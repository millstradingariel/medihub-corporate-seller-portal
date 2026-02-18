// backend/middlewares/authenticate.js
const { admin } = require('./verifyToken');
const { pool } = require('../db');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const email = decodedToken.email;

    // 1. Get user from users table
    const [users] = await pool.query(
      'SELECT id, firebase_uid, email, is_active FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = users[0];

    // 2. Check super_admin_users table
    //    Roles: 'super admin' | 'admin'
    const [superAdmins] = await pool.query(
      'SELECT role FROM super_admin_users WHERE user_id = ?',
      [user.id]
    );

    if (superAdmins.length > 0) {
      req.user = {
        id: user.id,
        email: user.email,
        is_active: user.is_active,
        isSuperAdmin: true,
        superAdminRole: superAdmins[0].role  // 'super admin' or 'admin'
      };
      console.log('👑 Super admin authenticated:', req.user.email, '| Role:', req.user.superAdminRole);
      return next();
    }

    // 3. Check company_users table
    //    Roles: 'company super admin' | 'company admin'
    const [companyUsers] = await pool.query(`
      SELECT cu.role, c.company_id, c.company_name
      FROM company_users cu
      JOIN company c ON cu.company_id = c.company_id
      WHERE cu.user_id = ?
    `, [user.id]);

    if (companyUsers.length > 0) {
      req.user = {
        id: user.id,
        email: user.email,
        is_active: user.is_active,
        isSuperAdmin: false,
        companyId: companyUsers[0].company_id,
        companyName: companyUsers[0].company_name,
        companyRole: companyUsers[0].role  // 'company super admin' or 'company admin'
      };
      console.log('🏢 Company user authenticated:', req.user.email, '| Role:', req.user.companyRole);
      return next();
    }

    return res.status(403).json({ message: 'User has no role assigned' });

  } catch (err) {
    console.error('❌ Auth error:', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { authenticate };