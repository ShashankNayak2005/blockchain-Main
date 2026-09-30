# Cloud-Based Secure File Sharing Using Blockchain and AES-256 Encryption

A full-stack enterprise academic project that provides tamper-proof, secure PDF document sharing using **AES-256-GCM Envelope Encryption**, **IPFS Decentralized Storage**, **Ethereum Blockchain Integrity Anchoring**, and a **MySQL Database (Prisma ORM)**.

---

## 🚀 Key Features & Architectural Principles
- **Envelope Encryption:** Every uploaded PDF is encrypted with a unique 256-bit AES key. The file key is wrapped using a server-side `MASTER_ENCRYPTION_KEY`.
- **Zero Raw Key Storage:** Plaintext AES encryption keys are **never** stored on the blockchain or in MySQL.
- **Pre-Decryption Fail-Closed Tamper Detection:** During download, the server computes the SHA-256 hash of the IPFS binary payload and verifies it against the canonical hash stored in the `FileRegistry.sol` smart contract on Ethereum. Hashes MUST match before decryption or key unwrapping proceeds.
- **Immutable Audit Trail:** On-chain record keeping for document existence, ownership, and time-stamped integrity logs.

---

## 🛠️ Technology Stack
- **Frontend:** React 18, Vite, Tailwind CSS, Lucide React, Axios, React Router v6
- **Backend:** Node.js, Express.js, JWT, bcryptjs, Multer
- **Database:** MySQL 8.0+, Prisma ORM
- **Encryption:** AES-256-GCM, SHA-256 checksums
- **Storage:** IPFS (via Pinata API)
- **Blockchain:** Solidity (`0.8.20`), Hardhat, Ethers.js v6

---

## 📁 Repository Structure
```
secure-file-sharing-blockchain/
├── docs/                      # Architectural & design documentation
│   ├── product-requirements.md
│   ├── architecture.md
│   ├── database-design.md
│   ├── blockchain-design.md
│   ├── security-design.md
│   ├── api-design.md
│   ├── development-plan.md
│   └── testing-plan.md
├── frontend/                  # React + Vite + Tailwind CSS SPA
├── backend/                   # Node.js + Express REST API & Crypto Services
├── blockchain/                # Solidity Contracts & Hardhat EVM Node
├── scripts/                   # System automation & seeding scripts
├── .env.example               # Central environment configuration template
└── package.json               # Root monorepo workspace orchestration
```

---

## ⚡ Quickstart Guide

### 1. Prerequisites
- **Node.js:** `v18.x` or `v20.x`
- **MySQL:** Running instance on `localhost:3306`

### 2. Environment Setup
Copy the template environment file:
```bash
cp .env.example .env
```
Fill in your `MASTER_ENCRYPTION_KEY` (64 hex characters), MySQL credentials, and Pinata IPFS keys.

### 3. Install All Dependencies
```bash
npm run install:all
```

### 4. Start Local Hardhat Blockchain & Deploy Contract
```bash
# In terminal 1:
npm run blockchain:node   1

# In terminal 2:
npm run blockchain:deploy   2
```

### 5. Run Database Migration
```bash
npm --prefix backend run prisma:generate
npm --prefix backend run prisma:migrate
```

### 6. Start Application Servers
```bash
# Start Backend REST Server
npm run dev:backend                3

# Start Frontend Client Application
npm run dev:frontend               4
```

---

## 📜 Documentation & Specifications
Detailed architectural blueprints and security specs are available in the [docs/](file:///c:/Users/shash/Music/secure-file-sharing-blockchain/docs) directory:
- [Product Requirements](file:///c:/Users/shash/Music/secure-file-sharing-blockchain/docs/product-requirements.md)
- [System Architecture](file:///c:/Users/shash/Music/secure-file-sharing-blockchain/docs/architecture.md)
- [Database Design & Schema](file:///c:/Users/shash/Music/secure-file-sharing-blockchain/docs/database-design.md)
- [Blockchain & Smart Contracts](file:///c:/Users/shash/Music/secure-file-sharing-blockchain/docs/blockchain-design.md)
- [Security & Envelope Encryption](file:///c:/Users/shash/Music/secure-file-sharing-blockchain/docs/security-design.md)
- [API Reference](file:///c:/Users/shash/Music/secure-file-sharing-blockchain/docs/api-design.md)
