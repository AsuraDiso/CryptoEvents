const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'pool',
  user: 'root',
  password: '',
  database: 'crypto_events',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool