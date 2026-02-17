const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { authenticate } = require("../middlewares/authenticate");

router.get("/dashboard", authenticate, async (req, res) => {
  try {
    const { companyId } = req.query;

    console.log('📊 Fetching dashboard for companyId:', companyId);

    if (!companyId) {
      return res.status(400).json({ error: "companyId is required" });
    }

    // 1. Get all orders for this company
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
      WHERE c.company_id = ?
      ORDER BY o.order_date DESC
    `, [companyId]);

    console.log('📦 Found', orders.length, 'orders for company');

    if (!orders.length) {
      return res.json({
        orders: [],
        lifetimeRevenue: 0,
        lifetimeReferralFees: 0,
      });
    }

    // 2. Get order items for quantity calculation
    const orderIds = orders.map(o => o.shopify_order_id);
    const placeholders = orderIds.map(() => '?').join(',');

    const [items] = await pool.query(`
      SELECT order_id, title, quantity, price
      FROM order_items
      WHERE order_id IN (${placeholders})
    `, orderIds);

    console.log('📦 Found', items.length, 'order items');

    // 3. Map items to orders
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

    // 4. Calculate metrics
    const lifetimeRevenue = orders.reduce(
      (sum, o) => sum + Number(o.total_ex_gst || 0),
      0
    );

    const lifetimeReferralFees = lifetimeRevenue * 0.05; // 5% referral fee

    console.log('✅ Dashboard metrics:', {
      orders: orders.length,
      lifetimeRevenue,
      lifetimeReferralFees,
    });

    res.json({
      orders: ordersWithItems,
      lifetimeRevenue,
      lifetimeReferralFees,
    });

  } catch (err) {
    console.error("❌ Dashboard error:", err);
    res.status(500).json({ 
      error: "Server error", 
      message: err.message 
    });
  }
});

module.exports = router;