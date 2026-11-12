const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Unit = sequelize.define('Unit', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  symbol: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  isBaseUnit: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  conversionFactor: {
    type: DataTypes.DECIMAL(10, 3),
    defaultValue: 1.000,
  },
  baseUnitId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'units',
  timestamps: true,
  updatedAt: false,
});

module.exports = Unit;

