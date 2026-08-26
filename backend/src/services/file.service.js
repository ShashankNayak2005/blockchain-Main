const crypto = require("crypto");
const { prisma } = require("../config/database");
const encryptionService = require("./encryption/encryption.service");
const hashService = require("./hashing/hash.service");
const ipfsService = require("./ipfs/ipfs.service");
const blockchainService = require("./blockchain/blockchain.service");
const { AppError, BadRequestError, ForbiddenError, NotFoundError } = require("../utils/errors");

class FileService {
  /**
   * Orchestrates the complete end-to-end PDF upload, encryption, IPFS pinning,
   * blockchain registration, key wrapping, and database persistence pipeline.
   */
  async processFileUpload({ fileBuffer, originalFileName, ownerId }) {
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
      throw new BadRequestError("Valid PDF binary file buffer is required.");
    }

    if (!ownerId) {
      throw new BadRequestError("Authenticated file owner identifier is required.");
    }

    // Step 1: Generate unique public file ID
    const fileId = `file_${crypto.randomUUID()}`;
    const safeFileName = originalFileName ? originalFileName.trim() : "document.pdf";

    // Step 2: Generate random 256-bit AES file key
    const fileKey = encryptionService.generateFileKey();

    // Step 3 & 4: Encrypt PDF payload using AES-256-GCM
    const { encryptedBuffer, iv: fileIv, authTag: fileAuthTag } = encryptionService.encryptFile(fileBuffer, fileKey);

    // Step 5: Compute SHA-256 digest of the FINAL ENCRYPTED BYTES payload
    const sha256Hash = hashService.calculateSHA256(encryptedBuffer);

    // Step 6: Upload ONLY encrypted bytes to IPFS
    let ipfsCid;
    try {
      ipfsCid = await ipfsService.uploadEncryptedFile(encryptedBuffer, {
        fileName: safeFileName,
        fileId
      });
    } catch (ipfsErr) {
      console.error(`❌ IPFS Upload Pipeline Failure [fileId: ${fileId}]:`, ipfsErr.message);
      throw new AppError(`Failed to store encrypted payload on IPFS: ${ipfsErr.message}`, ipfsErr.statusCode || 502, "IPFS_UPLOAD_FAILED");
    }

    // Step 7: Register file metadata and SHA-256 hash on Ethereum blockchain
    let blockchainTxHash;
    try {
      const bcReceipt = await blockchainService.registerFileOnBlockchain(fileId, ipfsCid, sha256Hash, ownerId);
      blockchainTxHash = bcReceipt.transactionHash;
    } catch (bcErr) {
      console.error(`❌ Blockchain Registration Pipeline Failure [fileId: ${fileId}]. Initiating IPFS rollback unpin...`, bcErr.message);

      // Rollback: Unpin from IPFS if blockchain registration failed
      try {
        await ipfsService.unpinFile(ipfsCid);
      } catch (unpinErr) {
        console.warn(`⚠️ Rollback unpin warning for CID [${ipfsCid}]:`, unpinErr.message);
      }

      throw new AppError(`Blockchain document registration failed: ${bcErr.message}`, bcErr.statusCode || 502, "BLOCKCHAIN_REGISTRATION_FAILED");
    }

    // Step 8: Wrap per-file AES key using SERVER_MASTER_KEY (Envelope Key Protection)
    const { encryptedAesKey, keyIv, keyAuthTag } = encryptionService.wrapFileKey(fileKey);

    // Step 9: Store file record & protected key parameters in MySQL database
    let fileRecord;
    try {
      fileRecord = await prisma.file.create({
        data: {
          fileId,
          originalFileName: safeFileName,
          mimeType: "application/pdf",
          fileSize: BigInt(encryptedBuffer.length),
          ownerId,
          ipfsCid,
          sha256Hash,
          encryptedAesKey,
          iv: fileIv,
          authTag: fileAuthTag,
          keyIv,
          keyAuthTag,
          blockchainTxHash,
          blockchainRecordId: fileId
        }
      });
    } catch (dbErr) {
      console.error(`CRITICAL INCONSISTENCY ALERT: Database record persistence failed after Blockchain registration! [fileId: ${fileId}, txHash: ${blockchainTxHash}]`, dbErr.message);
      throw new AppError(`Database persistence failed following blockchain registration: ${dbErr.message}`, 500, "DATABASE_PERSISTENCE_FAILED");
    }

    // Step 10: Return ONLY SAFE METADATA (Zero key or secret leakage)
    return {
      id: fileRecord.id,
      fileId: fileRecord.fileId,
      originalFileName: fileRecord.originalFileName,
      fileSize: Number(fileRecord.fileSize),
      ipfsCid: fileRecord.ipfsCid,
      sha256Hash: fileRecord.sha256Hash,
      blockchainTxHash: fileRecord.blockchainTxHash,
      createdAt: fileRecord.createdAt
    };
  }

  /**
   * Processes the secure download pipeline with pre-decryption tamper verification.
   */
  async processFileDownload({ fileId, userId }) {
    if (!fileId) {
      throw new BadRequestError("File ID is required for download.");
    }

    // 1. Retrieve file metadata from MySQL
    const fileRecord = await prisma.file.findFirst({
      where: {
        OR: [
          { id: fileId },
          { fileId: fileId }
        ]
      }
    });

    if (!fileRecord) {
      throw new NotFoundError(`File [${fileId}] not found.`);
    }

    // 2. Verify Authorization (Owner or FileAccess grant)
    const isOwner = fileRecord.ownerId === userId;
    let hasGrant = false;

    if (!isOwner) {
      const grant = await prisma.fileAccess.findUnique({
        where: {
          fileId_userId: {
            fileId: fileRecord.id,
            userId
          }
        }
      });
      hasGrant = !!grant;
    }

    if (!isOwner && !hasGrant) {
      throw new ForbiddenError("Access denied: You do not have permission to download this file.");
    }

    // 3. Fetch canonical blockchain record using fileId
    let onChainRecord;
    try {
      onChainRecord = await blockchainService.getOnChainFile(fileRecord.fileId);
    } catch (bcErr) {
      console.error(`❌ Download Pipeline Failure: Blockchain record query failed [fileId: ${fileRecord.fileId}]:`, bcErr.message);
      if (bcErr instanceof NotFoundError) {
        throw new AppError("CRITICAL INTEGRITY FAILURE: File record missing on blockchain.", 404, "BLOCKCHAIN_RECORD_MISSING");
      }
      throw new AppError(`Blockchain verification unavailable: ${bcErr.message}`, bcErr.statusCode || 502, "BLOCKCHAIN_VERIFY_UNAVAILABLE");
    }

    if (!onChainRecord || !onChainRecord.exists) {
      throw new AppError("CRITICAL INTEGRITY FAILURE: File record missing on blockchain.", 404, "BLOCKCHAIN_RECORD_MISSING");
    }

    // 4 & 5. Download encrypted PDF payload from IPFS using CID (checks tamper override if active)
    const ipfsCid = onChainRecord.ipfsCid || fileRecord.ipfsCid;
    let encryptedBuffer;

    try {
      encryptedBuffer = await ipfsService.downloadEncryptedFile(ipfsCid);
    } catch (ipfsErr) {
      console.error(`❌ Download Pipeline Failure: IPFS fetch failed for CID [${ipfsCid}]:`, ipfsErr.message);
      throw new AppError(`Failed to fetch file payload from IPFS network: ${ipfsErr.message}`, ipfsErr.statusCode || 502, "IPFS_DOWNLOAD_FAILED");
    }

    // 6. Calculate SHA-256 hash of the downloaded encrypted binary bytes
    const downloadedPayloadHash = hashService.calculateSHA256(encryptedBuffer);
    const canonicalOnChainHash = onChainRecord.sha256Hash.toLowerCase();

    // 7. Secure timing-safe comparison of downloaded hash vs expected on-chain hash
    const bufA = Buffer.from(downloadedPayloadHash.toLowerCase(), "utf-8");
    const bufB = Buffer.from(canonicalOnChainHash, "utf-8");

    const isIntegrityVerified = bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);

    // 8. MANDATORY SECURITY CHECK: IF HASHES DO NOT MATCH -> ABORT DOWNLOAD IMMEDIATELY!
    if (!isIntegrityVerified) {
      console.error(`🚨 [CRITICAL SECURITY EVENT] FILE TAMPER DETECTED! fileId: ${fileRecord.fileId}, IPFS CID: ${ipfsCid}`);
      console.error(`   Downloaded Encrypted Payload SHA-256: ${downloadedPayloadHash}`);
      console.error(`   Blockchain Canonical SHA-256:       ${canonicalOnChainHash}`);

      // DO NOT RETRIEVE OR UNWRAP AES KEY! DO NOT DECRYPT!
      throw new AppError(
        "File integrity verification failed. The file may have been modified or corrupted.",
        409,
        "INTEGRITY_VERIFICATION_FAILED"
      );
    }

    // 9. Hashes match 100%! Unwrap per-file AES key using SERVER_MASTER_KEY
    let unwrappedFileKey;
    try {
      unwrappedFileKey = encryptionService.unwrapFileKey(
        fileRecord.encryptedAesKey,
        fileRecord.keyIv,
        fileRecord.keyAuthTag
      );
    } catch (keyErr) {
      console.error(`❌ Key unwrapping failed for file [${fileRecord.fileId}]:`, keyErr.message);
      throw new AppError("Failed to unwrap encryption key using Server Master Key.", 500, "KEY_UNWRAP_FAILED");
    }

    // 10. Decrypt PDF payload using AES-256-GCM with payload IV and AuthTag
    let decryptedPdfBuffer;
    try {
      decryptedPdfBuffer = encryptionService.decryptFile(
        encryptedBuffer,
        unwrappedFileKey,
        fileRecord.iv,
        fileRecord.authTag
      );
    } catch (decryptErr) {
      console.error(`❌ PDF Decryption failed for file [${fileRecord.fileId}]:`, decryptErr.message);
      throw new AppError("File payload decryption failed. Encrypted data or authentication tag may be corrupted.", 400, "DECRYPTION_FAILED");
    }

    return {
      pdfBuffer: decryptedPdfBuffer,
      originalFileName: fileRecord.originalFileName,
      mimeType: fileRecord.mimeType || "application/pdf",
      fileId: fileRecord.fileId,
      sha256Hash: downloadedPayloadHash,
      blockchainTxHash: fileRecord.blockchainTxHash
    };
  }

  /**
   * Retrieves files accessible to the user with pagination & search filtering.
   */
  async getUserFiles({ userId, page = 1, limit = 10, search = "" }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const searchQuery = search ? search.trim() : "";

    const whereClause = {
      OR: [
        { ownerId: userId },
        { accessRules: { some: { userId } } }
      ],
      ...(searchQuery ? { originalFileName: { contains: searchQuery } } : {})
    };

    const [total, records] = await Promise.all([
      prisma.file.count({ where: whereClause }),
      prisma.file.findMany({
        where: whereClause,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fileId: true,
          originalFileName: true,
          mimeType: true,
          fileSize: true,
          ownerId: true,
          ipfsCid: true,
          sha256Hash: true,
          blockchainTxHash: true,
          createdAt: true,
          updatedAt: true,
          owner: {
            select: { id: true, name: true, email: true }
          }
        }
      })
    ]);

    const formattedFiles = records.map((f) => ({
      id: f.id,
      fileId: f.fileId,
      originalFileName: f.originalFileName,
      mimeType: f.mimeType,
      fileSize: Number(f.fileSize),
      ipfsCid: f.ipfsCid,
      sha256Hash: f.sha256Hash,
      blockchainTxHash: f.blockchainTxHash,
      isOwner: f.ownerId === userId,
      owner: f.owner,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt
    }));

    return {
      files: formattedFiles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    };
  }

  /**
   * Retrieves metadata for an authorized file.
   */
  async getFileDetails({ fileId, userId }) {
    const fileRecord = await prisma.file.findFirst({
      where: {
        OR: [
          { id: fileId },
          { fileId: fileId }
        ]
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        accessRules: {
          select: {
            user: { select: { id: true, name: true, email: true } },
            createdAt: true
          }
        }
      }
    });

    if (!fileRecord) {
      throw new NotFoundError(`File [${fileId}] not found.`);
    }

    const isOwner = fileRecord.ownerId === userId;
    const hasGrant = fileRecord.accessRules.some((grant) => grant.user.id === userId);

    if (!isOwner && !hasGrant) {
      throw new ForbiddenError("Access denied: You do not have permission to view metadata for this file.");
    }

    let onChainState = null;
    try {
      onChainState = await blockchainService.getOnChainFile(fileRecord.fileId);
    } catch (e) {
      // Non-fatal
    }

    return {
      id: fileRecord.id,
      fileId: fileRecord.fileId,
      originalFileName: fileRecord.originalFileName,
      mimeType: fileRecord.mimeType,
      fileSize: Number(fileRecord.fileSize),
      ipfsCid: fileRecord.ipfsCid,
      sha256Hash: fileRecord.sha256Hash,
      blockchainTxHash: fileRecord.blockchainTxHash,
      isOwner,
      owner: fileRecord.owner,
      sharedWith: fileRecord.accessRules.map((r) => r.user),
      onChainState: onChainState
        ? {
            ipfsCid: onChainState.ipfsCid,
            sha256Hash: onChainState.sha256Hash,
            owner: onChainState.owner,
            timestamp: onChainState.timestamp,
            exists: onChainState.exists
          }
        : null,
      createdAt: fileRecord.createdAt,
      updatedAt: fileRecord.updatedAt
    };
  }

  /**
   * Deletes a file. Only file owner.
   */
  async deleteFile({ fileId, userId }) {
    const fileRecord = await prisma.file.findFirst({
      where: {
        OR: [
          { id: fileId },
          { fileId: fileId }
        ]
      }
    });

    if (!fileRecord) {
      throw new NotFoundError(`File [${fileId}] not found.`);
    }

    if (fileRecord.ownerId !== userId) {
      throw new ForbiddenError("Access denied: Only the file owner is authorized to delete this file.");
    }

    try {
      await ipfsService.unpinFile(fileRecord.ipfsCid);
    } catch (e) {
      console.warn(`⚠️ Unpin failed during file deletion [CID: ${fileRecord.ipfsCid}]:`, e.message);
    }

    await prisma.file.delete({
      where: { id: fileRecord.id }
    });

    return {
      success: true,
      message: "File deleted successfully",
      fileId: fileRecord.fileId
    };
  }

  /**
   * Verifies the current IPFS file payload against the blockchain hash WITHOUT DECRYPTING IT!
   */
  async verifyFileOnDemand({ fileId, userId }) {
    const fileRecord = await prisma.file.findFirst({
      where: {
        OR: [
          { id: fileId },
          { fileId: fileId }
        ]
      }
    });

    if (!fileRecord) {
      throw new NotFoundError(`File [${fileId}] not found.`);
    }

    const isOwner = fileRecord.ownerId === userId;
    let hasGrant = false;

    if (!isOwner) {
      const grant = await prisma.fileAccess.findUnique({
        where: {
          fileId_userId: { fileId: fileRecord.id, userId }
        }
      });
      hasGrant = !!grant;
    }

    if (!isOwner && !hasGrant) {
      throw new ForbiddenError("Access denied: You do not have permission to verify this file.");
    }

    let onChainRecord;
    try {
      onChainRecord = await blockchainService.getOnChainFile(fileRecord.fileId);
    } catch (bcErr) {
      throw new AppError(`Blockchain lookup failed during verification: ${bcErr.message}`, 502, "BLOCKCHAIN_QUERY_FAILED");
    }

    if (!onChainRecord || !onChainRecord.exists) {
      throw new AppError("File record missing on blockchain.", 404, "BLOCKCHAIN_RECORD_MISSING");
    }

    const ipfsCid = onChainRecord.ipfsCid || fileRecord.ipfsCid;
    let encryptedBuffer;
    try {
      encryptedBuffer = await ipfsService.downloadEncryptedFile(ipfsCid);
    } catch (ipfsErr) {
      throw new AppError(`Failed to fetch file payload from IPFS: ${ipfsErr.message}`, 502, "IPFS_FETCH_FAILED");
    }

    const currentFileHash = hashService.calculateSHA256(encryptedBuffer).toLowerCase();
    const blockchainHash = onChainRecord.sha256Hash.toLowerCase();

    const bufA = Buffer.from(currentFileHash, "utf-8");
    const bufB = Buffer.from(blockchainHash, "utf-8");
    const verified = bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);

    return {
      fileId: fileRecord.fileId,
      ipfsCid,
      blockchainHash,
      currentFileHash,
      verified,
      isVerified: verified,
      verificationTimestamp: new Date().toISOString()
    };
  }

  /**
   * DEMO & TESTING UTILITY: Simulates 1-byte file payload corruption on IPFS.
   * Flips bits in the cached payload WITHOUT modifying the blockchain record.
   */
  async simulateTamper({ fileId, userId }) {
    const fileRecord = await prisma.file.findFirst({
      where: {
        OR: [
          { id: fileId },
          { fileId: fileId }
        ]
      }
    });

    if (!fileRecord) {
      throw new NotFoundError(`File [${fileId}] not found.`);
    }

    if (fileRecord.ownerId !== userId) {
      throw new ForbiddenError("Only file owner can trigger tamper simulation.");
    }

    ipfsService.simulateTamperPayload(fileRecord.ipfsCid);

    return {
      success: true,
      message: "Simulated 1-byte tamper in IPFS payload cache. Blockchain record remains immutable.",
      fileId: fileRecord.fileId,
      ipfsCid: fileRecord.ipfsCid
    };
  }

  /**
   * DEMO & TESTING UTILITY: Resets file payload back to pristine state.
   */
  async resetTamper({ fileId, userId }) {
    const fileRecord = await prisma.file.findFirst({
      where: {
        OR: [
          { id: fileId },
          { fileId: fileId }
        ]
      }
    });

    if (!fileRecord) {
      throw new NotFoundError(`File [${fileId}] not found.`);
    }

    ipfsService.resetTamperPayload(fileRecord.ipfsCid);

    return {
      success: true,
      message: "Reset tamper simulation. Restored pristine IPFS payload.",
      fileId: fileRecord.fileId,
      ipfsCid: fileRecord.ipfsCid
    };
  }
}

module.exports = new FileService();
