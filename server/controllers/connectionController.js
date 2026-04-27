const Connection = require("../models/Connection");
const Notification = require("../models/Notification");
const User = require("../models/User");

// sends a connection request from one user to another (like a friend request)
const sendRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.body;

    // you can't connect with yourself, that doesn't make sense
    if (senderId === receiverId) {
      return res.status(400).json({ message: "Cannot send request to yourself" });
    }

    // check both directions - maybe they already sent you a request, or you already sent one
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

    // get the sender's name so the notification message looks nice
    const senderUser = await User.findById(senderId).select("name");

    // let the other person know they got a connection request
    const notification = await Notification.create({
      userId: receiverId,
      senderName: senderUser ? senderUser.name : "Someone",
      message: `${senderUser ? senderUser.name : "Someone"} sent you a connection request`,
      type: "request"
    });

    // if the socket io instance is available, send real-time notification
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${receiverId}`).emit("newNotification", notification);
    }

    res.json({ message: "Connection request sent" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// handles accepting or rejecting a connection request
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

      // find who accepted so we can include their name in the notification
      const acceptorUser = await User.findById(userId).select("name");

      // notify the person who originally sent the request that it was accepted
      const notification = await Notification.create({
        userId: connection.sender,
        senderName: acceptorUser ? acceptorUser.name : "Someone",
        message: `${acceptorUser ? acceptorUser.name : "Someone"} accepted your connection request`,
        type: "accepted"
      });

      const io = req.app.get("io");
      if (io) {
        io.to(`user_${connection.sender}`).emit("newNotification", notification);
      }

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

// returns all connection data for a user - pending requests, sent requests, and accepted connections
const getConnections = async (req, res) => {
  try {
    const userId = req.user.id;

    // requests from other people waiting for you to accept or reject
    const requests = await Connection.find({
      receiver: userId,
      status: "pending"
    }).populate("sender", "name email role");

    // requests you sent that are still waiting for a response
    const sentRequests = await Connection.find({
      sender: userId,
      status: "pending"
    }).populate("receiver", "name email role");

    // people you're already connected with
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

// removes an accepted connection between two users
const removeConnection = async (req, res) => {
  try {
    const connectionId = req.params.id;
    const userId = req.user.id;

    const connection = await Connection.findById(connectionId);

    if (!connection) {
      return res.status(404).json({ message: "Connection not found" });
    }

    // make sure the person requesting the removal is actually part of this connection
    if (connection.sender.toString() !== userId && connection.receiver.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized to remove this connection" });
    }

    await connection.deleteOne();
    res.json({ message: "Connection removed" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// cancels a pending connection request that you sent
const cancelRequest = async (req, res) => {
  try {
    const connectionId = req.params.id;
    const userId = req.user.id;

    const connection = await Connection.findById(connectionId);

    if (!connection) {
      return res.status(404).json({ message: "Request not found" });
    }

    // only the person who sent the request can cancel it
    if (connection.sender.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized to cancel this request" });
    }

    if (connection.status !== "pending") {
      return res.status(400).json({ message: "Can only cancel pending requests" });
    }

    await connection.deleteOne();
    res.json({ message: "Request cancelled" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { sendRequest, respondRequest, getConnections, removeConnection, cancelRequest };