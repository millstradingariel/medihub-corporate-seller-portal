const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  user: process.env.DB_USER,   
  password: process.env.DB_PASSWORD,   
  database: process.env.DB_NAME,            
  socketPath: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`, 
  waitForConnections: true,
});

pool.query('SELECT 1')
    .then(() => console.log('🟢 MySQL connected'))
    .catch(err => console.error('🔴 MySQL error', err));

module.exports = { pool }; // ✅ Correct
