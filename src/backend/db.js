// db.js
const mysql = require('mysql2/promise');

let pool;

try {
  pool = mysql.createPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    socketPath: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    // Add timeout settings
    connectTimeout: 10000,
  });

  console.log('Database pool created successfully');
} catch (error) {
  console.error('Error creating database pool:', error);
  // Create a dummy pool so the app doesn't crash
  pool = null;
}

module.exports = { pool };