// const express = require('express');
// const cors = require('cors');
// const fetch = require('node-fetch');
// require('dotenv').config();

// const app = express();
// const PORT = process.env.PORT || 3002;

// app.use(cors());
// app.use(express.json());

// const SHOP = process.env.SHOPIFY_STORE_DOMAIN;
// const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
// const VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';

// console.log('🔧 Configuration:');
// console.log('  SHOP:', SHOP ? '✓ Set' : '✗ Missing');
// console.log('  TOKEN:', TOKEN ? '✓ Set' : '✗ Missing');

// async function fetchAllOrders() {
//   const allOrders = [];
//   let hasNextPage = true;
//   let cursor = null;

//   const query = `
//     query GetOrders($first: Int!, $after: String) {
//       orders(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
//         pageInfo {
//           hasNextPage
//           endCursor
//         }
//         edges {
//           node {
//             id
//             name
//             createdAt
//             displayFinancialStatus
//             totalPriceSet {
//               shopMoney {
//                 amount
//               }
//             }
//             lineItems(first: 100) {
//               edges {
//                 node {
//                   id
//                   title
//                   quantity
//                   originalUnitPriceSet {
//                     shopMoney {
//                       amount
//                     }
//                   }
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   `;

//   async function saveOrdersToDB(orders) {
//     for (const order of orders) {
//       const [result] = await db.execute(
//         `
//       INSERT IGNORE INTO orders
//       (shopify_order_id, order_name, order_date, status, total_ex_gst)
//       VALUES (?, ?, ?, ?, ?)
//       `,
//         [
//           order.id,
//           order.order_name,
//           order.order_date,
//           order.status,
//           order.total_ex_gst,
//         ]
//       );

//       const orderId = result.insertId;
//       if (!orderId) continue;

//       for (const item of order.items) {
//         await db.execute(
//           `
//         INSERT INTO order_items (order_id, title, quantity, price)
//         VALUES (?, ?, ?, ?)
//         `,
//           [orderId, item.title, item.quantity, item.price]
//         );
//       }
//     }
//   }


//   while (hasNextPage) {
//     const response = await fetch(
//       `https://${SHOP}/admin/api/${VERSION}/graphql.json`,
//       {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'X-Shopify-Access-Token': TOKEN,
//         },
//         body: JSON.stringify({ query, variables: { first: 250, after: cursor } }),
//       }
//     );

//     const json = await response.json();
//     if (json.errors) {
//       console.error('❌ Shopify API errors:', JSON.stringify(json.errors, null, 2));
//       throw new Error(`Shopify error: ${JSON.stringify(json.errors)}`);
//     }

//     const orders = json.data.orders.edges.map(e => e.node);
//     allOrders.push(...orders);

//     hasNextPage = json.data.orders.pageInfo.hasNextPage;
//     cursor = json.data.orders.pageInfo.endCursor;

//     if (hasNextPage) await new Promise(r => setTimeout(r, 500));
//   }

//   return allOrders;
// }

// app.get('/api/dashboard', async (req, res) => {
//   try {
//     // 1️⃣ Fetch from Shopify
//     const allOrders = await fetchAllOrders();
//     const paidOrders = allOrders.filter(
//       o => o.displayFinancialStatus === 'PAID'
//     );

//     // 2️⃣ Transform Shopify → internal format
//     const orders = paidOrders.map(order => ({
//       order_date: order.createdAt,
//       total_ex_gst: parseFloat(order.totalPriceSet.shopMoney.amount),
//       status: order.displayFinancialStatus,
//       order_name: order.name,
//       shopify_id: order.id,
//       items: order.lineItems.edges.map(i => ({
//         title: i.node.title,
//         quantity: i.node.quantity,
//         price: parseFloat(
//           i.node.originalUnitPriceSet.shopMoney.amount
//         ),
//       })),
//     }));

//     // 3️⃣ Save to SQL
//     await saveOrdersToDB(
//       orders.map(o => ({
//         ...o,
//         id: o.shopify_id,
//       }))
//     );

//     // 4️⃣ Read from SQL (THIS IS THE KEY PART)
//     const [[totals]] = await db.query(`
//       SELECT
//         SUM(total_ex_gst) AS lifetimeRevenue,
//         COUNT(*) AS totalOrders
//       FROM orders
//       WHERE status = 'PAID'
//     `);

//     const [rows] = await db.query(`
//       SELECT
//         o.order_date,
//         o.total_ex_gst,
//         SUM(oi.quantity) AS quantity
//       FROM orders o
//       JOIN order_items oi ON oi.order_id = o.id
//       WHERE o.status = 'PAID'
//       GROUP BY o.id
//     `);

//     const lifetimeReferralFees = totals.lifetimeRevenue * 0.1;

//     res.json({
//       orders: rows.map(r => ({
//         order_date: r.order_date,
//         total_ex_gst: r.total_ex_gst,
//         items: [{ quantity: r.quantity }],
//       })),
//       lifetimeRevenue: totals.lifetimeRevenue,
//       lifetimeReferralFees,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Dashboard SQL error' });
//   }
// });


// app.get('/health', (req, res) => {
//   res.json({ status: 'ok' });
// });

// app.listen(PORT, () => {
//   console.log(`🚀 Backend running on http://localhost:${PORT}`);
// });

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const dashboardRoute = require('./routes/dashboard');
const analyticsRoute = require("./routes/analytics");
const filterRoutes = require("./routes/filter");
const sanityRoutes = require("./routes/sanity");
const locationRoutes = require("./routes/locations1");
const companyRoutes = require("./routes/companyRoutes");
const deviceRoutes = require("./routes/devices");
const protectedRoutes = require("./routes/protected.route")
const kioskAnalyticsRouter = require("./routes/kioskAnalytics");
const userRoutes = require("./routes/authRoutes");
const comRoutes = require("./routes/companies");
const shopifyRoutes = require("./routes/syncShopifyOrders");
const locRoutes = require("./routes/location");
const financeRoutes = require("./routes/finance");
const corporateUsers = require('./routes/corporate-users');
const passwordchangee = require('./routes/password-change');
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', dashboardRoute);
app.use('/api', analyticsRoute);
app.use('/api', filterRoutes);
app.use("/api", protectedRoutes);
app.use("/api/sanity", sanityRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api", deviceRoutes);
app.use('/api/companies', companyRoutes);
app.use("/api/kiosk-analytics", kioskAnalyticsRouter);
app.use('/api/auth', userRoutes);
app.use('/api', comRoutes);
app.use('/api', shopifyRoutes);
app.use('/api', locRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api', corporateUsers);
app.use('/api', passwordchangee);

app.listen(3001, () => {
  console.log('🚀 Backend running on http://localhost:3001');
});

