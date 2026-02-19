const express = require("express");
const router = express.Router();
const { pool } = require('../db');
const { authenticate } = require("../middlewares/authenticate");
const { authorize } = require("../middlewares/authorize");
const { admin } = require('../middlewares/verifyToken');

/**
 * GET /api/users/company-users
 */
// GET company-users - allow super admins AND company admins
router.get("/company-users",
  authenticate,
  authorize({
    allowAnySuperAdmin: true,                                        // 'super admin' and 'admin'
    companyRoles: ['company super admin', 'company admin']           // both company roles
  }),
  async (req, res) => {
    try {
      const isSuperAdmin = req.user?.isSuperAdmin;
      let users;

      if (isSuperAdmin) {
        [users] = await pool.query(`
          SELECT u.id, u.email, u.created_at,
                 c.company_id, c.company_name, cu.role
          FROM users u
          JOIN company_users cu ON cu.user_id = u.id
          JOIN company c ON c.company_id = cu.company_id
          ORDER BY u.created_at DESC
        `);
      } else {
        [users] = await pool.query(`
          SELECT u.id, u.email, u.created_at,
                 c.company_id, c.company_name, cu.role
          FROM users u
          JOIN company_users cu ON cu.user_id = u.id
          JOIN company c ON c.company_id = cu.company_id
          WHERE c.company_id = ?
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
// Only 'super admin' can create company users
router.post("/company-users",
  authenticate,
  authorize({
    allowAnySuperAdmin: false,
    superAdminRoles: ['super admin']   // Only 'super admin', not 'admin'
  }),
  async (req, res) => {
    // ... your existing POST code
});

// GET /api/super-admin-users
// Only super admins can see this
router.get("/super-admin-users",
  authenticate,
  authorize({ allowAnySuperAdmin: true }),
  async (req, res) => {
    // ... your existing code
});

// POST /api/super-admin-users
// Only 'super admin' can create other admins
router.post("/super-admin-users",
  authenticate,
  authorize({
    allowAnySuperAdmin: false,
    superAdminRoles: ['super admin']   // Only top-level 'super admin'
  }),
  async (req, res) => {
    // ... your existing code
});

/**
 * POST /api/users/company-users
 */
router.post("/company-users", authenticate, authorize({ allowAnySuperAdmin: true }), async (req, res) => {
  try {
    const { name, email, password, company_id, role } = req.body;

    if (!name || !email || !password || !company_id || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const validRoles = ['company super admin', 'company admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const firebaseUser = await admin.auth().createUser({ email, password, emailVerified: false });

    const [userResult] = await pool.query(
      'INSERT INTO users (firebase_uid, name, role, email, created_at) VALUES (?, ?, NOW())',
      [firebaseUser.uid, email]
    );

    const userId = userResult.insertId;

    await pool.query(
      'INSERT INTO company_users (user_id, company_id, role) VALUES (?, ?, ?)',
      [userId, company_id, role]
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

router.get("/super-admin-users", authenticate, authorize({ allowAnySuperAdmin: true }), async (req, res) => {
  try {
    const query1 = `
      SELECT 
        u.id,
        u.email,
        u.created_at,
        sau.user_id,
        sau.name,
        sau.role
      FROM users u
      JOIN super_admin_users sau ON sau.user_id = u.id
      ORDER BY u.created_at DESC
    `;

    const [users] = await pool.query(query1);
    res.json({ data: users });
  } catch (err) {
    console.error("Get admin users error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * POST /api/users/company-users
 */
router.post("/super-admin-users", authenticate, authorize({ allowAnySuperAdmin: true }), async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const validAdminRoles = ['super admin', 'admin'];
    if (!validAdminRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const firebaseUser = await admin.auth().createUser({ email, password, emailVerified: false });

    const [userResult] = await pool.query(
      'INSERT INTO users (firebase_uid, email, created_at) VALUES (?, ?, NOW())',
      [firebaseUser.uid, email]
    );

    const userId = userResult.insertId;

    await pool.query(
      'INSERT INTO super_admin_users (user_id, name, role) VALUES (?, ?, ?)',
      [userId, name, role]
    );

    res.json({
      message: "User created successfully",
      data: { id: userId, email, name, role }
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

