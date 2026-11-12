const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Setting = sequelize.define('Setting', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'GENERAL', // 'MANDI', 'BILLING', 'APMC', 'INVENTORY', 'PRINTER', 'GENERAL'
  },
  dataType: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'STRING', // 'STRING', 'NUMBER', 'BOOLEAN', 'JSON'
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  updatedById: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'settings',
  timestamps: true,
});

module.exports = Setting;

