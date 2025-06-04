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
  },
  event_impact_score: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: true,
    comment: 'Score indicating the impact level of the event'
  },
  daily_return: {
    type: DataTypes.DECIMAL(15, 6),
    allowNull: true,
    comment: 'Daily return percentage for the currency on this date'
  },
  volatility: {
    type: DataTypes.DECIMAL(15, 6),
    allowNull: true,
    comment: 'Volatility measure for the currency on this date'
  }
}, {
  tableName: 'event_currencies',
  timestamps: false
});

module.exports = EventCurrency; 