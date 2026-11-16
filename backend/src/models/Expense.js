const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  expenseNumber: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'MISCELLANEOUS',
  },
  categoryLabel: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Other Operating Expense',
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0.01,
    },
  },
  paymentMode: {
    type: DataTypes.ENUM('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'),
    defaultValue: 'CASH',
  },
  referenceNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  paidTo: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'CANCELLED'),
    defaultValue: 'ACTIVE',
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'expenses',
  timestamps: true,
});

module.exports = Expense;
