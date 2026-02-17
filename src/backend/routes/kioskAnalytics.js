const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { authenticate } = require("../middlewares/authenticate");

/**
 * GET /api/kiosk-analytics?kioskId=...&year=2025&month=12
 */
router.get("/kiosk-analytics", authenticate, async (req, res) => {
  const { kioskId, year, month } = req.query;

  console.log('📊 Fetching analytics for kioskId:', kioskId, 'year:', year, 'month:', month);

  if (!kioskId) {
    return res.status(400).json({ error: "kioskId is required" });
  }

  try {
    /* ================= BUILD QUERY WITH DATE FILTERS ================= */

    let dateFilter = '';
    const queryParams = [kioskId];

    if (year && month) {
      // Filter by specific month
      dateFilter = ' AND YEAR(order_date) = ? AND MONTH(order_date) = ?';
      queryParams.push(year, month);
      console.log(`📅 Filtering by month: ${year}-${month}`);
    } else if (year) {
      // Filter by year only
      dateFilter = ' AND YEAR(order_date) = ?';
      queryParams.push(year);
      console.log(`📅 Filtering by year: ${year}`);
    } else {
      console.log('📅 No date filter (all time)');
    }

    /* ================= ORDERS ================= */

    const [orders] = await pool.query(
      `SELECT
        shopify_order_id,
        order_date,
        shopify_customer_id,
        total_ex_gst
      FROM orders
      WHERE kiosk_id = ?${dateFilter}
      ORDER BY order_date DESC`,
      queryParams
    );

    console.log('📦 Found', orders.length, 'orders for kiosk');

    if (!orders.length) {
      return res.json({
        orders: [],
        revenue: 0,
        referralFees: 0,
        unitsSold: 0,
        customers: 0,
        productsByQuantity: [],
        productsByRevenue: [],
      });
    }

    const orderIds = orders.map(o => o.shopify_order_id);

    /* ================= ORDER ITEMS ================= */

    const placeholders = orderIds.map(() => '?').join(',');
    const [items] = await pool.query(
      `SELECT title, quantity, price
       FROM order_items
       WHERE order_id IN (${placeholders})`,
      orderIds
    );

    console.log('📦 Found', items.length, 'order items');

    /* ================= METRICS ================= */

    const revenue = orders.reduce(
      (sum, o) => sum + Number(o.total_ex_gst || 0),
      0
    );

    // Example: 5% referral fee
    const referralFees = revenue * 0.05;

    const customers = new Set(
      orders
        .map(o => o.shopify_customer_id)
        .filter(Boolean)
    ).size;

    /* ================= PRODUCT AGGREGATION ================= */

    const productMap = {};

    for (const item of items) {
      if (!productMap[item.title]) {
        productMap[item.title] = {
          title: item.title,
          quantity: 0,
          revenue: 0,
        };
      }

      productMap[item.title].quantity += Number(item.quantity);
      productMap[item.title].revenue +=
        Number(item.quantity) * Number(item.price);
    }

    const products = Object.values(productMap);

    const productsByQuantity = [...products]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10); // Top 10

    const productsByRevenue = [...products]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Top 10

    const unitsSold = products.reduce(
      (sum, p) => sum + p.quantity,
      0
    );

    console.log('✅ Analytics calculated:', {
      orders: orders.length,
      revenue,
      unitsSold,
      customers
    });

    /* ================= RESPONSE ================= */

    res.json({
      orders,
      revenue,
      referralFees,
      unitsSold,
      customers,
      productsByQuantity,
      productsByRevenue,
    });

  } catch (err) {
    console.error("❌ Error fetching kiosk analytics:", err);
    console.error("❌ Error stack:", err.stack);
    res.status(500).json({ 
      error: "Server error", 
      message: err.message,
      kioskId: kioskId
    });
  }
});

module.exports = router;