const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TaxConfig = sequelize.define('TaxConfig', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  ratePercentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00,
  },
  isInclusive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isExempt: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'tax_configs',
  timestamps: true,
  updatedAt: false,
});

module.exports = TaxConfig;

