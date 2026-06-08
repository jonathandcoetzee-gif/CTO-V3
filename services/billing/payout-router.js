'use strict';

/**
 * Routes profits based on source.
 * @param {string} source - 'stripe', 'kdp', 'nft', etc.
 * @param {number} amount 
 */
export async function routePayout(source, amount) {
  console.log(`Routing payout of ${amount} from ${source}...`);

  if (source === 'nft') {
    const wallet = process.env.PAYOUT_WALLET || '0x9339…cFB6';
    console.log(`Sending ${amount} ETH to on-chain wallet ${wallet}`);
    // Implement ethers.js transfer
  } else {
    console.log(`Transferring ${amount} to Stripe/Bank account`);
    // Implement Stripe Payouts
  }

  return { status: 'success', source, amount, timestamp: new Date().toISOString() };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  routePayout(process.argv[2] || 'stripe', 100);
}
