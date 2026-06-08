'use strict';

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

export async function uploadToIPFS(filePath) {
  console.log(`Uploading ${filePath} to IPFS via Pinata...`);

  if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
    console.warn('Pinata API keys not set. Returning mock CID.');
    return 'QmMockCid123456789';
  }

  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
  let data = new FormData();
  data.append('file', fs.createReadStream(filePath));

  try {
    const response = await axios.post(url, data, {
      maxBodyLength: 'Infinity',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_API_KEY
      }
    });
    console.log('IPFS Upload Success:', response.data.IpfsHash);
    return response.data.IpfsHash;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  uploadToIPFS(process.argv[2]).then(cid => console.log('CID:', cid));
}
