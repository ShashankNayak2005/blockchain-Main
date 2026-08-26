# Product Requirements Document (PRD)

## Project Title
**Cloud-Based Secure File Sharing Using Blockchain and AES-256 Encryption**

---

## 1. Executive Summary & Objective
The goal of this project is to build an enterprise-grade, highly secure academic file-sharing application. The platform enables authenticated users to upload PDF documents securely into a decentralized storage network (IPFS), backed by strong cryptographic primitives (AES-256-GCM envelope encryption and SHA-256 checksums) and tamper-proof audit trails anchored on an Ethereum-compatible blockchain smart contract. 

MySQL (managed via Prisma ORM) serves as the relational application state store and holds protected (wrapped) AES file key metadata. Under no circumstances are raw encryption keys or unencrypted document files exposed publicly, saved to disk in plaintext, or stored on the blockchain.

---

## 2. Target Audience & Stakeholders
- **Academic Users / Researchers:** Upload confidential papers, exams, and proprietary datasets requiring tamper-proof integrity verification.
- **System Administrators:** Manage access control lists, monitor audit trails, and audit system integrity.

---

## 3. Core Functional Requirements

### 3.1 Authentication & Authorization
- **User Registration & Login:** Email/password authentication using bcrypt password hashing (minimum 12 salt rounds) and JSON Web Tokens (JWT) for session authorization.
- **Role-Based Access Control (RBAC):** `ADMIN` and `USER` roles. 
- **File Access Control (ACL):** Document owners can grant or revoke specific read/download permissions for other platform users.

### 3.2 File Ingestion & Security Processing (Upload Flow)
- **Format Validation:** Accept PDF files strictly (MIME type `application/pdf`, magic header check `%PDF-`).
- **Cryptographic Encryption:** Generate a unique, cryptographically secure 256-bit AES key per file using `crypto.randomBytes(32)`. Encrypt the PDF payload using **AES-256-GCM** with a unique 96-bit Initialization Vector (IV).
- **Decentralized Storage:** Upload strictly the *encrypted binary payload* to IPFS via the Pinata Pinning API.
- **Integrity Digest:** Calculate a SHA-256 hash of the encrypted PDF binary.
- **Blockchain Registration:** Store `fileId`, `ipfsCid`, `sha256Hash`, `ownerAddress/ID`, and `timestamp` in the `FileRegistry` smart contract on an Ethereum-compatible blockchain network (Local Hardhat for development).
- **Envelope Key Protection:** Protect (wrap) the per-file AES encryption key using a server-side Master Key (`MASTER_ENCRYPTION_KEY`) using AES-256-GCM.
- **Metadata Persistence:** Save protected key metadata, IVs, Auth Tags, IPFS CIDs, SHA-256 hashes, and blockchain transaction hashes into MySQL via Prisma.

### 3.3 Verification & Retrieval Flow (Download Flow)
- **Access Authorization:** Verify that the requesting user is either the file owner or holds an active grant in `FileAccess`.
- **Decentralized Fetching:** Retrieve the encrypted file payload directly from IPFS via Pinata IPFS Gateway or dedicated IPFS gateway.
- **Tamper Detection (Pre-Decryption Integrity Check):**
  1. Compute the SHA-256 hash of the retrieved IPFS binary payload.
  2. Query the `FileRegistry` smart contract on-chain for the canonical immutable `sha256Hash`.
  3. Compare the newly computed SHA-256 hash against the on-chain recorded hash.
  4. **IF MISMATCH:** Instantly reject the download, trigger an alert flag, and log a tampering incident. Do NOT attempt key unwrapping or decryption.
- **Key Unwrapping & Decryption:**
  1. Fetch the protected file AES key metadata from MySQL.
  2. Unwrap the per-file AES key using the server Master Key.
  3. Decrypt the PDF payload using AES-256-GCM and verify GCM authentication tag validity.
- **File Delivery:** Stream the decrypted PDF back to the user's browser securely with inline/attachment headers.

---

## 4. Non-Functional Requirements

### 4.1 Security & Compliance
- **Zero Plaintext Key Storage:** Plaintext AES file keys must never exist on disk, in MySQL, or on the blockchain.
- **Zero Raw File Storage on Blockchain:** Blockchain must strictly store metadata and hashes (`fileId`, `ipfsCid`, `sha256Hash`, `owner`, `timestamp`).
- **Cryptographic Authenticated Encryption:** AES-256-GCM guarantees both confidentiality and authentication tags for integrity against cipher-text manipulation.
- **Tamper Detection:** On-chain hash mismatch must fail-closed before any key operation or payload decryption occurs.
- **Master Key Security:** The server Master Key resides strictly in system environment variables (`.env`), never committed to source control or exposed via REST APIs.

### 4.2 Performance & Scalability
- Efficient streaming or buffering for file encryption/decryption (supporting up to 50MB files seamlessly).
- Fast IPFS pinning response via Pinata SDK/API.
- Smart contract execution gas-optimized for single-transaction registration.

### 4.3 Reliability & Auditability
- Complete logging of upload, access grant, download, and detected tampering events.
- Immutable event logs emitted by the smart contract for verifiable third-party auditing.

---

## 5. Explicit Technology Constraints
- **Database:** Strictly MySQL with Prisma ORM. (MongoDB is explicitly forbidden).
- **Storage:** Strictly IPFS with Pinata API (Firebase / local disk mock forbidden).
- **Blockchain:** Real local Hardhat Ethereum node running smart contract `FileRegistry.sol` compiled via Solc & Hardhat (No fake/mock blockchain wrappers).
- **Frontend Stack:** React, Vite, Tailwind CSS.
- **Backend Stack:** Node.js, Express.js.

---

## 6. Verification & Success Criteria
1. Full end-to-end file upload pipeline succeeds and stores valid records across IPFS, Hardhat Ethereum node, and MySQL.
2. File tampering test (altering 1 byte of the encrypted file on IPFS or during fetch) successfully triggers the blockchain integrity check failure and blocks decryption.
3. Non-authorized users are strictly denied download access at both the API and database levels.
4. Comprehensive test coverage (>80%) across Jest, Supertest, and Hardhat contract tests.
