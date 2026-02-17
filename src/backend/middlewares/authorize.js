// backend/middlewares/authorize.js

/**
 * Authorization middleware
 * @param {Object} options - Authorization options
 * @param {string[]} options.companyRoles - Allowed company roles (e.g., ['company_admin', 'staff'])
 * @param {string[]} options.superAdminRoles - Allowed super admin roles (e.g., ['full_access', 'read_only'])
 * @param {boolean} options.allowAnySuperAdmin - If true, any super admin can access (ignores superAdminRoles)
 */
// backend/middlewares/authorize.js
module.exports.authorize = (options = {}) => {
  const {
    companyRoles = [],
    superAdminRoles = [],
    allowAnySuperAdmin = false
  } = options;

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // ===== SUPER ADMIN CHECK =====
    if (req.user.isSuperAdmin) {
      // Allow any super admin regardless of role
      if (allowAnySuperAdmin) return next();

      // Allow only specific super admin roles ('super admin' or 'admin')
      if (superAdminRoles.length > 0 && superAdminRoles.includes(req.user.superAdminRole)) {
        return next();
      }

      return res.status(403).json({ 
        message: "Forbidden - insufficient super admin privileges",
        yourRole: req.user.superAdminRole,
        requiredRoles: superAdminRoles
      });
    }

    // ===== COMPANY USER CHECK =====
    if (!req.user.companyRole) {
      return res.status(403).json({ message: "Forbidden - no company role assigned" });
    }

    if (companyRoles.length > 0 && companyRoles.includes(req.user.companyRole)) {
      return next();
    }

    return res.status(403).json({ 
      message: "Forbidden - insufficient permissions",
      yourRole: req.user.companyRole,
      requiredRoles: companyRoles
    });
  };
};