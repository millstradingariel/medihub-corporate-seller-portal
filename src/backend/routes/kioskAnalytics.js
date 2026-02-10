const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * GET /api/kiosk-analytics?kioskId=...
 */
router.get("/", async (req, res) => {
  const { kioskId } = req.query;

  if (!kioskId) {
    return res.status(400).json({ error: "kioskId is required" });
  }

  try {
    /* ================= ORDERS ================= */

    const [orders] = await db.query(
      `
      SELECT
        shopify_order_id,
        order_date,
        shopify_customer_id,
        total_ex_gst
      FROM orders
      WHERE kiosk_id = ?
      `,
      [kioskId]
    );

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

    const [items] = await db.query(
      `
      SELECT title, quantity, price
      FROM order_items
      WHERE order_id IN (?)
      `,
      [orderIds]
    );

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

    const productsByQuantity = [...products].sort(
      (a, b) => b.quantity - a.quantity
    );

    const productsByRevenue = [...products].sort(
      (a, b) => b.revenue - a.revenue
    );

    const unitsSold = products.reduce(
      (sum, p) => sum + p.quantity,
      0
    );

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
    console.error("Error fetching kiosk analytics:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
