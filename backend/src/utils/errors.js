class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_SERVER_ERROR", details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = "Bad request", details = null) {
    super(message, 400, "BAD_REQUEST", details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Authentication required", details = null) {
    super(message, 401, "UNAUTHORIZED", details);
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Access denied", details = null) {
    super(message, 403, "FORBIDDEN", details);
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource not found", details = null) {
    super(message, 404, "NOT_FOUND", details);
  }
}

class ConflictError extends AppError {
  constructor(message = "Resource conflict", details = null) {
    super(message, 409, "CONFLICT", details);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError
};
