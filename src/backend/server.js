// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { pool } = require('./db');

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

// Health check route (Cloud Run uses this to check if app is ready)
app.get('/', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date() });
});

// DB health check
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

// Example DB test route
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
app.use('/api', dashboardRoute);
app.use('/api', analyticsRoute);
app.use('/api', filterRoutes);
app.use('/api', protectedRoutes);
app.use('/api/sanity', sanityRoutes);
app.use('/api/locationss', locationRoutes);
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

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

const PORT = process.env._PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment variables loaded:`);
  console.log(`- DB_USER: ${process.env.DB_USER ? 'SET' : 'NOT SET'}`);
  console.log(`- DB_PASSWORD: ${process.env.DB_PASSWORD ? 'SET' : 'NOT SET'}`);
  console.log(`- DB_NAME: ${process.env.DB_NAME ? 'SET' : 'NOT SET'}`);
  console.log(`- INSTANCE_CONNECTION_NAME: ${process.env.INSTANCE_CONNECTION_NAME ? process.env.INSTANCE_CONNECTION_NAME : 'NOT SET'}`);
});