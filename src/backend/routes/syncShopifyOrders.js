// src/backend/routes/syncShopifyOrders.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { syncOrdersToMySQL } = require("../services/shopifyService");

router.get("/orders", async (req, res) => {
  try {
    // 1️⃣ Sync Shopify orders to MySQL
    const syncedCount = await syncOrdersToMySQL();

    // 2️⃣ Fetch orders + items (include orders with no items)
    const [rows] = await pool.execute(`
      SELECT o.shopify_order_id,
             o.kiosk_id,
             o.order_name,
             o.order_date,
             o.paid_date,
             o.shopify_customer_id,
             o.customer_name,
             o.status,
             o.total_ex_gst,
             o.created_at,
             oi.title AS item_title,
             oi.sku AS item_sku,
             oi.quantity AS item_quantity
      FROM orders o
      LEFT JOIN order_items oi ON o.shopify_order_id = oi.order_id
      ORDER BY o.order_date DESC, o.shopify_order_id
    `);

    // 3️⃣ Reshape into nested JSON and calculate proportional item prices
    const ordersMap = new Map();

    for (const row of rows) {
      if (!ordersMap.has(row.shopify_order_id)) {
        ordersMap.set(row.shopify_order_id, {
          shopify_order_id: row.shopify_order_id,
          kiosk_id: row.kiosk_id,
          order_name: row.order_name,
          order_date: row.order_date,
          paid_date: row.paid_date,
          shopify_customer_id: row.shopify_customer_id,
          customer_name: row.customer_name,
          status: row.status,
          total_ex_gst: parseFloat(row.total_ex_gst),
          created_at: row.created_at,
          items: [],
        });
      }

      if (row.item_title) {
        ordersMap.get(row.shopify_order_id).items.push({
          title: row.item_title,
          sku: row.item_sku,
          quantity: Number(row.item_quantity),
          // price will be computed later proportionally
          price: 0,
        });
      }
    }

    // 4️⃣ Compute proportional item prices based on order total
    for (const order of ordersMap.values()) {
      const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

      if (totalQuantity > 0) {
        order.items.forEach(item => {
          item.price = parseFloat(
            ((item.quantity / totalQuantity) * order.total_ex_gst).toFixed(2)
          );
        });
      }
    }

    const orders = Array.from(ordersMap.values());

    res.json({
      message: "Shopify orders synced",
      syncedCount,
      orders,
    });
  } catch (err) {
    console.error("Failed to sync or fetch orders:", err);
    res.status(500).json({ error: "Failed to sync or fetch orders" });
  }
});

module.exports = router;
