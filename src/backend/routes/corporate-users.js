// Update POST /company-users
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
        [firebaseUser.uid, email, role]  // ✅ Include role
      );

      const userId = userResult.insertId;

      // Link to company
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

// Update POST /super-admin-users
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

      // Insert into users table WITH role and name
      await pool.query(
        'INSERT INTO users (firebase_uid, email, name, role, is_active, created_at) VALUES (?, ?, ?, ?, 1, NOW())',
        [firebaseUser.uid, email, name, role]  // ✅ Include name and role
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

// Update GET /super-admin-users
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