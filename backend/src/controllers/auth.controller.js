const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { prisma } = require("../config/database");
const { validateRegisterInput, validateLoginInput } = require("../validators/auth.validator");
const { ConflictError, UnauthorizedError } = require("../utils/errors");

const BCRYPT_SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = "24h";

function generateToken(user) {
  const jwtSecret = process.env.JWT_SECRET || "fallback_development_secret_key_32_chars";
  
  // SECURITY REQUIREMENT:
  // JWT payload contains ONLY necessary identifier fields (userId, role).
  // Passwords, AES keys, master keys, or file data MUST NEVER be in JWT!
  return jwt.sign(
    {
      userId: user.id,
      role: user.role
    },
    jwtSecret,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function sanitizeUser(user) {
  const { passwordHash, ...sanitized } = user;
  return sanitized;
}

async function register(req, res, next) {
  try {
    const validatedData = validateRegisterInput(req.body);

    // Check duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      throw new ConflictError("An account with this email address already exists");
    }

    // Hash password with bcrypt (12 salt rounds)
    const passwordHash = await bcrypt.hash(validatedData.password, BCRYPT_SALT_ROUNDS);

    // Create user in MySQL
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        passwordHash,
        role: "USER"
      }
    });

    const token = generateToken(user);
    const sanitizedUser = sanitizeUser(user);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: sanitizedUser,
        token
      }
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const validatedData = validateLoginInput(req.body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Verify password with bcrypt
    const isPasswordValid = await bcrypt.compare(validatedData.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const token = generateToken(user);
    const sanitizedUser = sanitizeUser(user);

    res.status(200).json({
      success: true,
      message: "Authentication successful",
      data: {
        user: sanitizedUser,
        token
      }
    });
  } catch (error) {
    next(error);
  }
}

async function getProfile(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  getProfile
};
