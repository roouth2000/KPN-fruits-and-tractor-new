const { sequelize } = require('../config/db');

const User = require('./User');
const Role = require('./Role');
const Permission = require('./Permission');
const RolePermission = require('./RolePermission');
const Customer = require('./Customer');
const Supplier = require('./Supplier');
const Product = require('./Product');
const Unit = require('./Unit');
const Invoice = require('./Invoice');
const InvoiceItem = require('./InvoiceItem');
const Payment = require('./Payment');
const PaymentAllocation = require('./PaymentAllocation');
const CustomerLedger = require('./CustomerLedger');
const SupplierLedger = require('./SupplierLedger');
const StockMovement = require('./StockMovement');
const TrayMovement = require('./TrayMovement');
const TaxConfig = require('./TaxConfig');
const AuditLog = require('./AuditLog');
const Batch = require('./Batch');
const InvoiceItemBatch = require('./InvoiceItemBatch');
const Setting = require('./Setting');

// Role & Permission Associations
Role.belongsToMany(Permission, {
  through: RolePermission,
  as: 'permissions',
  foreignKey: 'roleId',
  otherKey: 'permissionId',
});
Permission.belongsToMany(Role, {
  through: RolePermission,
  as: 'roles',
  foreignKey: 'permissionId',
  otherKey: 'roleId',
});

Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });
User.belongsTo(Role, { foreignKey: 'roleId', as: 'userRole' });

// Customer Associations
Customer.hasMany(Invoice, { foreignKey: 'customerId', as: 'invoices' });
Invoice.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Customer.hasMany(Payment, { foreignKey: 'customerId', as: 'payments' });
Payment.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Customer.hasMany(CustomerLedger, { foreignKey: 'customerId', as: 'ledgerEntries' });
CustomerLedger.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Customer.hasMany(TrayMovement, { foreignKey: 'customerId', as: 'trayMovements' });
TrayMovement.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

// Supplier Associations
Supplier.hasMany(SupplierLedger, { foreignKey: 'supplierId', as: 'ledgerEntries' });
SupplierLedger.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });

Supplier.hasMany(TrayMovement, { foreignKey: 'supplierId', as: 'trayMovements' });
TrayMovement.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });

// Invoice Associations
Invoice.hasMany(InvoiceItem, { foreignKey: 'invoiceId', as: 'items', onDelete: 'CASCADE' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

Invoice.hasMany(InvoiceItemBatch, { foreignKey: 'invoiceId', as: 'batchAllocations', onDelete: 'CASCADE' });
InvoiceItemBatch.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

InvoiceItem.hasMany(InvoiceItemBatch, { foreignKey: 'invoiceItemId', as: 'batchAllocations', onDelete: 'CASCADE' });
InvoiceItemBatch.belongsTo(InvoiceItem, { foreignKey: 'invoiceItemId', as: 'invoiceItem' });

// Batch & FIFO Inventory Associations
Product.hasMany(Batch, { foreignKey: 'productId', as: 'batches' });
Batch.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

Supplier.hasMany(Batch, { foreignKey: 'supplierId', as: 'batches' });
Batch.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });

Batch.hasMany(InvoiceItemBatch, { foreignKey: 'batchId', as: 'allocations' });
InvoiceItemBatch.belongsTo(Batch, { foreignKey: 'batchId', as: 'batch' });

Supplier.hasMany(InvoiceItemBatch, { foreignKey: 'supplierId', as: 'batchSaleAllocations' });
InvoiceItemBatch.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });

Product.hasMany(InvoiceItemBatch, { foreignKey: 'productId', as: 'batchSaleAllocations' });
InvoiceItemBatch.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

StockMovement.belongsTo(Batch, { foreignKey: 'batchId', as: 'batch' });
StockMovement.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });

Invoice.hasMany(Payment, { foreignKey: 'invoiceId', as: 'payments' });
Payment.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

Invoice.hasMany(PaymentAllocation, { foreignKey: 'invoiceId', as: 'paymentAllocations', onDelete: 'CASCADE' });
PaymentAllocation.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

// Product Associations
Product.hasMany(InvoiceItem, { foreignKey: 'productId', as: 'invoiceItems' });
InvoiceItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

Product.hasMany(StockMovement, { foreignKey: 'productId', as: 'stockMovements' });
StockMovement.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// Payment Associations
Payment.hasMany(PaymentAllocation, { foreignKey: 'paymentId', as: 'allocations', onDelete: 'CASCADE' });
PaymentAllocation.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });

// User Associations
User.hasMany(Invoice, { foreignKey: 'createdById', as: 'invoices' });
Invoice.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });

User.hasMany(Payment, { foreignKey: 'createdById', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });

User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Setting.belongsTo(User, { foreignKey: 'updatedById', as: 'updatedBy' });

module.exports = {
  sequelize,
  User,
  Role,
  Permission,
  RolePermission,
  Customer,
  Supplier,
  Product,
  Unit,
  Invoice,
  InvoiceItem,
  Payment,
  PaymentAllocation,
  CustomerLedger,
  SupplierLedger,
  StockMovement,
  TrayMovement,
  TaxConfig,
  AuditLog,
  Batch,
  InvoiceItemBatch,
  Setting,
};
