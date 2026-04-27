const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/User");

// set up the email transporter using Gmail SMTP for sending password reset emails
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// handles new user registration - takes name, email, password, and role
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // validate email format on the server side so nobody can bypass frontend checks
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    // make sure nobody else has already signed up with this email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // hash the password before saving - using 10 salt rounds for good security
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // save the new user to the database with the hashed password
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role
    });
    await user.save();

    res.status(201).json({
      message: "User registered successfully",
      user
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// handles user login - checks credentials and returns a JWT token if valid
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // first check if an account with this email exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // compare the entered password with the hashed one in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // generate a JWT token that expires in 1 day - the frontend stores this for auth
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// updates the user's profile info - accepts any fields and merges them
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      req.body,
      { new: true }
    );

    res.json({
      message: "Profile updated successfully",
      user: updatedUser
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// fetches the logged-in user's profile (minus the password for security)
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select("-password");

    res.json(user);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// lets users change their password - they need to provide the current one first
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Please provide both current and new passwords" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // make sure the current password they entered actually matches
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    // hash the new password and save it
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// handles forgot password - generates a 6-digit OTP and emails it to the user
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Please provide your email address" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // we still send a success message even if the email doesn't exist
      // this prevents attackers from figuring out which emails are registered
      return res.json({ message: "If an account with that email exists, a reset link has been sent" });
    }

    // generate a 6-digit OTP and set it to expire in 15 minutes
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetToken = otp;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000;
    await user.save();

    // send the OTP email - big and bold so it's easy to read
    await transporter.sendMail({
      from: `"MentorConnect" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Password Reset OTP - MentorConnect",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0f766e;">MentorConnect Password Reset</h2>
          <p>Hi ${user.name},</p>
          <p>Use the OTP below to reset your password. It expires in <strong>15 minutes</strong>.</p>
          <div style="text-align: center; margin: 30px 0; background: #f0fdf4; border: 2px solid #0f766e; border-radius: 10px; padding: 24px;">
            <p style="margin: 0 0 8px 0; color: #0f766e; font-size: 14px; font-weight: 600; letter-spacing: 1px;">YOUR OTP CODE</p>
            <p style="margin: 0; font-size: 40px; font-weight: 800; letter-spacing: 8px; color: #1c1917;">${otp}</p>
          </div>
          <p style="color: #666; font-size: 14px;">Enter this code on the login page along with your new password.</p>
          <p style="color: #999; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">MentorConnect - Professional Mentorship Platform</p>
        </div>
      `
    });

    res.json({ message: "OTP sent! Check your email inbox." });

  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Failed to send OTP. Please try again later." });
  }
};

// verifies the OTP the user got in their email and resets their password
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    // find the user by email, check the OTP matches, and make sure it hasn't expired
    const user = await User.findOne({
      email,
      resetToken: otp.trim(),
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP. Please request a new one." });
    }

    // update the password and clear the OTP so it can't be reused
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: "Password reset successfully! You can now log in." });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// deletes the user's account and cleans up their data
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // delete the user
    await User.findByIdAndDelete(userId);
    
    // cleanup: delete connections involving this user
    const Connection = require("../models/Connection");
    await Connection.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] });

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerUser, loginUser, updateProfile, getProfile, changePassword, forgotPassword, resetPassword, deleteAccount };