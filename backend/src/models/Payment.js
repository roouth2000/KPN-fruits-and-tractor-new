const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  paymentNumber: {
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
  invoiceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  paymentType: {
    type: DataTypes.ENUM('SALE_PAYMENT', 'PREVIOUS_DUE_COLLECTION', 'ADVANCE'),
    defaultValue: 'SALE_PAYMENT',
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  paymentMode: {
    type: DataTypes.ENUM('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'),
    defaultValue: 'CASH',
  },
  transactionRef: {
    type: DataTypes.STRING(128),
    allowNull: true,
  },
  paymentDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('CONFIRMED', 'REVERSED'),
    defaultValue: 'CONFIRMED',
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'payments',
  timestamps: true,
});

module.exports = Payment;

