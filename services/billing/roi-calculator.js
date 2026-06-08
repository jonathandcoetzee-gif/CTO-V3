'use strict';

/**
 * Calculates ROI for a given stream.
 * @param {number} revenue 
 * @param {number} costs (API credits, gas fees, etc.)
 */
export function calculateROI(revenue, costs) {
  if (costs === 0) return revenue > 0 ? 100 : 0;
  const profit = revenue - costs;
  const roi = (profit / costs) * 100;
  return {
    revenue,
    costs,
    profit,
    roi: roi.toFixed(2) + '%'
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(calculateROI(500, 200));
}
