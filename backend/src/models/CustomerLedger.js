const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CustomerLedger = sequelize.define('CustomerLedger', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('OPENING', 'SALE', 'PURCHASE', 'PAYMENT', 'RETURN', 'ADJUSTMENT'),
    defaultValue: 'SALE',
  },
  reference: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  debit: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  credit: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  runningBalance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'customer_ledgers',
  timestamps: true,
  updatedAt: false,
});

module.exports = CustomerLedger;

