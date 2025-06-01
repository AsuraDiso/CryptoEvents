const { Sequelize } = require('sequelize');

const eventsDb = new Sequelize('crypto_events', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

const cryptoDb = new Sequelize('crypto_coins', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

const testConnections = async () => {
  try {
    await eventsDb.authenticate();
    console.log('Connection to crypto_events database has been established successfully.');
    
    await cryptoDb.authenticate();
    console.log('Connection to crypto_coins database has been established successfully.');
  } catch (err) {
    console.error('Unable to connect to the databases:', err);
  }
};

testConnections();

module.exports = {
  eventsDb,
  cryptoDb
}; 