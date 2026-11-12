const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const StockMovement = sequelize.define('StockMovement', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  movementType: {
    type: DataTypes.ENUM(
      'OPENING',
      'SALE',
      'PURCHASE',
      'SALE_RETURN',
      'PURCHASE_RETURN',
      'DAMAGE',
      'WASTAGE',
      'ADJUSTMENT'
    ),
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
  unit: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  rate: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  referenceType: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  referenceId: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  batchNumber: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  batchId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  supplierId: {
    type: DataTypes.INTEGER,
    allowNull: true,
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
  tableName: 'stock_movements',
  timestamps: true,
  updatedAt: false,
});

module.exports = StockMovement;

