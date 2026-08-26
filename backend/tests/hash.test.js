const hashService = require("../src/services/hashing/hash.service");
const encryptionService = require("../src/services/encryption/encryption.service");

describe("SHA-256 Hashing Service & Encrypted Payload Integrity Tests", () => {
  const samplePdfBuffer = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kinds [ /Page ] /Count 1 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
  );

  beforeAll(() => {
    process.env.SERVER_MASTER_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  it("1. Same file / payload must produce the exact same SHA-256 hash", () => {
    const hash1 = hashService.calculateSHA256(samplePdfBuffer);
    const hash2 = hashService.calculateSHA256(samplePdfBuffer);

    expect(hash1).toBe(hash2);
  });

  it("2. Different file / payload must produce a different SHA-256 hash", () => {
    const differentPdfBuffer = Buffer.from("%PDF-1.4\nDifferent Content\n%%EOF");

    const hash1 = hashService.calculateSHA256(samplePdfBuffer);
    const hash2 = hashService.calculateSHA256(differentPdfBuffer);

    expect(hash1).not.toBe(hash2);
  });

  it("3. Changing a single byte in the buffer must completely change the hash digest", () => {
    const modifiedBuffer = Buffer.from(samplePdfBuffer);
    modifiedBuffer[0] = modifiedBuffer[0] ^ 0xff; // Flip bits of 1st byte

    const originalHash = hashService.calculateSHA256(samplePdfBuffer);
    const modifiedHash = hashService.calculateSHA256(modifiedBuffer);

    expect(originalHash).not.toBe(modifiedHash);
  });

  it("4. Hash output must be a valid 64-character SHA-256 hexadecimal string", () => {
    const hash = hashService.calculateSHA256(samplePdfBuffer);

    expect(typeof hash).toBe("string");
    expect(hash.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });

  it("5. MUST calculate SHA-256 from the FINAL ENCRYPTED PDF payload for IPFS/Blockchain integrity", () => {
    const fileKey = encryptionService.generateFileKey();
    
    // Step A: Encrypt Plaintext PDF
    const { encryptedBuffer } = encryptionService.encryptFile(samplePdfBuffer, fileKey);

    // Step B: Calculate SHA-256 on Encrypted Binary Payload
    const encryptedHash = hashService.calculateSHA256(encryptedBuffer);
    const plaintextHash = hashService.calculateSHA256(samplePdfBuffer);

    // Encrypted hash MUST NOT equal Plaintext hash
    expect(encryptedHash).not.toBe(plaintextHash);
    expect(/^[0-9a-f]{64}$/.test(encryptedHash)).toBe(true);

    // Step C: Simulated IPFS Fetch -> Recompute SHA-256 on retrieved payload
    const retrievedFromIPFS = Buffer.from(encryptedBuffer); // Identical bytes
    const recomputedHash = hashService.calculateSHA256(retrievedFromIPFS);

    // Hashes MUST match 100%
    expect(recomputedHash).toBe(encryptedHash);
  });

  it("6. Should throw an error if empty input is passed to calculateSHA256", () => {
    expect(() => {
      hashService.calculateSHA256(null);
    }).toThrow("Invalid input");
  });
});
