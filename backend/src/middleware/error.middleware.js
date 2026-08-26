const { AppError } = require("../utils/errors");

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let code = err.code || "INTERNAL_SERVER_ERROR";
  let message = err.message || "An unexpected error occurred";
  let details = err.details || null;

  // Handle CORS rate limit errors
  if (err.message && err.message.includes("CORS policy error")) {
    statusCode = 403;
    code = "CORS_FORBIDDEN";
  }

  // Handle unexpected errors (Non-AppError or status 500)
  if (!(err instanceof AppError)) {
    console.error("🔥 Unexpected Internal Server Error:", err);
    if (process.env.NODE_ENV === "production") {
      message = "An internal server error occurred. Please contact support.";
      details = null;
    } else {
      details = err.stack;
    }
  }

  // Sanitize message to prevent accidental database/credential leakage
  if (process.env.NODE_ENV === "production" && statusCode === 500) {
    message = "An internal server error occurred.";
    details = null;
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details
    }
  });
}

module.exports = errorHandler;
