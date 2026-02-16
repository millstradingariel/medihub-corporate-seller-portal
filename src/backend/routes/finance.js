// backend/routes/financeRoutes.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { authenticate } = require("../middlewares/authenticate");
const { authorize } = require("../middlewares/authorize");

router.get("/account/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;
    const { month, year } = req.query;

    // 1️⃣ Get company sanity ID
    const [[company]] = await pool.query(
      `SELECT _id AS company_sanity_id, company_name
       FROM company
       WHERE company_id = ?`,
      [companyId]
    );
    if (!company) return res.status(404).json({ message: "Company not found" });

    const companySanityId = company.company_sanity_id;

    // 2️⃣ Date filter
    let dateFilter = "";
    const dateParams = [];
    if (month && year) {
      dateFilter = "AND MONTH(o.order_date) = ? AND YEAR(o.order_date) = ?";
      dateParams.push(parseInt(month), parseInt(year));
    }

    // 3️⃣ Summary metrics
    // 3️⃣ Summary metrics
    const summaryQuery = `
        SELECT
            COUNT(DISTINCT o.shopify_order_id) AS total_orders,
            COUNT(DISTINCT o.shopify_customer_id) AS total_customers,
            COALESCE(SUM(oi.quantity), 0) AS units_sold,
            COALESCE(SUM(oi.price * oi.quantity), 0) AS total_revenue
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.shopify_order_id
        JOIN devices d ON o.kiosk_id = d.internal_id
        JOIN location_devices ld ON ld.device_sanity_ref = d.sanity_id
        JOIN company_locations cl ON cl.location_sanity_id = ld.location_sanity_id
        WHERE cl.company_sanity_id = ?
            AND o.status = 'Paid'
            ${dateFilter}
    `;
    const [[summary]] = await pool.query(summaryQuery, [companySanityId, ...dateParams]);

    // 4️⃣ Compute company commission (22.5%)
    const commissionRate = 0.225;
    const commission = Number(summary.total_revenue) * commissionRate;

    // 5️⃣ Products by Quantity & proportional Amount
    // 5️⃣ Products by Quantity & Revenue
    const productsQuery = `
    SELECT 
        oi.title AS product_name,
        SUM(oi.quantity) AS quantity,
        SUM(oi.price * oi.quantity) AS amount  -- ✅ from order_items
    FROM order_items oi
    JOIN orders o ON o.shopify_order_id = oi.order_id
    JOIN devices d ON o.kiosk_id = d.internal_id
    JOIN location_devices ld ON ld.device_sanity_ref = d.sanity_id
    JOIN company_locations cl ON cl.location_sanity_id = ld.location_sanity_id
    WHERE cl.company_sanity_id = ?
        AND o.status = 'Paid'
        ${dateFilter}
    GROUP BY oi.title
    ORDER BY quantity DESC
    LIMIT 10
`;
    const [products] = await pool.query(productsQuery, [companySanityId, ...dateParams]);

    // 6️⃣ Response
    res.json({
      data: {
        companyId: parseInt(companyId),
        companyName: company.company_name,
        totalRevenue: Number(summary.total_revenue) || 0, // total sales attributed to company
        commission: Number(commission) || 0,             // 22.5% commission for the company
        totalCustomers: Number(summary.total_customers) || 0,
        unitsSold: Number(summary.units_sold) || 0,
        productsByQuantity: products.map(p => ({ product_name: p.product_name, quantity: Number(p.quantity) })),
        productsByAmount: products.map(p => ({ product_name: p.product_name, amount: Number(p.amount) }))
      }
    });

  } catch (err) {
    console.error("Finance account error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
});

router.get('/payouts', authenticate, authorize('view_payouts'), async (req, res) => {
  try {
    const { filter = 'all_time', year, month } = req.query;

    // ✅ Define dateCondition before using it
    let dateCondition = '';

    if (filter === 'by_year' && year) {
      dateCondition = `AND YEAR(o.order_date) = ${parseInt(year)}`;
    } else if (filter === 'by_month' && year && month) {
      dateCondition = `AND YEAR(o.order_date) = ${parseInt(year)} AND MONTH(o.order_date) = ${parseInt(month)}`;
    }

    const query = `
      SELECT
          c._id AS company_id,
          c.company_name,
          COUNT(DISTINCT o.shopify_order_id) AS total_orders,
          COALESCE(SUM(oi.price * oi.quantity), 0) AS total_sales,
          COALESCE(SUM(oi.price * oi.quantity) * 0.225, 0) AS referral_fees
      FROM company c
      LEFT JOIN company_locations cl ON cl.company_sanity_id = c._id
      LEFT JOIN location_devices ld ON ld.location_sanity_id = cl.location_sanity_id
      LEFT JOIN devices d ON d.sanity_id = ld.device_sanity_ref
      LEFT JOIN orders o ON o.kiosk_id = d.internal_id
          AND o.status = 'Paid'
          ${dateCondition}
      LEFT JOIN order_items oi ON oi.order_id = o.shopify_order_id
      GROUP BY c._id, c.company_name
      HAVING SUM(oi.price * oi.quantity) > 0
      ORDER BY total_sales DESC
      `;

    const [payouts] = await pool.query(query);
    res.json({ data: payouts });

  } catch (err) {
    console.log('💰 Payouts data:', JSON.stringify(payouts, null, 2));
    res.status(500).json({ message: "Server error", error: err.message });
  }
});
module.exports = router;
