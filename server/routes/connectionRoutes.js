const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const { sendRequest, respondRequest, getConnections, removeConnection, cancelRequest } = require("../controllers/connectionController");

// all connection routes need authentication since they deal with user relationships
router.post("/send", protect, sendRequest);
router.post("/respond", protect, respondRequest);
router.get("/", protect, getConnections);
router.delete("/cancel/:id", protect, cancelRequest);
router.delete("/:id", protect, removeConnection);

module.exports = router;