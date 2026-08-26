# System Architecture Document

## 1. High-Level System Architecture

The architecture follows a multi-tier hybrid decentralized pattern combining:
- **Client Tier:** Single Page Application (React + Vite + Tailwind CSS).
- **Application Tier:** REST API Server (Node.js + Express.js) managing authentication, business logic, key envelope management, cryptographic processing, and external orchestration.
- **Relational Storage Tier:** MySQL database accessed via Prisma ORM for relational application state, user management, file metadata, and protected AES key parameters.
- **Decentralized File Storage Tier:** InterPlanetary File System (IPFS) via Pinata API for immutable decentralized storage of encrypted PDF binaries.
- **Decentralized Ledger Tier:** Ethereum-compatible blockchain (Hardhat Node) hosting the `FileRegistry.sol` smart contract for immutable metadata registration and tamper verification.

```mermaid
graph TD
    Client[React + Vite Frontend] <-->|REST API / JWT| Express[Node.js / Express API Server]
    
    subgraph Express Backend Services
        AuthService[Auth Service]
        CryptoService[Crypto Service - AES-256-GCM / Envelope]
        IPFSService[Pinata IPFS Service]
        BCService[Hardhat / Ethers.js Service]
        DBService[Prisma ORM Client]
    end

    Express --> AuthService
    Express --> CryptoService
    Express --> IPFSService
    Express --> BCService
    Express --> DBService

    DBService <-->|SQL Queries| MySQL[(MySQL Database)]
    IPFSService <-->|HTTPS API / Pinning| Pinata[Pinata IPFS Service]
    BCService <-->|JSON-RPC / Ethers.js| Hardhat[Hardhat Ethereum Node / FileRegistry.sol]
```

---

## 2. Component Architecture & Layered Responsibilities

### 2.1 Frontend (Client Tier)
- **UI Views:** Login, Register, Dashboard, Upload File Modal, File List, Access Management Modal, Integrity Verification Status Badge.
- **State Management & HTTP:** React Context / Axios for API requests, storing JWT in safe local storage or memory.
- **Validation:** Pre-flight client-side file type (`.pdf`) and size check.

### 2.2 Backend (Application Tier)
- **Controller Layer (`/routes`, `/controllers`):** Express handlers parsing input, managing standard REST responses, HTTP status codes, and error middleware.
- **Middleware Layer (`/middleware`):** `auth.middleware.js` (JWT verification & RBAC check), `upload.middleware.js` (Multer memory buffer parsing & PDF header verification).
- **Service Layer (`/services`):**
  - **`crypto.service.js`:** 
    - Generates 256-bit AES keys.
    - Encrypts/decrypts PDF buffers with AES-256-GCM (producing cipher, IV, authTag).
    - Wraps/unwraps per-file AES keys using server `MASTER_ENCRYPTION_KEY`.
    - Generates SHA-256 binary digests.
  - **`ipfs.service.js`:** Interacts with Pinata API to pin encrypted file buffers and unpin/retrieve content.
  - **`blockchain.service.js`:** Wraps `ethers.js` wallet/provider to invoke `FileRegistry.sol` smart contract methods (`registerFile`, `getFile`, `verifyHash`).
  - **`file.service.js`:** Orchestrates upload & download pipelines combining crypto, IPFS, blockchain, and Prisma database logic.

---

## 3. Sequence Diagrams

### 3.1 File Upload & Registration Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Client (User)
    participant API as Express API Server
    participant Crypto as Crypto Service
    participant IPFS as Pinata IPFS API
    participant BC as Hardhat Blockchain Node
    participant DB as MySQL (Prisma)

    User->>API: POST /api/files/upload (PDF + JWT)
    API->>API: Validate JWT & Verify PDF Magic Bytes (%PDF-)
    API->>Crypto: Generate random 256-bit AES Key
    API->>Crypto: Encrypt PDF payload (AES-256-GCM)
    Crypto-->>API: Return Encrypted PDF, IV, AuthTag
    API->>Crypto: Compute SHA-256 digest of Encrypted PDF
    Crypto-->>API: Return SHA-256 Hash
    API->>IPFS: Upload Encrypted PDF Buffer to IPFS
    IPFS-->>API: Return IPFS CID
    API->>BC: Call smart contract `registerFile(fileId, ipfsCid, sha256Hash)`
    BC-->>API: Transaction receipt & Tx Hash
    API->>Crypto: Wrap AES Key with Server Master Key (AES-256-GCM)
    Crypto-->>API: Return Wrapped Key, Key IV, Key AuthTag
    API->>DB: Store File Metadata & Protected Key in MySQL
    DB-->>API: Saved File Record
    API-->>User: 201 Created (fileId, ipfsCid, txHash, success)
```

---

### 3.2 File Download & Tamper Verification Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Client (User)
    participant API as Express API Server
    participant DB as MySQL (Prisma)
    participant BC as Hardhat Blockchain Node
    participant IPFS as Pinata IPFS Gateway
    participant Crypto as Crypto Service

    User->>API: GET /api/files/:id/download (JWT)
    API->>DB: Check Authorization (Owner or FileAccess record)
    DB-->>API: Authorized User Record & File Metadata
    API->>IPFS: Fetch Encrypted PDF by IPFS CID
    IPFS-->>API: Encrypted Binary Payload
    API->>Crypto: Compute SHA-256 digest of retrieved Payload
    Crypto-->>API: Calculated SHA-256 Hash
    API->>BC: Query `getFile(fileId)` / On-chain Hash
    BC-->>API: Canonical Immutable SHA-256 Hash
    
    alt Hash Mismatch (TAMPER DETECTED)
        API->>API: Log Security Alert & Tamper Incident
        API-->>User: 409 Conflict / 400 Bad Request ("File Tampered on IPFS!")
    else Hash Match (INTEGRITY VERIFIED)
        API->>DB: Retrieve Protected AES Key, IV, AuthTag from MySQL
        DB-->>API: Key Metadata
        API->>Crypto: Unwrap per-file AES Key using Server Master Key
        API->>Crypto: Decrypt PDF Payload using unwrapped AES Key & verify AuthTag
        Crypto-->>API: Decrypted Original PDF Binary Buffer
        API-->>User: 200 OK (Content-Type: application/pdf, Binary Stream)
    end
```

---

## 4. Key Architectural Decisions & Safeguards

| Decision Area | Technical Choice | Security Rationale |
| :--- | :--- | :--- |
| **File Encryption** | AES-256-GCM | Authenticated Encryption with Associated Data (AEAD); protects payload against ciphertext modification. |
| **Key Management** | Envelope Encryption | Per-file keys wrapped using server `MASTER_ENCRYPTION_KEY`. Raw keys never stored on disk or DB. |
| **Blockchain Role** | Immutable Hash Registry | Blockchain stores only hashes and CIDs; no raw keys, no document contents. Off-chain state stored in MySQL. |
| **Pre-decryption Check** | SHA-256 comparison vs Blockchain | Guarantees that tampered IPFS payloads are detected and dropped BEFORE attempting decryption. |
| **Database ORM** | Prisma + MySQL | Type-safe queries, migration control, strict relational mapping for access control. |
