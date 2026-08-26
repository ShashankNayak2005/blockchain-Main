const express = require("express");
const {
  uploadFile,
  downloadFile,
  listFiles,
  getFileDetails,
  deleteFile,
  verifyFile,
  simulateTamper,
  resetTamper
} = require("../controllers/file.controller");
const {
  authenticateUser,
  authorizeOwner,
  authorizeFileAccess
} = require("../middleware/auth.middleware");
const { validatePdfUpload } = require("../middleware/upload.middleware");

const router = express.Router();

// Upload PDF Endpoint
router.post("/upload", authenticateUser, validatePdfUpload, uploadFile);

// List Files Endpoint (with pagination and search)
router.get("/", authenticateUser, listFiles);

// Get File Details Endpoint
router.get("/:fileId", authenticateUser, authorizeFileAccess, getFileDetails);

// Verify File On-Demand Endpoint (No decryption performed)
router.get("/:fileId/verify", authenticateUser, authorizeFileAccess, verifyFile);

// Download PDF Endpoint (Protected with Pre-Decryption Integrity Check)
router.get("/:fileId/download", authenticateUser, authorizeFileAccess, downloadFile);

// Delete File Endpoint (Owner Only)
router.delete("/:fileId", authenticateUser, authorizeOwner, deleteFile);

// DEMO & TESTING UTILITY: Simulate 1-byte IPFS payload corruption (Owner Only)
router.post("/:fileId/simulate-tamper", authenticateUser, authorizeOwner, simulateTamper);

// DEMO & TESTING UTILITY: Reset IPFS payload to pristine condition (Owner Only)
router.post("/:fileId/reset-tamper", authenticateUser, authorizeOwner, resetTamper);

module.exports = router;
