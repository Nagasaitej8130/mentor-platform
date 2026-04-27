const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { getSuggestions } = require("../controllers/matchController");

// returns suggested connections based on skill matching
router.get("/", protect, getSuggestions);

module.exports = router;