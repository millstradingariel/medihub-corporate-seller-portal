const express = require("express");
const router = express.Router();
const { pool } = require("../db");

router.get('/by-email', async (req, res) => {
  try {
    const { email } = req.query;
    
    console.log('🔍 Looking up user:', email);
    
    // ✅ SELECT name
    const [users] = await pool.query(
      'SELECT id, firebase_uid, email, name, role, is_active FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    console.log('👤 DB user:', user);  // ← Debug log
    
    // Super admins
    if (user.role === 'super admin' || user.role === 'admin') {
      return res.json({
        data: {
          id: user.id,
          email: user.email,
          name: user.name || 'Marky',  // ✅ Include name with fallback
          is_active: user.is_active,
          isSuperAdmin: true,
          superAdminRole: user.role
        }
      });
    }
    
    // Company users
    if (user.role === 'company super admin' || user.role === 'company admin') {
      const [companyUsers] = await pool.query(`
        SELECT c.company_id, c.company_name
        FROM company_users cu
        JOIN company c ON cu.company_id = c.company_id
        WHERE cu.user_id = ?
      `, [user.id]);
      
      if (companyUsers.length === 0) {
        return res.status(404).json({ message: 'User not associated with any company' });
      }
      
      return res.json({
        data: {
          id: user.id,
          email: user.email,
          name: user.name || null,  // ✅ Include name with fallback
          is_active: user.is_active,
          isSuperAdmin: false,
          companyId: companyUsers[0].company_id,
          companyName: companyUsers[0].company_name,
          companyRole: user.role
        }
      });
    }
    
    return res.status(403).json({ message: 'User has no valid role assigned' });
    
  } catch (err) {
    console.error('❌ Auth error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;