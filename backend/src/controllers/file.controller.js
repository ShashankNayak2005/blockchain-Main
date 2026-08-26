const fileService = require("../services/file.service");

async function uploadFile(req, res, next) {
  try {
    const safeMetadata = await fileService.processFileUpload({
      fileBuffer: req.file.buffer,
      originalFileName: req.file.originalname,
      ownerId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: "File encrypted, pinned to IPFS, and registered on blockchain successfully",
      data: safeMetadata
    });
  } catch (error) {
    next(error);
  }
}

async function downloadFile(req, res, next) {
  try {
    const fileId = req.params.fileId || req.params.id;
    const userId = req.user.id;

    const downloadResult = await fileService.processFileDownload({
      fileId,
      userId
    });

    const safeFileName = downloadResult.originalFileName.replace(/["\r\n]/g, "_");

    res.setHeader("Content-Type", downloadResult.mimeType || "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFileName}"`);
    res.setHeader("X-Integrity-Status", "VERIFIED_ON_BLOCKCHAIN");
    res.setHeader("X-Blockchain-Tx-Hash", downloadResult.blockchainTxHash || "");

    res.status(200).send(downloadResult.pdfBuffer);
  } catch (error) {
    next(error);
  }
}

async function listFiles(req, res, next) {
  try {
    const userId = req.user.id;
    const { page, limit, search } = req.query;

    const result = await fileService.getUserFiles({
      userId,
      page,
      limit,
      search
    });

    res.status(200).json({
      success: true,
      data: result.files,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
}

async function getFileDetails(req, res, next) {
  try {
    const fileId = req.params.fileId || req.params.id;
    const userId = req.user.id;

    const details = await fileService.getFileDetails({
      fileId,
      userId
    });

    res.status(200).json({
      success: true,
      data: details
    });
  } catch (error) {
    next(error);
  }
}

async function deleteFile(req, res, next) {
  try {
    const fileId = req.params.fileId || req.params.id;
    const userId = req.user.id;

    const result = await fileService.deleteFile({
      fileId,
      userId
    });

    res.status(200).json({
      success: true,
      message: result.message,
      data: { fileId: result.fileId }
    });
  } catch (error) {
    next(error);
  }
}

async function verifyFile(req, res, next) {
  try {
    const fileId = req.params.fileId || req.params.id;
    const userId = req.user.id;

    const verificationResult = await fileService.verifyFileOnDemand({
      fileId,
      userId
    });

    res.status(200).json({
      success: true,
      data: verificationResult
    });
  } catch (error) {
    next(error);
  }
}

async function simulateTamper(req, res, next) {
  try {
    const fileId = req.params.fileId || req.params.id;
    const userId = req.user.id;

    const result = await fileService.simulateTamper({ fileId, userId });

    res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function resetTamper(req, res, next) {
  try {
    const fileId = req.params.fileId || req.params.id;
    const userId = req.user.id;

    const result = await fileService.resetTamper({ fileId, userId });

    res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadFile,
  downloadFile,
  listFiles,
  getFileDetails,
  deleteFile,
  verifyFile,
  simulateTamper,
  resetTamper
};
