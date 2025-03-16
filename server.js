require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/userDB")
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// ✅ User Schema
const userSchema = new mongoose.Schema({
    email: String,
    otp: String,
    isVerified: { type: Boolean, default: false }
});
const User = mongoose.model("User", userSchema);

// ✅ Configure Nodemailer
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER, // Your Gmail
        pass: process.env.EMAIL_PASS  // Your Gmail App Password
    }
});

// ✅ Endpoint to send OTP
app.post("/send-otp", async (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit OTP

    try {
        // Save OTP to DB (Create or Update User)
        let user = await User.findOne({ email });
        if (user) {
            user.otp = otp;
        } else {
            user = new User({ email, otp });
        }
        await user.save();

        // Send OTP via Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Your OTP Code",
            text: `Your OTP is: ${otp}. It is valid for 5 minutes.`
        };
        await transporter.sendMail(mailOptions);

        res.json({ message: "OTP sent successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Error sending OTP", error });
    }
});

// ✅ Endpoint to verify OTP & register/login user
app.post("/verify-otp", async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });

        if (user.otp === otp) {
            user.isVerified = true;
            user.otp = null; // Clear OTP after successful verification
            await user.save();
            res.json({ message: "OTP verified successfully! Account created.", success: true });
        } else {
            res.status(400).json({ message: "Invalid OTP", success: false });
        }
    } catch (error) {
        res.status(500).json({ message: "Error verifying OTP", error });
    }
});

// ✅ Start Server
app.listen(5000, () => console.log("🚀 Server running on port 5000"));

const jwt = require("jsonwebtoken");

app.post("/verify-otp", (req, res) => {
    const { email, otp } = req.body;
    
    if (otpStore[email] === otp) { // Check OTP validity
        const token = jwt.sign({ email }, "your_secret_key", { expiresIn: "1h" });

        res.json({ message: "OTP verified successfully.", success: true, token });
    } else {
        res.json({ message: "Invalid or expired OTP.", success: false });
    }
});
const rateLimit = require("express-rate-limit");

const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit to 5 OTP requests per IP
    message: "Too many OTP requests, please try again later."
});

app.post("/send-otp", otpLimiter, (req, res) => {
    // Send OTP logic here
});

