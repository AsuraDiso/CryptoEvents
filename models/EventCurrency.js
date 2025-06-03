const { DataTypes } = require('sequelize');
const { cryptoDb } = require('../config/database');

const EventCurrency = cryptoDb.define('EventCurrency', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  event_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'events',
      key: 'id'
    }
  },
  currency_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'currencies',
      key: 'id'
    }
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'event_currencies',
  timestamps: false
});

module.exports = EventCurrency; 