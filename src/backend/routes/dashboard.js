const express = require('express');
const router = express.Router();
const { pool } = require('../db');

const { fetchAllOrders } = require('../services/shopifyService');
const { saveOrdersToDB } = require('../services/orderService');

router.get('/dashboard', async (req, res) => {
  try {
    const shopifyOrders = await fetchAllOrders();
    console.log('🟢 Shopify orders:', shopifyOrders.length);

    const paidOrders = shopifyOrders.filter(
      o => o.displayFinancialStatus === 'PAID'
    );

    const orders = paidOrders.map(order => {
      // 🔍 Extract kiosk_id from metafields
      const kioskField = order.metafields?.edges.find(
        m => m.node.key === 'kiosk_id'
      );

      const kioskId = kioskField ? kioskField.node.value : null;

      return {
        id: order.id,
        order_name: order.name,
        order_date: order.createdAt,
        status: order.displayFinancialStatus,

        kiosk_id: kioskId,

        shopify_customer_id: order.customer?.id || null,
        customer_name: order.customer?.displayName,

        total_ex_gst: parseFloat(
          order.totalPriceSet.shopMoney.amount
        ),

        items: order.lineItems.edges.map(i => ({
          title: i.node.title,
          quantity: i.node.quantity,
          price: parseFloat(
            i.node.originalUnitPriceSet.shopMoney.amount
          ),
        })),
      };
    });

    // 1️⃣ Save to MySQL
    await saveOrdersToDB(orders);

    // 2️⃣ Read totals from MySQL (source of truth)
    const [[totals]] = await pool.query(`
      SELECT
        COALESCE(SUM(total_ex_gst), 0) AS lifetimeRevenue,
        COUNT(*) AS totalOrders
      FROM orders
      WHERE status = 'PAID'
    `);

    // 3️⃣ Read orders from MySQL
    const [rows] = await pool.query(`
      SELECT * FROM orders
      WHERE status = 'PAID'
      ORDER BY order_date DESC
    `);

    const lifetimeRevenue = parseFloat(totals.lifetimeRevenue);

    res.json({
      orders: rows,
      lifetimeRevenue,
      lifetimeReferralFees: lifetimeRevenue * 0.1,
    });
  } catch (err) {
    console.error('❌ Dashboard error:', err);
    res.status(500).json({ error: 'Dashboard failed' });
  }
});

module.exports = router;