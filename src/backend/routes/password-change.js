// src/backend/routes/password-change.js
const express = require("express");
const router = express.Router();
const admin = require("../firebase/admin"); // your admin.js
const { pool } = require("../db");
const { authenticate } = require("../middlewares/authenticate");

/**
 * POST /api/auth/change-password
 * Change password for first-time login
 */
router.post("/change-password", authenticate, async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // 1️⃣ Validate inputs
    if (!email || !newPassword) {
      return res.status(400).json({ message: "Email and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    // 2️⃣ Update password in Firebase
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      await admin.auth().updateUser(userRecord.uid, { password: newPassword });
    } catch (err) {
      console.error("Firebase password update error:", err);
      return res.status(500).json({ message: "Failed to update password in Firebase" });
    }

    // 3️⃣ Update is_active in MySQL
    try {
      await pool.query(
        "UPDATE users SET is_active = TRUE WHERE email = ?",
        [email]
      );
    } catch (err) {
      console.error("Database update error:", err);
      return res.status(500).json({ message: "Failed to update user status in database" });
    }

    // 4️⃣ Respond success
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
