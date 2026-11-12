const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const InvoiceItem = sequelize.define('InvoiceItem', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  invoiceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  productName: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  variety: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  grade: {
    type: DataTypes.STRING(20),
    defaultValue: 'A',
  },
  batchNumber: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  quantity: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  baseQuantity: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  rate: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  discount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  taxRate: {
    type: DataTypes.DECIMAL(6, 2),
    defaultValue: 0.00,
  },
  taxAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  trayQuantity: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  costPrice: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  cogsAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
}, {
  tableName: 'invoice_items',
  timestamps: true,
  updatedAt: false,
});

module.exports = InvoiceItem;

