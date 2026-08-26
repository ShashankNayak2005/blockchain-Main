const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("⚡ Starting FileRegistry Smart Contract Deployment on Local Hardhat EVM...");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`👤 Deploying contract with Account: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account Balance: ${hre.ethers.formatEther(balance)} ETH`);

  // 1. Deploy Contract
  const FileRegistry = await hre.ethers.getContractFactory("FileRegistry");
  const fileRegistry = await FileRegistry.deploy();

  await fileRegistry.waitForDeployment();
  const contractAddress = await fileRegistry.getAddress();

  console.log("\n====================================================");
  console.log(`🎉 SUCCESS: FileRegistry Deployed at Address:`);
  console.log(`👉 ${contractAddress}`);
  console.log("====================================================\n");

  // 2. Prepare Artifact Data & ABI
  const artifactPath = path.resolve(__dirname, "../artifacts/contracts/FileRegistry.sol/FileRegistry.json");
  if (!fs.existsSync(artifactPath)) {
    throw new Error("Contract artifact not found. Please compile contracts first.");
  }

  const artifactData = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  const contractAbi = artifactData.abi;

  const deploymentData = {
    contractName: "FileRegistry",
    address: contractAddress,
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    deployedAt: new Date().toISOString()
  };

  // 3. Save Deployment Artifacts
  const blockchainDeployDir = path.resolve(__dirname, "../deployments");
  const backendConfigDir = path.resolve(__dirname, "../../backend/src/config");

  if (!fs.existsSync(blockchainDeployDir)) {
    fs.mkdirSync(blockchainDeployDir, { recursive: true });
  }
  if (!fs.existsSync(backendConfigDir)) {
    fs.mkdirSync(backendConfigDir, { recursive: true });
  }

  // Write deployment.json
  fs.writeFileSync(
    path.join(blockchainDeployDir, "deployment.json"),
    JSON.stringify(deploymentData, null, 2)
  );

  fs.writeFileSync(
    path.join(backendConfigDir, "contract-deployment.json"),
    JSON.stringify(deploymentData, null, 2)
  );

  // Write ABI json for backend
  fs.writeFileSync(
    path.join(backendConfigDir, "FileRegistryABI.json"),
    JSON.stringify(contractAbi, null, 2)
  );

  console.log("📄 Saved deployment artifacts to:");
  console.log(`   - ${path.relative(process.cwd(), path.join(blockchainDeployDir, "deployment.json"))}`);
  console.log(`   - ${path.relative(process.cwd(), path.join(backendConfigDir, "contract-deployment.json"))}`);
  console.log(`   - ${path.relative(process.cwd(), path.join(backendConfigDir, "FileRegistryABI.json"))}`);

  // 4. Update .env & backend/.env with Deployed Address
  const envFiles = [
    path.resolve(__dirname, "../../.env"),
    path.resolve(__dirname, "../../backend/.env")
  ];

  envFiles.forEach((envPath) => {
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, "utf-8");
      if (content.includes("CONTRACT_ADDRESS=")) {
        content = content.replace(/CONTRACT_ADDRESS=.*/, `CONTRACT_ADDRESS=${contractAddress}`);
      } else {
        content += `\nCONTRACT_ADDRESS=${contractAddress}\n`;
      }
      fs.writeFileSync(envPath, content);
      console.log(`📝 Updated CONTRACT_ADDRESS in: ${path.basename(envPath)}`);
    }
  });

  console.log("\n🚀 Hardhat Blockchain deployment completed successfully!");
}

main().catch((error) => {
  console.error("❌ Smart contract deployment failed:", error);
  process.exitCode = 1;
});
