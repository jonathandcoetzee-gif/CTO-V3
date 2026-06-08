'use strict';

/**
 * index.js — ACE orchestrator main entry point.
 *
 * Express HTTP server that:
 *  1. Exposes POST /webhook/ace for external triggers (n8n, cron, manual)
 *  2. Runs a heartbeat loop every 5s that pulls pending tickets from the queue,
 *     feeds them through inference.js → router.js, and updates state
 *  3. Exposes GET /health, GET /state, GET /metrics for monitoring
 *
 * Designed for production — binds to 0.0.0.0 so Docker/host networking works.
 */

import express from 'express';
import { enqueue, getNextTicket, markDone, markFailed, peek, stats } from './ticket-system.js';
import { getState, revenueSummary, recordSuccess, recordFailure } from './state-manager.js';
import { init as initInference, decideAction } from './inference.js';
import { route, listWebhooks, setWebhooks } from './router.js';
import { init as initOptimizer, generateVariants } from './conv-optimizer.js';

/* ── Configuration ────────────────────────────────────────────────────── */

const PORT = parseInt(process.env.ACE_PORT || '3000', 10);
const HOST = process.env.ACE_HOST || '0.0.0.0';
const HEARTBEAT_INTERVAL_MS = parseInt(process.env.ACE_HEARTBEAT_INTERVAL || '5000', 10);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DISABLE_INFERENCE = process.env.ACE_DISABLE_INFERENCE === 'true';

/* ── Initialise modules ──────────────────────────────────────────────── */

// Initialise OpenAI clients if an API key is available
if (OPENAI_API_KEY) {
  initInference(OPENAI_API_KEY);
  initOptimizer(OPENAI_API_KEY);
  console.log('[ace] OpenAI initialised');
} else {
  console.warn('[ace] No OPENAI_API_KEY set — inference will fallback to NOOP');
}

/* ── Heartbeat loop ──────────────────────────────────────────────────── */

/**
 * Process one ticket from the queue.
 * Fetches the next pending ticket, decides the action via inference,
 * routes it to the appropriate n8n webhook, and marks it done/failed.
 */
async function processNextTicket() {
  const ticket = getNextTicket();
  if (!ticket) return null; // queue empty

  console.log(`[ace] Heartbeat processing ticket ${ticket.id} (type=${ticket.type})`);

  try {
    const state = getState();

    // Decide what to do
    let decision;
    if (DISABLE_INFERENCE) {
      // Manual/scheduled routing: use the ticket's type as the action
      const actionMap = {
        'SCHEDULED_SNEAKER_ARB': 'RUN_SNEAKER_ARB',
        'SCHEDULED_YOUTUBE': 'RUN_YOUTUBE_VIDEO',
        'SCHEDULED_EBOOK': 'RUN_EBOOK',
        'SCHEDULED_NFT': 'RUN_NFT_MINT',
        'SCHEDULED_ONBOARD': 'ONBOARD_CLIENT',
      };
      decision = {
        action: actionMap[ticket.type] || 'NOOP',
        confidence: 1.0,
        reasoning: `Direct dispatch for type=${ticket.type}`,
        params: { priority: ticket.priority, metadata: {} },
      };
    } else {
      decision = await decideAction(ticket.type, ticket.payload, state);
    }

    console.log(`[ace] Decision for ticket ${ticket.id}: ${decision.action} (confidence=${decision.confidence})`);

    // Route to the appropriate n8n webhook
    const routingResult = await route(decision, ticket);

    if (routingResult.dispatched && routingResult.ok) {
      markDone(ticket.id, {
        action: decision.action,
        routingResult,
        decision,
      });

      // Record success in state (revenue is updated by pipeline callback)
      const streamMap = {
        'RUN_SNEAKER_ARB': 'sneakerArbitrage',
        'RUN_YOUTUBE_VIDEO': 'youtubeAutomation',
        'RUN_EBOOK': 'ebookPublishing',
        'RUN_NFT_MINT': 'nftMinting',
        'ONBOARD_CLIENT': 'aceClientStores',
      };
      const streamName = streamMap[decision.action];
      if (streamName) {
        recordSuccess(streamName);
      }

      return { ticket, decision, routingResult };
    } else if (decision.action === 'NOOP') {
      // NOOP is not a failure — just mark done with no routing
      markDone(ticket.id, { action: 'NOOP', reason: decision.reasoning });
      return { ticket, decision, routingResult: null };
    } else {
      // Dispatch failed
      const errorMsg = routingResult?.error || `HTTP ${routingResult?.statusCode}`;
      markFailed(ticket.id, errorMsg);

      const streamMap = {
        'RUN_SNEAKER_ARB': 'sneakerArbitrage',
        'RUN_YOUTUBE_VIDEO': 'youtubeAutomation',
        'RUN_EBOOK': 'ebookPublishing',
        'RUN_NFT_MINT': 'nftMinting',
        'ONBOARD_CLIENT': 'aceClientStores',
      };
      const streamName = streamMap[decision.action];
      if (streamName) {
        recordFailure(streamName, errorMsg);
      }

      return { ticket, decision, routingResult, error: errorMsg };
    }
  } catch (err) {
    console.error(`[ace] Error processing ticket ${ticket.id}:`, err);
    try {
      markFailed(ticket.id, err.message);
    } catch {
      // swallow double-failures
    }
    return { ticket, error: err.message };
  }
}

/**
 * Heartbeat: runs every HEARTBEAT_INTERVAL_MS milliseconds.
 * Pulls the next ticket from the queue and processes it.
 */
function startHeartbeat() {
  console.log(`[ace] Heartbeat starting every ${HEARTBEAT_INTERVAL_MS}ms`);

  let isProcessing = false;

  const interval = setInterval(async () => {
    if (isProcessing) {
      console.log('[ace] Heartbeat: still processing previous ticket, skipping');
      return;
    }

    isProcessing = true;
    try {
      await processNextTicket();
    } catch (err) {
      console.error('[ace] Heartbeat error:', err.message);
    } finally {
      isProcessing = false;
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Allow the interval to be cleared on shutdown
  process.on('SIGTERM', () => clearInterval(interval));
  process.on('SIGINT', () => clearInterval(interval));
}

/* ── Express server ──────────────────────────────────────────────────── */

const app = express();

// Trust proxy if behind n8n/reverse proxy
app.set('trust proxy', true);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  console.log(`[ace] ${req.method} ${req.path}`);
  next();
});

/**
 * POST /webhook/ace — Main entry point for external triggers.
 *
 * Accepts tickets from n8n, cron jobs, or manual API calls.
 * Body: { type: string, payload?: object, priority?: number }
 */
app.post('/webhook/ace', (req, res) => {
  const { type, payload, priority } = req.body || {};

  if (!type) {
    return res.status(400).json({ error: 'Missing required field: type' });
  }

  const validTypes = [
    'SCHEDULED_TICK', 'MANUAL_TRIGGER', 'WEBHOOK_TRIGGER',
    'SCHEDULED_SNEAKER_ARB', 'SCHEDULED_YOUTUBE', 'SCHEDULED_EBOOK',
    'SCHEDULED_NFT', 'SCHEDULED_ONBOARD',
  ];

  const ticketType = validTypes.includes(type) ? type : 'WEBHOOK_TRIGGER';

  const ticket = enqueue(ticketType, payload || {}, priority || 100);

  console.log(`[ace] Enqueued ticket ${ticket.id} via /webhook/ace (type=${ticketType})`);

  res.status(201).json({
    ok: true,
    ticketId: ticket.id,
    ticket,
    queueStats: stats(),
  });
});

/**
 * GET /health — Health check endpoint.
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    queueSize: stats().pending,
  });
});

/**
 * GET /state — Full system state (performance metrics, stream data).
 */
app.get('/state', (_req, res) => {
  res.json({
    state: getState(),
    queueStats: stats(),
    webhooks: listWebhooks(),
  });
});

/**
 * GET /metrics — Lightweight revenue and KPI summary.
 */
app.get('/metrics', (_req, res) => {
  const rev = revenueSummary();
  res.json({
    mrr: rev.mrr,
    totalRevenue: rev.totalRevenue,
    streams: rev.streams,
    queueStats: stats(),
  });
});

/**
 * POST /webhook/ace/optimize — Trigger conversion optimizer.
 * Body: { funnelContext?: string }
 */
app.post('/webhook/ace/optimize', async (req, res) => {
  const { funnelContext } = req.body || {};
  const state = getState();

  try {
    const result = await generateVariants(state, funnelContext);
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    res.json({
      ok: true,
      variants: result.variants,
      testPlan: result.testPlan,
      generatedAt: result.generatedAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /webhook/ace/ticket — Manually enqueue a ticket from external source.
 */
app.post('/webhook/ace/ticket', (req, res) => {
  const { type, payload, priority } = req.body || {};
  if (!type) {
    return res.status(400).json({ error: 'Missing required field: type' });
  }
  const ticket = enqueue(type, payload || {}, priority || 100);
  res.status(201).json({ ok: true, ticketId: ticket.id, ticket });
});

/**
 * GET /webhook/ace/queue — Inspect current queue state.
 */
app.get('/webhook/ace/queue', (_req, res) => {
  const qStats = stats();
  const pending = peek('pending');
  const running = peek('running');
  res.json({ stats: qStats, pending: pending.length, running: running.length });
});

/* ── Start server ────────────────────────────────────────────────────── */

app.listen(PORT, HOST, () => {
  console.log(`[ace] ACE orchestrator listening on http://${HOST}:${PORT}`);
  console.log(`[ace] Endpoints:`);
  console.log(`[ace]   POST /webhook/ace          — Main ticket ingestion`);
  console.log(`[ace]   POST /webhook/ace/optimize  — Generate funnel variants`);
  console.log(`[ace]   POST /webhook/ace/ticket    — Manual ticket enqueue`);
  console.log(`[ace]   GET  /webhook/ace/queue     — Queue inspection`);
  console.log(`[ace]   GET  /health                — Health check`);
  console.log(`[ace]   GET  /state                 — Full system state`);
  console.log(`[ace]   GET  /metrics               — Revenue/KPI summary`);

  // Start the heartbeat loop after the server is listening
  startHeartbeat();
});