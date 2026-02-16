// backend/middlewares/authorize.js
const { pool } = require('../db');

const authorize = (permission) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            // ✅ If no permission required, just check if authenticated
            if (!permission) return next();

            // ✅ Get user's permissions from their role in DB
            const [permissions] = await pool.query(`
                SELECT p.name
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                JOIN users u ON u.role_id = rp.role_id
                WHERE u.id = ?
            `, [req.user.id]);

            const userPermissions = permissions.map(p => p.name);
            console.log('🔑 User permissions:', userPermissions);
            console.log('🔒 Required permission:', permission);

            // ✅ Check if user has the required permission
            if (!userPermissions.includes(permission)) {
                return res.status(403).json({
                    message: "Forbidden - insufficient permissions",
                    required: permission,
                    yours: userPermissions
                });
            }

            // ✅ Attach permissions to req.user for use in routes
            req.user.permissions = userPermissions;

            next();
        } catch (err) {
            console.error('❌ Authorize error:', err);
            res.status(500).json({ message: 'Authorization failed' });
        }
    };
};

module.exports = { authorize };