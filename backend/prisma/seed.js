const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting MySQL Database seeding...");

  // Clean existing records in reverse dependency order
  await prisma.fileAccess.deleteMany();
  await prisma.file.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const adminUser = await prisma.user.create({
    data: {
      name: "System Admin",
      email: "admin@university.edu",
      passwordHash,
      role: "ADMIN"
    }
  });

  const demoUser = await prisma.user.create({
    data: {
      name: "Dr. Alice Smith",
      email: "alice@university.edu",
      passwordHash,
      role: "USER"
    }
  });

  const colleagueUser = await prisma.user.create({
    data: {
      name: "Prof. Bob Jones",
      email: "bob@university.edu",
      passwordHash,
      role: "USER"
    }
  });

  console.log(`✅ Created Users: Admin (${adminUser.email}), Alice (${demoUser.email}), Bob (${colleagueUser.email})`);

  // Create Sample File Record
  // IMPORTANT SECURITY COMPLIANCE:
  // encryptedAesKey contains strictly wrapped key payload, NEVER plaintext key!
  const sampleFile = await prisma.file.create({
    data: {
      fileId: "file_demo_uuid_1001",
      originalFileName: "Academic_Research_Paper_2026.pdf",
      mimeType: "application/pdf",
      fileSize: BigInt(2458902),
      ownerId: demoUser.id,
      ipfsCid: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
      sha256Hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      encryptedAesKey: "4a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b", // Wrapped key hex
      iv: "1234567890abcdef12345678",           // Payload IV (12 bytes hex)
      authTag: "abcdef1234567890abcdef1234567890", // Payload Auth Tag (16 bytes hex)
      keyIv: "9876543210fedcba98765432",         // Key Wrapping IV (12 bytes hex)
      keyAuthTag: "fedcba9876543210fedcba9876543210", // Key Wrapping Auth Tag (16 bytes hex)
      blockchainTxHash: "0x7d9f8a3b2c1e0f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
      blockchainRecordId: "1001"
    }
  });

  console.log(`✅ Created Sample File: ${sampleFile.originalFileName} (ID: ${sampleFile.fileId})`);

  // Grant Access to Bob
  const fileAccess = await prisma.fileAccess.create({
    data: {
      fileId: sampleFile.id,
      userId: colleagueUser.id,
      grantedBy: demoUser.id
    }
  });

  console.log(`✅ Granted Access: File '${sampleFile.originalFileName}' shared with ${colleagueUser.email}`);

  console.log("🌱 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Database seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
