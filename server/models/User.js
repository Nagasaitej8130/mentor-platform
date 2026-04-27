const mongoose = require("mongoose");

// the main user schema - stores everything about a person on the platform
// some fields are shared, but mentors and entrepreneurs each have their own extra fields
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["mentor", "entrepreneur"],
    required: true
  },

  // fields that both mentors and entrepreneurs can fill out
  bio: String,
  skills: [String],

  // entrepreneur-specific fields
  startupName: String,
  idea: String,
  industry: String,
  stage: String,
  goals: [String],

  // mentor-specific fields
  currentRole: String,
  company: String,
  experienceYears: Number,
  expertise: [String],
  availability: String,

  // password reset fields - token is temporary and expires after 15 minutes
  resetToken: String,
  resetTokenExpiry: Date,

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("User", userSchema);