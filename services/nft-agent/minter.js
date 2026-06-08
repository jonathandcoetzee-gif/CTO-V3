'use strict';

import { ethers } from 'ethers';

const RPC_URL = process.env.RPC_URL || 'https://rpc.ankr.com/eth_sepolia';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

const ABI = [
  "function safeMint(address to, string memory uri) public"
];

export async function mintNFT(toAddress, tokenURI) {
  console.log(`Minting NFT to ${toAddress} with URI ${tokenURI}...`);

  if (!PRIVATE_KEY || !CONTRACT_ADDRESS) {
    console.warn('EVM credentials not set. Skipping real minting.');
    return { success: true, txHash: '0xMockTxHash' };
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    const tx = await contract.safeMint(toAddress, tokenURI);
    console.log(`Transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error('Error minting NFT:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [to, uri] = process.argv.slice(2);
  mintNFT(to || '0x9339…cFB6', uri || 'ipfs://QmTest');
}
