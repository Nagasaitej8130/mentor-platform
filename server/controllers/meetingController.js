const Meeting = require("../models/Meeting");
const Notification = require("../models/Notification");
const User = require("../models/User");

// creates a new meeting between two connected users
const createMeeting = async (req, res) => {
  try {
    const userId = req.user.id;
    const { participantId, date, time, link } = req.body;

    // make sure the meeting date is not in the past
    const meetingDate = new Date(`${date}T${time}`);
    if (meetingDate < new Date()) {
      return res.status(400).json({ message: "Cannot schedule a meeting in the past" });
    }

    const meeting = new Meeting({
      participants: [userId, participantId],
      date,
      time,
      link,
      createdBy: userId
    });

    await meeting.save();

    // get the creator's name so the notification includes who scheduled it
    const creator = await User.findById(userId).select("name");
    const creatorName = creator ? creator.name : "Someone";

    // send a notification to the other person with full meeting details
    const notification = await Notification.create({
      userId: participantId,
      senderName: creatorName,
      message: `${creatorName} scheduled a meeting with you on ${date} at ${time}`,
      type: "meeting"
    });

    // send real-time notification if socket is available
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${participantId}`).emit("newNotification", notification);
    }

    res.json({
      message: "Meeting scheduled successfully",
      meeting
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// gets all meetings where the logged-in user is a participant
const getMeetings = async (req, res) => {
  try {
    const userId = req.user.id;

    const meetings = await Meeting.find({
      participants: userId
    }).populate("participants createdBy", "name email role");

    res.json(meetings);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// cancels/deletes a meeting - only the person who created it can do this
const cancelMeeting = async (req, res) => {
  try {
    const meetingId = req.params.id;
    const userId = req.user.id;

    const meeting = await Meeting.findById(meetingId).populate("participants", "name");

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    // only the creator of the meeting can cancel it
    if (meeting.createdBy.toString() !== userId) {
      return res.status(403).json({ message: "Only the meeting creator can cancel it" });
    }

    // get the creator's name for the cancellation notification
    const creator = await User.findById(userId).select("name");
    const creatorName = creator ? creator.name : "Someone";

    // notify the other participant that the meeting was cancelled
    const otherParticipant = meeting.participants.find(p => p._id.toString() !== userId);
    if (otherParticipant) {
      const notification = await Notification.create({
        userId: otherParticipant._id,
        senderName: creatorName,
        message: `${creatorName} cancelled the meeting on ${meeting.date} at ${meeting.time}`,
        type: "meeting_cancelled"
      });

      const io = req.app.get("io");
      if (io) {
        io.to(`user_${otherParticipant._id}`).emit("newNotification", notification);
      }
    }

    await meeting.deleteOne();
    res.json({ message: "Meeting cancelled" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createMeeting, getMeetings, cancelMeeting };