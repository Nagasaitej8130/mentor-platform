const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { getMessages } = require("../controllers/messageController");

router.get("/:otherUserId", protect, getMessages);

module.exports = router;