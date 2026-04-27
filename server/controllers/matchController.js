const User = require("../models/User");

// suggests people to connect with based on matching skills
// mentors see entrepreneurs and vice versa - sorted by how many skills overlap
const getSuggestions = async (req, res) => {
  try {
    const userId = req.user.id;

    const currentUser = await User.findById(userId);

    let targetRole = currentUser.role === "mentor"
      ? "entrepreneur"
      : "mentor";

    // find users with the opposite role (mentors see entrepreneurs, entrepreneurs see mentors)
    const users = await User.find({
      role: targetRole,
      _id: { $ne: userId }
    });

    // basic matching - just counts how many skills the two users have in common
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

    // people with the most matching skills show up first
    suggestions.sort((a, b) => b.score - a.score);

    res.json(suggestions);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getSuggestions };