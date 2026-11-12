const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  invoiceNumber: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  customerName: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  customerPhone: {
    type: DataTypes.STRING(32),
    allowNull: true,
  },
  saleType: {
    type: DataTypes.ENUM('WHOLESALE', 'RETAIL', 'CASH', 'CREDIT'),
    defaultValue: 'WHOLESALE',
  },
  invoiceDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'CONFIRMED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'RETURNED'),
    defaultValue: 'CONFIRMED',
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  discount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  tax: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  grandTotal: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  paidAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  balanceDue: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  previousDueSnapshot: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  totalPayableSnapshot: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  trayIssued: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  trayReturned: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'invoices',
  timestamps: true,
});

module.exports = Invoice;

