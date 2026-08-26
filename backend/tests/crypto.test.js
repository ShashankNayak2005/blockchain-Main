const crypto = require("crypto");
const encryptionService = require("../src/services/encryption/encryption.service");

describe("AES-256-GCM Envelope Encryption & Key Wrapping Service Tests", () => {
  const samplePdfBuffer = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kinds [ /Page ] /Count 1 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
  );

  const validMasterKeyHex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const wrongMasterKeyHex = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

  beforeAll(() => {
    process.env.SERVER_MASTER_KEY = validMasterKeyHex;
  });

  it("1. Should generate cryptographically secure unique 32-byte AES keys", () => {
    const key1 = encryptionService.generateFileKey();
    const key2 = encryptionService.generateFileKey();

    expect(Buffer.isBuffer(key1)).toBe(true);
    expect(key1.length).toBe(32);
    expect(Buffer.isBuffer(key2)).toBe(true);
    expect(key2.length).toBe(32);
    expect(key1.equals(key2)).toBe(false); // Must be unique!
  });

  it("2. Should encrypt PDF data and return ciphertext, IV (12-byte hex), and AuthTag (16-byte hex)", () => {
    const fileKey = encryptionService.generateFileKey();
    const result = encryptionService.encryptFile(samplePdfBuffer, fileKey);

    expect(result.encryptedBuffer).toBeDefined();
    expect(Buffer.isBuffer(result.encryptedBuffer)).toBe(true);
    expect(result.encryptedBuffer.length).toBeGreaterThan(0);

    expect(result.iv).toBeDefined();
    expect(result.iv.length).toBe(24); // 12 bytes = 24 hex characters

    expect(result.authTag).toBeDefined();
    expect(result.authTag.length).toBe(32); // 16 bytes = 32 hex characters
  });

  it("3. Should decrypt encrypted PDF data successfully", () => {
    const fileKey = encryptionService.generateFileKey();
    const { encryptedBuffer, iv, authTag } = encryptionService.encryptFile(samplePdfBuffer, fileKey);

    const decrypted = encryptionService.decryptFile(encryptedBuffer, fileKey, iv, authTag);
    expect(Buffer.isBuffer(decrypted)).toBe(true);
  });

  it("4. Decrypted data must equal the original plaintext PDF data byte-for-byte", () => {
    const fileKey = encryptionService.generateFileKey();
    const { encryptedBuffer, iv, authTag } = encryptionService.encryptFile(samplePdfBuffer, fileKey);

    const decrypted = encryptionService.decryptFile(encryptedBuffer, fileKey, iv, authTag);
    expect(decrypted.equals(samplePdfBuffer)).toBe(true);
    expect(decrypted.toString()).toBe(samplePdfBuffer.toString());
  });

  it("5. Decryption with an incorrect AES key must fail and throw an authentication error", () => {
    const correctFileKey = encryptionService.generateFileKey();
    const wrongFileKey = encryptionService.generateFileKey();

    const { encryptedBuffer, iv, authTag } = encryptionService.encryptFile(samplePdfBuffer, correctFileKey);

    expect(() => {
      encryptionService.decryptFile(encryptedBuffer, wrongFileKey, iv, authTag);
    }).toThrow();
  });

  it("6. Decryption with modified ciphertext must fail GCM authentication tag validation", () => {
    const fileKey = encryptionService.generateFileKey();
    const { encryptedBuffer, iv, authTag } = encryptionService.encryptFile(samplePdfBuffer, fileKey);

    // Tamper with 1 byte of the ciphertext
    const tamperedBuffer = Buffer.from(encryptedBuffer);
    tamperedBuffer[0] = tamperedBuffer[0] ^ 0xff;

    expect(() => {
      encryptionService.decryptFile(tamperedBuffer, fileKey, iv, authTag);
    }).toThrow();
  });

  it("7. Decryption with a modified authentication tag must fail authentication", () => {
    const fileKey = encryptionService.generateFileKey();
    const { encryptedBuffer, iv, authTag } = encryptionService.encryptFile(samplePdfBuffer, fileKey);

    // Tamper with the Auth Tag
    const tagBuffer = Buffer.from(authTag, "hex");
    tagBuffer[0] = tagBuffer[0] ^ 0xff;
    const tamperedAuthTag = tagBuffer.toString("hex");

    expect(() => {
      encryptionService.decryptFile(encryptedBuffer, fileKey, iv, tamperedAuthTag);
    }).toThrow();
  });

  it("8. Wrapped AES key can be successfully unwrapped using the Server Master Key", () => {
    const fileKey = encryptionService.generateFileKey();

    const wrappedResult = encryptionService.wrapFileKey(fileKey);
    expect(wrappedResult.encryptedAesKey).toBeDefined();
    expect(wrappedResult.keyIv).toBeDefined();
    expect(wrappedResult.keyAuthTag).toBeDefined();

    const unwrappedKey = encryptionService.unwrapFileKey(
      wrappedResult.encryptedAesKey,
      wrappedResult.keyIv,
      wrappedResult.keyAuthTag
    );

    expect(Buffer.isBuffer(unwrappedKey)).toBe(true);
    expect(unwrappedKey.equals(fileKey)).toBe(true);
  });

  it("9. Unwrapping a key with an incorrect master key must fail authentication", () => {
    const fileKey = encryptionService.generateFileKey();
    const wrappedResult = encryptionService.wrapFileKey(fileKey, validMasterKeyHex);

    expect(() => {
      encryptionService.unwrapFileKey(
        wrappedResult.encryptedAesKey,
        wrappedResult.keyIv,
        wrappedResult.keyAuthTag,
        wrongMasterKeyHex
      );
    }).toThrow();
  });

  it("10. Master key validation must throw if key is missing or invalid length", () => {
    expect(() => {
      encryptionService.getMasterKey("invalid_short_key");
    }).toThrow("CRITICAL SECURITY ERROR");

    expect(() => {
      encryptionService.getMasterKey("0123456789abcdef"); // < 64 chars
    }).toThrow("CRITICAL SECURITY ERROR");
  });
});
