const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { supabase } = require("../middlewares/verifyToken");

router.post("/change-password", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
    if (error || !supabaseUser) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const { email, newPassword } = req.body;

    console.log('🔄 Password change requested for:', email);

    if (!email || !newPassword) {
      return res.status(400).json({ message: "Email and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const [userRows] = await pool.query(
      'SELECT id, is_active, email, supabase_uid FROM users WHERE email = ?',
      [email]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRows[0];

    if (user.is_active !== 2) {
      return res.status(403).json({
        message: "Password change only allowed for pending accounts",
        current_status: user.is_active,
      });
    }

    // ✅ Update password in Supabase
    try {
      const { error } = await supabase.auth.admin.updateUserById(
        user.supabase_uid,
        { password: newPassword }
      );
      if (error) throw error;
      console.log('✅ Supabase password updated for:', email);
    } catch (err) {
      console.error("Supabase password update error:", err);
      return res.status(500).json({ message: "Failed to update password" });
    }

    // ✅ Activate user
    await pool.query(
      "UPDATE users SET is_active = 1 WHERE email = ?",
      [email]
    );
    console.log('✅ User activated for:', email);

    res.json({
      success: true,
      message: "Password changed successfully. You can now login.",
      data: { email, is_active: 1 }
    });

  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;