# Local Hardhat Blockchain Development Guide

## 1. Overview & Architecture
This project utilizes a local **Hardhat Ethereum EVM node** to run the `FileRegistry.sol` smart contract. The local blockchain environment requires **zero real mainnet or testnet funds (0 ETH)**. Hardhat automatically provisions 20 pre-funded test accounts, each initialized with 10,000 test ETH.

---

## 2. 3-Terminal Development Workflow

To run the complete application locally, open three separate terminal instances in the project root (`secure-file-sharing-blockchain/`):

### 🖥️ Terminal 1: Start Local Hardhat Blockchain Node
Starts an in-memory Ethereum EVM JSON-RPC node on `http://127.0.0.1:8545` (Chain ID: `31337`).

```bash
# Option A: From workspace root
npm run blockchain:node

# Option B: Directly from blockchain directory
cd blockchain
npx hardhat node
```

> **Expected Output:**
> ```
> Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
> Accounts:
> Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
> Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
> ...
> ```

---

### 🚀 Terminal 2: Deploy Smart Contract to Local Node
Compiles `FileRegistry.sol`, deploys it to the running Hardhat node, prints the contract address, generates deployment artifacts, and automatically updates `.env`.

```bash
# Option A: From workspace root
npm run blockchain:deploy

# Option B: Directly from blockchain directory
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

> **Expected Output:**
> ```
> ⚡ Starting FileRegistry Smart Contract Deployment on Local Hardhat EVM...
> 👤 Deploying contract with Account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
> 💰 Account Balance: 10000.0 ETH
> 
> 🎉 SUCCESS: FileRegistry Deployed at Address:
> 👉 0x5FbDB2315678afecb367f032d93F642f64180aa3
> 
> 📄 Saved deployment artifacts to:
>    - blockchain/deployments/deployment.json
>    - backend/src/config/contract-deployment.json
>    - backend/src/config/FileRegistryABI.json
> 📝 Updated CONTRACT_ADDRESS in: .env
> 📝 Updated CONTRACT_ADDRESS in: backend/.env
> ```

---

### ⚙️ Terminal 3: Start Backend REST API Server
Launches the Node.js / Express backend server with Prisma ORM database connection and Ethers.js integration to the deployed `FileRegistry` contract.

```bash
# Option A: From workspace root
npm run dev:backend

# Option B: Directly from backend directory
cd backend
npm run dev
```

> **Expected Output:**
> ```
> 🚀 Backend REST API Server listening on http://localhost:5000
> ✅ MySQL Database connected successfully via Prisma ORM
> ```

---

## 3. Generated Deployment Artifacts

When `deploy.js` completes, the following files are produced:

1. **`blockchain/deployments/deployment.json`**: Contains contract address, chain ID (`31337`), network name (`localhost`), deployer address, and timestamp.
2. **`backend/src/config/contract-deployment.json`**: Duplicate artifact consumed directly by backend Ethers service.
3. **`backend/src/config/FileRegistryABI.json`**: Complete Solc ABI specification required by Ethers.js to invoke `registerFile()`, `getFile()`, and `verifyFile()`.

---

## 4. Pre-funded Hardhat Account Details

- **Default Deployer Account (Account #0):**
  - Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
  - Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
  - Default Balance: 10,000 ETH

---

## 5. Troubleshooting & Contract Reset

If you restart the Hardhat node in Terminal 1, all local EVM state is reset. Simply re-run Terminal 2 (`npm run blockchain:deploy`) to redeploy the contract and refresh the backend artifacts.
