const { PrismaClient } = require("@prisma/client");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "info", "warn", "error"] : ["error"]
});

/**
 * Tests database connection and logs connection status.
 */
async function connectDB() {
  try {
    await prisma.$connect();
    console.log("✅ MySQL Database connected successfully via Prisma ORM");
    return true;
  } catch (error) {
    console.error("❌ MySQL Database connection failed:", error.message);
    throw error;
  }
}

/**
 * Graceful disconnect helper for server shutdown or testing.
 */
async function disconnectDB() {
  await prisma.$disconnect();
}

module.exports = {
  prisma,
  connectDB,
  disconnectDB
};
