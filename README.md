# CipherChain: Cloud-Based Secure File Sharing Using Blockchain and AES-256 Encryption

## 1. Project Title

**CipherChain: Cloud-Based Secure File Sharing Using Ethereum Blockchain, IPFS, and AES-256-GCM Encryption**

---

## 2. Project Overview

**CipherChain** is an enterprise-grade, zero-trust cloud file storage and sharing platform designed for high-security environments. It resolves the core vulnerability of centralized cloud file storage—single points of failure and unauthorized data tampering—by integrating:
- **AES-256-GCM Envelope Encryption** for per-file data confidentiality and key isolation.
- **Pinata IPFS (InterPlanetary File System)** for decentralized, content-addressed encrypted payload storage.
- **SHA-256 Cryptographic Hashing** for tamper-evident file digest generation.
- **Ethereum Smart Contracts (`FileRegistry.sol`)** for immutable, on-chain integrity verification anchors.
- **Prisma ORM & MySQL Database** for high-performance relational access control management (ACL) and user session tracking.

The system enforces a **fail-closed pre-decryption verification architecture**: when a user requests a file download, the backend computes the SHA-256 hash of the downloaded IPFS payload and verifies it against the immutable canonical Ethereum smart contract record using constant-time comparison before key unwrapping or payload decryption is ever attempted.

---

## 3. Problem Statement

Modern cloud file storage services (e.g., Google Drive, Dropbox, AWS S3) suffer from significant security risks:
1. **Centralized Trust Vulnerabilities:** Storage providers hold both encrypted files and decryption keys, exposing sensitive documents to insider threats or server breaches.
2. **Silent Data Corruption & Tampering:** Malicious actors or corrupted storage nodes can modify payload contents without detection if integrity verification relies on mutable cloud databases.
3. **Lack of Immutable Audit Trails:** Audit logs stored in traditional relational databases can be altered by database administrators or attackers with root access.
4. **Key Exposure Risks:** Storing raw encryption keys directly on public block explorers or insecure database records jeopardizes document privacy across all shared users.

---

## 4. Objectives

- **Confidentiality:** Ensure document contents are never stored or transmitted in plaintext. Apply AES-256-GCM with unique 256-bit random keys per file.
- **Envelope Key Protection:** Protect per-file AES keys using a 256-bit `SERVER_MASTER_KEY` so raw file keys are never written to disk or database tables.
- **Tamper Evidence:** Provide 100% mathematical proof of file integrity using immutable Ethereum EVM smart contracts.
- **Decentralization:** Eliminate single storage server failures by pinning encrypted payload binaries to IPFS.
- **Fail-Closed Security:** Automatically reject download requests and block payload decryption if an IPFS payload is tampered with by even 1 byte.
- **Zero Secrets Leakage:** Guarantee that raw keys, master keys, Pinata JWTs, and Ethereum private keys are never exposed to the frontend browser or written to logs.

---

## 5. Key Features

- **Drag-and-Drop PDF Upload:** Streamlined uploading with frontend PDF magic byte validation (`%PDF-`).
- **Real-Time Security Progress:** Step-by-step progress tracking (AES-256 Encryption $\rightarrow$ IPFS Pinning $\rightarrow$ SHA-256 Digest $\rightarrow$ Blockchain Mining $\rightarrow$ MySQL Persistence).
- **Interactive On-Demand Verification:** Verify file integrity on-chain without downloading or decrypting the underlying file.
- **Interactive Tamper-Detection Simulator:** Built-in development tool to simulate 1-byte IPFS payload corruption and demonstrate fail-closed blockchain rejection live.
- **Role-Based Access Control (RBAC) & ACLs:** File ownership enforcement and access grant tracking.
- **Security-Hardened REST API:** Equipped with Helmet security headers, CORS origin whitelisting, rate limiting (15 auth reqs/15m, 300 global reqs/15m), and sanitized error responses.

---

## 6. System Architecture

```
                                              +-----------------------------------+
                                              |   React 18 SPA (Vite / Tailwind)  |
                                              +-----------------+-----------------+
                                                                | HTTPS / JWT
                                                                v
                                              +-----------------+-----------------+
                                              |   Express.js REST API Server    |
                                              +--------+----------------+---------+
                                                       |                |
                       +-------------------------------+                +-------------------------------+
                       |                                                                                |
                       v                                                                                v
        +--------------+--------------+                                                  +--------------+--------------+
        | Envelope Key Wrapping Engine|                                                  |   SHA-256 Digest Generator   |
        |  (AES-256-GCM + Master Key) |                                                  |     (Final Encrypted Bytes)  |
        +--------------+--------------+                                                  +--------------+--------------+
                       |                                                                                |
        +--------------+--------------+                                                  +--------------+--------------+
        |   MySQL Relational Database  |                                                  | Pinata IPFS Decentralized    |
        |  (Prisma ORM - Access Rules) |                                                  | File Storage (Encrypted Only)|
        +-----------------------------+                                                  +--------------+--------------+
                                                                                                        |
                                                                                                        v
                                                                                         +--------------+--------------+
                                                                                         | Ethereum Smart Contract     |
                                                                                         | (FileRegistry.sol EVM Node) |
                                                                                         +-----------------------------+
```

---

## 7. Upload Flow

```
User Selects PDF
      ↓
Frontend PDF Magic Bytes Check (%PDF-)
      ↓
POST /api/files/upload (JWT Authenticated)
      ↓
Generate Random 256-Bit AES File Key
      ↓
Encrypt PDF Payload via AES-256-GCM (Extract IV + Auth Tag)
      ↓
Calculate SHA-256 Hash Digest of FINAL ENCRYPTED BYTES
      ↓
Upload ONLY Encrypted Binary Bytes to Pinata IPFS (Receive CID)
      ↓
Register fileId, ipfsCid, sha256Hash, owner on Ethereum Smart Contract (FileRegistry.sol)
      ↓
Wrap AES File Key with SERVER_MASTER_KEY (Envelope Encryption)
      ↓
Persist File Metadata & Protected Key Parameters in MySQL via Prisma
      ↓
Return Safe DTO Response to Frontend (Zero Key Exposure)
```

---

## 8. Download Flow

```
GET /api/files/:fileId/download (JWT Authenticated)
      ↓
Verify Ownership / Access Control Rights in MySQL
      ↓
Fetch Canonical Record (ipfsCid, sha256Hash) from FileRegistry.sol Smart Contract
      ↓
Download Encrypted Payload Bytes from IPFS Network
      ↓
Compute SHA-256 Hash Digest of Downloaded Encrypted Bytes
      ↓
Compare Downloaded SHA-256 vs Blockchain SHA-256 (Buffer.timingSafeEqual)
      ↓
┌───────────────────────────────────────────────┐
│              Verification Decision            │
└───────────────────────┬───────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
   [Hashes Match]              [Hash Mismatch!]
         │                             │
         │                             ▼
         │                 🚨 SECURITY ALERT DETECTED
         │                 - Log Security Event
         │                 - DO NOT Unwrap AES Key
         │                 - DO NOT Decrypt Payload
         │                 - Return HTTP 409 Conflict
         v
Unwrap Protected AES Key via SERVER_MASTER_KEY
         ↓
Decrypt Payload using AES-256-GCM (Verify Auth Tag)
         ↓
Stream Original PDF Document Binary to User
```

---

## 9. Security Architecture

- **Zero-Trust Storage:** IPFS nodes store strictly high-entropy AES-256-GCM ciphertexts. Even if an IPFS gateway node is compromised, payload contents remain mathematically unreadable without the per-file key.
- **Envelope Key Protection:** Per-file keys are encrypted under a 256-bit master key (`SERVER_MASTER_KEY`). Raw keys exist in RAM only for the duration of the cryptographic operation.
- **Fail-Closed Download Gate:** Payload decryption is structurally downstream from smart contract integrity verification. Mismatched hashes immediately abort key unwrapping.
- **Timing-Safe Hash Comparison:** Hash comparisons use Node.js `crypto.timingSafeEqual()` to eliminate side-channel timing attacks.
- **API Hardening:** Express application is configured with `helmet`, strict CORS origin matching, request body size limits, and `express-rate-limit` brute-force protection.

---

## 10. Technology Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide React, Axios, React Router v6
- **Backend:** Node.js 18+, Express.js, Prisma ORM, MySQL 8.0+, JWT, bcryptjs, Multer, Helmet, express-rate-limit
- **Cryptography:** Node.js native `crypto` (AES-256-GCM, SHA-256, `crypto.randomBytes`)
- **Decentralized Storage:** IPFS (Pinata REST API Gateway)
- **Blockchain:** Solidity `0.8.20`, Hardhat EVM Node, Ethers.js v6 (Chain ID 31337)

---

## 11. Database Architecture

MySQL 8.0+ managed via Prisma ORM (`backend/prisma/schema.prisma`):

```prisma
enum Role {
  USER
  ADMIN
}

model User {
  id           String       @id @default(uuid())
  email        String       @unique
  passwordHash String
  name         String
  role         Role         @default(USER)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  files        File[]
  accessGrants FileAccess[]
}

model File {
  id                 String       @id @default(uuid())
  fileId             String       @unique
  originalFileName   String
  mimeType           String
  fileSize           BigInt
  ownerId            String
  ipfsCid            String
  sha256Hash         String
  encryptedAesKey    String       @db.Text
  iv                 String
  authTag            String
  keyIv              String
  keyAuthTag         String
  blockchainTxHash   String
  blockchainRecordId String?
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt
  owner              User         @relation(fields: [ownerId], references: [id])
  accessRules        FileAccess[]
}

model FileAccess {
  id        String   @id @default(uuid())
  fileId    String
  userId    String
  createdAt DateTime @default(now())
  file      File     @relation(fields: [fileId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([fileId, userId])
}
```

---

## 12. Blockchain Architecture

Smart contract written in Solidity `0.8.20` (`blockchain/contracts/FileRegistry.sol`):
- **Immutability:** Stores metadata mapping `mapping(string => FileRecord)` where `fileId` acts as the primary key.
- **Duplicate Prevention:** Rejects duplicate file registrations with `require(!files[_fileId].exists, "FileRegistry: Duplicate file registration prohibited")`.
- **Integrity Verification:** Exposes `verifyFile(fileId, candidateHash)` returning boolean match result against canonical on-chain hash.

---

## 13. IPFS Architecture

- Encrypted binary buffers are uploaded via Pinata `pinFileToIPFS` API.
- Files are assigned a Content Identifier (CIDv0 / CIDv1) derived from their encrypted contents.
- Backend retrieves payloads via Pinata IPFS Gateway (`https://gateway.pinata.cloud/ipfs/:cid`).

---

## 14. AES-256-GCM Explanation

Galois/Counter Mode (GCM) is an authenticated encryption cipher providing both **confidentiality** and **authenticity**:
- **Confidentiality:** 256-bit key ensures $2^{256}$ brute-force key space.
- **Initialization Vector (IV):** 96-bit (12-byte) unique random IV per encryption guarantees different ciphertexts even for identical input files.
- **Authentication Tag:** 128-bit (16-byte) authentication tag computed during encryption. Decryption verifies the tag; any ciphertext alteration breaks tag validation and aborts decryption.

---

## 15. SHA-256 Integrity Verification

SHA-256 produces a unique 256-bit (64-character hexadecimal) cryptographic digest:
- **Pre-image Resistance:** Computationally impossible to reconstruct original bytes from hash digest.
- **Avalanche Effect:** Changing a single bit in the encrypted payload alters on average 50% of the output hash bits.
- **Immutable Target:** Storing the SHA-256 digest on Ethereum provides a tamper-proof reference.

---

## 16. Why Blockchain Is Used

Centralized databases can be modified by database administrators, cloud providers, or attackers with root access. By anchoring file hashes on an Ethereum EVM smart contract, no single party can alter the canonical hash history once a transaction is mined.

---

## 17. Why MySQL Is Used

While blockchain provides immutable verification anchors, querying public blockchains for listing, search filtering, pagination, and user access control lists (ACLs) is slow and costly. MySQL acts as a high-speed relational query index for safe application metadata.

---

## 18. Why AES Keys Are Not Stored Directly on Blockchain

Blockchains are public, transparent ledgers. Any data written to a smart contract storage variable or event log can be read by anyone on the network. Storing encryption keys on-chain would render encrypted files globally accessible. Instead, per-file keys are wrapped using `SERVER_MASTER_KEY` and stored privately in MySQL.

---

## 19. Installation Requirements

- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **MySQL Database:** v8.0 or higher
- **Git:** Installed on local machine

---

## 20. Environment Variables

Create a root `.env` file in the project root:

```env
# SERVER CONFIGURATION
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_jwt_secret_key_minimum_32_characters_long_12345

# ENVELOPE MASTER ENCRYPTION KEY (64 hex characters / 32 bytes)
SERVER_MASTER_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
MASTER_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# MYSQL DATABASE (Prisma ORM)
DATABASE_URL="mysql://root:password@127.0.0.1:3306/secure_file_sharing"

# PINATA IPFS GATEWAY & CREDENTIALS
PINATA_API_KEY=your_pinata_api_key_placeholder
PINATA_SECRET_API_KEY=your_pinata_secret_api_key_placeholder
PINATA_JWT=your_pinata_jwt_token_placeholder
PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs

# HARDHAT BLOCKCHAIN NODE
HARDHAT_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

---

## 21. MySQL Setup

1. Start your local MySQL server on port 3306.
2. Create the database schema:
   ```sql
   CREATE DATABASE secure_file_sharing;
   ```
3. Run Prisma database migrations inside `backend/`:
   ```bash
   cd backend
   npx prisma migrate dev --name init
   ```

---

## 22. Hardhat Setup

Navigate to the `blockchain/` directory and compile smart contracts:

```bash
cd blockchain
npm install
npx hardhat compile
```

---

## 23. Smart Contract Deployment

1. Start the local Hardhat EVM node in a dedicated terminal:
   ```bash
   cd blockchain
   npx hardhat node
   ```
2. In a second terminal, deploy `FileRegistry.sol` to the local node:
   ```bash
   cd blockchain
   npx hardhat run scripts/deploy.js --network localhost
   ```
   *The script deploys the contract and automatically exports the contract address and ABI to `backend/src/config/`.*

---

## 24. IPFS / Pinata Setup

1. Register a free account at [Pinata.cloud](https://pinata.cloud).
2. Generate an API JWT Token with `pinFileToIPFS` permissions.
3. Paste the JWT into your `.env` file under `PINATA_JWT`.
   *(Note: If Pinata credentials are not set, the backend automatically uses an in-memory IPFS buffer fallback during local offline testing).*

---

## 25. Backend Setup

```bash
cd backend
npm install
npx prisma generate
```

---

## 26. Frontend Setup

```bash
cd frontend
npm install
```

---

## 27. Running the Complete Application

To run the complete system locally, open 4 separate terminal windows:

- **Terminal 1 (Blockchain Node):**
  ```bash
  cd blockchain
  npx hardhat node
  ```

- **Terminal 2 (Deploy Smart Contract):**
  ```bash
  cd blockchain
  npx hardhat run scripts/deploy.js --network localhost
  ```

- **Terminal 3 (Backend API Server):**
  ```bash
  cd backend
  npm run dev
  ```

- **Terminal 4 (Frontend React App):**
  ```bash
  cd frontend
  npm run dev
  ```

Open your browser and navigate to `http://localhost:5173`.

---

## 28. Testing

### Run Smart Contract Unit Tests
```bash
cd blockchain
npm test
```

### Run Backend Unit & Integration Tests (11 Test Suites)
```bash
cd backend
npx jest
```

### Run Frontend Production Build Validation
```bash
cd frontend
npm run build
```

---

## 29. Tamper Detection Demonstration

To demonstrate fail-closed blockchain verification live:
1. Upload a PDF document at `http://localhost:5173/upload`.
2. Navigate to **My Files** $\rightarrow$ **Verify** (`/files/:fileId/verify`).
3. Click **Simulate 1-Byte Tamper**.
4. The system flips 1 byte in the IPFS payload buffer without modifying the smart contract record.
5. Observe the verification status change from `STATUS: ✓ AUTHENTIC` to `STATUS: ✗ FILE TAMPERED`.
6. Attempt download: system returns `HTTP 409 Conflict` and refuses payload decryption.

---

## 30. Security Considerations

- **Secret Isolation:** Environment files (`.env`) are excluded via `.gitignore`.
- **Envelope Encryption:** Master keys encrypt individual file keys.
- **Input Sanitization:** Filenames and parameters are sanitized to prevent path traversal and header injection.
- **CORS & Rate Limiting:** Enforced via Helmet and `express-rate-limit`.

---

## 31. Future Enhancements

- **Asymmetric Multi-Party Sharing:** Public key encryption (RSA/ECC) for sharing files between users without sharing master keys.
- **Zero-Knowledge Proofs (ZK-SNARKs):** Verifying file access rights without revealing owner identities on-chain.
- **Ethereum Mainnet / Polygon L2 Deployment:** Migrating contract deployment to low-cost Ethereum Layer-2 networks.

---

## 32. Project Limitations

- **File Size Ceiling:** Maximum uploaded PDF size set to 50MB for in-memory buffer processing.
- **Browser Memory:** Large file downloads construct binary Blobs in client browser RAM.
- **Local Network Scope:** Initial setup configured for local Hardhat node (`http://127.0.0.1:8545`).
