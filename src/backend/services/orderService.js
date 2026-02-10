const { pool } = require('../db');

async function saveOrdersToDB(orders) {
  console.log('🟡 saveOrdersToDB called with', orders.length, 'orders');

  for (const order of orders) {
    if (!Array.isArray(order.items)) {
      console.warn('⚠️ Skipping order without items:', order.id);
      continue;
    }

    // 1️⃣ Insert / update order
    await pool.query(
      `
      INSERT INTO orders (
        shopify_order_id,
        order_name,
        order_date,
        shopify_customer_id,
        customer_name,
        status,
        subtotal,
        tax,
        discounts,
        total_ex_gst,
        kiosk_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        customer_name = VALUES(customer_name),
        shopify_customer_id = VALUES(shopify_customer_id),
        status = VALUES(status),
        total_ex_gst = VALUES(total_ex_gst),
        kiosk_id = VALUES(kiosk_id)
      `,
      [
        order.id,
        order.order_name,
        order.order_date,
        order.shopify_customer_id || null,
        order.customer_name || 'Guest',
        order.status,
        order.subtotal || 0,
        order.tax || 0,
        order.discounts || 0,
        order.total_ex_gst,
        order.kiosk_id || null,
      ]
    );

    // 2️⃣ Insert order items
    for (const item of order.items) {
      await pool.query(
        `
        INSERT INTO order_items (order_id, title, quantity, price)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          quantity = VALUES(quantity),
          price = VALUES(price)
        `,
        [
          order.id,
          item.title,
          item.quantity,
          item.price,
        ]
      );
    }
  }
}

module.exports = { saveOrdersToDB };