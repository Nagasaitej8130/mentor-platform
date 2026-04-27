const Message = require("../models/Message");

// fetches the chat history between the logged-in user and another user
// messages are sorted by time so they appear in the right order
const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    }).sort({ createdAt: 1 });

    // mark all messages from the other user as read since we're viewing them now
    await Message.updateMany(
      { sender: otherUserId, receiver: userId, isRead: false },
      { isRead: true }
    );

    res.json(messages);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// returns the last message and unread count for each conversation the user has
// this is used to show preview text and unread badges in the chat user list
const getLastMessages = async (req, res) => {
  try {
    const userId = req.user.id;

    // find all distinct users this person has chatted with
    const messages = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: require("mongoose").Types.ObjectId.createFromHexString(userId) },
            { receiver: require("mongoose").Types.ObjectId.createFromHexString(userId) }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        // figure out who the "other person" is in each message
        $addFields: {
          otherUser: {
            $cond: {
              if: { $eq: ["$sender", require("mongoose").Types.ObjectId.createFromHexString(userId)] },
              then: "$receiver",
              else: "$sender"
            }
          }
        }
      },
      {
        // group by the other user and grab the latest message from each conversation
        $group: {
          _id: "$otherUser",
          lastMessage: { $first: "$message" },
          lastMessageTime: { $first: "$createdAt" },
          lastSender: { $first: "$sender" }
        }
      }
    ]);

    // also get unread counts per conversation
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          receiver: require("mongoose").Types.ObjectId.createFromHexString(userId),
          isRead: false
        }
      },
      {
        $group: {
          _id: "$sender",
          count: { $sum: 1 }
        }
      }
    ]);

    // combine last messages with unread counts into one response
    const unreadMap = {};
    unreadCounts.forEach(u => {
      unreadMap[u._id.toString()] = u.count;
    });

    const result = {};
    messages.forEach(m => {
      result[m._id.toString()] = {
        lastMessage: m.lastMessage,
        lastMessageTime: m.lastMessageTime,
        lastSender: m.lastSender.toString(),
        unreadCount: unreadMap[m._id.toString()] || 0
      };
    });

    res.json(result);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// returns total unread message count across all conversations for the current user
const getTotalUnread = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await Message.countDocuments({
      receiver: userId,
      isRead: false
    });

    res.json({ unreadCount: count });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMessages, getLastMessages, getTotalUnread };