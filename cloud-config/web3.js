/**
 * Web3 / Ethers wallet wrapper.
 * Used by the NFT minting pipeline for on-chain interactions.
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const privateKey = process.env.ETH_PRIVATE_KEY;
const rpcUrl = process.env.ETH_RPC_URL;

if (!privateKey || !rpcUrl) {
  console.warn('[web3] ETH_PRIVATE_KEY or ETH_RPC_URL missing — wallet will be null');
}

let provider = null;
let wallet = null;

if (rpcUrl) {
  provider = new ethers.JsonRpcProvider(rpcUrl);
}
if (provider && privateKey) {
  wallet = new ethers.Wallet(privateKey, provider);
}

/**
 * Get the ethers Wallet instance.
 * @returns {ethers.Wallet | null}
 */
export function getWallet() {
  return wallet;
}

/**
 * Get the ethers Provider instance.
 * @returns {ethers.JsonRpcProvider | null}
 */
export function getProvider() {
  return provider;
}

/**
 * Get the wallet's current ETH balance.
 * @returns {Promise<string>} balance in ETH (as string)
 */
export async function getBalance() {
  if (!wallet) throw new Error('Wallet not initialised. Check ETH_PRIVATE_KEY and ETH_RPC_URL.');
  const bal = await provider.getBalance(wallet.address);
  return ethers.formatEther(bal);
}

/**
 * Get the current network gas price.
 * @returns {Promise<bigint>} gas price in wei
 */
export async function getGasPrice() {
  if (!provider) throw new Error('Provider not initialised.');
  return provider.getFeeData();
}

/**
 * Send a transaction.
 * @param {object} tx — ethers TransactionRequest object
 * @returns {Promise<ethers.TransactionResponse>}
 */
export async function sendTransaction(tx) {
  if (!wallet) throw new Error('Wallet not initialised.');
  return wallet.sendTransaction(tx);
}

/**
 * Deploy a contract.
 * @param {string} abi — contract ABI
 * @param {string} bytecode — contract bytecode
 * @param {Array} [args=[]] — constructor arguments
 * @returns {Promise<ethers.Contract>} deployed contract instance
 */
export async function deployContract(abi, bytecode, args = []) {
  if (!wallet) throw new Error('Wallet not initialised.');
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  return contract;
}

/**
 * Get a contract instance at a known address.
 * @param {string} address
 * @param {Array} abi
 * @returns {ethers.Contract}
 */
export function getContract(address, abi) {
  if (!wallet) throw new Error('Wallet not initialised.');
  return new ethers.Contract(address, abi, wallet);
}

/**
 * Get the wallet's signer address.
 * @returns {string}
 */
export function getAddress() {
  if (!wallet) throw new Error('Wallet not initialised.');
  return wallet.address;
}

export default {
  getWallet,
  getProvider,
  getBalance,
  getGasPrice,
  sendTransaction,
  deployContract,
  getContract,
  getAddress,
};