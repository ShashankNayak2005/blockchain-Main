const crypto = require("crypto");

class HashService {
  /**
   * Computes a cryptographic SHA-256 hash from a binary Buffer or string.
   * IMPORTANT ARCHITECTURAL REQUIREMENT:
   * The hash MUST be calculated from the FINAL ENCRYPTED PDF bytes uploaded to IPFS.
   * 
   * @param {Buffer|string} buffer - The final encrypted payload binary buffer
   * @returns {string} 64-character hexadecimal SHA-256 digest string
   */
  calculateSHA256(buffer) {
    if (!buffer) {
      throw new Error("Invalid input: Buffer or binary data is required to calculate SHA-256 hash.");
    }

    if (!Buffer.isBuffer(buffer)) {
      buffer = Buffer.from(buffer);
    }

    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  /**
   * Alias for calculateSHA256 for consistent service interface.
   * @param {Buffer|string} buffer 
   * @returns {string} 64-character hexadecimal string
   */
  calculateHash(buffer) {
    return this.calculateSHA256(buffer);
  }
}

module.exports = new HashService();
