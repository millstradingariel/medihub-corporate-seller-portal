const { pool } = require("../db");
const { fetchOrdersFromShopify, fetchWholesaleOrdersFromShopify } = require("../shopify/fetchOrders");

async function syncOrdersToMySQL() {
  const orders = await fetchOrdersFromShopify();
  let insertedCount = 0;

  for (const order of orders) {

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
        order.subtotalPriceSet.shopMoney.amount,
        new Date(),
      ]
    );

    insertedCount++;

    for (const item of order.lineItems) {
      const price =
        Number(item.originalUnitPriceSet?.shopMoney?.amount) ||
        Number(item.priceSet?.shopMoney?.amount) ||
        Number(item.price) ||
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

async function syncWholesaleOrdersToMySQL() {
  const wholesaleOrders = await fetchWholesaleOrdersFromShopify();
  let insertedCount = 0;

  for (const wholesaleOrder of wholesaleOrders) {
    // ✅ Strip GID to get plain numeric ID
    const orderId = wholesaleOrder.id?.replace('gid://shopify/Order/', '') || null;

    const paymentDate = wholesaleOrder.displayFinancialStatus === "Paid"
      ? wholesaleOrder.processedAt || wholesaleOrder.createdAt
      : '0000-00-00 00:00:00';

    const paymentStatus = wholesaleOrder.displayFinancialStatus === "Paid"
      ? "Paid"
      : "Pending";

    const fulfillmentStatus = wholesaleOrder.displayFulfillmentStatus === "Fulfilled"
      ? "Fulfilled"
      : "Unfulfilled";

    await pool.execute(
      `INSERT INTO wholesale_orders 
          (wholesale_orders_id, wholesale_orders_date, wholesale_orders_name, company_id, payment_status, payment_date, fulfillment_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
          wholesale_orders_name = VALUES(wholesale_orders_name),
          payment_status = VALUES(payment_status),
          payment_date = VALUES(payment_date),
          fulfillment_status = VALUES(fulfillment_status),
          updated_at = NOW()`,
      [
        orderId,
        wholesaleOrder.createdAt,
        wholesaleOrder.name,
        wholesaleOrder.company_id || null,
        paymentStatus,
        paymentDate,
        fulfillmentStatus,
      ]
    );

    insertedCount++;

    for (const item of wholesaleOrder.lineItems) {
      const price = Number(item.price) || 0;

      const [existing] = await pool.execute(
        `SELECT wholesale_orders_id FROM wholesale_order_items 
         WHERE wholesale_orders_id = ? AND sku = ? AND title = ?`,
        [orderId, item.sku || null, item.title || null]
      );

      if (existing.length === 0) {
        await pool.execute(
          `INSERT INTO wholesale_order_items (wholesale_orders_id, title, sku, qty, price)
             VALUES (?, ?, ?, ?, ?)`,
          [orderId, item.title || null, item.sku || null, item.quantity || 0, price]
        );
      }
    }
  }

  return insertedCount;
}

module.exports = { syncOrdersToMySQL, syncWholesaleOrdersToMySQL };
