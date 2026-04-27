const mongoose = require("mongoose");

// stores meeting details - who's meeting, when, and the video call link
const meetingSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],
  date: String,
  time: String,
  link: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Meeting", meetingSchema);