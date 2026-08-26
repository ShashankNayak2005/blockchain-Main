# Blockchain Tamper-Detection Demonstration Guide

## 1. Executive Summary & Purpose

The purpose of this demonstration is to empirically prove that **Ethereum Blockchain integrity anchoring** guarantees fail-closed data integrity. Even if an attacker or corrupted storage provider modifies **just a single byte (1 bit)** of an encrypted PDF file payload stored on IPFS, the system immediately detects the hash mismatch against the immutable smart contract (`FileRegistry.sol`) and **refuses to decrypt or download the document**.

---

## 2. Cryptographic Integrity Architecture

```
                                              +----------------------------------+
                                              | Ethereum Blockchain Smart        |
                                              | Contract (FileRegistry.sol)     |
                                              +----------------+-----------------+
                                                               |
                                                 Canonical     | Immutable
                                                 SHA-256 Digest| On-Chain Record
                                                               v
   +-----------------------+              +--------------------+-----------------+
   | Downloaded IPFS Payload| --SHA-256--> | Cryptographic Timing-Safe Comparison  |
   | (Encrypted Bytes)     |              | (Buffer.timingSafeEqual)             |
   +-----------------------+              +--------------------+-----------------+
                                                               |
                                           +-------------------+-------------------+
                                           |                                       |
                                    [Hashes Match?]                         [Hash Mismatch!]
                                           |                                       |
                                           v                                       v
                             +-------------+-------------+           +-------------+-------------+
                             | Unwrap AES Key with       |           | 🚨 SECURITY ALERT DETECTED  |
                             | SERVER_MASTER_KEY &       |           | Abort Decryption Immediately|
                             | Decrypt PDF Payload       |           | Return HTTP 409 Conflict    |
                             +---------------------------+           +---------------------------+
                             | STATUS: ✓ AUTHENTIC       |           | STATUS: ✗ FILE TAMPERED   |
                             +---------------------------+           +---------------------------+
```

---

## 3. Demonstration Procedure via Web UI

### Step 1: Upload a PDF Document
1. Log in to the application and navigate to **Upload File** (`/upload`).
2. Upload any valid PDF document (e.g., `Research_Paper.pdf`).
3. Click **Encrypt & Register PDF on Blockchain**.
4. Observe the 5-step pipeline completion:
   - `✓ PDF Encrypted` (AES-256-GCM)
   - `✓ Uploaded to IPFS` (Pinata Gateway CID)
   - `✓ SHA-256 Generated`
   - `✓ Blockchain Registered` (Hardhat EVM Node)
   - `✓ Metadata Stored`

---

### Step 2: Perform Normal Pristine Verification & Download
1. Navigate to **My Files** (`/my-files`) and click **Verify** on your uploaded document.
2. Observe the verification status:
   - **ORIGINAL HASH (ETHEREUM BLOCKCHAIN):** `af53bdea923d99a1e2c791fccb2fa868454bd5177bd5974010e912b35ed18906`
   - **CURRENT FILE HASH (IPFS PAYLOAD):** `af53bdea923d99a1e2c791fccb2fa868454bd5177bd5974010e912b35ed18906`
   - **STATUS:** `✓ AUTHENTIC`
3. Click **Proceed to Secure Download**. The step-by-step modal will run, verify the hash, unwrap the AES key, decrypt the payload, and save the original PDF.

---

### Step 3: Trigger Simulated 1-Byte File Tampering
1. On the **Verification Page** (`/files/:fileId/verify`), locate the **Tamper-Detection Demonstration Controls** card.
2. Click **Simulate 1-Byte Tamper**.
3. The backend flips 1 byte (`0xFF` XOR operation) in the cached IPFS payload buffer **without altering the smart contract record**.
4. Observe the updated verification view:
   - **ORIGINAL HASH (ETHEREUM BLOCKCHAIN):** `af53bdea923d99a1e2c791fccb2fa868454bd5177bd5974010e912b35ed18906` (Unchanged / Immutable)
   - **CURRENT FILE HASH (IPFS PAYLOAD):** `0cbb733c76a1d98b676e476d77a93c671bfff9578bea49d0508e0c8aa6a34a42` (Modified)
   - **STATUS:** `STATUS: ✗ FILE TAMPERED`
5. The **Download Button is automatically disabled**.

---

### Step 4: Attempt Direct Download of Tampered File
If an attacker attempts to call `GET /api/files/:fileId/download` directly on a tampered payload:
- **HTTP Response Code:** `409 Conflict`
- **Error Response Body:**
  ```json
  {
    "success": false,
    "error": {
      "code": "INTEGRITY_VERIFICATION_FAILED",
      "message": "File integrity verification failed. The file may have been modified or corrupted."
    }
  }
  ```
- **Console Log Output:**
  ```
  🚨 [CRITICAL SECURITY EVENT] FILE TAMPER DETECTED! fileId: file_613fedac...
     Downloaded Encrypted Payload SHA-256: 0cbb733c76a1d98b...
     Blockchain Canonical SHA-256:       af53bdea923d99a1...
  ```
- **Key Unwrapping & Decryption:** **NEVER CALLED**. Zero keys are retrieved or unwrapped.

---

### Step 5: Restore Pristine File Condition
1. Click **Restore Pristine File** on the Verification Page.
2. Click **Re-Audit On-Chain**.
3. Status returns to `STATUS: ✓ AUTHENTIC`, and downloads succeed cleanly again.

---

## 4. Automated Integration Test Execution

To run the automated Jest test suite covering this exact scenario:

```bash
cd backend
npx jest tests/tamper-demo.test.js
```

> **Test Output:**
> ```
> PASS tests/tamper-demo.test.js
> Complete Blockchain Tamper-Detection Demonstration Automated Test
>   ✓ Step 1-5: Upload PDF, encrypt AES-256, pin IPFS, generate SHA-256, store on Blockchain (23 ms)
>   ✓ Step 6-7: Pristine Download & Verification MUST PASS (STATUS: ✓ AUTHENTIC) (20 ms)
>   ✓ Step 8-13: Simulate 1-byte tamper in IPFS payload -> Verification MUST FAIL & Download BLOCKED (56 ms)
>   ✓ Step 14: Reset tamper -> File restored to pristine state & Download succeeds again (17 ms)
> ```
