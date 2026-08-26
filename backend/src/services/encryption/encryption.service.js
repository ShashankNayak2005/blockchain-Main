const crypto = require("crypto");

class EncryptionService {
  /**
   * Validates and retrieves the Server Master Key from process.env.
   * Supports SERVER_MASTER_KEY and fallback MASTER_ENCRYPTION_KEY.
   * @param {string} [overrideMasterKeyHex] - Optional key parameter for testing invalid master key scenarios.
   * @returns {Buffer} 32-byte Master Key Buffer
   */
  getMasterKey(overrideMasterKeyHex = null) {
    const keyHex = overrideMasterKeyHex || process.env.SERVER_MASTER_KEY || process.env.MASTER_ENCRYPTION_KEY;

    if (!keyHex) {
      throw new Error("CRITICAL SECURITY ERROR: SERVER_MASTER_KEY environment variable is not configured.");
    }

    const cleanHex = keyHex.trim();

    if (cleanHex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(cleanHex)) {
      throw new Error("CRITICAL SECURITY ERROR: SERVER_MASTER_KEY must be a valid 64-character hex string (256 bits / 32 bytes).");
    }

    return Buffer.from(cleanHex, "hex");
  }

  /**
   * Generates a cryptographically secure random 256-bit (32-byte) AES key.
   * @returns {Buffer} 32-byte random Buffer
   */
  generateFileKey() {
    return crypto.randomBytes(32);
  }

  /**
   * Encrypts a PDF or binary buffer using AES-256-GCM.
   * @param {Buffer} dataBuffer - Plaintext file data
   * @param {Buffer} fileKey - 32-byte AES file key
   * @returns {{ encryptedBuffer: Buffer, iv: string, authTag: string }}
   */
  encryptFile(dataBuffer, fileKey) {
    if (!Buffer.isBuffer(dataBuffer)) {
      dataBuffer = Buffer.from(dataBuffer);
    }

    if (!Buffer.isBuffer(fileKey) || fileKey.length !== 32) {
      throw new Error("Invalid file key: Must be a 32-byte Buffer.");
    }

    // Recommended IV length for AES-GCM is 96 bits (12 bytes)
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", fileKey, iv);

    const encryptedBuffer = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encryptedBuffer,
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex")
    };
  }

  /**
   * Decrypts an AES-256-GCM encrypted file buffer.
   * @param {Buffer} encryptedBuffer - Ciphertext data
   * @param {Buffer} fileKey - 32-byte AES file key
   * @param {string|Buffer} iv - 12-byte IV (hex string or Buffer)
   * @param {string|Buffer} authTag - 16-byte GCM Authentication Tag (hex string or Buffer)
   * @returns {Buffer} Decrypted plaintext Buffer
   */
  decryptFile(encryptedBuffer, fileKey, iv, authTag) {
    if (!Buffer.isBuffer(encryptedBuffer)) {
      encryptedBuffer = Buffer.from(encryptedBuffer);
    }

    if (!Buffer.isBuffer(fileKey) || fileKey.length !== 32) {
      throw new Error("Invalid file key: Must be a 32-byte Buffer.");
    }

    const ivBuffer = Buffer.isBuffer(iv) ? iv : Buffer.from(iv, "hex");
    const tagBuffer = Buffer.isBuffer(authTag) ? authTag : Buffer.from(authTag, "hex");

    if (ivBuffer.length !== 12) {
      throw new Error("Invalid IV length: AES-256-GCM requires a 12-byte IV.");
    }

    if (tagBuffer.length !== 16) {
      throw new Error("Invalid authentication tag length: AES-256-GCM requires a 16-byte Auth Tag.");
    }

    const decipher = crypto.createDecipheriv("aes-256-gcm", fileKey, ivBuffer);
    decipher.setAuthTag(tagBuffer);

    return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  }

  /**
   * Wraps (encrypts) a per-file AES key using the Server Master Key (Envelope Encryption).
   * @param {Buffer} fileKey - 32-byte raw AES file key
   * @param {string} [overrideMasterKeyHex] - Optional override for testing
   * @returns {{ encryptedAesKey: string, keyIv: string, keyAuthTag: string }}
   */
  wrapFileKey(fileKey, overrideMasterKeyHex = null) {
    if (!Buffer.isBuffer(fileKey) || fileKey.length !== 32) {
      throw new Error("Invalid file key: Must be a 32-byte Buffer.");
    }

    const masterKey = this.getMasterKey(overrideMasterKeyHex);
    const keyIv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv("aes-256-gcm", masterKey, keyIv);
    const wrappedBuffer = Buffer.concat([cipher.update(fileKey), cipher.final()]);
    const keyAuthTag = cipher.getAuthTag();

    return {
      encryptedAesKey: wrappedBuffer.toString("hex"),
      keyIv: keyIv.toString("hex"),
      keyAuthTag: keyAuthTag.toString("hex")
    };
  }

  /**
   * Unwraps (decrypts) a protected per-file AES key using the Server Master Key.
   * @param {string} encryptedAesKeyHex - Hex string of wrapped key cipher
   * @param {string} keyIvHex - Hex string of key wrapping IV
   * @param {string} keyAuthTagHex - Hex string of key wrapping Auth Tag
   * @param {string} [overrideMasterKeyHex] - Optional override for testing
   * @returns {Buffer} 32-byte raw AES file key Buffer
   */
  unwrapFileKey(encryptedAesKeyHex, keyIvHex, keyAuthTagHex, overrideMasterKeyHex = null) {
    const masterKey = this.getMasterKey(overrideMasterKeyHex);

    const wrappedBuffer = Buffer.from(encryptedAesKeyHex, "hex");
    const keyIv = Buffer.from(keyIvHex, "hex");
    const keyAuthTag = Buffer.from(keyAuthTagHex, "hex");

    if (keyIv.length !== 12) {
      throw new Error("Invalid key wrapping IV: Must be a 12-byte hex string.");
    }

    if (keyAuthTag.length !== 16) {
      throw new Error("Invalid key wrapping Auth Tag: Must be a 16-byte hex string.");
    }

    const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, keyIv);
    decipher.setAuthTag(keyAuthTag);

    return Buffer.concat([decipher.update(wrappedBuffer), decipher.final()]);
  }
}

module.exports = new EncryptionService();
