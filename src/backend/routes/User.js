const express = require("express");
const router = express.Router();
const { pool } = require('../db');
const { authenticate } = require("../middlewares/authenticate");
const { authorize } = require("../middlewares/authorize");
const { supabase } = require("../middlewares/verifyToken");
const { auditLogger } = require('../services/auditLogger');

router.get(
    "/seller-users/view",
    authenticate,
    authorize("view_company_users"),
    async (req, res) => {
        try {
            const isCorporateUser = req.user.roleType === "corporate";
            const { companyId } = req.query;

            let users;

            if (isCorporateUser && !companyId) {
                const [rows] = await pool.query(`
          SELECT 
            u.id, u.name, u.email, u.role_id, u.created_at, u.is_active,
            r.name AS role_name, r.display_name AS role_display_name,
            c.company_id, c.company_name
          FROM users u
          LEFT JOIN roles r ON u.role_id = r.id
          INNER JOIN company_users cu ON cu.user_id = u.id
          INNER JOIN company c ON c.company_id = cu.company_id
          WHERE r.role_type = 'company'
          ORDER BY u.created_at DESC
        `);
                users = rows;

            } else {
                const targetCompanyId = companyId || req.user.companyId;
                const [rows] = await pool.query(`
          SELECT 
            u.id, u.name, u.email, u.role_id, u.created_at, u.is_active,
            r.name AS role_name, r.display_name AS role_display_name,
            c.company_id, c.company_name
          FROM users u
          LEFT JOIN roles r ON u.role_id = r.id
          INNER JOIN company_users cu ON cu.user_id = u.id
          INNER JOIN company c ON c.company_id = cu.company_id
          WHERE c.company_id = ?
          ORDER BY u.created_at DESC
        `, [targetCompanyId]);
                users = rows;
            }

            res.json({ data: users });
        } catch (err) {
            console.error("Get company users error:", err);
            res.status(500).json({ message: "Server error", error: err.message });
        }
    }
);

router.post(
    "/seller-users/create",
    authenticate,
    authorize("view_company_users"),
    async (req, res) => {
        try {
            const { name, email, password, company_id, role_id } = req.body;

            console.log('👤 User creating:', req.user.email);
            console.log('🏢 Target company_id:', company_id);
            console.log('🔐 User roleType:', req.user.roleType);

            if (!name || !email || !password || !company_id || !role_id) {
                return res.status(400).json({ message: "All fields are required" });
            }

            const isCorporateAdmin = req.user.roleType === 'corporate';

            if (isCorporateAdmin) {
                const [companyRows] = await pool.query(
                    'SELECT company_id FROM company WHERE company_id = ?',
                    [company_id]
                );

                if (companyRows.length === 0) {
                    return res.status(400).json({
                        message: "Company does not exist"
                    });
                }
                console.log('✅ Corporate admin can create users for any company');
            } else {
                if (!req.user.companyId) {
                    return res.status(400).json({ message: "User company ID is missing" });
                }

                if (String(company_id) !== String(req.user.companyId)) {
                    console.log('❌ Company mismatch:', {
                        requested: company_id,
                        userCompany: req.user.companyId
                    });
                    return res.status(403).json({
                        message: "You can only create users for your own company"
                    });
                }
                console.log('✅ Company match verified for company admin');
            }

            // Get role details from database
            const [roleRows] = await pool.query(
                'SELECT id, name, display_name FROM roles WHERE id = ?',
                [role_id]
            );

            if (roleRows.length === 0) {
                return res.status(400).json({ message: "Invalid role" });
            }

            const role = roleRows[0];

            // Check if user already exists
            const [existingUsers] = await pool.query(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );
            if (existingUsers.length > 0) {
                return res.status(400).json({
                    message: "User with this email already exists"
                });
            }

            // ✅ Create user in Supabase
            const { data: supabaseUser, error: supabaseError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true  // auto-confirm email
            });

            if (supabaseError) {
                console.error('❌ Supabase user creation error:', supabaseError);
                if (supabaseError.message.includes('already been registered')) {
                    return res.status(400).json({ message: "Email already exists" });
                }
                return res.status(500).json({ message: "Failed to create user" });
            }

            console.log('✅ Supabase user created:', supabaseUser.user.id);

            // Insert into users table
            const [userResult] = await pool.query(
                'INSERT INTO users (supabase_uid, name, email, role_id, is_active, created_at) VALUES (?, ?, ?, ?, 1, NOW())',
                [supabaseUser.user.id, name, email, role_id]
            );

            const userId = userResult.insertId;

            // Link to company
            await pool.query(
                'INSERT INTO company_users (user_id, company_id, created_at) VALUES (?, ?, NOW())',
                [userId, company_id]
            );

            console.log('✅ User created successfully:', {
                userId,
                email,
                name,
                company_id,
                role_id,
                createdBy: req.user.email
            });

            // Fetch the created user with all details
            const [createdUser] = await pool.query(
                `SELECT 
          u.id,
          u.name,
          u.email,
          u.role_id,
          u.created_at,
          r.name AS role_name,
          r.display_name AS role_display_name,
          c.company_id,
          c.company_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        INNER JOIN company_users cu ON cu.user_id = u.id
        INNER JOIN company c ON c.company_id = cu.company_id
        WHERE u.id = ?`,
                [userId]
            );

            await auditLogger({
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                roleName: req.user.superAdminRoleDisplay || req.user.companyRoleDisplay,
                companyId: company_id,
                action: 'CREATE_USER',
                entityType: 'user',
                entityId: userId,
                details: { name, email, role_id },
            });

            res.json({
                message: "User created successfully",
                data: createdUser[0]
            });

        } catch (err) {
            console.error("❌ Create company user error:", err);

            res.status(500).json({
                message: "Server error",
                error: err.message
            });
        }
    }
);

router.put(
    "/seller-users/:id/update",
    authenticate,
    authorize("edit_user"),
    async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { name, role_id, is_active } = req.body;
            const isCorporateUser = req.user.roleType === "corporate";
            // 1️⃣ Validation
            if (!id || isNaN(id)) {
                return res.status(400).json({
                    message: "Invalid user ID"
                });
            }

            if (!name || !role_id) {
                return res.status(400).json({
                    message: "Name and role_id are required"
                });
            }

            // ✅ Optional: Validate name length
            if (name.trim().length < 2) {
                return res.status(400).json({
                    message: "Name must be at least 2 characters"
                });
            }

            const [userRows] = await pool.query(
                `SELECT u.id, u.name, u.email, cu.company_id 
         FROM users u
         INNER JOIN company_users cu ON cu.user_id = u.id
         WHERE u.id = ?`,
                [id]
            );

            if (userRows.length === 0) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            const user = userRows[0];

            if (!isCorporateUser && user.company_id !== req.user.companyId) {
                return res.status(403).json({
                    message: "Unauthorized to edit this user"
                });
            }

            const [roleRows] = await pool.query(
                'SELECT id, name, display_name, role_type FROM roles WHERE id = ?',
                [role_id]
            );

            if (roleRows.length === 0) {
                return res.status(400).json({
                    message: "Invalid role"
                });
            }

            if (roleRows[0].role_type !== 'company') {
                return res.status(400).json({
                    message: "Role must be a company role"
                });
            }

            const role = roleRows[0];

            const [result] = await pool.query(
                'UPDATE users SET name = ?, role_id = ?, is_active = ? WHERE id = ?',
                [name.trim(), role_id, is_active ?? user.is_active, id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            const [updatedUser] = await pool.query(
                `SELECT 
          u.id,
          u.name,
          u.email,
          u.role_id,
          u.is_active,
          u.created_at,
          r.name AS role_name,
          r.display_name AS role_display_name,
          c.company_id,
          c.company_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        INNER JOIN company_users cu ON cu.user_id = u.id
        INNER JOIN company c ON c.company_id = cu.company_id
        WHERE u.id = ?`,
                [id]
            );

            if (updatedUser.length === 0) {
                // This shouldn't happen, but safety check
                return res.status(500).json({
                    message: "User updated but failed to retrieve updated data"
                });
            }

            await auditLogger({
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                roleType: req.user.roleType,
                roleName: req.user.superAdminRoleDisplay || req.user.companyRoleDisplay,
                companyId: updatedUser[0].company_id,
                action: 'EDIT_USER',
                entityType: 'user',
                entityId: id,
                details: { name: name.trim(), newRole: role.display_name },
            });

            res.json({
                message: "User updated successfully",
                data: updatedUser[0]
            });

        } catch (err) {
            console.error("Update company user error:", err);
            res.status(500).json({
                message: "Server error",
                error: err.message
            });
        }
    }
);

router.put(
    "/seller-users/:id/archive",
    authenticate,
    authorize("edit_user"),
    async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const isCorporateUser = req.user.roleType === "corporate";

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    message: "Invalid user ID",
                });
            }

            const [userRows] = await pool.query(
                `SELECT u.id, u.name, u.email, cu.company_id 
         FROM users u
         INNER JOIN company_users cu ON cu.user_id = u.id
         WHERE u.id = ?`,
                [id]
            );

            if (userRows.length === 0) {
                return res.status(404).json({
                    message: "User not found",
                });
            }

            const user = userRows[0];

            if (!isCorporateUser && user.company_id !== req.user.companyId) {
                return res.status(403).json({
                    message: "Unauthorized to archive this user",
                });
            }

            const [result] = await pool.query(
                `UPDATE users 
         SET is_active = 0
         WHERE id = ?`,
                [userId]
            );

            if (result.affectedRows === 0) {
                throw new Error("Failed to archive user");
            }

            await auditLogger({
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                roleType: req.user.roleType,
                roleName: req.user.superAdminRoleDisplay || req.user.companyRoleDisplay,
                companyId: user.company_id,
                action: 'ARCHIVE_USER',
                entityType: 'user',
                entityId: userId,
                details: { archivedUser: user.name, email: user.email },
            });

            res.json({
                message: "User archived successfully",
                data: {
                    id: userId,
                    name: user.name,
                    email: user.email,
                    is_active: 1,
                },
            });
        } catch (err) {
            console.error("Archive user error:", err);
            res.status(500).json({
                message: "Server error",
                error: err.message,
            });
        }
    }
);

router.get('/corporate/view',
    authenticate,
    authorize('view_admin_users'),  // ✅ Simple permission check
    async (req, res) => {
        try {
            const [users] = await pool.query(`
        SELECT 
          u.id,
          u.name,
          u.email,
          u.role_id,
          r.name AS role_name,
          r.display_name AS role_display_name,
          u.is_active,
          u.created_at
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE r.role_type = 'corporate'
        ORDER BY u.created_at DESC
      `);

            console.log('👑 Found', users.length, 'super admin users');
            res.json({ success: true, data: users });
        } catch (err) {
            console.error('Get admin users error:', err);
            res.status(500).json({ success: false, message: 'Server error', error: err.message });
        }
    }
);

router.post(
    '/corporate/create',
    authenticate,
    authorize('create_user'),
    async (req, res) => {
        try {
            const { email, password, name, role_id, is_active } = req.body;
            if (!email || !password || !name || !role_id) {
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required'
                });
            }

            const [roleRows] = await pool.query(
                'SELECT name, display_name, role_type FROM roles WHERE id = ?',
                [role_id]
            );

            if (roleRows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role selected'
                });
            }

            const role = roleRows[0];

            if (role.role_type !== 'corporate') {
                return res.status(400).json({
                    success: false,
                    message: 'Role must be a corporate role'
                });
            }

            const [existingUsers] = await pool.query(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            if (existingUsers.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'User with this email already exists'
                });
            }

            // ✅ FIXED HERE
            const { data: supabaseUser, error: supabaseError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true
            });

            if (supabaseError) {
                console.error('❌ Supabase user creation error:', supabaseError);
                if (supabaseError.message.includes('already been registered')) {
                    return res.status(400).json({ success: false, message: 'Email already exists' });
                }
                return res.status(500).json({ success: false, message: 'Failed to create user' });
            }

            const [result] = await pool.query(
                `INSERT INTO users 
                (supabase_uid, email, name, role_id, is_active, created_at) 
                VALUES (?, ?, ?, ?, ?, NOW())`,
                [supabaseUser.user.id, email, name, role_id, is_active ?? 2]
            );

            console.log('🔍 req.user:', {
                id: req.user.id,
                email: req.user.email,
                roleType: req.user.roleType,
                superAdminRoleDisplay: req.user.superAdminRoleDisplay,
                roleName: req.user.superAdminRoleDisplay || req.user.companyRoleDisplay,
            });

            await auditLogger({
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                roleType: req.user.roleType,
                roleName: req.user.superAdminRoleDisplay || req.user.companyRoleDisplay,
                action: 'CREATE_USER',
                entityType: 'user',
                entityId: result.insertId,
                details: { name, email, role: role.display_name },
            });

            res.status(201).json({
                success: true,
                message: 'User created successfully',
                data: {
                    id: result.insertId,
                    email,
                    name,
                    role_id,
                    role_name: role.name,
                    role_display_name: role.display_name
                }
            });

        } catch (err) {

            res.status(500).json({
                success: false,
                message: 'Server error',
                error: err.message
            });
        }
    }
);

router.put('/corporate/:id/update',
    authenticate,
    authorize('edit_user'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { name, role_id, is_active } = req.body;

            if (!name || !role_id || !is_active) {
                return res.status(400).json({ success: false, message: 'All fields are required' });
            }

            const [users] = await pool.query(
                'SELECT supabase_uid, email, name, is_active FROM users WHERE id = ?',
                [id]
            );

            if (users.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            const user = users[0];

            const [roleRows] = await pool.query(
                'SELECT role_type, display_name FROM roles WHERE id = ?',
                [role_id]
            );

            if (roleRows.length === 0 || roleRows[0].role_type !== 'corporate') {
                return res.status(400).json({ success: false, message: 'Invalid role. Must be a corporate role.' });
            }

            await pool.query('UPDATE users SET name = ?, role_id = ?, is_active = ? WHERE id = ?', [name, role_id, is_active, id]);

            await auditLogger({
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                roleType: req.user.roleType,
                roleName: req.user.superAdminRoleDisplay || req.user.companyRoleDisplay,
                action: 'EDIT_USER',
                entityType: 'user',
                entityId: id,
                details: { name, role: roleRows[0].display_name, is_active },
            });

            res.json({ success: true, message: 'User updated successfully' });

        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to update user', error: error.message });
        }
    }
);

router.put('/corporate/:id/archive',
    authenticate,
    authorize('edit_user'),
    async (req, res) => {
        try {
            const { id } = req.params;

            const [users] = await pool.query(
                'SELECT id, supabase_uid, email, name FROM users WHERE id = ?',
                [id]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const user = users[0];

            if (req.user.id === parseInt(id)) {
                return res.status(403).json({
                    success: false,
                    message: 'You cannot archive your own account'
                });
            }

            await pool.query(
                'UPDATE users SET is_active = 0 WHERE id = ?',
                [id]
            );

            await auditLogger({
                userId: req.user.id,
                userEmail: req.user.email,
                userName: req.user.name,
                roleType: req.user.roleType,
                roleName: req.user.superAdminRoleDisplay || req.user.companyRoleDisplay,
                action: 'ARCHIVE_USER',
                entityType: 'user',
                entityId: id,
                details: { archivedUser: user.name, email: user.email },
            });

            res.json({
                success: true,
                message: 'User archived successfully',
                data: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    is_archived: true
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to archive user',
                error: error.message
            });
        }
    }
);

module.exports = router;