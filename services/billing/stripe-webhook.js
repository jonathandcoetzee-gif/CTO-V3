'use strict';

import express from 'express';
import bodyParser from 'body-parser';

const app = express();

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];

  // In a real app, verify signature:
  // let event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  
  const event = JSON.parse(req.body);

  console.log(`Received Stripe event: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log(`Payment successful for session ${session.id}`);
      // Handle fulfillment
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

const PORT = process.env.BILLING_PORT || 3001;
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Stripe webhook listener on port ${PORT}`);
  });
}

export default app;
