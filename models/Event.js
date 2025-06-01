const { DataTypes } = require('sequelize');
const { eventsDb } = require('../config/database');

const Event = eventsDb.define('Event', {
  sl_no: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  name_of_incident: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.STRING
  },
  month: {
    type: DataTypes.STRING
  },
  year: {
    type: DataTypes.STRING
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