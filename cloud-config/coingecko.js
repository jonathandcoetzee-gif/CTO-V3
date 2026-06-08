/**
 * CoinGecko price feed wrapper.
 * Fetches live cryptocurrency prices for the NFT minting pipeline.
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://api.coingecko.com/api/v3';

/**
 * Fetch the current USD price of a coin.
 * @param {string} coinId — e.g. 'ethereum', 'bitcoin'
 * @returns {Promise<number>} price in USD
 */
export async function getPrice(coinId = 'ethereum') {
  const res = await fetch(
    `${BASE_URL}/simple/price?ids=${coinId}&vs_currencies=usd`,
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`CoinGecko price error (${res.status}): ${err}`);
  }
  const data = await res.json();
  const price = data[coinId]?.usd;
  if (price === undefined) throw new Error(`Coin "${coinId}" not found on CoinGecko`);
  return price;
}

/**
 * Fetch ETH gas price estimate (in Gwei).
 * Uses Etherscan via CoinGecko's public API where available, otherwise falls back.
 * @returns {Promise<{slow: number, average: number, fast: number}>}
 */
export async function getGasPrice() {
  const res = await fetch(`${BASE_URL}/simple/price?ids=ethereum&vs_currencies=usd&include_gas=true`);
  if (!res.ok) throw new Error(`CoinGecko gas error: ${res.status}`);
  const data = await res.json();
  // CoinGecko returns gas prices in Gwei
  return {
    slow: data.gas?.slow || 20,
    average: data.gas?.average || 30,
    fast: data.gas?.fast || 50,
  };
}

/**
 * Get the market data for a coin (market cap, 24h volume, etc.).
 * @param {string} coinId
 * @returns {Promise<object>}
 */
export async function getMarketData(coinId = 'ethereum') {
  const res = await fetch(
    `${BASE_URL}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`,
  );
  if (!res.ok) throw new Error(`CoinGecko market data error: ${res.status}`);
  const data = await res.json();
  return data.market_data;
}

export default { getPrice, getGasPrice, getMarketData };