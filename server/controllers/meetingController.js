const Meeting = require("../models/Meeting");
const Notification = require("../models/Notification");

// create meeting
const createMeeting = async (req, res) => {
  try {
    const userId = req.user.id;
    const { participantId, date, time, link } = req.body;

    const meeting = new Meeting({
      participants: [userId, participantId],
      date,
      time,
      link,
      createdBy: userId
    });

    await meeting.save();

    // 🔔 NOTIFY OTHER USER
    await Notification.create({
      userId: participantId,
      message: "A meeting has been scheduled with you",
      type: "meeting"
    });

    res.json({
      message: "Meeting scheduled successfully",
      meeting
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// get meetings for logged-in user
const getMeetings = async (req, res) => {
  try {
    const userId = req.user.id;

    const meetings = await Meeting.find({
      participants: userId
    }).populate("participants", "name email role");

    res.json(meetings);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createMeeting, getMeetings };