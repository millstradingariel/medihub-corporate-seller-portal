const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { authenticate } = require("../middlewares/authenticate");
const { authorize } = require("../middlewares/authorize");

router.get(
    "/corporate",
    authenticate,
    authorize('view_corporate_dashboard'),
    async (req, res) => {
        try {
            const { year, month } = req.query;

            let dateFilter = '';
            const queryParams = [];

            if (year && month) {
                dateFilter = ' AND YEAR(o.order_date) = ? AND MONTH(o.order_date) = ?';
                queryParams.push(year, month);
            } else if (year) {
                dateFilter = ' AND YEAR(o.order_date) = ?';
                queryParams.push(year);
            }

            const [orders] = await pool.query(`
        SELECT 
          o.shopify_order_id,
          o.total_ex_gst,
          o.shopify_customer_id,
          c.company_id,
          c.company_name
        FROM orders o
        JOIN devices d ON o.kiosk_id = d.internal_id
        JOIN location_devices ld ON d.sanity_id = ld.device_sanity_ref
        JOIN locations l ON ld.location_sanity_id = l.sanity_id
        JOIN company_locations cl ON l.sanity_id = cl.location_sanity_id
        JOIN company c ON cl.company_sanity_id = c._id
        WHERE 1=1${dateFilter}
      `, queryParams);

            if (!orders.length) {
                return res.json({
                    totalRevenue: 0,
                    totalReferralFees: 0,
                    totalOrders: 0,
                    totalUnitsSold: 0,
                    totalCustomers: 0,
                    companyStats: []
                });
            }

            const orderIds = orders.map(o => o.shopify_order_id);
            const placeholders = orderIds.map(() => '?').join(',');

            const [items] = await pool.query(`
        SELECT order_id, quantity
        FROM order_items
        WHERE order_id IN (${placeholders})
      `, orderIds);

            const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_ex_gst || 0), 0);
            const totalReferralFees = totalRevenue * 0.225;
            const totalOrders = orders.length;
            const totalUnitsSold = items.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
            const totalCustomers = new Set(orders.map(o => o.shopify_customer_id).filter(Boolean)).size;

            const companyMap = {};
            const itemsByOrderId = {};
            items.forEach(item => {
                if (!itemsByOrderId[item.order_id]) itemsByOrderId[item.order_id] = 0;
                itemsByOrderId[item.order_id] += Number(item.quantity || 0);
            });

            orders.forEach(order => {
                const { company_id, company_name, total_ex_gst, shopify_order_id } = order;
                if (!companyMap[company_id]) {
                    companyMap[company_id] = { company_id, company_name, revenue: 0, orders: 0, units_sold: 0 };
                }
                companyMap[company_id].revenue += Number(total_ex_gst || 0);
                companyMap[company_id].orders += 1;
                companyMap[company_id].units_sold += itemsByOrderId[shopify_order_id] || 0;
            });

            const companyStats = Object.values(companyMap).sort((a, b) => b.revenue - a.revenue);

            res.json({
                totalRevenue,
                totalReferralFees,
                totalOrders,
                totalUnitsSold,
                totalCustomers,
                companyStats
            });
        } catch (err) {
            res.status(500).json({ error: "Server error", message: err.message });
        }
    }
);

router.get("/seller", authenticate, async (req, res) => {
    try {
        const { companyId, year, month } = req.query;

        if (!companyId) {
            return res.status(400).json({ error: "companyId is required" });
        }

        let dateFilter = '';
        const queryParams = [companyId];

        if (year && month) {
            dateFilter = ' AND YEAR(o.order_date) = ? AND MONTH(o.order_date) = ?';
            queryParams.push(year, month);
        } else if (year) {
            dateFilter = ' AND YEAR(o.order_date) = ?';
            queryParams.push(year);
        }

        const [orders] = await pool.query(`
      SELECT 
        o.shopify_order_id,
        o.order_name,
        o.order_date,
        o.kiosk_id,
        o.shopify_customer_id,
        o.customer_name,
        o.status,
        o.total_ex_gst
      FROM orders o
      JOIN devices d ON o.kiosk_id = d.internal_id
      JOIN location_devices ld ON d.sanity_id = ld.device_sanity_ref
      JOIN locations l ON ld.location_sanity_id = l.sanity_id
      JOIN company_locations cl ON l.sanity_id = cl.location_sanity_id
      JOIN company c ON cl.company_sanity_id = c._id
      WHERE c.company_id = ?${dateFilter}
      ORDER BY o.order_date DESC
    `, queryParams);


        if (!orders.length) {
            return res.json({
                orders: [],
                lifetimeRevenue: 0,
                lifetimeReferralFees: 0,
            });
        }

        const orderIds = orders.map(o => o.shopify_order_id);
        const placeholders = orderIds.map(() => '?').join(',');

        const [items] = await pool.query(`
      SELECT order_id, title, sku, quantity, price
      FROM order_items
      WHERE order_id IN (${placeholders})
    `, orderIds);

        const itemsByOrderId = {};
        items.forEach(item => {
            if (!itemsByOrderId[item.order_id]) {
                itemsByOrderId[item.order_id] = [];
            }
            itemsByOrderId[item.order_id].push(item);
        });

        const ordersWithItems = orders.map(order => ({
            ...order,
            items: itemsByOrderId[order.shopify_order_id] || []
        }));

        const lifetimeRevenue = orders.reduce(
            (sum, o) => sum + Number(o.total_ex_gst || 0), 0
        );
        const lifetimeReferralFees = lifetimeRevenue * 0.225;


        res.json({
            orders: ordersWithItems,
            lifetimeRevenue,
            lifetimeReferralFees,
        });

    } catch (err) {
        res.status(500).json({ error: "Server error", message: err.message });
    }
});

module.exports = router;
