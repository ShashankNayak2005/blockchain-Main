/**
 * Global deploy script helper.
 * Executes Hardhat deployment script from root workspace.
 */
const { execSync } = require("child_process");

console.log("🚀 Starting Smart Contract deployment on Local Hardhat network...");

try {
  execSync("npm --prefix blockchain run deploy", { stdio: "inherit" });
  console.log("✅ Smart Contract deployed successfully!");
} catch (error) {
  console.error("❌ Smart Contract deployment failed:", error.message);
  process.exit(1);
}
