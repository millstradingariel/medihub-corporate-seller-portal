// backend/middlewares/authenticate.js
const { supabase } = require('./verifyToken');
const { pool } = require('../db');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    // ✅ Supabase token verification
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
    if (error || !supabaseUser) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const email = supabaseUser.email;
    console.log('🔐 Authenticating user:', email);

    // Get user with role from users table
    const [users] = await pool.query(`
        SELECT 
            u.id, 
            u.supabase_uid, 
            u.email, 
            u.name,
            u.is_active,
            r.name AS role_name,
            r.display_name AS role_display_name, -- ✅ add this
            r.role_type
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.email = ?
    `, [email]);

    if (users.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = users[0];


    // Check if super admin
    // ✅ Fix
    if (user.role_type === 'corporate') {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        is_active: user.is_active,
        isSuperAdmin: true,
        superAdminRole: user.role_name,
        superAdminRoleDisplay: user.role_display_name, // ✅ add this
        roleType: user.role_type,
        permissions: []
      };
      console.log('👑 Corporate user authenticated:', user.email, '| Role:', user.role_name);
      return next();
    }

    // Check if company user
    if (user.role_type === 'company') {
      const [companyUsers] = await pool.query(`
        SELECT c.company_id, c.company_name
        FROM company_users cu
        JOIN company c ON cu.company_id = c.company_id
        WHERE cu.user_id = ?
    `, [user.id]);

      if (companyUsers.length === 0) {
        return res.status(403).json({ message: 'User not associated with any company' });
      }

      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        is_active: user.is_active,
        isSuperAdmin: false,
        companyId: companyUsers[0].company_id,
        companyName: companyUsers[0].company_name,
        companyRole: user.role_name,
        companyRoleDisplay: user.role_display_name, // ✅ add this
        roleType: user.role_type,
        permissions: []
      };
      console.log('🏢 Company user authenticated:', user.email, '| Role:', user.role_name);
      return next();
    }

    return res.status(403).json({ message: 'User has no valid role' });

  } catch (err) {
    console.error('❌ Auth middleware error:', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { authenticate };