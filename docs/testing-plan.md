# Testing Strategy & Verification Plan

## 1. Overview & Test Objectives
To guarantee the highest level of security, cryptographic correctness, and system reliability, the project employs a multi-tiered automated and manual testing suite:

1. **Smart Contract Unit Tests (Hardhat / Chai):** Test Solidity contract functions, modifiers, event emissions, and edge cases on an in-memory EVM.
2. **Cryptographic Core Unit Tests (Jest):** Verify AES-256-GCM encryption/decryption, Key Wrapping/Unwrapping, SHA-256 calculation, and invalid tag failures.
3. **API Integration Tests (Jest + Supertest):** Test Express REST endpoints, JWT authentication middleware, Prisma database queries, and error handling DTOs.
4. **Security & Tamper Simulation Verification:** Real-world simulation of IPFS payload corruption and authorization bypass attempts.

---

## 2. Automated Test Matrix

| Test Suite | Framework | Scope | Location |
| :--- | :--- | :--- | :--- |
| **Smart Contract Tests** | Hardhat / Ethers / Chai | Solc contract methods, ownership checks, event logs | `test/hardhat/FileRegistry.test.js` |
| **Crypto Core Tests** | Jest | AES-256-GCM, Envelope key wrapping, SHA-256 | `test/backend/crypto.test.js` |
| **Auth API Tests** | Jest / Supertest | User registration, login, JWT validation, bcrypt | `test/backend/auth.test.js` |
| **File API & Tamper Tests** | Jest / Supertest | Upload, download, hash comparison, pre-decryption fail | `test/backend/file.test.js` |

---

## 3. Detailed Security & Tamper Test Scenarios

### Scenario 1: Successful End-to-End Upload and Download Flow
- **Goal:** Verify that a legitimate user can upload a valid PDF and download it uncorrupted.
- **Steps:**
  1. Login as User A.
  2. Upload valid `sample.pdf` buffer.
  3. Verify encrypted binary is pinned to IPFS, SHA-256 recorded on-chain, and protected key stored in MySQL.
  4. User A requests download `/api/v1/files/:id/download`.
  5. System retrieves IPFS payload, matches computed SHA-256 with blockchain, unwraps key, decrypts payload.
- **Expected Result:** HTTP 200 OK with binary stream matching original PDF byte-for-byte.

---

### Scenario 2: IPFS Payload Tamper Attack Simulation
- **Goal:** Verify that modifying 1 byte of the encrypted file stored on IPFS instantly blocks decryption.
- **Steps:**
  1. Perform standard upload of `sample.pdf`.
  2. Mock/Intermittent step: Modify 1 byte of the encrypted buffer returned from IPFS gateway during download.
  3. Express server calculates SHA-256 digest of the tampered buffer.
  4. Query `FileRegistry` smart contract for canonical SHA-256 hash.
  5. Compare candidate hash vs canonical on-chain hash.
- **Expected Result:**
  - Hashes **DO NOT MATCH**.
  - Server logs security alert: `[SECURITY ALERT] Tamper detected for fileId...`
  - System immediately returns **HTTP 409 Conflict** with message `"SECURITY ALERT: Download blocked! IPFS file content hash does not match canonical Blockchain SHA-256 record."`
  - **No decryption or key unwrapping is attempted**.

---

### Scenario 3: GCM Auth Tag Corruption Attack
- **Goal:** Verify that if the cipher text or auth tag in MySQL is modified, AES-256-GCM authentication fails cleanly.
- **Steps:**
  1. Alter `fileAuthTag` or `encryptedAesKey` in MySQL record directly.
  2. Attempt download route.
- **Expected Result:** Node `crypto` throws `Unsupported state or unable to authenticate data`. Express error handler catches exception and returns **HTTP 400 Bad Request** / **500 Error** safely without crashing or exposing stack traces.

---

### Scenario 4: Unauthorized User Download Attempt
- **Goal:** Verify that a user who is neither the owner nor granted access in `FileAccess` is denied download access.
- **Steps:**
  1. User A uploads file `F1`.
  2. User B logs in and attempts `GET /api/v1/files/F1/download`.
- **Expected Result:** **HTTP 403 Forbidden** returned. No IPFS or Blockchain call initiated.

---

### Scenario 5: Non-PDF File Header Spoofing Attack
- **Goal:** Verify that renaming an executable `.exe` to `.pdf` fails pre-upload magic byte validation.
- **Steps:**
  1. Create file with executable binary content named `fake.pdf`.
  2. POST to `/api/v1/files/upload`.
  3. Upload middleware inspects magic header (`%PDF-`).
- **Expected Result:** **HTTP 400 Bad Request** with message `"Invalid file format: File must be a valid PDF document"`.

---

## 4. Test Execution Commands

```bash
# 1. Run Hardhat Smart Contract Unit Tests
npx hardhat test

# 2. Run Backend Unit & Integration Tests (Jest)
npm run test:backend

# 3. Run Specific Cryptographic Core Test
npx jest test/backend/crypto.test.js

# 4. Run End-to-End Security & Tamper Test Suite
npm run test:security
```
