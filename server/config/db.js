const mongoose = require("mongoose");

// connects to our MongoDB database using the connection string from .env
// if the connection fails, the app shuts down because nothing works without the database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected ✅");
  } catch (error) {
    console.error("DB Connection Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;