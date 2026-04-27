const mongoose = require("mongoose");

// stores notifications like connection requests, meeting invites, etc.
// isRead tracks whether the user has seen it yet
const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  senderName: String,
  message: String,
  type: String,
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Notification", notificationSchema);