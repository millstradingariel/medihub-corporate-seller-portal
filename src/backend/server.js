const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { pool } = require('./db');

const dashboardRoute = require('./routes/Dashboard');
const deviceRoute = require('./routes/Device');
const companyRoute = require('./routes/Company');
const userRoute = require('./routes/User');

const analyticsRoute = require("./routes/analytics");
const filterRoutes = require("./routes/filter");
const sanityRoutes = require("./routes/sanity");
const locationRoutes = require("./routes/locations1");
const companyRoutes = require("./routes/companyRoutes");
const protectedRoutes = require("./routes/protected.route");
const kioskAnalyticsRouter = require("./routes/kioskAnalytics");
const authRoute = require("./routes/Auth");
const comRoutes = require("./routes/companies");
const shopifyRoutes = require("./routes/syncShopifyOrders");
const locRoutes = require("./routes/location");
const financeRoutes = require("./routes/finance");
const corporateUsers = require('./routes/corporate-users');
const passwordchangee = require('./routes/password-change');
const rolesRoutes = require('./routes/roles');
const orderRoutes = require('./routes/orders');
const postageRoutes = require('./routes/Postage');
const wholesaleRoutes = require('./routes/WholesaleOrders');
const fetchWholesaleOrders = require('./routes/FetchShopifyTest')
const auditLogsRoutes = require('./routes/auditLogs');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date() });
});

app.get('/health', async (req, res) => {
  if (!pool) {
    return res.status(500).json({
      status: 'unhealthy',
      database: 'not connected',
      message: 'Database pool not initialized'
    });
  }

  try {
    const [rows] = await pool.query('SELECT 1');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Health check DB error:', err);
    res.status(500).json({
      status: 'unhealthy',
      database: 'error',
      error: err.message
    });
  }
});

app.get('/api/test', async (req, res) => {
  if (!pool) {
    return res.status(500).json({
      error: 'Database not available',
      message: 'Check environment variables and Cloud SQL connection'
    });
  }

  try {
    const [rows] = await pool.query('SELECT NOW() AS currentTime');
    res.json({ success: true, time: rows[0].currentTime });
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Wire your routes
app.use('/api/dashboard', dashboardRoute);
app.use('/api/company', companyRoute);
app.use('/api', filterRoutes);
app.use('/api', protectedRoutes);
app.use('/api/sanity', sanityRoutes);
app.use('/api/locationss', locationRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api', kioskAnalyticsRouter);
app.use('/api/auth', authRoute);
app.use('/api', comRoutes);
app.use('/api', shopifyRoutes);
app.use('/api', locRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api', corporateUsers);
app.use('/api', passwordchangee);
app.use('/api', rolesRoutes);
// app.use('/api', orderRoutes);
app.use('/api/postage', postageRoutes);
app.use('/api/wholesale-orders', wholesaleRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/device', deviceRoute);
app.use('/api/user', userRoute);
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});