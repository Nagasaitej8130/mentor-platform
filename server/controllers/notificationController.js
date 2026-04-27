const Notification = require("../models/Notification");

// gets all notifications for the logged-in user, newest ones first
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 });

    res.json(notifications);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// marks all unread notifications as read for the current user
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    res.json({ message: "Notifications marked as read" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// deletes all notifications for the current user - a fresh start
const clearAll = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.deleteMany({ userId });

    res.json({ message: "All notifications cleared" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getNotifications, markAsRead, clearAll };