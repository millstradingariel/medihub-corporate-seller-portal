// backend/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

/**
 * GET /api/auth/by-email?email=
 * This route is called during login, so it should NOT require authentication
 */
router.get("/by-email", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Get user basic info
    const [userRows] = await pool.query(
      `SELECT id, email, firebase_uid, is_active FROM users WHERE email = ?`,
      [email]
    );

    if (!userRows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRows[0];

    // Check if super admin
    const [superAdminRows] = await pool.query(
      `SELECT role FROM super_admin_users WHERE user_id = ?`,
      [user.id]
    );

    const isSuperAdmin = superAdminRows.length > 0;
    const superAdminRole = isSuperAdmin ? superAdminRows[0].role : null;

    // Get company info
    const [companyRows] = await pool.query(
      `
      SELECT  
        c._id AS companyId,
        c.company_name AS companyName, 
        cu.role AS companyRole 
      FROM company_users cu 
      JOIN company c ON c._id = cu.company_id 
      WHERE cu.user_id = ? 
      `,
      [user.id]
    );

    const companyInfo = companyRows.length > 0 ? companyRows[0] : null;

    // Return complete user profile
    res.json({
      data: {
        id: user.id,
        email: user.email,
        firebaseUid: user.firebase_uid,
        is_active: user.is_active,  // ✅ Include active status
        isSuperAdmin,
        superAdminRole,
        companyId: companyInfo?.companyId || null,
        companyName: companyInfo?.companyName || null,
        companyRole: companyInfo?.companyRole || null,
      }
    });
  } catch (err) {
    console.error("Get user by email error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


module.exports = router;