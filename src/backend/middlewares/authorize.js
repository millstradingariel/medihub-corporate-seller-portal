// backend/middlewares/authorize.js

/**
 * Authorization middleware
 * @param {Object} options - Authorization options
 * @param {string[]} options.companyRoles - Allowed company roles (e.g., ['company_admin', 'staff'])
 * @param {string[]} options.superAdminRoles - Allowed super admin roles (e.g., ['full_access', 'read_only'])
 * @param {boolean} options.allowAnySuperAdmin - If true, any super admin can access (ignores superAdminRoles)
 */
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

    // Check if user is a super admin
    if (req.user.isSuperAdmin) {
      // If allowAnySuperAdmin is true, any super admin can access
      if (allowAnySuperAdmin) {
        return next();
      }

      // Check if their super admin role is allowed
      if (superAdminRoles.length > 0 && superAdminRoles.includes(req.user.superAdminRole)) {
        return next();
      }

      // If no super admin roles specified but they have company role, check that
      if (superAdminRoles.length === 0 && req.user.companyRole) {
        if (companyRoles.includes(req.user.companyRole)) {
          return next();
        }
      }

      // Super admin but doesn't have required role
      return res.status(403).json({ message: "Forbidden - insufficient super admin privileges" });
    }

    // Regular user - check company role
    if (!req.user.companyRole) {
      return res.status(403).json({ message: "Forbidden - no company role assigned" });
    }

    if (!companyRoles.includes(req.user.companyRole)) {
      return res.status(403).json({ message: "Forbidden - insufficient permissions" });
    }

    next();
  };
};