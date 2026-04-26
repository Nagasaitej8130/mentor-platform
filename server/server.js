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

// Socket setup
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Connect DB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, "../client")));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);

// Root route — serve landing page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// Protected route
app.get("/api/protected", protect, (req, res) => {
  res.json({
    message: "You are authorized",
    user: req.user
  });
});

// Socket
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // join room
socket.on("joinRoom", (roomId) => {
  socket.join(roomId);
  console.log("Socket", socket.id, "joined room:", roomId);
});

  // send message
 socket.on("sendMessage", async (data) => {
  const { senderId, receiverId, message, roomId } = data;

  // save message in DB
  const newMessage = new Message({
    sender: senderId,
    receiver: receiverId,
    message
  });

  await newMessage.save();

  io.to(roomId).emit("receiveMessage", {
    senderId,
    message
  });
});

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});