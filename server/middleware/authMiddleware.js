const jwt = require("jsonwebtoken");

// this middleware checks if the user is logged in before letting them access protected routes
// it looks for a JWT token in the request headers and verifies it
const protect = (req, res, next) => {
  try {
    let token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ message: "No token, access denied" });
    }

    // the token comes as "Bearer xxxxx" so we need to strip the "Bearer " part
    if (token.startsWith("Bearer ")) {
      token = token.split(" ")[1];
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // attach the user info to the request so other handlers can use it
    req.user = decoded;
    next();

  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = protect;