const { prisma, connectDB, disconnectDB } = require("../src/config/database");
const bcrypt = require("bcryptjs");

describe("Database & Prisma ORM Core Verification Tests", () => {
  beforeAll(async () => {
    // Verify database connection
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it("1. Should connect to the database via Prisma client", async () => {
    const result = await prisma.$queryRaw`SELECT 1 as alive`;
    expect(result).toBeDefined();
    expect(Number(result[0].alive)).toBe(1);
  });

  it("2. Should perform CRUD operations on User model with unique email constraint", async () => {
    const testEmail = `test_user_${Date.now()}@university.edu`;
    const passwordHash = await bcrypt.hash("SecurePass123!", 10);

    // CREATE
    const user = await prisma.user.create({
      data: {
        name: "Test Researcher",
        email: testEmail,
        passwordHash,
        role: "USER"
      }
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe(testEmail);
    expect(user.role).toBe("USER");

    // READ
    const foundUser = await prisma.user.findUnique({
      where: { id: user.id }
    });
    expect(foundUser).not.toBeNull();
    expect(foundUser.name).toBe("Test Researcher");

    // UPDATE
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { name: "Dr. Test Researcher" }
    });
    expect(updatedUser.name).toBe("Dr. Test Researcher");

    // DUPLICATE EMAIL CONSTRAINT CHECK
    await expect(
      prisma.user.create({
        data: {
          name: "Duplicate User",
          email: testEmail,
          passwordHash,
          role: "USER"
        }
      })
    ).rejects.toThrow();

    // CLEANUP
    await prisma.user.delete({ where: { id: user.id } });
  });

  it("3. Should store File metadata with protected key and verify indexes", async () => {
    const ownerEmail = `owner_${Date.now()}@university.edu`;
    const passwordHash = await bcrypt.hash("Pass123!", 10);

    const owner = await prisma.user.create({
      data: { name: "File Owner", email: ownerEmail, passwordHash }
    });

    const fileId = `file_test_${Date.now()}`;
    const ipfsCid = `QmTestCid_${Date.now()}`;
    const sha256Hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    // CREATE FILE RECORD
    // Verify SECURITY REQUIREMENT: Only protected (wrapped) AES key stored
    const wrappedKeyHex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    const fileRecord = await prisma.file.create({
      data: {
        fileId,
        originalFileName: "Confidential_Thesis.pdf",
        mimeType: "application/pdf",
        fileSize: BigInt(1048576),
        ownerId: owner.id,
        ipfsCid,
        sha256Hash,
        encryptedAesKey: wrappedKeyHex,
        iv: "1234567890abcdef12345678",
        authTag: "abcdef1234567890abcdef1234567890",
        keyIv: "9876543210fedcba98765432",
        keyAuthTag: "fedcba9876543210fedcba9876543210",
        blockchainTxHash: "0x1234567890abcdef"
      }
    });

    expect(fileRecord.id).toBeDefined();
    expect(fileRecord.fileId).toBe(fileId);
    expect(fileRecord.encryptedAesKey).toBe(wrappedKeyHex);

    // QUERY BY INDEX (ipfsCid and sha256Hash)
    const fileByCid = await prisma.file.findFirst({
      where: { ipfsCid }
    });
    expect(fileByCid).not.toBeNull();
    expect(fileByCid.id).toBe(fileRecord.id);

    const fileByHash = await prisma.file.findFirst({
      where: { sha256Hash }
    });
    expect(fileByHash).not.toBeNull();

    // CLEANUP
    await prisma.file.delete({ where: { id: fileRecord.id } });
    await prisma.user.delete({ where: { id: owner.id } });
  });

  it("4. Should enforce Access Control permissions via FileAccess records", async () => {
    const ownerEmail = `owner_acl_${Date.now()}@university.edu`;
    const recipientEmail = `recipient_acl_${Date.now()}@university.edu`;
    const passwordHash = await bcrypt.hash("Pass123!", 10);

    const owner = await prisma.user.create({
      data: { name: "Owner User", email: ownerEmail, passwordHash }
    });
    const recipient = await prisma.user.create({
      data: { name: "Recipient User", email: recipientEmail, passwordHash }
    });

    const fileId = `file_acl_${Date.now()}`;
    const fileRecord = await prisma.file.create({
      data: {
        fileId,
        originalFileName: "Shared_Dataset.pdf",
        fileSize: BigInt(500000),
        ownerId: owner.id,
        ipfsCid: `QmCid_${Date.now()}`,
        sha256Hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        encryptedAesKey: "wrapped_key_payload",
        iv: "1234567890abcdef12345678",
        authTag: "abcdef1234567890abcdef1234567890",
        keyIv: "9876543210fedcba98765432",
        keyAuthTag: "fedcba9876543210fedcba9876543210",
        blockchainTxHash: "0x9999"
      }
    });

    // Check authorization BEFORE granting access
    let accessGrant = await prisma.fileAccess.findUnique({
      where: {
        fileId_userId: { fileId: fileRecord.id, userId: recipient.id }
      }
    });
    expect(accessGrant).toBeNull();

    // GRANT ACCESS
    accessGrant = await prisma.fileAccess.create({
      data: {
        fileId: fileRecord.id,
        userId: recipient.id,
        grantedBy: owner.id
      }
    });
    expect(accessGrant.id).toBeDefined();

    // Check authorization AFTER granting access
    const verifiedAccess = await prisma.fileAccess.findUnique({
      where: {
        fileId_userId: { fileId: fileRecord.id, userId: recipient.id }
      }
    });
    expect(verifiedAccess).not.toBeNull();
    expect(verifiedAccess.grantedBy).toBe(owner.id);

    // CLEANUP (Cascade delete cleans FileAccess automatically)
    await prisma.file.delete({ where: { id: fileRecord.id } });
    await prisma.user.delete({ where: { id: owner.id } });
    await prisma.user.delete({ where: { id: recipient.id } });
  });
});
