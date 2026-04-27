const User = require("../models/User");

// search for users by name, email, or skill
// uses regex so partial matches work too (e.g. typing "java" finds "JavaScript")
const searchUsers = async (req, res) => {
  try {
    let keyword = req.query.q;

    // make sure we actually got a search term
    if (!keyword || !keyword.trim()) {
      console.log("No keyword received");
      return res.json([]);
    }

    keyword = keyword.trim();

    console.log("Search keyword:", keyword);

    // search across name, email, and skills - case insensitive so it's user friendly
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

// returns a single user's public profile by their ID (no password obviously)
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password -resetToken -resetTokenExpiry");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { searchUsers, getUserById };