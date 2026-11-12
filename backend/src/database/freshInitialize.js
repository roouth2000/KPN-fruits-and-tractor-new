const { ensureDatabaseExists, sequelize } = require('../config/db');
const { seedRolesAndPermissions } = require('./seeders/rolesAndPermissionsSeeder');
const { seedMasterData } = require('./seeders/masterDataSeeder');

async function freshDatabaseInitialize() {
  console.log('\n======================================================');
  console.log('STARTING COMPLETE FRESH DATABASE INITIALIZATION');
  console.log('======================================================\n');

  await ensureDatabaseExists();
  await sequelize.authenticate();
  console.log('[DB] Connected to MySQL successfully.');

  // Disable foreign key checks during cleanup
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

  try {
    console.log('Purging all dummy transactional and mock records...');

    // 1. Delete all invoices and items
    await sequelize.query('DELETE FROM invoice_items;').catch(() => {});
    await sequelize.query('DELETE FROM invoices;').catch(() => {});
    await sequelize.query('ALTER TABLE invoice_items AUTO_INCREMENT = 1;').catch(() => {});
    await sequelize.query('ALTER TABLE invoices AUTO_INCREMENT = 1;').catch(() => {});

    // 2. Delete all payments and allocations
    await sequelize.query('DELETE FROM payment_allocations;').catch(() => {});
    await sequelize.query('DELETE FROM payments;').catch(() => {});
    await sequelize.query('ALTER TABLE payment_allocations AUTO_INCREMENT = 1;').catch(() => {});
    await sequelize.query('ALTER TABLE payments AUTO_INCREMENT = 1;').catch(() => {});

    // 3. Delete all ledgers and movements
    await sequelize.query('DELETE FROM customer_ledgers;').catch(() => {});
    await sequelize.query('DELETE FROM supplier_ledgers;').catch(() => {});
    await sequelize.query('DELETE FROM stock_movements;').catch(() => {});
    await sequelize.query('DELETE FROM tray_movements;').catch(() => {});
    await sequelize.query('ALTER TABLE customer_ledgers AUTO_INCREMENT = 1;').catch(() => {});
    await sequelize.query('ALTER TABLE supplier_ledgers AUTO_INCREMENT = 1;').catch(() => {});
    await sequelize.query('ALTER TABLE stock_movements AUTO_INCREMENT = 1;').catch(() => {});
    await sequelize.query('ALTER TABLE tray_movements AUTO_INCREMENT = 1;').catch(() => {});

    // 4. Delete all dummy suppliers
    await sequelize.query('DELETE FROM suppliers;').catch(() => {});
    await sequelize.query('ALTER TABLE suppliers AUTO_INCREMENT = 1;').catch(() => {});

    // 5. Delete all dummy customers (keep only CUST-CASH)
    await sequelize.query("DELETE FROM customers WHERE customerCode != 'CUST-CASH';").catch(() => {});
    await sequelize.query("UPDATE customers SET currentDue = 0.00, outstandingTrays = 0.00, creditLimit = 0.00 WHERE customerCode = 'CUST-CASH';").catch(() => {});

    // 6. Reset all fruit stock levels to clean 0.00
    await sequelize.query('UPDATE products SET currentStock = 0.00;').catch(() => {});

    console.log('✓ All mock data purged and table sequences reset to 1.');

    // 7. Seed Fresh Roles, Permissions & Default Staff Accounts
    console.log('\nSeeding system RBAC matrix and staff accounts...');
    await seedRolesAndPermissions();

    // 8. Seed Fresh Master Packaging Units & Defaults
    console.log('\nSeeding fresh master packaging units and defaults...');
    await seedMasterData();

    console.log('\n======================================================');
    console.log('DATABASE FRESHLY INITIALIZED AND READY FOR LIVE USAGE!');
    console.log('======================================================\n');
  } finally {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
  }
}

if (require.main === module) {
  freshDatabaseInitialize()
    .then(() => {
      console.log('Initialization complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Initialization failed:', err);
      process.exit(1);
    });
}

module.exports = { freshDatabaseInitialize };

