const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'medihub',
    waitForConnections: true,
});

pool.query('SELECT 1')
    .then(() => console.log('🟢 MySQL connected'))
    .catch(err => console.error('🔴 MySQL error', err));

module.exports = { pool }; // ✅ Correct
