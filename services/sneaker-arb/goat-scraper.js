'use strict';

import axios from 'axios';

export async function getGoatData(query) {
  console.log(`Searching GOAT for: ${query}`);
  try {
    const response = await axios.post('https://2go9gn9y96-dsn.algolia.net/1/indexes/*/queries?x-algolia-agent=Algolia%20for%20JavaScript%20(4.8.5)%3B%20Browser&x-algolia-api-key=ac99678fd96250fbb09095697693952d&x-algolia-application-id=2GO9GN9Y96', {
      requests: [
        {
          indexName: 'product_variants_v2',
          params: `query=${encodeURIComponent(query)}&hitsPerPage=10`
        }
      ]
    });

    if (response.data && response.data.results) {
      return response.data.results[0].hits.map(h => ({
        id: h.objectID,
        name: h.name,
        styleId: h.sku,
        lowestOffer: h.lowest_price_cents / 100,
        image: h.main_picture_url
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching GOAT data:', error.message);
    return [];
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const query = process.argv[2] || 'Jordan 1';
  getGoatData(query).then(data => console.log(JSON.stringify(data, null, 2)));
}
