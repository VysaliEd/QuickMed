require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json()); // No need for body-parser

// 🔹 MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/quickmed", { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Error:", err));

// 🔹 User Schema (For Storing OTPs)
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    otp: { type: String, required: true },
    otpExpires: { type: Date, required: true }
});
const User = mongoose.model("User", UserSchema);

// 🔹 Nodemailer Configuration
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
    }
});

// 🔹 Generate Random OTP
const generateOTP = () => crypto.randomInt(100000, 999999).toString(); // 6-digit OTP

// 📌 **1. API to Send OTP**
app.post("/send-otp", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: "Email is required" });

        const otp = generateOTP();
        const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry

        await User.findOneAndUpdate({ email }, { email, otp, otpExpires: expiryTime }, { upsert: true });

        // 🔹 Send OTP via Email
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: "Your OTP Code",
            text: `Your OTP is ${otp}. It will expire in 5 minutes.`
        };

        await transporter.sendMail(mailOptions);

        res.json({ success: true, message: "OTP sent successfully!" });
    } catch (error) {
        console.error("❌ Error sending OTP:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// 📌 **2. API to Verify OTP**
app.post("/verify-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP are required" });

        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ success: false, message: "User not found" });

        if (user.otp !== otp) return res.status(400).json({ success: false, message: "Invalid OTP" });

        if (user.otpExpires < new Date()) return res.status(400).json({ success: false, message: "OTP has expired" });

        await User.deleteOne({ email });

        res.json({ success: true, message: "OTP verified successfully!" });
    } catch (error) {
        console.error("❌ Error verifying OTP:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// 🔹 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
