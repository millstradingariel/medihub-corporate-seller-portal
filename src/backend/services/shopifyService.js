// src/backend/services/shopifyService.js
const { pool } = require("../db");
const { fetchOrdersFromShopify } = require("../shopify/fetchOrders");

async function syncOrdersToMySQL() {
  const orders = await fetchOrdersFromShopify();
  let insertedCount = 0;

  for (const order of orders) {
    // --- Insert order ---
    await pool.execute(
      `INSERT INTO orders 
        (shopify_order_id, kiosk_id, order_name, order_date, paid_date, shopify_customer_id, customer_name, status, total_ex_gst, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         order_name = VALUES(order_name),
         kiosk_id = VALUES(kiosk_id),
         total_ex_gst = VALUES(total_ex_gst),
         status = VALUES(status)`,
      [
        order.id,
        order.kiosk_id,
        order.name,
        order.createdAt,
        order.processedAt,
        order.customer?.id || null,
        order.customer?.displayName || null,
        order.displayFinancialStatus,
        order.subtotalPriceSet.shopMoney.amount, // Order total
        new Date(),
      ]
    );

    insertedCount++;

    // --- Insert order items ---
    for (const item of order.lineItems) {
      // Determine correct unit price
      const price =
        Number(item.originalUnitPriceSet?.shopMoney?.amount) ||
        Number(item.priceSet?.shopMoney?.amount) ||
        Number(item.price) || // fallback for REST API
        0;

      await pool.execute(
        `INSERT INTO order_items
      (order_id, title, sku, quantity, price)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
       quantity = VALUES(quantity),
       price = VALUES(price)`,
        [
          order.id,
          item.title || null,
          item.sku || null,
          item.quantity || 0,
          price,
        ]
      );
    }

  }

  return insertedCount;
}

module.exports = { syncOrdersToMySQL };
