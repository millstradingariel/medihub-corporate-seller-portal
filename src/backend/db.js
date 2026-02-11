// db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  user: process.env.DB_USER,                  // From Cloud Run env vars
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  socketPath: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`, // Cloud SQL private socket
  waitForConnections: true,
});

module.exports = { pool };
