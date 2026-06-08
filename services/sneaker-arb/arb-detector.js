'use strict';

import { getStockXData } from './stockx-scraper.js';
import { getGoatData } from './goat-scraper.js';

export async function detectArb(query) {
  console.log(`Analyzing arbitrage for: ${query}`);
  
  const stockxProducts = await getStockXData(query);
  const goatProducts = await getGoatData(query);

  const opportunities = [];

  for (const sx of stockxProducts) {
    if (!sx.styleId) continue;

    const goatMatch = goatProducts.find(g => g.styleId === sx.styleId);
    if (goatMatch) {
      // Comparison 1: Buy on StockX (lowestAsk), Sell on GOAT (lowestOffer)
      if (sx.lowestAsk && goatMatch.lowestOffer) {
        const spread = goatMatch.lowestOffer - sx.lowestAsk;
        const margin = spread / sx.lowestAsk;

        if (margin >= 0.3) {
          opportunities.push({
            name: sx.name,
            styleId: sx.styleId,
            buyAt: 'StockX',
            buyPrice: sx.lowestAsk,
            sellAt: 'GOAT',
            sellPrice: goatMatch.lowestOffer,
            margin: (margin * 100).toFixed(2) + '%'
          });
        }
      }

      // Comparison 2: Buy on GOAT (lowestOffer), Sell on StockX (highestBid)
      if (goatMatch.lowestOffer && sx.highestBid) {
        const spread = sx.highestBid - goatMatch.lowestOffer;
        const margin = spread / goatMatch.lowestOffer;

        if (margin >= 0.3) {
          opportunities.push({
            name: sx.name,
            styleId: sx.styleId,
            buyAt: 'GOAT',
            buyPrice: goatMatch.lowestOffer,
            sellAt: 'StockX',
            sellPrice: sx.highestBid,
            margin: (margin * 100).toFixed(2) + '%'
          });
        }
      }
    }
  }

  return opportunities;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const query = process.argv[2] || 'Jordan 1';
  detectArb(query).then(opps => {
    console.log(`Found ${opps.length} opportunities:`);
    console.log(JSON.stringify(opps, null, 2));
  });
}
