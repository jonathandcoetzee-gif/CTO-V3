'use strict';

/**
 * conv-optimizer.js — Conversion Optimization Agent for ACE orchestrator.
 *
 * Generates A/B funnel variants (Aggressive, Trust-focused, Educational)
 * plus a structured test plan using GPT-4o at temperature 0.5.
 *
 * The optimizer analyses current funnel performance from state, then
 * proposes variants that the router can deploy as experiments.
 */

import OpenAI from 'openai';

const MODEL = 'gpt-4o';
const TEMPERATURE = 0.5;
const MAX_TOKENS = 2048;

let openai = null;

/**
 * Initialise the OpenAI client.
 * @param {string} apiKey — OpenAI API key (defaults to env OPENAI_API_KEY)
 */
export function init(apiKey) {
  openai = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
}

/**
 * Build the system prompt for the conversion optimization agent.
 */
function buildOptimizerPrompt(state, funnelContext) {
  const convState = state.conversionOptimizer || {};
  const streams = state.streams || {};

  const streamSummary = Object.entries(streams)
    .map(([name, s]) =>
      `- ${name}: revenue=$${s.revenue}, profit=$${s.profit || 0}, runs=${s.runs}, successes=${s.successes}`
    )
    .join('\n');

  return `You are the ACE Conversion Optimization Agent. Your role is to design A/B test variants for the Revenue OS funnel and propose a structured test plan.

## Context
- Tests run so far: ${convState.testsRun || 0}
- Wins deployed: ${convState.winsDeployed || 0}
- Current conversion lift: ${(convState.conversionLift || 0) * 100}%
- Active test: ${convState.activeTest || 'none'}

## Stream Performance
${streamSummary}

## Funnel Context
${funnelContext || 'No specific funnel context provided — generate general-purpose variants for the ACE onboarding funnel.'}

## Task
Generate exactly 3 funnel variants and a test plan. Each variant should be a distinct approach:

1. **Aggressive** — Direct, urgency-driven copy with bold CTAs, scarcity signals, and hard offers
2. **Trust-focused** — Social proof, testimonials, guarantees, risk-reversal messaging
3. **Educational** — Value-first content, explainer-style copy, free-resource lead magnets

Return ONLY valid JSON with this schema:
{
  "variants": [
    {
      "name": "Aggressive",
      "headline": "string — attention-grabbing headline",
      "subheadline": "string — supporting copy",
      "cta": "string — call to action button text",
      "keyMessage": "string — core persuasive message",
      "designNotes": "string — visual/UX design guidance",
      "targetAudience": "string — who this resonates with"
    },
    {
      "name": "Trust-focused",
      "headline": "string",
      "subheadline": "string",
      "cta": "string",
      "keyMessage": "string",
      "designNotes": "string",
      "targetAudience": "string"
    },
    {
      "name": "Educational",
      "headline": "string",
      "subheadline": "string",
      "cta": "string",
      "keyMessage": "string",
      "designNotes": "string",
      "targetAudience": "string"
    }
  ],
  "testPlan": {
    "hypothesis": "string — what we expect to learn",
    "successMetric": "string — primary metric to measure",
    "duration": "string — recommended test duration",
    "trafficSplit": "string — how to split traffic across variants",
    "minimumSampleSize": "number — minimum visitors per variant",
    "confidenceThreshold": "number — statistical significance threshold (0.0-1.0)",
    "winnerCriteria": "string — how to declare a winner",
    "nextSteps": "string — what happens after a winner is identified"
  }
}`;
}

/**
 * Generate 3 funnel variants and a test plan using GPT-4o.
 *
 * @param {object} state — current system state from state-manager
 * @param {string} funnelContext — optional context about the current funnel
 * @returns {Promise<object>} { variants: [...], testPlan: {...} }
 */
export async function generateVariants(state, funnelContext = '') {
  if (!openai) init();

  const systemPrompt = buildOptimizerPrompt(state || {}, funnelContext);

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: JSON.stringify({
            timestamp: new Date().toISOString(),
            state: {
              conversionOptimizer: state.conversionOptimizer || {},
              streams: state.streams || {},
            },
            funnelContext,
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || '{}';

    // Extract JSON from possible markdown fences
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(raw);

    // Validate the structure
    if (!result.variants || !Array.isArray(result.variants)) {
      throw new Error('Response missing variants array');
    }
    if (!result.testPlan) {
      throw new Error('Response missing testPlan');
    }

    return {
      variants: result.variants,
      testPlan: result.testPlan,
      raw,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[conv-optimizer] Failed to generate variants:', err.message);
    return {
      variants: [],
      testPlan: null,
      error: err.message,
      generatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Evaluate test results and determine a winner.
 *
 * @param {object} testResults — { variantName: string, conversions: number, visitors: number }[]
 * @param {number} confidenceThreshold — statistical significance threshold (default 0.95)
 * @returns {object} winner analysis
 */
export function evaluateWinner(testResults, confidenceThreshold = 0.95) {
  if (!testResults || testResults.length === 0) {
    return { winner: null, reason: 'No test results provided' };
  }

  // Simple Bayesian-inspired evaluation
  const rates = testResults.map(r => ({
    name: r.variantName,
    conversions: r.conversions || 0,
    visitors: r.visitors || 0,
    rate: r.visitors > 0 ? r.conversions / r.visitors : 0,
  }));

  // Find the variant with highest conversion rate
  rates.sort((a, b) => b.rate - a.rate);
  const winner = rates[0];

  // Calculate relative lift over control (assume control is first variant)
  const control = rates[rates.length - 1];
  const lift = control && control.rate > 0
    ? ((winner.rate - control.rate) / control.rate) * 100
    : 0;

  return {
    winner: winner.name,
    winningRate: winner.rate,
    liftPercent: lift,
    results: rates,
    threshold: confidenceThreshold,
    isSignificant: lift >= 5, // heuristic: 5%+ lift is practically significant
    reason: lift >= 5
      ? `Variant "${winner.name}" outperformed with ${(winner.rate * 100).toFixed(2)}% conversion rate (${lift.toFixed(1)}% lift)`
      : 'No statistically significant winner detected yet — continue test',
  };
}