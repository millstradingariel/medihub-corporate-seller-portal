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
    
    // Get user with role
    const [users] = await pool.query(
      'SELECT id, firebase_uid, email, name, role, is_active FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      console.log('❌ User not found');
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    console.log('👤 Found user:', user.id, '| Role:', user.role);
    
    // Check if super admin (role = 'super admin' or 'admin')
    if (user.role === 'super admin' || user.role === 'admin') {
      console.log('👑 User is super admin with role:', user.role);
      return res.json({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          is_active: user.is_active,
          isSuperAdmin: true,
          superAdminRole: user.role  // 'super admin' or 'admin'
        }
      });
    }
    
    // Check if company user (role = 'company super admin' or 'company admin')
    if (user.role === 'company super admin' || user.role === 'company admin') {
      // Get company association
      const [companyUsers] = await pool.query(`
        SELECT c.company_id, c.company_name
        FROM company_users cu
        JOIN company c ON cu.company_id = c.company_id
        WHERE cu.user_id = ?
      `, [user.id]);
      
      if (companyUsers.length === 0) {
        console.log('⚠️ Company user not linked to any company');
        return res.status(404).json({ message: 'User not associated with any company' });
      }
      
      const companyData = companyUsers[0];
      console.log('🏢 Company user:', companyData.company_name, '| Role:', user.role);
      
      return res.json({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          is_active: user.is_active,
          isSuperAdmin: false,
          companyId: companyData.company_id,
          companyName: companyData.company_name,
          companyRole: user.role  // 'company super admin' or 'company admin'
        }
      });
    }
    
    // User has no valid role
    console.log('⚠️ User has invalid or no role:', user.role);
    return res.status(403).json({ message: 'User has no valid role assigned' });
    
  } catch (err) {
    console.error('❌ Auth by email error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;