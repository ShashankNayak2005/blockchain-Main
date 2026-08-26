const blockchainService = require("../src/services/blockchain/blockchain.service");
const { getBlockchainConfig } = require("../src/config/ethers");
const { ethers } = require("ethers");

describe("Blockchain Service Unit & Integration Tests", () => {
  const mockFileId = `file_test_bc_${Date.now()}`;
  const mockIpfsCid = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";
  const mockSha256Hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  const tamperedSha256Hash = "a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e";

  beforeAll(() => {
    process.env.CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    process.env.BLOCKCHAIN_RPC_URL = process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";
  });

  describe("1. Configuration & Input Validation", () => {
    it("Should correctly load Ethers configuration and contract deployment artifacts", () => {
      const config = getBlockchainConfig();

      expect(config.provider).toBeDefined();
      expect(config.wallet).toBeDefined();
      expect(config.contractAddress).toBeDefined();
      expect(Array.isArray(config.abi)).toBe(true);
      expect(config.abi.length).toBeGreaterThan(0);
    });

    it("Should validate fileId, ipfsCid, and sha256Hash format before chain invocation", async () => {
      await expect(
        blockchainService.registerFileOnBlockchain("", mockIpfsCid, mockSha256Hash)
      ).rejects.toThrow("Valid fileId is required");

      await expect(
        blockchainService.registerFileOnBlockchain(mockFileId, "", mockSha256Hash)
      ).rejects.toThrow("Valid ipfsCid is required");

      await expect(
        blockchainService.registerFileOnBlockchain(mockFileId, mockIpfsCid, "invalid_short_hash")
      ).rejects.toThrow("SHA-256 digest is required");
    });

    it("Should validate inputs for getFileFromBlockchain and verifyFileHash", async () => {
      await expect(blockchainService.getFileFromBlockchain("")).rejects.toThrow("Valid fileId is required");
      await expect(blockchainService.verifyFileHash("file_1", "")).rejects.toThrow("SHA-256 hash is required");
    });

    it("SECURITY CHECK: BLOCKCHAIN_PRIVATE_KEY must never be logged or returned in DTOs", () => {
      const config = getBlockchainConfig();
      const stringifiedConfig = JSON.stringify(config);

      expect(stringifiedConfig.includes(process.env.BLOCKCHAIN_PRIVATE_KEY)).toBe(false);
    });
  });

  describe("2. Live / Hardhat Blockchain Integration Tests", () => {
    let isHardhatNodeRunning = false;

    beforeAll(async () => {
      try {
        const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
        await provider.getNetwork();
        isHardhatNodeRunning = true;
      } catch (err) {
        isHardhatNodeRunning = false;
      }
    });

    it("Should execute end-to-end register, getFile, and verifyHash on Hardhat EVM node", async () => {
      if (!isHardhatNodeRunning) {
        console.warn("⚠️ Hardhat node not running at 127.0.0.1:8545. Skipping live transaction test.");
        return;
      }

      // Step A: Register file on blockchain
      const regResult = await blockchainService.registerFileOnBlockchain(
        mockFileId,
        mockIpfsCid,
        mockSha256Hash
      );

      expect(regResult.success).toBe(true);
      expect(regResult.transactionHash).toBeDefined();
      expect(regResult.transactionHash.startsWith("0x")).toBe(true);

      // Step B: Fetch record from blockchain
      const record = await blockchainService.getFileFromBlockchain(mockFileId);
      expect(record.fileId).toBe(mockFileId);
      expect(record.ipfsCid).toBe(mockIpfsCid);
      expect(record.sha256Hash).toBe(mockSha256Hash);
      expect(record.exists).toBe(true);

      // Step C: Verify matching hash (Pre-decryption Integrity Verification)
      const verification = await blockchainService.verifyFileHash(mockFileId, mockSha256Hash);
      expect(verification.isVerified).toBe(true);
      expect(verification.matches).toBe(true);
      expect(verification.blockchainHash).toBe(mockSha256Hash);

      // Step D: Verify tampered hash failure
      const tamperedVerification = await blockchainService.verifyFileHash(mockFileId, tamperedSha256Hash);
      expect(tamperedVerification.isVerified).toBe(false);
      expect(tamperedVerification.matches).toBe(false);

      // Step E: Reject duplicate registration
      await expect(
        blockchainService.registerFileOnBlockchain(mockFileId, mockIpfsCid, mockSha256Hash)
      ).rejects.toThrow("Duplicate registration");
    });
  });
});
