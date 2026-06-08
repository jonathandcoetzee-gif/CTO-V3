'use strict';

export function buildMetadata(name, description, imageCid, attributes = []) {
  return {
    name,
    description,
    image: `ipfs://${imageCid}`,
    attributes: attributes.map(attr => ({
      trait_type: attr.trait_type,
      value: attr.value
    }))
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const metadata = buildMetadata('Revenue OS NFT #1', 'Minted by ACE', 'QmMock');
  console.log(JSON.stringify(metadata, null, 2));
}
