const { Sequelize } = require('sequelize');

const cryptoDb = new Sequelize('crypto_events', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

const testConnections = async () => {
  try {
    await cryptoDb.authenticate();
    console.log('Connection to crypto_events database has been established successfully.');
  } catch (err) {
    console.error('Unable to connect to the databases:', err);
  }
};

testConnections();

module.exports = { cryptoDb };