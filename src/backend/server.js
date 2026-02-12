// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { pool } = require('./db'); // Import Cloud SQL pool

// Import your routes
const dashboardRoute = require('./routes/dashboard');
const analyticsRoute = require("./routes/analytics");
const filterRoutes = require("./routes/filter");
const sanityRoutes = require("./routes/sanity");
const locationRoutes = require("./routes/locations1");
const companyRoutes = require("./routes/companyRoutes");
const deviceRoutes = require("./routes/devices");
const protectedRoutes = require("./routes/protected.route");
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

// Example DB test route
app.get('/api/test', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW() AS currentTime');
    res.json({ success: true, time: rows[0].currentTime });
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Wire your routes
app.use('/api', dashboardRoute);
app.use('/api', analyticsRoute);
app.use('/api', filterRoutes);
app.use('/api', protectedRoutes);
app.use('/api/sanity', sanityRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api', deviceRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/kiosk-analytics', kioskAnalyticsRouter);
app.use('/api/auth', userRoutes);
app.use('/api', comRoutes);
app.use('/api', shopifyRoutes);
app.use('/api', locRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api', corporateUsers);
app.use('/api', passwordchangee);

// Listen on the port provided by Cloud Run or fallback to 8080
const PORT = process.env._PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
