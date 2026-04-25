const User = require("../models/User");

// Get suggestions
const getSuggestions = async (req, res) => {
  try {
    const userId = req.user.id;

    const currentUser = await User.findById(userId);

    let targetRole = currentUser.role === "mentor"
      ? "entrepreneur"
      : "mentor";

    // find opposite role users
    const users = await User.find({
      role: targetRole,
      _id: { $ne: userId }
    });

    // simple matching (skills overlap)
    const suggestions = users.map(user => {
      let score = 0;

      if (currentUser.skills && user.skills) {
        const commonSkills = currentUser.skills.filter(skill =>
          user.skills.includes(skill)
        );
        score = commonSkills.length;
      }

      return {
        user,
        score
      };
    });

    // sort by score
    suggestions.sort((a, b) => b.score - a.score);

    res.json(suggestions);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getSuggestions };