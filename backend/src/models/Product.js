const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  productCode: {
    type: DataTypes.STRING(32),
    allowNull: false,
    unique: true,
  },
  barcode: {
    type: DataTypes.STRING(64),
    allowNull: true,
    unique: true,
  },
  name: {
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
  defaultUnit: {
    type: DataTypes.STRING(20),
    defaultValue: 'BOX',
  },
  baseUnit: {
    type: DataTypes.STRING(20),
    defaultValue: 'KG',
  },
  conversionFactor: {
    type: DataTypes.DECIMAL(10, 3),
    defaultValue: 1.000,
  },
  wholesaleRate: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  retailRate: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  purchaseRate: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  currentStock: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  minStockLevel: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 10.00,
  },
  isTrayRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  trayType: {
    type: DataTypes.STRING(50),
    defaultValue: 'PLASTIC',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'products',
  timestamps: true,
});

module.exports = Product;

