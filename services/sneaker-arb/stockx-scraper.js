'use strict';

import axios from 'axios';

export async function getStockXData(query) {
  console.log(`Searching StockX for: ${query}`);
  try {
    const response = await axios.get(`https://stockx.com/api/browse?_search=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (response.data && response.data.Products) {
      return response.data.Products.map(p => ({
        id: p.id,
        name: p.title,
        styleId: p.styleId,
        lowestAsk: p.market.lowestAsk,
        highestBid: p.market.highestBid,
        urlKey: p.urlKey,
        image: p.media.thumbUrl
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching StockX data:', error.message);
    return [];
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const query = process.argv[2] || 'Jordan 1';
  getStockXData(query).then(data => console.log(JSON.stringify(data, null, 2)));
}
