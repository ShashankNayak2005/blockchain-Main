const request = require("supertest");
const app = require("../src/app");
const { prisma, connectDB, disconnectDB } = require("../src/config/database");
const ipfsService = require("../src/services/ipfs/ipfs.service");
const blockchainService = require("../src/services/blockchain/blockchain.service");
const encryptionService = require("../src/services/encryption/encryption.service");
const hashService = require("../src/services/hashing/hash.service");

describe("Complete PDF Download Pipeline & Tamper Verification Integration Tests", () => {
  let ownerToken = "";
  let ownerId = "";
  let unauthorizedToken = "";
  let unauthorizedId = "";
  let sampleFileRecord = null;

  const samplePdfBuffer = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kinds [ /Page ] /Count 1 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
  );

  beforeAll(async () => {
    await connectDB();

    // Register Owner User
    const ownerRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Dr. Download Owner",
        email: `download_owner_${Date.now()}@university.edu`,
        password: "OwnerPassword123!"
      });
    ownerToken = ownerRes.body.data.token;
    ownerId = ownerRes.body.data.user.id;

    // Register Unauthorized User
    const unauthRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Unauthorized Viewer",
        email: `unauth_${Date.now()}@university.edu`,
        password: "UnauthPassword123!"
      });
    unauthorizedToken = unauthRes.body.data.token;
    unauthorizedId = unauthRes.body.data.user.id;

    // Upload sample file using pipeline services
    const fileKey = encryptionService.generateFileKey();
    const { encryptedBuffer, iv: fileIv, authTag: fileAuthTag } = encryptionService.encryptFile(samplePdfBuffer, fileKey);
    const sha256Hash = hashService.calculateSHA256(encryptedBuffer);
    const { encryptedAesKey, keyIv, keyAuthTag } = encryptionService.wrapFileKey(fileKey);

    const fileId = `file_dl_${Date.now()}`;
    const ipfsCid = `QmDlTestCid_${Date.now()}`;

    sampleFileRecord = await prisma.file.create({
      data: {
        fileId,
        originalFileName: "Confidential_Research.pdf",
        mimeType: "application/pdf",
        fileSize: BigInt(encryptedBuffer.length),
        ownerId,
        ipfsCid,
        sha256Hash,
        encryptedAesKey,
        iv: fileIv,
        authTag: fileAuthTag,
        keyIv,
        keyAuthTag,
        blockchainTxHash: "0x1234567890abcdef"
      }
    });

    // Mock Blockchain & IPFS for default test state
    jest.spyOn(blockchainService, "getOnChainFile").mockResolvedValue({
      ipfsCid,
      sha256Hash,
      owner: ownerId,
      timestamp: Math.floor(Date.now() / 1000),
      exists: true
    });

    jest.spyOn(ipfsService, "downloadEncryptedFile").mockResolvedValue(encryptedBuffer);
  });

  afterAll(async () => {
    if (ownerId || unauthorizedId) {
      await prisma.fileAccess.deleteMany();
      await prisma.file.deleteMany({ where: { ownerId } });
      await prisma.user.deleteMany({ where: { id: { in: [ownerId, unauthorizedId] } } });
    }
    await disconnectDB();
  });

  it("1. Successful download: Owner requests download -> Hashes match on-chain -> Decrypted PDF returned matching original byte-for-byte", async () => {
    const res = await request(app)
      .get(`/api/files/${sampleFileRecord.fileId}/download`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["content-disposition"]).toContain("Confidential_Research.pdf");
    expect(res.headers["x-integrity-status"]).toBe("VERIFIED_ON_BLOCKCHAIN");
    expect(res.body.equals(samplePdfBuffer)).toBe(true);
  });

  it("2. Unauthorized download: Unrelated user attempting download without ACL grant must be rejected with 403 Forbidden", async () => {
    const res = await request(app)
      .get(`/api/files/${sampleFileRecord.fileId}/download`)
      .set("Authorization", `Bearer ${unauthorizedToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("3. Non-existent file: Requesting download for non-existent file ID must return 404 Not Found", async () => {
    const res = await request(app)
      .get("/api/files/non_existent_file_id_999/download")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("4. IPFS failure: Handle IPFS fetch failure gracefully (502 Bad Gateway)", async () => {
    jest.spyOn(ipfsService, "downloadEncryptedFile").mockRejectedValueOnce(new Error("IPFS Gateway timeout"));

    const res = await request(app)
      .get(`/api/files/${sampleFileRecord.fileId}/download`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.statusCode).toBe(502);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("IPFS_DOWNLOAD_FAILED");
  });

  it("5. Blockchain failure: Handle missing or failed blockchain record lookup gracefully (404 / 502)", async () => {
    jest.spyOn(blockchainService, "getOnChainFile").mockResolvedValueOnce({
      ipfsCid: "",
      sha256Hash: "",
      owner: "",
      timestamp: 0,
      exists: false
    });

    const res = await request(app)
      .get(`/api/files/${sampleFileRecord.fileId}/download`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain("missing on blockchain");
  });

  it("6. Hash match: Verified canonical hash proceeds to key unwrapping and decryption", async () => {
    const res = await request(app)
      .get(`/api/files/${sampleFileRecord.fileId}/download`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.headers["x-integrity-status"]).toBe("VERIFIED_ON_BLOCKCHAIN");
  });

  it("7. MANDATORY TEST: Hash mismatch MUST reject download with 409 Conflict and NEVER decrypt AES key", async () => {
    const tamperedHash = "a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e";
    const unwrapSpy = jest.spyOn(encryptionService, "unwrapFileKey");

    // Mock blockchain returning tampered hash
    jest.spyOn(blockchainService, "getOnChainFile").mockResolvedValueOnce({
      ipfsCid: sampleFileRecord.ipfsCid,
      sha256Hash: tamperedHash,
      owner: ownerId,
      timestamp: Math.floor(Date.now() / 1000),
      exists: true
    });

    const res = await request(app)
      .get(`/api/files/${sampleFileRecord.fileId}/download`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe("File integrity verification failed. The file may have been modified or corrupted.");

    // SECURITY VERIFICATION: KEY UNWRAPPING MUST NOT HAVE BEEN CALLED
    expect(unwrapSpy).not.toHaveBeenCalled();
  });

  it("8. Modified encrypted file: Altering 1 byte of encrypted payload on IPFS triggers hash mismatch & blocks download", async () => {
    const fileKey = encryptionService.generateFileKey();
    const { encryptedBuffer } = encryptionService.encryptFile(samplePdfBuffer, fileKey);

    // Tamper 1 byte of IPFS payload
    const tamperedPayload = Buffer.from(encryptedBuffer);
    tamperedPayload[0] = tamperedPayload[0] ^ 0xff;

    jest.spyOn(ipfsService, "downloadEncryptedFile").mockResolvedValueOnce(tamperedPayload);

    const res = await request(app)
      .get(`/api/files/${sampleFileRecord.fileId}/download`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain("File integrity verification failed");
  });

  it("9. Incorrect AES key / Wrapped key corruption: Corrupting wrapped AES key in DB results in unwrapping failure", async () => {
    const corruptFile = await prisma.file.create({
      data: {
        fileId: `file_corrupt_key_${Date.now()}`,
        originalFileName: "Corrupt_Key.pdf",
        fileSize: BigInt(samplePdfBuffer.length),
        ownerId,
        ipfsCid: sampleFileRecord.ipfsCid,
        sha256Hash: sampleFileRecord.sha256Hash,
        encryptedAesKey: "bad_wrapped_key_hex",
        iv: sampleFileRecord.iv,
        authTag: sampleFileRecord.authTag,
        keyIv: sampleFileRecord.keyIv,
        keyAuthTag: sampleFileRecord.keyAuthTag,
        blockchainTxHash: "0x1234"
      }
    });

    jest.spyOn(blockchainService, "getOnChainFile").mockResolvedValueOnce({
      ipfsCid: sampleFileRecord.ipfsCid,
      sha256Hash: sampleFileRecord.sha256Hash,
      owner: ownerId,
      timestamp: Math.floor(Date.now() / 1000),
      exists: true
    });

    const res = await request(app)
      .get(`/api/files/${corruptFile.fileId}/download`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);

    await prisma.file.delete({ where: { id: corruptFile.id } });
  });

  it("10. Modified authentication tag: Corrupting payload authTag results in GCM decryption failure (400 Bad Request)", async () => {
    const corruptTagFile = await prisma.file.create({
      data: {
        fileId: `file_corrupt_tag_${Date.now()}`,
        originalFileName: "Corrupt_Tag.pdf",
        fileSize: BigInt(samplePdfBuffer.length),
        ownerId,
        ipfsCid: sampleFileRecord.ipfsCid,
        sha256Hash: sampleFileRecord.sha256Hash,
        encryptedAesKey: sampleFileRecord.encryptedAesKey,
        iv: sampleFileRecord.iv,
        authTag: "abcdef1234567890abcdef1234567890", // Corrupt auth tag
        keyIv: sampleFileRecord.keyIv,
        keyAuthTag: sampleFileRecord.keyAuthTag,
        blockchainTxHash: "0x1234"
      }
    });

    jest.spyOn(blockchainService, "getOnChainFile").mockResolvedValueOnce({
      ipfsCid: sampleFileRecord.ipfsCid,
      sha256Hash: sampleFileRecord.sha256Hash,
      owner: ownerId,
      timestamp: Math.floor(Date.now() / 1000),
      exists: true
    });

    const res = await request(app)
      .get(`/api/files/${corruptTagFile.fileId}/download`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("DECRYPTION_FAILED");

    await prisma.file.delete({ where: { id: corruptTagFile.id } });
  });
});
