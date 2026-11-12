const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Batch = sequelize.define('Batch', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  batchNumber: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  supplierId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  purchaseDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  initialQuantity: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  currentQuantity: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'BOX',
  },
  purchaseRate: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'DEPLETED', 'EXPIRED'),
    defaultValue: 'ACTIVE',
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
  tableName: 'batches',
  timestamps: true,
  indexes: [
    { fields: ['productId'] },
    { fields: ['supplierId'] },
    { fields: ['purchaseDate'] },
    { fields: ['status'] },
    { unique: true, fields: ['batchNumber'] },
  ],
});

module.exports = Batch;

