const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { getMessages, getLastMessages, getTotalUnread } = require("../controllers/messageController");

// get chat history with a specific user
router.get("/:otherUserId", protect, getMessages);

// get last message preview + unread count per conversation (used for chat sidebar)
router.get("/meta/last", protect, getLastMessages);

// get total unread message count across all conversations (used for sidebar badge)
router.get("/meta/unread", protect, getTotalUnread);

module.exports = router;