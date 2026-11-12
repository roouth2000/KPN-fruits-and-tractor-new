const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const InvoiceItemBatch = sequelize.define('InvoiceItemBatch', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  invoiceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  invoiceItemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  batchId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  supplierId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  quantity: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'BOX',
  },
  purchaseRate: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  saleRate: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  allocatedDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
}, {
  tableName: 'invoice_item_batches',
  timestamps: true,
  indexes: [
    { fields: ['invoiceId'] },
    { fields: ['invoiceItemId'] },
    { fields: ['batchId'] },
    { fields: ['productId'] },
    { fields: ['supplierId'] },
  ],
});

module.exports = InvoiceItemBatch;

