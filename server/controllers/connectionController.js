const Connection = require("../models/Connection");
const Notification = require("../models/Notification");
const User = require("../models/User");

// Send connection request
const sendRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.body;

    // prevent sending to self
    if (senderId === receiverId) {
      return res.status(400).json({ message: "Cannot send request to yourself" });
    }

    // check if already exists (either direction)
    const existing = await Connection.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ]
    });

    if (existing) {
      return res.status(400).json({ message: "Request already sent" });
    }

    const connection = new Connection({
      sender: senderId,
      receiver: receiverId
    });

    await connection.save();

    // Look up sender name for the notification
    const senderUser = await User.findById(senderId).select("name");

    // CREATE NOTIFICATION
    await Notification.create({
      userId: receiverId,
      senderName: senderUser ? senderUser.name : "Someone",
      message: `${senderUser ? senderUser.name : "Someone"} sent you a connection request`,
      type: "request"
    });

    res.json({ message: "Connection request sent" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Accept or reject request
const respondRequest = async (req, res) => {
  try {
    const { requestId, action } = req.body;
    const userId = req.user.id;

    const connection = await Connection.findById(requestId);

    if (!connection) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (action === "accept") {
      connection.status = "accepted";
      await connection.save();

      // Look up acceptor name
      const acceptorUser = await User.findById(userId).select("name");

      // NOTIFY SENDER
      await Notification.create({
        userId: connection.sender,
        senderName: acceptorUser ? acceptorUser.name : "Someone",
        message: `${acceptorUser ? acceptorUser.name : "Someone"} accepted your connection request`,
        type: "accepted"
      });

      return res.json({ message: "Request accepted" });
    }

    if (action === "reject") {
      await connection.deleteOne();
      return res.json({ message: "Request rejected" });
    }

    res.status(400).json({ message: "Invalid action" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all connections and requests
const getConnections = async (req, res) => {
  try {
    const userId = req.user.id;

    // Incoming requests (others -> you)
    const requests = await Connection.find({
      receiver: userId,
      status: "pending"
    }).populate("sender", "name email role");

    // Sent requests (you -> others)
    const sentRequests = await Connection.find({
      sender: userId,
      status: "pending"
    }).populate("receiver", "name email role");

    // Accepted connections
    const connections = await Connection.find({
      $or: [
        { sender: userId, status: "accepted" },
        { receiver: userId, status: "accepted" }
      ]
    }).populate("sender receiver", "name email role");

    res.json({
      requests,
      sentRequests,
      connections
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { sendRequest, respondRequest, getConnections };