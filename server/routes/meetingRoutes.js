
const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { createMeeting, getMeetings } = require("../controllers/meetingController");

router.post("/create", protect, createMeeting);

router.get("/", protect, getMeetings);

module.exports = router;