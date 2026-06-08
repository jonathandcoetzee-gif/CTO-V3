'use strict';

/**
 * state-manager.js — Load/save performance metrics for ACE orchestrator.
 *
 * Tracks per-stream revenue, MRR, last run times, and conversion metrics.
 * Persists to a JSON file (state.json) so data survives restarts.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATE_FILE = path.join(__dirname, 'state.json');

/* ── Default state schema ────────────────────────────────────────────── */

const DEFAULT_STATE = {
  mrr: 0,
  totalRevenue: 0,
  streams: {
    sneakerArbitrage: {
      enabled: true,
      revenue: 0,
      cost: 0,
      profit: 0,
      lastRun: null,
      runs: 0,
      successes: 0,
      failures: 0,
      gapCaptureRate: 0,
      gapsDetected: 0,
      gapsExecuted: 0,
    },
    youtubeAutomation: {
      enabled: true,
      revenue: 0,
      cost: 0,
      profit: 0,
      lastRun: null,
      runs: 0,
      successes: 0,
      failures: 0,
    },
    ebookPublishing: {
      enabled: true,
      revenue: 0,
      cost: 0,
      profit: 0,
      lastRun: null,
      runs: 0,
      successes: 0,
      failures: 0,
    },
    nftMinting: {
      enabled: true,
      revenue: 0,
      cost: 0,
      profit: 0,
      lastRun: null,
      runs: 0,
      successes: 0,
      failures: 0,
    },
    aceClientStores: {
      enabled: true,
      revenue: 0,
      cost: 0,
      profit: 0,
      lastRun: null,
      runs: 0,
      successes: 0,
      failures: 0,
    },
  },
  ace: {
    decisionAccuracy: 1.0,      // % of tickets completed without failure
    pipelineUptime: 1.0,        // fraction of scheduled runs that succeeded
    totalTicketsProcessed: 0,
    totalTicketsFailed: 0,
    lastHeartbeat: null,
  },
  conversionOptimizer: {
    testsRun: 0,
    winsDeployed: 0,
    conversionLift: 0,          // percentage lift from deployed variants
    activeTest: null,
  },
};

/* ── Internal helpers ─────────────────────────────────────────────────── */

function load() {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    save(DEFAULT_STATE);
    return { ...DEFAULT_STATE };
  }
}

function save(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

/* ── Public API ───────────────────────────────────────────────────────── */

/**
 * Get the full state object (cloned to prevent mutation leaks).
 */
export function getState() {
  return JSON.parse(JSON.stringify(load()));
}

/**
 * Update arbitrary paths in state. Accepts a flat or nested object.
 * Merge is shallow — use setStreamMetric for stream-specific updates.
 */
export function updateState(patch) {
  const state = load();
  for (const [key, value] of Object.entries(patch)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      state[key] = { ...(state[key] || {}), ...value };
    } else {
      state[key] = value;
    }
  }
  save(state);
  return getState();
}

/**
 * Update a specific stream metric.
 *
 * @param {string} streamName — key in state.streams (e.g. 'sneakerArbitrage')
 * @param {object} patch — fields to update on that stream
 */
export function setStreamMetric(streamName, patch) {
  const state = load();
  if (!state.streams[streamName]) {
    throw new Error(`Unknown stream: ${streamName}`);
  }
  state.streams[streamName] = { ...state.streams[streamName], ...patch };

  // Recalculate totals
  const streams = Object.values(state.streams);
  state.totalRevenue = streams.reduce((sum, s) => sum + (s.revenue || 0), 0);
  state.mrr = state.totalRevenue;

  // ACE decision accuracy = (total successes / total processed)
  const totalProcessed = streams.reduce((sum, s) => sum + (s.runs || 0), 0);
  const totalFailed = streams.reduce((sum, s) => sum + (s.failures || 0), 0);
  state.ace.totalTicketsProcessed = totalProcessed;
  state.ace.totalTicketsFailed = totalFailed;
  state.ace.decisionAccuracy = totalProcessed > 0
    ? (totalProcessed - totalFailed) / totalProcessed
    : 1.0;

  save(state);
  return getState();
}

/**
 * Record a successful run of a pipeline.
 */
export function recordSuccess(streamName, revenue = 0, cost = 0) {
  const state = load();
  const s = state.streams[streamName];
  if (!s) throw new Error(`Unknown stream: ${streamName}`);

  s.runs = (s.runs || 0) + 1;
  s.successes = (s.successes || 0) + 1;
  s.revenue = (s.revenue || 0) + revenue;
  s.cost = (s.cost || 0) + cost;
  s.profit = s.revenue - s.cost;
  s.lastRun = new Date().toISOString();
  state.ace.lastHeartbeat = new Date().toISOString();
  save(state);
  return getState();
}

/**
 * Record a failed run of a pipeline.
 */
export function recordFailure(streamName, error = '') {
  const state = load();
  const s = state.streams[streamName];
  if (!s) throw new Error(`Unknown stream: ${streamName}`);

  s.runs = (s.runs || 0) + 1;
  s.failures = (s.failures || 0) + 1;
  s.lastRun = new Date().toISOString();
  state.ace.lastHeartbeat = new Date().toISOString();
  save(state);
  return getState();
}

/**
 * Get a summary of all stream revenue for quick reporting.
 */
export function revenueSummary() {
  const state = load();
  const streams = Object.entries(state.streams).map(([name, data]) => ({
    name,
    revenue: data.revenue,
    cost: data.cost,
    profit: data.profit || data.revenue - data.cost,
    enabled: data.enabled,
    lastRun: data.lastRun,
  }));

  return {
    mrr: state.mrr,
    totalRevenue: state.totalRevenue,
    streams,
  };
}

/**
 * Reset state to defaults.
 */
export function reset() {
  save(DEFAULT_STATE);
  return getState();
}