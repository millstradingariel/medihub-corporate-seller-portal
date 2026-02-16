const { pool } = require('../db');

const auditLogger = async ({
    userId,
    userEmail,
    userName,
    roleName,
    roleType,
    companyId,
    action,
    entityType,
    entityId,
    details,
}) => {
    try {
        console.log('📝 auditLogger called:', { userId, userEmail, roleType, roleName, action });

        if (roleType === 'corporate') {
            await pool.query(
                `INSERT INTO corporate_audit_logs 
                (user_id, user_email, user_name, role_name, action, entity_type, entity_id, details)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId, userEmail, userName, roleName || null, action,
                    entityType || null, entityId ? String(entityId) : null,
                    details ? JSON.stringify(details) : null,
                ]
            );
            console.log('✅ Inserted into corporate_audit_logs');
        } else {
            await pool.query(
                `INSERT INTO company_audit_logs 
                (user_id, user_email, user_name, role_name, company_id, action, entity_type, entity_id, details)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId, userEmail, userName, roleName || null,
                    companyId, action,
                    entityType || null, entityId ? String(entityId) : null,
                    details ? JSON.stringify(details) : null,
                ]
            );
            console.log('✅ Inserted into company_audit_logs');
        }
    } catch (err) {
        console.error('❌ Audit log error:', err.message);
        console.error('❌ Audit log stack:', err.stack);
        console.log('📝 roleType value:', roleType, '| type:', typeof roleType);
        console.log('📝 Is corporate?', roleType === 'corporate');
    }
};

module.exports = { auditLogger };