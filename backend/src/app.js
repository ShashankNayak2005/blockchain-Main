const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const authRoutes = require("./routes/auth.routes");
const fileRoutes = require("./routes/file.routes");
const errorHandler = require("./middleware/error.middleware");

const app = express();

// 1. Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP for API backend to avoid header conflicts
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// 2. CORS Policy Hardening
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173"
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl/Jest requests)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS policy error: Origin not allowed by CORS policy."));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  })
);

// 3. Body Parser Limits (Prevent DoS payload attacks)
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// 4. Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Max 300 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests from this IP, please try again after 15 minutes."
    }
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Max 15 auth attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_AUTH_ATTEMPTS",
      message: "Too many authentication attempts. Please try again after 15 minutes."
    }
  }
});

app.use(globalLimiter);

// Health Check Endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Secure File Sharing API Server is operational",
    timestamp: new Date().toISOString()
  });
});

// Authentication Routes (Rate limited)
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/v1/auth", authLimiter, authRoutes);

// File Operations Routes
app.use("/api/files", fileRoutes);
app.use("/api/v1/files", fileRoutes);

// Global Error Handler Middleware
app.use(errorHandler);

module.exports = app;
