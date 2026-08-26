const { ethers } = require("ethers");
const { getBlockchainConfig } = require("../../config/ethers");
const { AppError, BadRequestError, NotFoundError } = require("../../utils/errors");

class BlockchainService {
  constructor() {
    this._contractInstance = null;
  }

  /**
   * Returns active Ethers.js contract instance connected to wallet provider.
   */
  getContract() {
    const { wallet, contractAddress, abi } = getBlockchainConfig();

    if (!contractAddress || contractAddress.trim().length === 0) {
      throw new AppError("Smart contract address is not configured in environment.", 500, "CONTRACT_NOT_DEPLOYED");
    }

    if (!abi || !Array.isArray(abi) || abi.length === 0) {
      throw new AppError("FileRegistry Smart contract ABI is not loaded.", 500, "ABI_MISSING");
    }

    try {
      this._contractInstance = new ethers.Contract(contractAddress.trim(), abi, wallet);
      return this._contractInstance;
    } catch (err) {
      throw new AppError(`Failed to instantiate Ethers contract: ${err.message}`, 500, "CONTRACT_INIT_FAILED");
    }
  }

  /**
   * Registers file metadata and SHA-256 hash on the Ethereum blockchain.
   * 
   * @param {string} fileId - Public unique file UUID
   * @param {string} ipfsCid - IPFS Content Identifier
   * @param {string} sha256Hash - 64-character SHA-256 digest of encrypted PDF
   * @param {string} [owner] - Optional registrant identifier
   * @returns {Promise<{ success: boolean, transactionHash: string, blockNumber: number, fileId: string, ipfsCid: string, sha256Hash: string }>}
   */
  async registerFileOnBlockchain(fileId, ipfsCid, sha256Hash, owner = null) {
    // Input Validation
    if (!fileId || typeof fileId !== "string" || fileId.trim().length === 0) {
      throw new BadRequestError("Valid fileId is required for blockchain registration.");
    }

    if (!ipfsCid || typeof ipfsCid !== "string" || ipfsCid.trim().length === 0) {
      throw new BadRequestError("Valid ipfsCid is required for blockchain registration.");
    }

    if (!sha256Hash || typeof sha256Hash !== "string" || sha256Hash.trim().length !== 64) {
      throw new BadRequestError("Valid 64-character hex SHA-256 digest is required for blockchain registration.");
    }

    const cleanFileId = fileId.trim();
    const cleanIpfsCid = ipfsCid.trim();
    const cleanSha256Hash = sha256Hash.trim();

    try {
      const contract = this.getContract();

      // Invoke registerFile smart contract function
      const tx = await contract.registerFile(cleanFileId, cleanIpfsCid, cleanSha256Hash);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        fileId: cleanFileId,
        ipfsCid: cleanIpfsCid,
        sha256Hash: cleanSha256Hash
      };
    } catch (error) {
      console.error(`❌ Blockchain registration failed for fileId [${cleanFileId}]:`, error.message);

      // Node connection errors
      if (error.code === "ECONNREFUSED" || (error.message && error.message.includes("could not detect network"))) {
        throw new AppError("Blockchain RPC network node is unavailable at configured URL.", 503, "BLOCKCHAIN_UNAVAILABLE");
      }

      // Reverted transaction handling (e.g. duplicate fileId)
      if (error.message && (error.message.includes("Duplicate file") || error.message.includes("already registered"))) {
        throw new AppError("Duplicate registration: File ID is already registered on blockchain.", 409, "DUPLICATE_BLOCKCHAIN_RECORD");
      }

      if (error.message && error.message.includes("execution reverted")) {
        const revertReason = error.reason || error.message;
        throw new AppError(`Blockchain transaction reverted: ${revertReason}`, 400, "BLOCKCHAIN_TX_REVERTED");
      }

      throw new AppError(`Blockchain transaction failed: ${error.message}`, error.statusCode || 502, "BLOCKCHAIN_TX_FAILED");
    }
  }

  /**
   * Retrieves an on-chain file record.
   * 
   * @param {string} fileId - Public unique file UUID
   * @returns {Promise<{ fileId: string, ipfsCid: string, sha256Hash: string, owner: string, timestamp: number, exists: boolean }>}
   */
  async getFileFromBlockchain(fileId) {
    if (!fileId || typeof fileId !== "string" || fileId.trim().length === 0) {
      throw new BadRequestError("Valid fileId is required for blockchain lookup.");
    }

    const cleanFileId = fileId.trim();

    try {
      const contract = this.getContract();
      const record = await contract.getFile(cleanFileId);

      return {
        fileId: cleanFileId,
        ipfsCid: record[0],
        sha256Hash: record[1],
        owner: record[2],
        timestamp: Number(record[3]),
        exists: record[4]
      };
    } catch (error) {
      console.error(`❌ Blockchain lookup failed for fileId [${cleanFileId}]:`, error.message);

      if (error.message && (error.message.includes("does not exist") || error.message.includes("record not found"))) {
        throw new NotFoundError(`File record [${cleanFileId}] not found on blockchain.`);
      }

      if (error.code === "ECONNREFUSED" || (error.message && error.message.includes("could not detect network"))) {
        throw new AppError("Blockchain RPC network node is unavailable.", 503, "BLOCKCHAIN_UNAVAILABLE");
      }

      throw new AppError(`Blockchain lookup query failed: ${error.message}`, 502, "BLOCKCHAIN_QUERY_FAILED");
    }
  }

  /**
   * Verifies downloaded file payload SHA-256 hash against the canonical on-chain hash.
   * PRE-DECRYPTION INTEGRITY VERIFICATION STEP!
   * 
   * @param {string} fileId - Public unique file UUID
   * @param {string} downloadedFileSha256 - Newly computed SHA-256 digest of downloaded IPFS payload
   * @returns {Promise<{ isVerified: boolean, fileId: string, downloadedHash: string, blockchainHash: string, matches: boolean, verifiedAt: string }>}
   */
  async verifyFileHash(fileId, downloadedFileSha256) {
    if (!fileId || typeof fileId !== "string" || fileId.trim().length === 0) {
      throw new BadRequestError("Valid fileId is required for verification.");
    }

    if (!downloadedFileSha256 || typeof downloadedFileSha256 !== "string" || downloadedFileSha256.trim().length !== 64) {
      throw new BadRequestError("Valid 64-character SHA-256 hash is required for verification.");
    }

    const cleanFileId = fileId.trim();
    const cleanDownloadedHash = downloadedFileSha256.trim().toLowerCase();

    try {
      const contract = this.getContract();
      const res = await contract.verifyFile(cleanFileId, cleanDownloadedHash);

      const isMatch = res[0] === true;
      const canonicalHash = res[1];

      return {
        isVerified: isMatch,
        matches: isMatch,
        fileId: cleanFileId,
        downloadedHash: cleanDownloadedHash,
        blockchainHash: canonicalHash,
        verifiedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ On-chain hash verification failed for fileId [${cleanFileId}]:`, error.message);

      if (error instanceof AppError) throw error;
      if (error.message && error.message.includes("does not exist")) {
        throw new NotFoundError(`Cannot verify hash: File record [${cleanFileId}] does not exist on blockchain.`);
      }

      throw new AppError(`Blockchain verification query failed: ${error.message}`, 502, "BLOCKCHAIN_VERIFY_FAILED");
    }
  }

  // Aliases for backwards compatibility
  async registerFileOnChain(fileId, ipfsCid, sha256Hash) {
    return this.registerFileOnBlockchain(fileId, ipfsCid, sha256Hash);
  }

  async getOnChainFile(fileId) {
    return this.getFileFromBlockchain(fileId);
  }

  async verifyOnChainHash(fileId, candidateHash) {
    return this.verifyFileHash(fileId, candidateHash);
  }
}

module.exports = new BlockchainService();
