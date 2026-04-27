const express = require("express");
const router = express.Router();

const { registerUser, loginUser, updateProfile, getProfile, changePassword, forgotPassword, resetPassword } = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");

// public routes - anyone can access these without being logged in
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// protected routes - user must be logged in (token required)
router.put("/profile", protect, updateProfile);
router.get("/profile", protect, getProfile);
router.put("/change-password", protect, changePassword);

module.exports = router;