/**
 * Pinata IPFS client wrapper.
 * Used by the NFT pipeline to upload art metadata and images to IPFS.
 */

import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';
import dotenv from 'dotenv';
dotenv.config();

const API_URL = 'https://api.pinata.cloud';
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET = process.env.PINATA_SECRET;

if (!PINATA_API_KEY || !PINATA_SECRET) {
  console.warn('[pinata] PINATA_API_KEY or PINATA_SECRET missing — uploads will fail.');
}

function authHeaders() {
  return {
    pinata_api_key: PINATA_API_KEY,
    pinata_secret_api_key: PINATA_SECRET,
  };
}

/**
 * Upload a JSON object to IPFS as a JSON pin.
 * @param {object} jsonData — the JSON metadata to upload
 * @param {object} [metadata] — optional Pinata pin metadata
 * @returns {Promise<{IpfsHash: string, PinSize: number, Timestamp: string}>}
 */
export async function uploadJSON(jsonData, metadata = {}) {
  if (!PINATA_API_KEY || !PINATA_SECRET) throw new Error('Pinata not configured.');
  const res = await fetch(`${API_URL}/pinning/pinJSONToIPFS`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pinataContent: jsonData,
      pinataMetadata: {
        name: metadata.name || 'revenue-os-nft',
        ...metadata,
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata uploadJSON error (${res.status}): ${err}`);
  }
  return res.json();
}

/**
 * Upload a file (image, video, etc.) to IPFS.
 * @param {string} filePath — absolute path to the file
 * @param {object} [metadata] — optional Pinata pin metadata
 * @returns {Promise<{IpfsHash: string, PinSize: number, Timestamp: string}>}
 */
export async function uploadFile(filePath, metadata = {}) {
  if (!PINATA_API_KEY || !PINATA_SECRET) throw new Error('Pinata not configured.');
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('pinataMetadata', JSON.stringify({
    name: metadata.name || path.basename(filePath),
    ...metadata,
  }));
  const res = await fetch(`${API_URL}/pinning/pinFileToIPFS`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata uploadFile error (${res.status}): ${err}`);
  }
  return res.json();
}

/**
 * Unpin a file from IPFS by its CID hash.
 * @param {string} ipfsHash
 * @returns {Promise<void>}
 */
export async function unpin(ipfsHash) {
  if (!PINATA_API_KEY || !PINATA_SECRET) throw new Error('Pinata not configured.');
  const res = await fetch(`${API_URL}/pinning/unpin/${ipfsHash}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Pinata unpin error: ${res.status}`);
}

/**
 * Get a list of pins.
 * @param {object} [filters] — optional filters
 * @returns {Promise<{rows: Array, count: number}>}
 */
export async function listPins(filters = {}) {
  if (!PINATA_API_KEY || !PINATA_SECRET) throw new Error('Pinata not configured.');
  const params = new URLSearchParams(filters);
  const res = await fetch(`${API_URL}/data/pinList?${params}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Pinata listPins error: ${res.status}`);
  return res.json();
}

export default { uploadJSON, uploadFile, unpin, listPins };