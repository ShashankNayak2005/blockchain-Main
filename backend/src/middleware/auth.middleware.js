const jwt = require("jsonwebtoken");
const { prisma } = require("../config/database");
const { UnauthorizedError, ForbiddenError, NotFoundError } = require("../utils/errors");

/**
 * Authenticates requests via Bearer JWT token.
 * Security Enforcement: JWT payload contains STRICTLY userId and role.
 */
async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Authentication token is missing or malformed");
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new UnauthorizedError("Authentication token is missing");
    }

    const jwtSecret = process.env.JWT_SECRET || "fallback_development_secret_key_32_chars";
    let decoded;

    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      throw new UnauthorizedError("Invalid or expired authentication token");
    }

    if (!decoded || !decoded.userId) {
      throw new UnauthorizedError("Invalid token payload structure");
    }

    // Verify user exists in MySQL database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      throw new UnauthorizedError("User account no longer exists");
    }

    // Attach authenticated user to request object
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Authorization Middleware: Ensures requesting user is the owner of the target file.
 */
async function authorizeOwner(req, res, next) {
  try {
    const fileIdentifier = req.params.id || req.params.fileId;
    if (!fileIdentifier) {
      throw new ForbiddenError("File identifier missing from request");
    }

    const file = await prisma.file.findFirst({
      where: {
        OR: [
          { id: fileIdentifier },
          { fileId: fileIdentifier }
        ]
      }
    });

    if (!file) {
      throw new NotFoundError("Requested file not found");
    }

    if (file.ownerId !== req.user.id && req.user.role !== "ADMIN") {
      throw new ForbiddenError("Access denied: You are not the owner of this file");
    }

    req.targetFile = file;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Authorization Middleware: Ensures requesting user is either file owner or holds an active FileAccess grant.
 */
async function authorizeFileAccess(req, res, next) {
  try {
    const fileIdentifier = req.params.id || req.params.fileId;
    if (!fileIdentifier) {
      throw new ForbiddenError("File identifier missing from request");
    }

    const file = await prisma.file.findFirst({
      where: {
        OR: [
          { id: fileIdentifier },
          { fileId: fileIdentifier }
        ]
      }
    });

    if (!file) {
      throw new NotFoundError("Requested file not found");
    }

    // Owner or Admin automatically authorized
    if (file.ownerId === req.user.id || req.user.role === "ADMIN") {
      req.targetFile = file;
      return next();
    }

    // Check FileAccess ACL rules
    const hasAccess = await prisma.fileAccess.findUnique({
      where: {
        fileId_userId: {
          fileId: file.id,
          userId: req.user.id
        }
      }
    });

    if (!hasAccess) {
      throw new ForbiddenError("Access denied: You do not have permission to access this file");
    }

    req.targetFile = file;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  authenticateUser,
  authorizeOwner,
  authorizeFileAccess
};
