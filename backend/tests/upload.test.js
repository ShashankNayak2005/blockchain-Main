const request = require("supertest");
const app = require("../src/app");
const { prisma, connectDB, disconnectDB } = require("../src/config/database");
const ipfsService = require("../src/services/ipfs/ipfs.service");
const blockchainService = require("../src/services/blockchain/blockchain.service");

describe("Complete PDF Upload Pipeline & Security Integration Tests", () => {
  let authToken = "";
  let userId = "";

  const testUser = {
    name: "Dr. Upload Tester",
    email: `uploader_${Date.now()}@university.edu`,
    password: "SecureUploadPassword123!"
  };

  const samplePdfBuffer = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kinds [ /Page ] /Count 1 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
  );

  beforeAll(async () => {
    await connectDB();

    // Register test user
    const res = await request(app)
      .post("/api/auth/register")
      .send(testUser);

    authToken = res.body.data.token;
    userId = res.body.data.user.id;
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

  it("1. Should reject upload request if JWT authentication token is missing (401 Unauthorized)", async () => {
    const res = await request(app)
      .post("/api/files/upload")
      .attach("file", samplePdfBuffer, "sample.pdf");

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("2. Should reject upload if file is not a PDF (400 Bad Request)", async () => {
    const res = await request(app)
      .post("/api/files/upload")
      .set("Authorization", `Bearer ${authToken}`)
      .attach("file", Buffer.from("Hello text content"), "sample.txt");

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain("Invalid file format");
  });

  it("3. Should reject upload if file extension is .pdf but content lacks %PDF- magic bytes (400 Bad Request)", async () => {
    const res = await request(app)
      .post("/api/files/upload")
      .set("Authorization", `Bearer ${authToken}`)
      .attach("file", Buffer.from("NOT_A_PDF_MAGIC_HEADER"), "fake.pdf");

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain("Invalid PDF header");
  });

  it("4. Should successfully process full PDF upload pipeline and return ONLY safe metadata", async () => {
    const mockCid = `QmUploadTest_${Date.now()}`;
    const mockTxHash = `0x${Date.now()}1234567890abcdef`;

    jest.spyOn(ipfsService, "uploadEncryptedFile").mockResolvedValueOnce(mockCid);
    jest.spyOn(blockchainService, "registerFileOnBlockchain").mockResolvedValueOnce({
      success: true,
      transactionHash: mockTxHash,
      blockNumber: 100
    });

    const res = await request(app)
      .post("/api/files/upload")
      .set("Authorization", `Bearer ${authToken}`)
      .attach("file", samplePdfBuffer, "Research_Paper.pdf");

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.fileId).toBeDefined();
    expect(data.originalFileName).toBe("Research_Paper.pdf");
    expect(data.ipfsCid).toBe(mockCid);
    expect(data.sha256Hash).toBeDefined();
    expect(data.sha256Hash.length).toBe(64);
    expect(data.blockchainTxHash).toBe(mockTxHash);

    // SECURITY CHECK: DO NOT RETURN SENSITIVE KEYS OR SECRETS
    expect(data.encryptedAesKey).toBeUndefined();
    expect(data.keyIv).toBeUndefined();
    expect(data.keyAuthTag).toBeUndefined();
    expect(data.iv).toBeUndefined();
    expect(data.authTag).toBeUndefined();
    expect(data.SERVER_MASTER_KEY).toBeUndefined();
    expect(data.BLOCKCHAIN_PRIVATE_KEY).toBeUndefined();

    // Verify DB persistence
    const dbRecord = await prisma.file.findUnique({
      where: { fileId: data.fileId }
    });

    expect(dbRecord).not.toBeNull();
    expect(dbRecord.encryptedAesKey).toBeDefined();
    expect(dbRecord.encryptedAesKey).not.toBe("");
    expect(dbRecord.ownerId).toBe(userId);
  });

  it("5. Should handle IPFS failure safely and NOT persist database or blockchain record", async () => {
    jest.spyOn(ipfsService, "uploadEncryptedFile").mockImplementationOnce(async () => {
      throw new Error("Pinata gateway offline");
    });

    const countBefore = await prisma.file.count();

    const res = await request(app)
      .post("/api/files/upload")
      .set("Authorization", `Bearer ${authToken}`)
      .attach("file", samplePdfBuffer, "Failed_IPFS_Paper.pdf");

    expect(res.statusCode).toBe(502);
    expect(res.body.success).toBe(false);

    const countAfter = await prisma.file.count();
    expect(countAfter).toBe(countBefore); // No orphan DB records!
  });

  it("6. Should handle Blockchain failure safely and trigger IPFS rollback unpin", async () => {
    const mockCid = `QmFailedChain_${Date.now()}`;
    
    jest.spyOn(ipfsService, "uploadEncryptedFile").mockImplementationOnce(async () => mockCid);
    const unpinSpy = jest.spyOn(ipfsService, "unpinFile").mockImplementationOnce(async () => true);
    jest.spyOn(blockchainService, "registerFileOnBlockchain").mockImplementationOnce(async () => {
      throw new Error("EVM Execution Reverted");
    });

    const countBefore = await prisma.file.count();

    const res = await request(app)
      .post("/api/files/upload")
      .set("Authorization", `Bearer ${authToken}`)
      .attach("file", samplePdfBuffer, "Failed_Chain_Paper.pdf");

    expect(res.statusCode).toBe(502);
    expect(res.body.success).toBe(false);
    expect(unpinSpy).toHaveBeenCalledWith(mockCid); // IPFS unpin rollback executed!

    const countAfter = await prisma.file.count();
    expect(countAfter).toBe(countBefore);
  });
});
