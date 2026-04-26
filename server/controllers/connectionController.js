const Connection = require("../models/Connection");
const Notification = require("../models/Notification");

// Send connection request
const sendRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.body;

    // prevent sending to self
    if (senderId === receiverId) {
      return res.status(400).json({ message: "Cannot send request to yourself" });
    }

    // check if already exists
    const existing = await Connection.findOne({
      sender: senderId,
      receiver: receiverId
    });

    if (existing) {
      return res.status(400).json({ message: "Request already sent" });
    }

    const connection = new Connection({
      sender: senderId,
      receiver: receiverId
    });

    await connection.save();

    // 🔔 CREATE NOTIFICATION
    await Notification.create({
      userId: receiverId,
      message: "You received a connection request",
      type: "connection"
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

    const connection = await Connection.findById(requestId);

    if (!connection) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (action === "accept") {
      connection.status = "accepted";
      await connection.save();

      // 🔔 NOTIFY SENDER
      await Notification.create({
        userId: connection.sender,
        message: "Your connection request was accepted",
        type: "connection"
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

    // ✅ Incoming requests (others → you)
    const requests = await Connection.find({
      receiver: userId,
      status: "pending"
    }).populate("sender", "name email role");

    // ✅ Sent requests (you → others)
    const sentRequests = await Connection.find({
      sender: userId,
      status: "pending"
    }).populate("receiver", "name email role");

    // ✅ Accepted connections
    const connections = await Connection.find({
      $or: [
        { sender: userId, status: "accepted" },
        { receiver: userId, status: "accepted" }
      ]
    }).populate("sender receiver", "name email role");

    res.json({
      requests,
      sentRequests, // 🔥 NEW
      connections
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { sendRequest, respondRequest, getConnections };