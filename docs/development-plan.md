# Development Plan & Implementation Roadmap

## 1. Project Directory Structure

```
secure-file-sharing-blockchain/
├── docs/
│   ├── product-requirements.md
│   ├── architecture.md
│   ├── database-design.md
│   ├── blockchain-design.md
│   ├── security-design.md
│   ├── api-design.md
│   ├── development-plan.md
│   └── testing-plan.md
├── contracts/
│   └── FileRegistry.sol
├── scripts/
│   ├── deploy.js
│   └── seed.js
├── test/
│   ├── hardhat/
│   │   └── FileRegistry.test.js
│   └── backend/
│       ├── crypto.test.js
│       ├── auth.test.js
│       └── file.test.js
├── prisma/
│   └── schema.prisma
├── backend/
│   ├── config/
│   │   ├── database.js
│   │   └── ethers.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── file.controller.js
│   │   └── admin.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── upload.middleware.js
│   │   └── error.middleware.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── file.routes.js
│   │   └── admin.routes.js
│   ├── services/
│   │   ├── crypto.service.js
│   │   ├── ipfs.service.js
│   │   ├── blockchain.service.js
│   │   └── file.service.js
│   ├── utils/
│   │   ├── errors.js
│   │   └── logger.js
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── FileUploadModal.jsx
│   │   │   ├── FileListTable.jsx
│   │   │   ├── ShareModal.jsx
│   │   │   └── IntegrityBadge.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── VerifyFile.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── hardhat.config.js
├── package.json
└── .env.example
```

---

## 2. Environment Variables Configuration (`.env.example`)

```env
# Server Configuration
PORT=5000
NODE_ENV=development
JWT_SECRET=super_secret_jwt_key_min_32_characters_long_12345

# Envelope Cryptography Master Key (32 bytes = 64 hex characters)
MASTER_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# MySQL Database (Prisma)
DATABASE_URL="mysql://root:password@localhost:3306/secure_file_sharing"

# Pinata IPFS Credentials
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key
PINATA_JWT=your_pinata_jwt_token
PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs/

# Hardhat Local Blockchain Node
HARDHAT_RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

---

## 3. Phased Implementation Strategy

### Phase 1: Environment & Project Foundation Setup
- Initialize Root `package.json` with dependencies (`ethers`, `hardhat`, `prisma`, `@prisma/client`, `express`, `jsonwebtoken`, `bcryptjs`, `axios`, `multer`, `dotenv`).
- Configure Prisma ORM (`prisma/schema.prisma`), run initial MySQL migration (`npx prisma migrate dev`).
- Initialize Hardhat setup (`hardhat.config.js`).

### Phase 2: Blockchain Smart Contract Development & Testing
- Write `contracts/FileRegistry.sol`.
- Write Hardhat contract deployment script `scripts/deploy.js`.
- Run local Hardhat node (`npx hardhat node`).
- Write & execute Hardhat unit tests `test/hardhat/FileRegistry.test.js`.

### Phase 3: Cryptographic Core & Backend Services
- Build `CryptoService.js` (AES-256-GCM encryption/decryption, Key Envelope Wrapping/Unwrapping using `MASTER_ENCRYPTION_KEY`, SHA-256 computation).
- Write standalone unit tests for `CryptoService.js` to ensure 100% key wrapping & auth tag validation correctness.
- Build `IPFSService.js` using Pinata SDK / REST API.
- Build `BlockchainService.js` using Ethers.js v6.

### Phase 4: Express API & Business Logic Layer
- Implement JWT Auth Controller & Middleware (`auth.middleware.js`).
- Implement File Upload Route (`upload.middleware.js`, `file.controller.js` -> `file.service.js`).
- Implement File Download Route with Pre-Decryption Tamper Detection Check.
- Implement Access Control Sharing endpoints (`/files/:id/share`).

### Phase 5: Modern UI/UX Frontend Implementation
- Bootstrap React + Vite + Tailwind CSS in `frontend/`.
- Build Auth Context & Login/Register pages with sleek dark-mode glassmorphic styling.
- Build Dashboard table displaying uploaded files, IPFS CID links, Blockchain Tx hashes, and verification status badges.
- Build Drag-and-Drop PDF Upload modal with real-time status steps (Encrypting -> Uploading to IPFS -> Mining Blockchain Tx -> Saving).
- Build Download & Tamper Verification modal showing on-chain hash matching.

### Phase 6: End-to-End Integration & Security Verification
- Wire up Frontend API service to Express backend.
- Run real local Hardhat node & connect real Pinata IPFS account.
- Perform automated Tamper Simulation test (modifying 1 byte of encrypted IPFS file and verifying download block).

### Phase 7: Documentation & Final Testing Suite
- Run complete test suite (Jest + Supertest + Hardhat).
- Finalize walkthrough documentation.
