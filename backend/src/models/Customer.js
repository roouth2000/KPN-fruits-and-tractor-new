const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  customerCode: {
    type: DataTypes.STRING(32),
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING(32),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(120),
    allowNull: true,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING(80),
    allowNull: true,
  },
  state: {
    type: DataTypes.STRING(80),
    allowNull: true,
  },
  gstin: {
    type: DataTypes.STRING(32),
    allowNull: true,
  },
  customerType: {
    type: DataTypes.ENUM('REGULAR', 'WHOLESALE', 'WALK_IN'),
    defaultValue: 'REGULAR',
  },
  creditLimit: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 50000.00,
  },
  openingBalance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  currentDue: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  outstandingTrays: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'customers',
  timestamps: true,
});

module.exports = Customer;

