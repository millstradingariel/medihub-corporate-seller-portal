const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticate } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');

// backend/routes/auditLogs.js
router.get('/', authenticate, async (req, res) => {
    try {
        const { companyId, page = 1, limit = 20, action, startDate, endDate } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let conditions = [];
        let params = [];

        if (action) { conditions.push('action = ?'); params.push(action); }
        if (startDate) { conditions.push('created_at >= ?'); params.push(startDate); }
        if (endDate) { conditions.push('created_at <= ?'); params.push(endDate + ' 23:59:59'); }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        let logs, total;

        if (req.user.roleType === 'corporate' && !companyId) {
            // ✅ Corporate user — query corporate_audit_logs
            const [rows] = await pool.query(
                `SELECT *, 'corporate' AS source FROM corporate_audit_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
                [...params, parseInt(limit), offset]
            );
            const [[{ count }]] = await pool.query(
                `SELECT COUNT(*) as count FROM corporate_audit_logs ${whereClause}`, params
            );
            logs = rows;
            total = count;
        } else {
            // ✅ Company user OR corporate viewing a specific company — query company_audit_logs
            const targetCompanyId = companyId || req.user.companyId;
            const companyConditions = [`company_id = ?`, ...conditions];
            const companyParams = [targetCompanyId, ...params];
            const companyWhere = `WHERE ${companyConditions.join(' AND ')}`;

            const [rows] = await pool.query(
                `SELECT *, 'company' AS source FROM company_audit_logs ${companyWhere} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
                [...companyParams, parseInt(limit), offset]
            );
            const [[{ count }]] = await pool.query(
                `SELECT COUNT(*) as count FROM company_audit_logs ${companyWhere}`, companyParams
            );
            logs = rows;
            total = count;
        }

        res.json({ data: logs, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        console.error('Audit logs error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;  // make sure this line exists at the bottom
