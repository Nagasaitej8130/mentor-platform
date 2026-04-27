const express = require("express");
const router = express.Router();

const { searchUsers, getUserById } = require("../controllers/userController");
const protect = require("../middleware/authMiddleware");

// search endpoint - lets users find other people on the platform
router.get("/search", protect, searchUsers);

// get a specific user's public profile by ID (for view-profile page)
router.get("/:id", protect, getUserById);

module.exports = router;