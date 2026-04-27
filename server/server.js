// load environment variables from .env file (things like DB connection string, JWT secret, etc.)
require("dotenv").config();
const userRoutes = require("./routes/userRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const messageRoutes = require("./routes/messageRoutes");
const Message = require("./models/Message");
const matchRoutes = require("./routes/matchRoutes");
const connectionRoutes = require("./routes/connectionRoutes");
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const cors = require("cors");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const protect = require("./middleware/authMiddleware");

const app = express();
const server = http.createServer(app);

// setting up socket.io for real-time chat and notifications - allowing all origins for now
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// make the io instance available to controllers so they can emit real-time events
app.set("io", io);

// connect to MongoDB before doing anything else
connectDB();

// basic middleware - cors for cross-origin requests, json parser for request bodies
app.use(cors());
app.use(express.json());

// serve the frontend files (HTML, CSS, JS) from the client folder
app.use(express.static(path.join(__dirname, "../client")));

// all the API routes - each one handles a specific part of the app
app.use("/api/auth", authRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);

// when someone visits the root URL, show them the landing page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// a test route to check if authentication is working properly
app.get("/api/protected", protect, (req, res) => {
  res.json({
    message: "You are authorized",
    user: req.user
  });
});

// socket.io event handlers for real-time chat and notifications
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // each logged-in user joins their own private room so we can send them targeted notifications
  // the frontend emits this right after connecting with their user ID from the JWT
  socket.on("registerUser", (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} registered to their notification room`);
  });

  // when a user opens a chat, they join a shared room so messages go to the right people
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log("Socket", socket.id, "joined room:", roomId);
  });

  // handle incoming messages - save to database and broadcast to the room
  socket.on("sendMessage", async (data) => {
    const { senderId, receiverId, message, roomId } = data;

    // save the message to MongoDB so chat history persists
    const newMessage = new Message({
      sender: senderId,
      receiver: receiverId,
      message,
      isRead: false
    });

    await newMessage.save();

    // send the message to everyone in the chat room with timestamp
    io.to(roomId).emit("receiveMessage", {
      senderId,
      message,
      createdAt: newMessage.createdAt
    });

    // also notify the receiver's personal room so unread count updates in real-time
    // (only if they're not already in the chat room viewing this conversation)
    io.to(`user_${receiverId}`).emit("newUnreadMessage", {
      senderId,
      message
    });
  });

  // typing indicator - broadcast to the room that this user is typing
  socket.on("typing", (data) => {
    socket.to(data.roomId).emit("typing", { senderId: data.senderId });
  });

  // stopped typing - tell the other person to hide the typing indicator
  socket.on("stopTyping", (data) => {
    socket.to(data.roomId).emit("stopTyping", { senderId: data.senderId });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// start the server - uses PORT from environment variables, falls back to 5000 for local dev
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});