const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { createMeeting, getMeetings, cancelMeeting } = require("../controllers/meetingController");

// routes for creating, viewing, and cancelling meetings
router.post("/create", protect, createMeeting);
router.get("/", protect, getMeetings);
router.delete("/:id", protect, cancelMeeting);

module.exports = router;