const express = require("express");
const router = express.Router();

const { registerUser, loginUser, updateProfile, getProfile } = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);

router.put("/profile", protect, updateProfile);
router.get("/profile", protect, getProfile);

module.exports = router;