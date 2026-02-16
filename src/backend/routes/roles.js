// backend/routes/roles.routes.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticate } = require("../middlewares/authenticate");
const { authorize } = require("../middlewares/authorize");
const { auditLogger } = require('../services/auditLogger');

router.get('/permissions', authenticate, authorize('view_roles'), async (req, res) => {
  try {
    const [permissions] = await pool.query(`
      SELECT 
        id,
        name,
        display_name,
        description,
        category
      FROM permissions
      ORDER BY category, display_name
    `);

    // Group by category
    const grouped = permissions.reduce((acc, perm) => {
      if (!acc[perm.category]) {
        acc[perm.category] = [];
      }
      acc[perm.category].push(perm);
      return acc;
    }, {});

    res.json({ success: true, data: grouped });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch permissions' });
  }
});

// =====================================================
// ROLES ROUTES
// =====================================================

/**
 * GET /api/roles
 * Get all roles with their permissions count
 */
router.get('/roles', authenticate, async (req, res) => {
  try {
    const { role_type } = req.query;

    let query = `
      SELECT 
        r.id,
        r.name,
        r.display_name,
        r.description,
        r.role_type,
        r.is_system_role,
        r.created_at,
        COUNT(rp.permission_id) as permissions_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
    `;

    const params = [];
    if (role_type) {
      query += ` WHERE r.role_type = ?`;
      params.push(role_type);
    }

    query += ` GROUP BY r.id ORDER BY r.created_at DESC`;

    const [roles] = await pool.query(query, params);

    res.json({ success: true, data: roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch roles' });
  }
});

/**
 * GET /api/roles/:id
 * Get a specific role with all its permissions
 */
router.get('/roles/:id', authenticate, authorize('view_roles'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get role details
    const [roles] = await pool.query(`
      SELECT 
        id,
        name,
        display_name,
        description,
        role_type,
        is_system_role,
        created_at
      FROM roles
      WHERE id = ?
    `, [id]);

    if (roles.length === 0) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const role = roles[0];

    // Get role permissions
    const [permissions] = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.display_name,
        p.category
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
      ORDER BY p.category, p.display_name
    `, [id]);

    role.permissions = permissions;

    res.json({ success: true, data: role });
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch role' });
  }
});

/**
 * POST /api/roles
 * Create a new role
 */
router.post('/roles', authenticate, authorize('create_role'), async (req, res) => {
  try {
    const { name, display_name, description, role_type, permission_ids } = req.body;

    // Validation
    if (!name || !display_name || !role_type) {
      return res.status(400).json({
        success: false,
        message: 'Name, display name, and role type are required'
      });
    }

    if (!['corporate', 'company'].includes(role_type)) {
      return res.status(400).json({
        success: false,
        message: 'Role type must be either corporate or company'
      });
    }

    // Check if role name already exists
    const [existing] = await pool.query(
      'SELECT id FROM roles WHERE name = ?',
      [name]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Role with this name already exists'
      });
    }

    // Insert role
    const [result] = await pool.query(`
      INSERT INTO roles (name, display_name, description, role_type, is_system_role)
      VALUES (?, ?, ?, ?, FALSE)
    `, [name, display_name, description, role_type]);

    const roleId = result.insertId;

    // Assign permissions if provided
    if (permission_ids && permission_ids.length > 0) {
      const permissionValues = permission_ids.map(pid => [roleId, pid]);
      await pool.query(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES ?',
        [permissionValues]
      );
    }

    await auditLogger({
      userId: req.user.id,
      userEmail: req.user.email,
      userName: req.user.name,
      roleType: req.user.roleType,
      roleName: req.user.superAdminRoleDisplay || req.user.companyRoleDisplay,
      action: 'CREATE_ROLE',
      entityType: 'role',
      entityId: roleId,
      details: { name, display_name, role_type, permissions: permission_ids?.length || 0 },
    });

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: { id: roleId }
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ success: false, message: 'Failed to create role' });
  }
});

/**
 * PUT /api/roles/:id
 * Update a role and its permissions
 */
router.put('/roles/:id', authenticate, authorize('edit_role'), async (req, res) => {
  try {
    const { id } = req.params;
    const { display_name, description, permission_ids } = req.body;

    // Check if role exists and is not a system role
    const [roles] = await pool.query(
      'SELECT is_system_role FROM roles WHERE id = ?',
      [id]
    );

    if (roles.length === 0) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const role = roles[0];

    if (role.is_system_role) {
      // System roles can only update permissions, not name/description
      if (display_name || description) {
        return res.status(403).json({
          success: false,
          message: 'Cannot modify system role details. Only permissions can be updated.'
        });
      }
    }

    // Update role details (if not system role)
    if (!role.is_system_role && (display_name || description)) {
      await pool.query(`
        UPDATE roles 
        SET display_name = COALESCE(?, display_name),
            description = COALESCE(?, description)
        WHERE id = ?
      `, [display_name, description, id]);
    }

    // Update permissions
    if (permission_ids !== undefined) {
      // Delete existing permissions
      await pool.query('DELETE FROM role_permissions WHERE role_id = ?', [id]);

      // Insert new permissions
      if (permission_ids.length > 0) {
        const permissionValues = permission_ids.map(pid => [id, pid]);
        await pool.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ?',
          [permissionValues]
        );
      }
    }

    await auditLogger({
      userId: req.user.id,
      userEmail: req.user.email,
      userName: req.user.name,
      roleType: req.user.roleType,
      roleName: req.user.superAdminRoleDisplay || req.user.companyRoleDisplay,
      action: 'EDIT_ROLE',
      entityType: 'role',
      entityId: id,
      details: { display_name, description, permissions: permission_ids?.length || 0 },
    });

    res.json({ success: true, message: 'Role updated successfully' });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ success: false, message: 'Failed to update role' });
  }
});

/**
 * DELETE /api/roles/:id
 * Delete a custom role (system roles cannot be deleted)
 */
router.delete('/roles/:id', authenticate, authorize('delete_role'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if role exists and is not a system role
    const [roles] = await pool.query(
      'SELECT is_system_role FROM roles WHERE id = ?',
      [id]
    );

    if (roles.length === 0) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const role = roles[0];

    if (role.is_system_role) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete system roles'
      });
    }

    // Check if any users are assigned this role
    const [userCount] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE role_id = ?',
      [id]
    );

    if (userCount[0].count > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete role. ${userCount[0].count} user(s) are assigned to this role.`
      });
    }

    // ✅ Fetch role details before deleting
    const [roleDetails] = await pool.query(
      'SELECT name, display_name FROM roles WHERE id = ?',
      [id]
    );

    // Delete role (CASCADE will handle role_permissions)
    await pool.query('DELETE FROM roles WHERE id = ?', [id]);

    await auditLogger({
      userId: req.user.id,
      userEmail: req.user.email,
      userName: req.user.name,
      roleType: req.user.roleType,
      roleName: req.user.superAdminRoleDisplay || req.user.companyRoleDisplay,
      action: 'DELETE_ROLE',
      entityType: 'role',
      entityId: id,
      details: { deletedRole: roleDetails[0].name, display_name: roleDetails[0].display_name },
    });

    res.json({ success: true, message: 'Role deleted successfully' });

  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ success: false, message: 'Failed to delete role' });
  }
});

// =====================================================
// USER PERMISSIONS ENDPOINT (Read-Only)
// Shows what permissions a user has from their role
// =====================================================

/**
 * GET /api/users/:userId/permissions
 * Get user's permissions from their role
 */
router.get('/users/:userId/permissions', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check authorization - users can view their own, admins can view all
    if (req.user.id !== parseInt(userId) && !req.user.permissions.includes('view_users')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const [permissions] = await pool.query(`
      SELECT DISTINCT 
        p.id,
        p.name,
        p.display_name,
        p.category
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN users u ON u.role_id = rp.role_id
      WHERE u.id = ?
      ORDER BY p.category, p.display_name
    `, [userId]);

    res.json({ success: true, data: permissions });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch permissions' });
  }
});

module.exports = router;