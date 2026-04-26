const User = require("../models/User");

// 🔍 Search users
const searchUsers = async (req, res) => {
  try {
    let keyword = req.query.q;

    // 🧠 Trim & validate
    if (!keyword || !keyword.trim()) {
      console.log("No keyword received");
      return res.json([]);
    }

    keyword = keyword.trim();

    console.log("Search keyword:", keyword);

    // 🔍 Search query
    const users = await User.find({
      $or: [
        { name: { $regex: keyword, $options: "i" } },
        { email: { $regex: keyword, $options: "i" } },
        { skills: { $elemMatch: { $regex: keyword, $options: "i" } } }
      ]
    }).select("-password");

    console.log("Users found:", users.length);

    res.json(users);

  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { searchUsers };