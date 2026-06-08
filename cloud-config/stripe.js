/**
 * Stripe initialisation wrapper.
 * Provides a pre-configured Stripe instance plus helpers.
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

const secretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!secretKey) {
  console.warn('[stripe] STRIPE_SECRET_KEY missing — Stripe client will be null');
}

const stripe = secretKey
  ? new Stripe(secretKey, { apiVersion: '2024-11-20.acacia' })
  : null;

/**
 * Get the raw Stripe instance.
 * @returns {Stripe | null}
 */
export function getInstance() {
  return stripe;
}

/**
 * Construct a Stripe webhook event from a raw body and signature header.
 * @param {Buffer|string} rawBody
 * @param {string} signature
 * @returns {Stripe.Event}
 */
export function constructWebhookEvent(rawBody, signature) {
  if (!stripe) throw new Error('Stripe not initialised. Check STRIPE_SECRET_KEY.');
  if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET not set.');
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

/**
 * Create a checkout session.
 * @param {Stripe.Checkout.SessionCreateParams} params
 * @returns {Promise<Stripe.Checkout.Session>}
 */
export async function createCheckoutSession(params) {
  if (!stripe) throw new Error('Stripe not initialised.');
  return stripe.checkout.sessions.create(params);
}

/**
 * Create a payment intent.
 * @param {Stripe.PaymentIntentCreateParams} params
 * @returns {Promise<Stripe.PaymentIntent>}
 */
export async function createPaymentIntent(params) {
  if (!stripe) throw new Error('Stripe not initialised.');
  return stripe.paymentIntents.create(params);
}

export default { getInstance, constructWebhookEvent, createCheckoutSession, createPaymentIntent };