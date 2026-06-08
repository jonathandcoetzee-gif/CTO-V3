'use strict';

/**
 * ticket-system.js — JSON-backed task queue for ACE orchestrator.
 *
 * Persists tickets to a local JSON file so state survives restarts.
 * Supports: enqueue, getNextTicket, markDone, markFailed, peek, stats.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TICKETS_FILE = path.join(__dirname, 'tickets.json');

/* ── Internal helpers ─────────────────────────────────────────────────── */

function load() {
  try {
    const raw = fs.readFileSync(TICKETS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { tickets: [], nextId: 1 };
  }
}

function save(state) {
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

/* ── Public API ───────────────────────────────────────────────────────── */

/**
 * Enqueue a new ticket.
 *
 * @param {string} type  — event type, e.g. 'SCHEDULED_TICK', 'WEBHOOK_TRIGGER'
 * @param {object} payload — arbitrary data payload
 * @param {number} priority — lower = higher priority (default 100)
 * @returns {object} the created ticket
 */
export function enqueue(type, payload, priority = 100) {
  const state = load();

  const ticket = {
    id: crypto.randomUUID(),
    seq: state.nextId++,
    type,
    payload: payload || {},
    priority,
    status: 'pending',     // pending | running | done | failed
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    result: null,
    error: null,
  };

  state.tickets.push(ticket);
  save(state);

  console.log(`[ticket-system] Enqueued ticket ${ticket.id} (type=${type}, priority=${priority})`);
  return ticket;
}

/**
 * Get the next pending ticket (highest priority, then FIFO).
 * Marks it as 'running' and returns the ticket, or null if queue is empty.
 */
export function getNextTicket() {
  const state = load();

  // Sort: lower priority number first, then oldest createdAt first
  const pending = state.tickets
    .filter(t => t.status === 'pending')
    .sort((a, b) => a.priority - b.priority || new Date(a.createdAt) - new Date(b.createdAt));

  if (pending.length === 0) return null;

  const ticket = pending[0];
  ticket.status = 'running';
  ticket.startedAt = new Date().toISOString();
  save(state);

  return ticket;
}

/**
 * Mark a ticket as done.
 */
export function markDone(ticketId, result = {}) {
  const state = load();
  const ticket = state.tickets.find(t => t.id === ticketId);
  if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

  ticket.status = 'done';
  ticket.completedAt = new Date().toISOString();
  ticket.result = result;
  save(state);

  console.log(`[ticket-system] Ticket ${ticketId} completed`);
  return ticket;
}

/**
 * Mark a ticket as failed.
 */
export function markFailed(ticketId, error = 'Unknown error') {
  const state = load();
  const ticket = state.tickets.find(t => t.id === ticketId);
  if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

  ticket.status = 'failed';
  ticket.completedAt = new Date().toISOString();
  ticket.error = typeof error === 'string' ? error : (error.message || String(error));
  save(state);

  console.error(`[ticket-system] Ticket ${ticketId} FAILED: ${ticket.error}`);
  return ticket;
}

/**
 * Return tickets filtered by optional status.
 */
export function peek(status = null) {
  const state = load();
  if (!status) return state.tickets;
  return state.tickets.filter(t => t.status === status);
}

/**
 * Return aggregate queue stats.
 */
export function stats() {
  const tickets = peek();
  const counts = { pending: 0, running: 0, done: 0, failed: 0 };
  for (const t of tickets) {
    counts[t.status] = (counts[t.status] || 0) + 1;
  }
  return {
    total: tickets.length,
    ...counts,
  };
}