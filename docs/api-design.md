# API Design Document

## 1. Overview & Protocol Guidelines
- **Base URL:** `http://localhost:5000/api/v1`
- **Protocol:** HTTP/1.1 RESTful JSON API (Multipart for file uploads, Binary Stream for downloads).
- **Authentication Header:** `Authorization: Bearer <JWT_TOKEN>`
- **Standard Response Structure:**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": {}
  }
  ```
- **Standard Error Response Structure:**
  ```json
  {
    "success": false,
    "error": {
      "code": "ERROR_CODE_STRING",
      "message": "Human readable error description",
      "details": null
    }
  }
  ```

---

## 2. API Endpoint Matrix

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/auth/register` | None | Register a new user account |
| **POST** | `/auth/login` | None | Authenticate user & return JWT token |
| **GET** | `/auth/me` | JWT | Get current authenticated user profile |
| **POST** | `/files/upload` | JWT | Upload PDF, encrypt, pin to IPFS, register on blockchain |
| **GET** | `/files` | JWT | List accessible files (owned + shared) |
| **GET** | `/files/:id` | JWT | Get metadata & blockchain verification state |
| **GET** | `/files/:id/download` | JWT | Perform pre-decryption integrity check & download PDF |
| **GET** | `/files/:id/verify` | JWT | Verify IPFS payload vs Blockchain SHA-256 on demand |
| **POST** | `/files/:id/share` | JWT | Grant access to another user by email |
| **DELETE** | `/files/:id/share/:userId` | JWT | Revoke access from a user |
| **DELETE** | `/files/:id` | JWT | Deactivate file record on-chain and soft-delete in DB |

---

## 3. Detailed Endpoint Specifications

### 3.1 Authentication Endpoints

#### `POST /auth/register`
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@university.edu",
    "password": "SecurePassword123!"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "data": {
      "user": {
        "id": "u-1234-uuid",
        "name": "Jane Doe",
        "email": "jane@university.edu",
        "role": "USER",
        "createdAt": "2026-08-20T12:00:00.000Z"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```

#### `POST /auth/login`
- **Request Body:**
  ```json
  {
    "email": "jane@university.edu",
    "password": "SecurePassword123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Authentication successful",
    "data": {
      "user": {
        "id": "u-1234-uuid",
        "name": "Jane Doe",
        "email": "jane@university.edu",
        "role": "USER"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```

---

### 3.2 File Processing Endpoints

#### `POST /files/upload`
- **Headers:** `Content-Type: multipart/form-data`, `Authorization: Bearer <JWT>`
- **Form Data:**
  - `file`: PDF File binary (Max size: 50MB)
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "File encrypted, pinned to IPFS, and registered on blockchain successfully",
    "data": {
      "id": "f-9876-uuid",
      "fileId": "file_8f9a2b1c3d",
      "originalFileName": "Research_Paper_Final.pdf",
      "fileSize": 2458902,
      "ipfsCid": "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
      "sha256Hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "blockchainTxHash": "0x7d9f8a3b2c1e0f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
      "createdAt": "2026-08-20T12:05:00.000Z"
    }
  }
  ```

#### `GET /files`
- **Query Params:** `page=1&limit=10&search=Research`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "files": [
        {
          "id": "f-9876-uuid",
          "fileId": "file_8f9a2b1c3d",
          "originalFileName": "Research_Paper_Final.pdf",
          "fileSize": 2458902,
          "ipfsCid": "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
          "sha256Hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          "isOwner": true,
          "owner": {
            "name": "Jane Doe",
            "email": "jane@university.edu"
          },
          "createdAt": "2026-08-20T12:05:00.000Z"
        }
      ],
      "pagination": { "page": 1, "total": 1, "totalPages": 1 }
    }
  }
  ```

#### `GET /files/:id/download`
- **Response Headers:**
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="Research_Paper_Final.pdf"`
  - `X-Integrity-Status: VERIFIED_ON_BLOCKCHAIN`
- **Payload:** Decrypted original binary stream of the PDF file.
- **Error Response if Tampered (409 Conflict):**
  ```json
  {
    "success": false,
    "error": {
      "code": "TAMPER_DETECTED",
      "message": "SECURITY ALERT: Download blocked! IPFS file content hash does not match canonical Blockchain SHA-256 record."
    }
  }
  ```

#### `GET /files/:id/verify`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "fileId": "file_8f9a2b1c3d",
      "integrityVerified": true,
      "calculatedIpfsHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "onChainHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "ipfsCid": "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
      "blockchainTxHash": "0x7d9f8a3b2c1e0f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
      "verifiedAt": "2026-08-20T12:10:00.000Z"
    }
  }
  ```

#### `POST /files/:id/share`
- **Request Body:**
  ```json
  {
    "recipientEmail": "colleague@university.edu"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "File access granted to colleague@university.edu successfully"
  }
  ```
