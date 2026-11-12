const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SupplierLedger = sequelize.define('SupplierLedger', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  supplierId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('OPENING', 'SALE', 'PURCHASE', 'PAYMENT', 'RETURN', 'ADJUSTMENT'),
    defaultValue: 'PURCHASE',
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
}, {
  tableName: 'supplier_ledgers',
  timestamps: true,
  updatedAt: false,
});

module.exports = SupplierLedger;

