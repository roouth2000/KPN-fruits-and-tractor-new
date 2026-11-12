const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TrayMovement = sequelize.define('TrayMovement', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  supplierId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  movementType: {
    type: DataTypes.ENUM('ISSUE', 'RETURN', 'LOST', 'DAMAGED', 'ADJUSTMENT'),
    allowNull: false,
  },
  trayType: {
    type: DataTypes.STRING(50),
    defaultValue: 'PLASTIC',
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  depositAmount: {
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
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'tray_movements',
  timestamps: true,
  updatedAt: false,
});

module.exports = TrayMovement;

