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

    console.log('🔐 Authenticating user:', email);

    // Get user with role from users table
    const [users] = await pool.query(
      'SELECT id, firebase_uid, email, name, role, is_active FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = users[0];

    // Check if super admin
    if (user.role === 'super admin' || user.role === 'admin') {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        is_active: user.is_active,
        isSuperAdmin: true,
        superAdminRole: user.role
      };
      console.log('👑 Super admin authenticated:', user.email, '| Role:', user.role);
      return next();
    }

    // Check if company user
    if (user.role === 'company super admin' || user.role === 'company admin') {
      // Get company association
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
        companyRole: user.role
      };
      console.log('🏢 Company user authenticated:', user.email, '| Role:', user.role);
      return next();
    }

    return res.status(403).json({ message: 'User has no valid role' });

  } catch (err) {
    console.error('❌ Auth middleware error:', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { authenticate };