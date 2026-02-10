// backend/routes/userRoutes.js - EXAMPLE USAGE
const express = require("express");
const { authenticate } = require("../middlewares/authenticate");
const { authorize } = require("../middlewares/authorize");
const { pool } = require("../db");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Example 1: Allow any super admin OR company admins
router.get("/", authorize({
  companyRoles: ["company_admin"],
  allowAnySuperAdmin: true
}), async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const [rows] = await pool.query(
      `SELECT u.id, u.email, cu.role, c.name AS company_name
       FROM users u
       LEFT JOIN company_users cu ON cu.user_id = u.id
       LEFT JOIN company c ON c.id = cu.company_id
       WHERE cu.company_id = ?`,
      [companyId]
    );

    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Example 2: Only specific super admin roles can access
router.post("/create-company", authorize({
  superAdminRoles: ["full_access", "company_manager"]
}), async (req, res) => {
  // Only super admins with "full_access" or "company_manager" role can create companies
  // Regular users cannot access this at all
  try {
    const { name, abn } = req.body;
    
    const [result] = await pool.query(
      `INSERT INTO company (name, abn) VALUES (?, ?)`,
      [name, abn]
    );

    res.json({ message: "Company created", id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Example 3: Super admins with specific roles OR company staff
router.get("/reports", authorize({
  companyRoles: ["company_admin", "staff"],
  superAdminRoles: ["full_access", "read_only"]
}), async (req, res) => {
  // Can be accessed by:
  // - Super admins with "full_access" or "read_only" role
  // - Regular users with "company_admin" or "staff" role
  res.json({ message: "Reports data" });
});



module.exports = router;