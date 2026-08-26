const request = require("supertest");
const app = require("../src/app");
const { prisma, connectDB, disconnectDB } = require("../src/config/database");
const ipfsService = require("../src/services/ipfs/ipfs.service");
const blockchainService = require("../src/services/blockchain/blockchain.service");
const encryptionService = require("../src/services/encryption/encryption.service");
const hashService = require("../src/services/hashing/hash.service");

describe("File Management API Endpoints Integration Tests", () => {
  let ownerToken = "";
  let ownerId = "";
  let nonOwnerToken = "";
  let nonOwnerId = "";
  let testFileRecord = null;

  const samplePdfBuffer = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
  );

  beforeAll(async () => {
    await connectDB();

    // Register Owner User
    const ownerRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Dr. File Manager",
        email: `file_mgr_owner_${Date.now()}@university.edu`,
        password: "OwnerPassword123!"
      });
    ownerToken = ownerRes.body.data.token;
    ownerId = ownerRes.body.data.user.id;

    // Register Non-Owner User
    const nonOwnerRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Other Student",
        email: `non_owner_${Date.now()}@university.edu`,
        password: "NonOwnerPassword123!"
      });
    nonOwnerToken = nonOwnerRes.body.data.token;
    nonOwnerId = nonOwnerRes.body.data.user.id;

    // Create sample file record in DB
    const fileKey = encryptionService.generateFileKey();
    const { encryptedBuffer, iv: fileIv, authTag: fileAuthTag } = encryptionService.encryptFile(samplePdfBuffer, fileKey);
    const sha256Hash = hashService.calculateSHA256(encryptedBuffer);
    const { encryptedAesKey, keyIv, keyAuthTag } = encryptionService.wrapFileKey(fileKey);

    const fileId = `file_mgr_${Date.now()}`;
    const ipfsCid = `QmFileMgrCid_${Date.now()}`;

    testFileRecord = await prisma.file.create({
      data: {
        fileId,
        originalFileName: "Academic_Journal_2026.pdf",
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
        blockchainTxHash: "0xabcdef1234567890"
      }
    });

    // Mock IPFS & Blockchain
    jest.spyOn(blockchainService, "getOnChainFile").mockResolvedValue({
      ipfsCid,
      sha256Hash,
      owner: ownerId,
      timestamp: Math.floor(Date.now() / 1000),
      exists: true
    });

    jest.spyOn(ipfsService, "downloadEncryptedFile").mockResolvedValue(encryptedBuffer);
    jest.spyOn(ipfsService, "unpinFile").mockResolvedValue(true);
  });

  afterAll(async () => {
    if (ownerId || nonOwnerId) {
      await prisma.fileAccess.deleteMany();
      await prisma.file.deleteMany({ where: { ownerId } });
      await prisma.user.deleteMany({ where: { id: { in: [ownerId, nonOwnerId] } } });
    }
    await disconnectDB();
  });

  describe("1. GET /api/files (List Files with Pagination)", () => {
    it("Should return paginated files accessible to authenticated user", async () => {
      const res = await request(app)
        .get("/api/files?page=1&limit=5")
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(5);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it("Should filter files by search query parameter", async () => {
      const res = await request(app)
        .get("/api/files?search=Academic")
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].originalFileName).toContain("Academic");
    });
  });

  describe("2. GET /api/files/:fileId (Get File Metadata)", () => {
    it("Should return safe file metadata for authorized owner", async () => {
      const res = await request(app)
        .get(`/api/files/${testFileRecord.fileId}`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.fileId).toBe(testFileRecord.fileId);
      expect(data.originalFileName).toBe("Academic_Journal_2026.pdf");
      expect(data.ipfsCid).toBe(testFileRecord.ipfsCid);
      expect(data.sha256Hash).toBe(testFileRecord.sha256Hash);

      // SECURITY CHECK: SENSITIVE KEYS MUST NOT BE EXPOSED
      expect(data.encryptedAesKey).toBeUndefined();
      expect(data.keyIv).toBeUndefined();
      expect(data.keyAuthTag).toBeUndefined();
      expect(data.iv).toBeUndefined();
      expect(data.authTag).toBeUndefined();
    });

    it("Should reject metadata request for unauthorized user (403 Forbidden)", async () => {
      const res = await request(app)
        .get(`/api/files/${testFileRecord.fileId}`)
        .set("Authorization", `Bearer ${nonOwnerToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe("3. GET /api/files/:fileId/verify (On-Demand On-Chain Verification)", () => {
    it("Should verify current IPFS payload against blockchain hash WITHOUT decrypting", async () => {
      const res = await request(app)
        .get(`/api/files/${testFileRecord.fileId}/verify`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.fileId).toBe(testFileRecord.fileId);
      expect(data.ipfsCid).toBe(testFileRecord.ipfsCid);
      expect(data.blockchainHash).toBe(testFileRecord.sha256Hash.toLowerCase());
      expect(data.currentFileHash).toBe(testFileRecord.sha256Hash.toLowerCase());
      expect(data.verified).toBe(true);
      expect(data.verificationTimestamp).toBeDefined();

      // SECURITY CHECK: NO KEYS EXPOSED
      expect(data.encryptedAesKey).toBeUndefined();
    });
  });

  describe("4. DELETE /api/files/:fileId (Delete File)", () => {
    it("Should reject file deletion attempt by non-owner user (403 Forbidden)", async () => {
      const res = await request(app)
        .delete(`/api/files/${testFileRecord.fileId}`)
        .set("Authorization", `Bearer ${nonOwnerToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("Should allow file owner to delete file and unpin from IPFS", async () => {
      const res = await request(app)
        .delete(`/api/files/${testFileRecord.fileId}`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("File deleted successfully");

      // Verify deletion from DB
      const deleted = await prisma.file.findUnique({
        where: { id: testFileRecord.id }
      });
      expect(deleted).toBeNull();
    });
  });
});
