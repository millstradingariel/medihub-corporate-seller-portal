const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { auditLogger } = require('../services/auditLogger');

router.get('/by-email', async (req, res) => {
  try {
    const { email } = req.query;
    const [users] = await pool.query(`
      SELECT 
        u.id, 
        u.supabase_uid,
        u.email, 
        u.name,
        u.role_id, 
        r.name AS role_name,
        r.display_name AS role_display_name,
        r.role_type,
        u.is_active 
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id 
      WHERE u.email = ?
    `, [email]);

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];
    console.log('👤 User role_type:', user.role_type); // ✅ add this


    if (!user.role_id || !user.role_type) {
      return res.status(403).json({ message: 'User has no valid role assigned' });
    }

    if (user.role_type === 'corporate') {
      await auditLogger({
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        roleType: user.role_type,
        roleName: user.role_display_name,
        action: 'LOGIN',
        entityType: 'session',
      });

      return res.json({ // ✅ add return res.json()
        data: {
          id: user.id,
          email: user.email,
          name: user.name || null,
          supabaseUid: user.supabase_uid,
          is_active: user.is_active,
          isSuperAdmin: true,
          superAdminRole: user.role_name,
          superAdminRoleDisplay: user.role_display_name,
          roleId: user.role_id,
          roleType: user.role_type
        }
      });
    }

    if (user.role_type === 'company') {
      const [companyUsers] = await pool.query(`
        SELECT c.company_id, c.company_name
        FROM company_users cu
        JOIN company c ON cu.company_id = c.company_id
        WHERE cu.user_id = ?
    `, [user.id]);

      if (companyUsers.length === 0) {
        return res.status(404).json({ message: 'User not associated with any company' });
      }

      await auditLogger({
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        roleType: user.role_type,
        roleName: user.role_display_name,
        companyId: companyUsers[0]?.company_id || null,
        companyName: companyUsers[0]?.company_name || null,
        action: 'LOGIN',
        entityType: 'session',
      });

      return res.json({ // ✅ add return res.json()
        data: {
          id: user.id,
          email: user.email,
          name: user.name || null,
          supabaseUid: user.supabase_uid,
          is_active: user.is_active,
          isSuperAdmin: false,
          companyId: companyUsers[0].company_id,
          companyName: companyUsers[0].company_name,
          companyRole: user.role_name,
          companyRoleDisplay: user.role_display_name,
          roleId: user.role_id,
          roleType: user.role_type
        }
      });
    }

    return res.status(403).json({ message: 'Invalid role type' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/verify-session', async (req, res) => {
  try {
    const { email } = req.query;

    const [users] = await pool.query(`
            SELECT 
                u.id, u.supabase_uid, u.email, u.name,
                u.role_id, r.name AS role_name,
                r.display_name AS role_display_name,
                r.role_type, u.is_active 
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id 
            WHERE u.email = ?
        `, [email]);

    if (users.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = users[0];

    if (user.role_type === 'corporate') {
      return res.json({
        data: {
          id: user.id, email: user.email, name: user.name || null,
          supabaseUid: user.supabase_uid, is_active: user.is_active,
          isSuperAdmin: true, superAdminRole: user.role_name,
          superAdminRoleDisplay: user.role_display_name,
          roleId: user.role_id, roleType: user.role_type
        }
      });
    }

    if (user.role_type === 'company') {
      const [companyUsers] = await pool.query(`
                SELECT c.company_id, c.company_name
                FROM company_users cu
                JOIN company c ON cu.company_id = c.company_id
                WHERE cu.user_id = ?
            `, [user.id]);

      if (companyUsers.length === 0) return res.status(404).json({ message: 'User not associated with any company' });

      return res.json({
        data: {
          id: user.id, email: user.email, name: user.name || null,
          supabaseUid: user.supabase_uid, is_active: user.is_active,
          isSuperAdmin: false,
          companyId: companyUsers[0].company_id,
          companyName: companyUsers[0].company_name,
          companyRole: user.role_name,
          companyRoleDisplay: user.role_display_name,
          roleId: user.role_id, roleType: user.role_type
        }
      });
    }

    return res.status(403).json({ message: 'Invalid role type' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;