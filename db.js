const mysql = require('mysql2/promise');

const eventsPool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'crypto_events',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const cryptoPool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'crypto_coins',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = {
  eventsPool,
  cryptoPool
}; 