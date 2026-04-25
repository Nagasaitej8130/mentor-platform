const mongoose = require("mongoose");

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

  // COMMON
  bio: String,
  skills: [String],

  // ENTREPRENEUR
  startupName: String,
  idea: String,
  industry: String,
  stage: String,
  goals: [String],

  // MENTOR
  currentRole: String,
  company: String,
  experienceYears: Number,
  expertise: [String],
  availability: String,

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("User", userSchema);