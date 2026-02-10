// backend/middlewares/authenticate.js
const { pool } = require("../db");
const { verifyToken } = require("./verifyToken");

const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify Firebase token
    const decodedToken = await verifyToken(token);
    const email = decodedToken.email;

    if (!email) {
      return res.status(401).json({ message: "Invalid token - no email found" });
    }

    // Get user from database
    const [userRows] = await pool.query(
      `SELECT id, email, firebase_uid FROM users WHERE email = ?`,
      [email]
    );

    if (!userRows.length) {
      return res.status(403).json({ message: "User not registered in system" });
    }

    const user = userRows[0];

    // Check if they're a super admin (by checking if they exist in super_admin_users)
    const [superAdminRows] = await pool.query(
      `SELECT role FROM super_admin_users WHERE user_id = ?`,
      [user.id]
    );

    const isSuperAdmin = superAdminRows.length > 0;
    const superAdminRole = isSuperAdmin ? superAdminRows[0].role : null;

    // Get their company info (if they have any)
    const [companyRows] = await pool.query(
      `
      SELECT 
        c._id AS company_id,
        c.company_name AS company_name,
        cu.role AS company_role
      FROM company_users cu
      JOIN company c ON c.company_id = cu.company_id
      WHERE cu.user_id = ?
      `,
      [user.id]
    );

    const companyInfo = companyRows.length > 0 ? companyRows[0] : null;

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      firebaseUid: decodedToken.uid,
      isSuperAdmin,
      superAdminRole,
      companyId: companyInfo?.company_id || null,
      companyName: companyInfo?.company_name || null,
      companyRole: companyInfo?.company_role || null
    };

    next();
  } catch (err) {
    console.error('Authentication error:', err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = { authenticate };