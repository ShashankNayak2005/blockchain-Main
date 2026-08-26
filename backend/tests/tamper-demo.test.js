const request = require("supertest");
const app = require("../src/app");
const { prisma, connectDB, disconnectDB } = require("../src/config/database");
const ipfsService = require("../src/services/ipfs/ipfs.service");
const blockchainService = require("../src/services/blockchain/blockchain.service");

describe("Complete Blockchain Tamper-Detection Demonstration Automated Test", () => {
  let authToken = "";
  let userId = "";
  let fileRecord = null;

  const samplePdfBuffer = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
  );

  beforeAll(async () => {
    await connectDB();

    // Register User
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Dr. Security Auditor",
        email: `auditor_${Date.now()}@university.edu`,
        password: "AuditPassword123!"
      });

    authToken = regRes.body.data.token;
    userId = regRes.body.data.user.id;
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    if (userId) {
      await prisma.fileAccess.deleteMany();
      await prisma.file.deleteMany({ where: { ownerId: userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await disconnectDB();
  });

  it("Step 1-5: Upload PDF, encrypt AES-256, pin IPFS, generate SHA-256, store on Blockchain", async () => {
    const mockCid = `QmTamperDemoCid_${Date.now()}`;
    const mockTxHash = `0x${Date.now()}99999999`;

    jest.spyOn(ipfsService, "uploadEncryptedFile").mockImplementation(async (buffer) => {
      ipfsService._localBufferCache.set(mockCid, Buffer.from(buffer));
      return mockCid;
    });

    jest.spyOn(blockchainService, "registerFileOnBlockchain").mockImplementation(async (fileId, ipfsCid, sha256Hash, owner) => {
      jest.spyOn(blockchainService, "getOnChainFile").mockResolvedValue({
        ipfsCid: mockCid,
        sha256Hash,
        owner,
        timestamp: Math.floor(Date.now() / 1000),
        exists: true
      });

      return {
        success: true,
        transactionHash: mockTxHash,
        blockNumber: 105
      };
    });

    const res = await request(app)
      .post("/api/files/upload")
      .set("Authorization", `Bearer ${authToken}`)
      .attach("file", samplePdfBuffer, "Audit_Report.pdf");

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);

    fileRecord = res.body.data;
    expect(fileRecord.fileId).toBeDefined();
    expect(fileRecord.ipfsCid).toBe(mockCid);
    expect(fileRecord.sha256Hash).toBeDefined();
  });

  it("Step 6-7: Pristine Download & Verification MUST PASS (STATUS: ✓ AUTHENTIC)", async () => {
    // Check On-Demand Verification
    const verifyRes = await request(app)
      .get(`/api/files/${fileRecord.fileId}/verify`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(verifyRes.statusCode).toBe(200);
    expect(verifyRes.body.data.verified).toBe(true);
    expect(verifyRes.body.data.currentFileHash).toBe(verifyRes.body.data.blockchainHash);

    // Check Download
    const dlRes = await request(app)
      .get(`/api/files/${fileRecord.fileId}/download`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(dlRes.statusCode).toBe(200);
    expect(dlRes.headers["x-integrity-status"]).toBe("VERIFIED_ON_BLOCKCHAIN");
    expect(dlRes.body.equals(samplePdfBuffer)).toBe(true);
  });

  it("Step 8-13: Simulate 1-byte tamper in IPFS payload -> Verification MUST FAIL & Download BLOCKED", async () => {
    // 1. Trigger simulated tamper endpoint
    const tamperRes = await request(app)
      .post(`/api/files/${fileRecord.fileId}/simulate-tamper`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(tamperRes.statusCode).toBe(200);
    expect(tamperRes.body.success).toBe(true);

    // 2. Query On-Demand Verification -> SHA-256 changed, Blockchain hash unchanged
    const verifyTamperedRes = await request(app)
      .get(`/api/files/${fileRecord.fileId}/verify`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(verifyTamperedRes.statusCode).toBe(200);
    expect(verifyTamperedRes.body.data.verified).toBe(false);
    expect(verifyTamperedRes.body.data.blockchainHash).toBe(fileRecord.sha256Hash.toLowerCase());
    expect(verifyTamperedRes.body.data.currentFileHash).not.toBe(fileRecord.sha256Hash.toLowerCase());

    // 3. Attempt download -> MUST REJECT WITH 409 CONFLICT & NO DECRYPTION
    const dlTamperedRes = await request(app)
      .get(`/api/files/${fileRecord.fileId}/download`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(dlTamperedRes.statusCode).toBe(409);
    expect(dlTamperedRes.body.success).toBe(false);
    expect(dlTamperedRes.body.error.message).toBe("File integrity verification failed. The file may have been modified or corrupted.");
  });

  it("Step 14: Reset tamper -> File restored to pristine state & Download succeeds again", async () => {
    const resetRes = await request(app)
      .post(`/api/files/${fileRecord.fileId}/reset-tamper`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(resetRes.statusCode).toBe(200);

    const dlRestoredRes = await request(app)
      .get(`/api/files/${fileRecord.fileId}/download`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(dlRestoredRes.statusCode).toBe(200);
    expect(dlRestoredRes.body.equals(samplePdfBuffer)).toBe(true);
  });
});
