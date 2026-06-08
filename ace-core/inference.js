'use strict';

/**
 * inference.js — LLM decision layer for ACE orchestrator.
 *
 * Uses OpenAI (gpt-4o, temperature 0.2) to analyse incoming events
 * and return a structured action decision the router can execute.
 *
 * Decision schema:
 *   { action: 'RUN_SNEAKER_ARB' | 'RUN_YOUTUBE_VIDEO' | 'RUN_EBOOK'
 *           | 'RUN_NFT_MINT' | 'ONBOARD_CLIENT' | 'NOOP',
 *     confidence: 0.0..1.0,
 *     reasoning: 'brief explanation',
 *     params: { streamOverride?, priority?, metadata? } }
 */

import OpenAI from 'openai';

const MODEL = 'gpt-4o';
const TEMPERATURE = 0.2;
const MAX_TOKENS = 512;

let openai = null;

/**
 * Initialise the OpenAI client.
 * @param {string} apiKey — OpenAI API key (defaults to env OPENAI_API_KEY)
 */
export function init(apiKey) {
  openai = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
}

/**
 * Build the system prompt for the decision agent.
 */
function buildSystemPrompt(state) {
  const streams = state.streams || {};
  const summary = Object.entries(streams)
    .map(([name, s]) =>
      `- ${name}: revenue=$${s.revenue}, profit=$${s.profit || 0}, ` +
      `runs=${s.runs}, failures=${s.failures}, lastRun=${s.lastRun || 'never'}, ` +
      `enabled=${s.enabled}`
    )
    .join('\n');

  return `You are ACE, the AI Revenue Orchestrator. You decide which revenue pipeline to execute next.

## Available Actions
- RUN_SNEAKER_ARB — Execute sneaker arbitrage (check StockX↔GOAT spreads, execute trades)
- RUN_YOUTUBE_VIDEO — Generate and upload a faceless YouTube video
- RUN_EBOOK — Generate and publish a book via KDP
- RUN_NFT_MINT — Generate and mint a generative art NFT
- ONBOARD_CLIENT — Create a new ACE client store deployment
- NOOP — No operation needed at this time

## Current System State
MRR: $${state.mrr}
Total Revenue: $${state.totalRevenue}

### Stream Performance
${summary}

## Decision Rules
1. Prioritise streams that haven't run recently (check lastRun)
2. Prioritise streams with high profit margins
3. If multiple streams are due, pick the one with highest revenue priority
4. If a stream has failed repeatedly (>3 consecutive), deprioritise it
5. Revenue priority order: SNEAKER_ARB > CLIENT_STORES > YOUTUBE > EBOOK > NFT

Return ONLY valid JSON with exactly these fields:
{
  "action": "RUN_SNEAKER_ARB | RUN_YOUTUBE_VIDEO | RUN_EBOOK | RUN_NFT_MINT | ONBOARD_CLIENT | NOOP",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of decision",
  "params": { "priority": 1-100, "metadata": {} }
}`;
}

/**
 * Ask GPT-4o to decide the next action.
 *
 * @param {string} eventType — type of event triggering this decision
 * @param {object} eventPayload — payload from the ticket or webhook
 * @param {object} state — current system state from state-manager
 * @returns {Promise<object>} decision with action, confidence, reasoning, params
 */
export async function decideAction(eventType, eventPayload, state) {
  if (!openai) init();

  const systemPrompt = buildSystemPrompt(state || {});
  const userMessage = {
    role: 'user',
    content: JSON.stringify({
      eventType,
      eventPayload,
      timestamp: new Date().toISOString(),
      streams: state.streams || {},
      aceMetrics: state.ace || {},
    }),
  };

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: systemPrompt },
        userMessage,
      ],
    });

    const raw = completion.choices[0]?.message?.content || '{}';

    // Extract JSON from possible markdown fences
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const decision = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(raw);

    // Validate the decision
    const validActions = [
      'RUN_SNEAKER_ARB', 'RUN_YOUTUBE_VIDEO', 'RUN_EBOOK',
      'RUN_NFT_MINT', 'ONBOARD_CLIENT', 'NOOP',
    ];
    if (!validActions.includes(decision.action)) {
      console.warn(`[inference] Invalid action "${decision.action}", defaulting to NOOP`);
      decision.action = 'NOOP';
    }

    return {
      action: decision.action || 'NOOP',
      confidence: typeof decision.confidence === 'number' ? decision.confidence : 0.5,
      reasoning: decision.reasoning || 'No reasoning provided',
      params: decision.params || { priority: 100, metadata: {} },
      raw, // raw response for debugging
    };
  } catch (err) {
    console.error('[inference] OpenAI call failed:', err.message);
    // Fallback: return NOOP with low confidence
    return {
      action: 'NOOP',
      confidence: 0,
      reasoning: `Inference error: ${err.message}`,
      params: { priority: 100, metadata: {} },
      error: err.message,
    };
  }
}