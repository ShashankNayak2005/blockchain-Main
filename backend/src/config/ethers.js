const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

/**
 * Initializes and exports Ethers.js provider, wallet, and contract instance configuration.
 */
function getBlockchainConfig() {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || process.env.HARDHAT_RPC_URL || "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Default pre-funded Hardhat Account #0 private key
  const privateKey =
    process.env.BLOCKCHAIN_PRIVATE_KEY ||
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  // Ensure private key starts with 0x
  const formattedPrivateKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const wallet = new ethers.Wallet(formattedPrivateKey, provider);

  // Resolve contract address
  let contractAddress = process.env.CONTRACT_ADDRESS;
  const deploymentJsonPath = path.resolve(__dirname, "./contract-deployment.json");

  if ((!contractAddress || contractAddress.startsWith("0x5FbDB")) && fs.existsSync(deploymentJsonPath)) {
    try {
      const deployData = JSON.parse(fs.readFileSync(deploymentJsonPath, "utf-8"));
      if (deployData.address) {
        contractAddress = deployData.address;
      }
    } catch (e) {
      // Ignore read errors
    }
  }

  // Resolve contract ABI
  let abi = [];
  const abiJsonPath = path.resolve(__dirname, "./FileRegistryABI.json");
  if (fs.existsSync(abiJsonPath)) {
    try {
      abi = JSON.parse(fs.readFileSync(abiJsonPath, "utf-8"));
    } catch (e) {
      // Ignore read errors
    }
  }

  return {
    provider,
    wallet,
    contractAddress,
    abi,
    rpcUrl
  };
}

module.exports = {
  getBlockchainConfig
};
