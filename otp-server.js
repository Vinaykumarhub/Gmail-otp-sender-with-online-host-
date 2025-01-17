const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config(); // For environment variables

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors({
  origin: process.env.FRONTEND_URL, // Frontend URL from environment variable
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
  credentials: true, // Allow cookies if needed
}));

// Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Email address from .env
    pass: process.env.EMAIL_PASS, // App password from .env
  },
});

// In-memory OTP storage
const otps = new Map();

// Endpoint to send OTP
app.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  // Validate email
  if (!email || !validateEmail(email)) {
    return res.status(400).json({ status: 'error', message: 'Invalid or missing email address.' });
  }

  try {
    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Store OTP with expiration time (5 minutes)
    otps.set(email, { otp, expiresAt: Date.now() + 300000 });

    // Email message setup
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP for Verification',
      text: `Your OTP is: ${otp}\nThis OTP will expire in 5 minutes.`,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    console.log(`OTP sent to ${email}`);
    res.status(200).json({ status: 'success', message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ status: 'error', message: 'Failed to send OTP. Please try again later.' });
  }
});

// Utility function to validate email
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Clean up expired OTPs (runs every minute)
setInterval(() => {
  const now = Date.now();
  otps.forEach((value, key) => {
    if (value.expiresAt < now) {
      otps.delete(key);
      console.log(`Expired OTP for ${key} removed.`);
    }
  });
}, 60000);

// Start the Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
