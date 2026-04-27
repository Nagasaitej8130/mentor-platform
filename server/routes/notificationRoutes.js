const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { getNotifications, markAsRead, clearAll } = require("../controllers/notificationController");

// get all notifications for the logged-in user
router.get("/", protect, getNotifications);

// mark all as read
router.put("/read", protect, markAsRead);

// delete all notifications
router.delete("/", protect, clearAll);

module.exports = router;