const express = require("express");
const router = express.Router();
const protect = require("../middleware/protect");

const { sendRequest, respondRequest, getConnections } = require("../controllers/connectionController");

router.post("/send", protect, sendRequest);
router.post("/respond", protect, respondRequest);
router.get("/", protect, getConnections);

module.exports = router;