'use strict';

/**
 * router.js — Maps ACE actions to n8n webhook URLs and dispatches tickets.
 *
 * Each revenue pipeline has a registered n8n webhook endpoint.
 * When ACE decides an action, router looks up the target URL, builds
 * the payload, and POSTs the ticket to the n8n workflow trigger.
 */

import http from 'http';
import https from 'https';

/* ── Default n8n webhook registry ────────────────────────────────────── */

// These should be updated by the DevOps engineer with actual n8n URLs.
const DEFAULT_WEBHOOKS = {
  RUN_SNEAKER_ARB: process.env.WEBHOOK_SNEAKER_ARB || 'http://localhost:5678/webhook/sneaker-arb',
  RUN_YOUTUBE_VIDEO: process.env.WEBHOOK_YOUTUBE_VIDEO || 'http://localhost:5678/webhook/youtube-video',
  RUN_EBOOK: process.env.WEBHOOK_EBOOK || 'http://localhost:5678/webhook/ebook',
  RUN_NFT_MINT: process.env.WEBHOOK_NFT_MINT || 'http://localhost:5678/webhook/nft-mint',
  ONBOARD_CLIENT: process.env.WEBHOOK_ONBOARD_CLIENT || 'http://localhost:5678/webhook/onboard-client',
  NOOP: null, // no webhook for no-op
};

let webhookRegistry = { ...DEFAULT_WEBHOOKS };

/* ── Internal helpers ─────────────────────────────────────────────────── */

/**
 * Parse a URL string into components for http/https module.
 */
function parseUrl(urlString) {
  const url = new URL(urlString);
  return {
    protocol: url.protocol === 'https:' ? 'https' : 'http',
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + url.search,
  };
}

/**
 * Make an HTTP POST request with a JSON body.
 */
function postJson(urlString, payload) {
  return new Promise((resolve, reject) => {
    const { protocol, hostname, port, path } = parseUrl(urlString);
    const lib = protocol === 'https' ? https : http;

    const body = JSON.stringify(payload);

    const options = {
      hostname,
      port,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'ACE-Orchestrator/1.0',
        'X-ACE-Ticket': payload.ticketId || 'unknown',
      },
      timeout: 30000, // 30s timeout
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after 30s to ${urlString}`));
    });

    req.write(body);
    req.end();
  });
}

/* ── Public API ───────────────────────────────────────────────────────── */

/**
 * Update the webhook registry (e.g., from environment or config).
 */
export function setWebhooks(webhooks) {
  webhookRegistry = { ...DEFAULT_WEBHOOKS, ...webhooks };
}

/**
 * Get the current webhook URL for an action.
 */
export function getWebhookUrl(action) {
  if (!action || action === 'NOOP') return null;
  return webhookRegistry[action] || null;
}

/**
 * Route a ticket to the appropriate n8n webhook based on ACE's decision.
 *
 * @param {object} decision — the decision object from inference.js
 *   { action: string, confidence: number, reasoning: string, params: object }
 * @param {object} ticket — the ticket from ticket-system.js
 * @returns {Promise<object>} routing result
 */
export async function route(decision, ticket) {
  const { action, params } = decision;

  if (action === 'NOOP') {
    console.log('[router] NOOP — no webhook dispatch needed');
    return { dispatched: false, action, reason: 'NOOP action' };
  }

  const webhookUrl = getWebhookUrl(action);
  if (!webhookUrl) {
    console.warn(`[router] No webhook registered for action "${action}"`);
    return { dispatched: false, action, reason: `No webhook URL for ${action}` };
  }

  // Build the dispatch payload
  const payload = {
    ticketId: ticket.id,
    action,
    confidence: decision.confidence,
    reasoning: decision.reasoning,
    priority: params?.priority || 100,
    metadata: params?.metadata || {},
    timestamp: new Date().toISOString(),
    ticket, // full ticket for context
  };

  console.log(`[router] Dispatching ticket ${ticket.id} → ${action} @ ${webhookUrl}`);

  try {
    const response = await postJson(webhookUrl, payload);
    const ok = response.statusCode >= 200 && response.statusCode < 300;

    console.log(`[router] Response ${response.statusCode} for ticket ${ticket.id}`);

    return {
      dispatched: true,
      action,
      webhookUrl,
      statusCode: response.statusCode,
      ok,
      responseBody: response.body,
    };
  } catch (err) {
    console.error(`[router] Failed to dispatch ticket ${ticket.id}:`, err.message);
    return {
      dispatched: true,
      action,
      webhookUrl,
      ok: false,
      error: err.message,
    };
  }
}

/**
 * List all registered webhooks.
 */
export function listWebhooks() {
  return { ...webhookRegistry };
}