const { DataTypes } = require('sequelize');
const { cryptoDb } = require('../config/database');

const Event = cryptoDb.define('Event', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name_of_incident: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  country: {
    type: DataTypes.STRING
  },
  type_of_event: {
    type: DataTypes.STRING
  },
  place_name: {
    type: DataTypes.STRING
  },
  impact: {
    type: DataTypes.TEXT
  },
  affected_population: {
    type: DataTypes.STRING
  },
  important_person_group: {
    type: DataTypes.STRING
  },
  outcome: {
    type: DataTypes.STRING
  }
}, {
  tableName: 'events',
  timestamps: false
});

module.exports = Event; 