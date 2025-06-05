const { DataTypes } = require('sequelize');
// const { cryptoDb } = require('../src/config/database');
const { cryptoDb } = require('../config/database');

const CryptoCurrency = cryptoDb.define('CryptoCurrency', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  Name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  Symbol: {
    type: DataTypes.STRING
  },
  Date: {
    type: DataTypes.DATE
  },
  Close: {
    type: DataTypes.DECIMAL(20, 8)
  },
  High: {
    type: DataTypes.DECIMAL(20, 8)
  },
  Low: {
    type: DataTypes.DECIMAL(20, 8)
  },
  Open: {
    type: DataTypes.DECIMAL(20, 8)
  },
  Volume: {
    type: DataTypes.DECIMAL(30, 8)
  },
  Marketcap: {
    type: DataTypes.DECIMAL(30, 8)
  }
}, {
  tableName: 'currencies',
  timestamps: false
});

module.exports = CryptoCurrency; 