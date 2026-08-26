const multer = require("multer");
const { BadRequestError } = require("../utils/errors");

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf" && !file.originalname.toLowerCase().endsWith(".pdf")) {
      return cb(new BadRequestError("Invalid file format: Uploaded file must be a PDF document (.pdf)"));
    }
    cb(null, true);
  }
});

/**
 * Single file upload middleware handling "file" field.
 */
const singleFileUpload = upload.single("file");

/**
 * Validates Multer upload errors and checks PDF magic header bytes (%PDF-).
 */
function validatePdfUpload(req, res, next) {
  singleFileUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(new BadRequestError(`File size exceeds maximum allowed limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`));
        }
        return next(new BadRequestError(`File upload error: ${err.message}`));
      }
      return next(err);
    }

    if (!req.file || !req.file.buffer) {
      return next(new BadRequestError("No file uploaded. Please attach a valid PDF document under the 'file' form field."));
    }

    const buffer = req.file.buffer;

    // Verify PDF Magic Bytes (%PDF- -> hex: 25 50 44 46 2d)
    if (buffer.length < 5) {
      return next(new BadRequestError("Invalid file: File payload is too small to be a valid PDF document."));
    }

    const header = buffer.toString("ascii", 0, 5);
    if (header !== "%PDF-") {
      return next(new BadRequestError("Invalid PDF header: File content magic bytes do not match standard PDF document structure."));
    }

    next();
  });
}

module.exports = {
  validatePdfUpload
};
