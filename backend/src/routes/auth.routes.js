const express = require("express");
const { register, login, getProfile } = require("../controllers/auth.controller");
const { authenticateUser } = require("../middleware/auth.middleware");

const router = express.Router();

// Public Auth Endpoints
router.post("/register", register);
router.post("/login", login);

// Protected Auth Endpoints
router.get("/me", authenticateUser, getProfile);

module.exports = router;
