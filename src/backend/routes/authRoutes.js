// backend/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

/**
 * GET /api/auth/by-email?email=
 * This route is called during login, so it should NOT require authentication
 */
router.get('/by-email', async (req, res) => {
  try {
    const { email } = req.query;
    
    console.log('🔍 Looking up user:', email);
    
    // Get user
    const [users] = await pool.query(
      'SELECT id, firebase_uid, email, is_active FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    console.log('👤 Found user:', user.id);
    
    // Check if super admin
    const [superAdmins] = await pool.query(
      'SELECT role FROM super_admin_users WHERE user_id = ?',
      [user.id]
    );
    
    if (superAdmins.length > 0) {
      console.log('👑 User is super admin');
      return res.json({
        data: {
          id: user.id,
          email: user.email,
          is_active: user.is_active,
          isSuperAdmin: true,
          superAdminRole: superAdmins[0].role
        }
      });
    }
    
    // Check if company user
    const [companyUsers] = await pool.query(`
      SELECT 
        u.id,
        u.email,
        cu.role,
        c.company_id,
        c.company_name
      FROM users u
      JOIN company_users cu ON u.id = cu.user_id
      JOIN company c ON cu.company_id = c.company_id
      WHERE cu.user_id = ?
    `, [user.id]);
    
    if (companyUsers.length === 0) {
      console.log('⚠️ User not associated with any company');
      return res.status(404).json({ message: 'User not associated with any company' });
    }
    
    const companyUser = companyUsers[0];
    console.log('🏢 User company:', companyUser.company_name, 'ID:', companyUser.company_id);
    
    res.json({
      data: {
        id: user.id,
        email: user.email,
        is_active: user.is_active,
        isSuperAdmin: false,
        companyId: companyUser.company_id,      // ← Make sure this exists!
        companyName: companyUser.company_name,
        companyRole: companyUser.role
      }
    });
    
  } catch (err) {
    console.error('❌ Auth by email error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


module.exports = router;