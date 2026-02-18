const express = require("express");
const router = express.Router();
const { pool } = require('../db');
const { authenticate } = require("../middlewares/authenticate");
const { authorize } = require("../middlewares/authorize");
const { admin } = require('../middlewares/verifyToken');

/* ========== COMPANY USERS ========== */

// GET /api/company-users
router.get("/company-users",
  authenticate,
  authorize({
    allowAnySuperAdmin: true,
    companyRoles: ['company super admin', 'company admin']
  }),
  async (req, res) => {
    try {
      const isSuperAdmin = req.user?.isSuperAdmin;
      let users;

      if (isSuperAdmin) {
        // Super admins see ALL company users
        [users] = await pool.query(`
          SELECT 
            u.id, 
            u.email, 
            u.name,
            u.role,
            u.created_at,
            c.company_id, 
            c.company_name
          FROM users u
          JOIN company_users cu ON cu.user_id = u.id
          JOIN company c ON c.company_id = cu.company_id
          WHERE u.role IN ('company super admin', 'company admin')
          ORDER BY u.created_at DESC
        `);
      } else {
        // Company admins see only their company's users
        [users] = await pool.query(`
          SELECT 
            u.id, 
            u.email, 
            u.name,
            u.role,
            u.created_at,
            c.company_id, 
            c.company_name
          FROM users u
          JOIN company_users cu ON cu.user_id = u.id
          JOIN company c ON c.company_id = cu.company_id
          WHERE c.company_id = ? 
            AND u.role IN ('company super admin', 'company admin')
          ORDER BY u.created_at DESC
        `, [req.user.companyId]);
      }

      res.json({ data: users });
    } catch (err) {
      console.error("Get company users error:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
});

// POST /api/company-users
router.post("/company-users",
  authenticate,
  authorize({
    allowAnySuperAdmin: false,
    superAdminRoles: ['super admin']
  }),
  async (req, res) => {
    try {
      const { email, password, company_id, role } = req.body;

      if (!email || !password || !company_id || !role) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const validRoles = ['company super admin', 'company admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const [existingUsers] = await pool.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );
      if (existingUsers.length > 0) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      const firebaseUser = await admin.auth().createUser({
        email,
        password,
        emailVerified: false
      });

      // Insert into users table WITH role
      const [userResult] = await pool.query(
        'INSERT INTO users (firebase_uid, email, role, is_active, created_at) VALUES (?, ?, ?, 1, NOW())',
        [firebaseUser.uid, email, role]
      );

      const userId = userResult.insertId;

      // Link to company in company_users table
      await pool.query(
        'INSERT INTO company_users (user_id, company_id, created_at) VALUES (?, ?, NOW())',
        [userId, company_id]
      );

      res.json({
        message: "User created successfully",
        data: { id: userId, email, company_id, role }
      });

    } catch (err) {
      console.error("Create company user error:", err);
      if (err.code === 'auth/email-already-exists') {
        return res.status(400).json({ message: "Email already exists in Firebase" });
      }
      res.status(500).json({ message: "Server error", error: err.message });
    }
});

/* ========== SUPER ADMIN USERS ========== */

// GET /api/super-admin-users
router.get("/super-admin-users",
  authenticate,
  authorize({ allowAnySuperAdmin: true }),
  async (req, res) => {
    try {
      const [users] = await pool.query(`
        SELECT 
          id,
          email,
          name,
          role,
          created_at
        FROM users
        WHERE role IN ('super admin', 'admin')
        ORDER BY created_at DESC
      `);

      res.json({ data: users });
    } catch (err) {
      console.error("Get admin users error:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
});

// POST /api/super-admin-users
router.post("/super-admin-users",
  authenticate,
  authorize({
    allowAnySuperAdmin: false,
    superAdminRoles: ['super admin']
  }),
  async (req, res) => {
    try {
      const { email, password, name, role } = req.body;

      if (!email || !password || !name || !role) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const validAdminRoles = ['super admin', 'admin'];
      if (!validAdminRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const [existingUsers] = await pool.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );
      if (existingUsers.length > 0) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      const firebaseUser = await admin.auth().createUser({
        email,
        password,
        emailVerified: false
      });

      // Insert into users table WITH name and role
      await pool.query(
        'INSERT INTO users (firebase_uid, email, name, role, is_active, created_at) VALUES (?, ?, ?, ?, 1, NOW())',
        [firebaseUser.uid, email, name, role]
      );

      res.json({
        message: "User created successfully",
        data: { email, name, role }
      });

    } catch (err) {
      console.error("Create admin user error:", err);
      if (err.code === 'auth/email-already-exists') {
        return res.status(400).json({ message: "Email already exists in Firebase" });
      }
      res.status(500).json({ message: "Server error", error: err.message });
    }
});

module.exports = router;