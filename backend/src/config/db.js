const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');
const config = require('./env');

const sequelize = new Sequelize(
  config.db.name,
  config.db.user,
  config.db.pass,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: 'mysql',
    logging: config.db.logging,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
    },
  }
);

/**
 * Ensure database exists on MySQL server before connecting Sequelize
 */
const ensureDatabaseExists = async () => {
  try {
    const connection = await mysql.createConnection({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.pass,
    });
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await connection.end();
  } catch (error) {
    console.warn(`[DB] Database creation check notice: ${error.message}`);
  }
};

/**
 * Safe, idempotent schema column migration for existing MySQL databases.
 * sequelize.sync() only creates missing tables; it does NOT add new columns to
 * already-existing production tables (e.g. customers.groupName, customers.isGroupLeader).
 * This runs once at startup / before the first API request so deployments never hit
 * ER_BAD_FIELD_ERROR (HTTP 500) after pulling schema updates.
 */
const ensureSchemaColumns = async () => {
  const dbName = config.db.name;

  const tableExists = async (tableName) => {
    const [rows] = await sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = :dbName AND TABLE_NAME = :tableName`,
      { replacements: { dbName, tableName } }
    );
    return Array.isArray(rows) && rows.length > 0;
  };

  const checkAndAddColumn = async (tableName, columnName, alterSql) => {
    const [rows] = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :dbName AND TABLE_NAME = :tableName AND COLUMN_NAME = :columnName`,
      { replacements: { dbName, tableName, columnName } }
    );
    if (!rows || rows.length === 0) {
      console.log(`[DB Migration] Adding missing column ${tableName}.${columnName}...`);
      await sequelize.query(alterSql);
      console.log(`[DB Migration] Added column ${tableName}.${columnName} successfully.`);
    }
  };

  // 1. customers table columns
  if (await tableExists('customers')) {
    await checkAndAddColumn(
      'customers',
      'groupName',
      'ALTER TABLE `customers` ADD COLUMN `groupName` VARCHAR(120) NULL;'
    );
    await checkAndAddColumn(
      'customers',
      'isGroupLeader',
      'ALTER TABLE `customers` ADD COLUMN `isGroupLeader` TINYINT(1) NOT NULL DEFAULT 0;'
    );
    await checkAndAddColumn(
      'customers',
      'gstin',
      'ALTER TABLE `customers` ADD COLUMN `gstin` VARCHAR(32) NULL;'
    );
    await checkAndAddColumn(
      'customers',
      'openingBalance',
      'ALTER TABLE `customers` ADD COLUMN `openingBalance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00;'
    );
    await checkAndAddColumn(
      'customers',
      'currentDue',
      'ALTER TABLE `customers` ADD COLUMN `currentDue` DECIMAL(12, 2) NOT NULL DEFAULT 0.00;'
    );
    await checkAndAddColumn(
      'customers',
      'outstandingTrays',
      'ALTER TABLE `customers` ADD COLUMN `outstandingTrays` INT NOT NULL DEFAULT 0;'
    );
  }

  // 2. invoices table snapshot & tray columns
  if (await tableExists('invoices')) {
    await checkAndAddColumn(
      'invoices',
      'previousDueSnapshot',
      'ALTER TABLE `invoices` ADD COLUMN `previousDueSnapshot` DECIMAL(12, 2) NOT NULL DEFAULT 0.00;'
    );
    await checkAndAddColumn(
      'invoices',
      'totalPayableSnapshot',
      'ALTER TABLE `invoices` ADD COLUMN `totalPayableSnapshot` DECIMAL(12, 2) NOT NULL DEFAULT 0.00;'
    );
    await checkAndAddColumn(
      'invoices',
      'trayIssued',
      'ALTER TABLE `invoices` ADD COLUMN `trayIssued` INT NOT NULL DEFAULT 0;'
    );
    await checkAndAddColumn(
      'invoices',
      'trayReturned',
      'ALTER TABLE `invoices` ADD COLUMN `trayReturned` INT NOT NULL DEFAULT 0;'
    );
  }

  // 3. settings.value -> LONGTEXT for compressed base64 logo uploads
  if (await tableExists('settings')) {
    const [valRows] = await sequelize.query(
      `SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :dbName AND TABLE_NAME = 'settings' AND COLUMN_NAME = 'value'`,
      { replacements: { dbName } }
    );
    if (valRows && valRows[0] && String(valRows[0].DATA_TYPE).toLowerCase() !== 'longtext') {
      console.log('[DB Migration] Upgrading settings.value column to LONGTEXT...');
      await sequelize.query('ALTER TABLE `settings` MODIFY COLUMN `value` LONGTEXT NULL;');
    }
  }
};

let schemaInitialized = false;
let schemaInitPromise = null;

const testConnection = async () => {
  try {
    // 1. Auto-create database if it does not exist yet
    await ensureDatabaseExists();

    // 2. Connect via Sequelize
    await sequelize.authenticate();
    console.log(`[DB] Connected to MySQL database "${config.db.name}" successfully.`);

    // 3. Register models & ensure all tables are created
    require('../models');
    await sequelize.sync();

    // 4. Auto-migrate any newly added columns on existing production tables
    await ensureSchemaColumns();

    // 5. If freshly created database with no users, seed default roles & master data
    const [userCountResult] = await sequelize.query("SELECT COUNT(*) as count FROM users;").catch(() => [[{ count: 0 }]]);
    const userCount = userCountResult && userCountResult[0] ? Number(userCountResult[0].count) : 0;

    if (userCount === 0) {
      console.log(`[DB] Initializing seed data for database "${config.db.name}"...`);
      const { seedRolesAndPermissions } = require('../database/seeders/rolesAndPermissionsSeeder');
      const { seedMasterData } = require('../database/seeders/masterDataSeeder');
      await seedRolesAndPermissions().catch((e) => console.warn('[DB] Role seed note:', e.message));
      await seedMasterData().catch((e) => console.warn('[DB] Master seed note:', e.message));
    }

    schemaInitialized = true;
  } catch (error) {
    console.error('[DB] Unable to connect to MySQL database:', error.message);
    throw error;
  }
};

/**
 * Ensures database connection + schema column migrations have completed before
 * serving API requests (important for Hostinger / Passenger lazy startup).
 * Resolves immediately once completed.
 */
const ensureSchemaReady = async () => {
  if (schemaInitialized) return;
  if (!schemaInitPromise) {
    schemaInitPromise = testConnection().catch((err) => {
      // Allow retry on subsequent request if transient boot failure occurred
      schemaInitPromise = null;
      throw err;
    });
  }
  return schemaInitPromise;
};

module.exports = {
  sequelize,
  testConnection,
  ensureDatabaseExists,
  ensureSchemaColumns,
  ensureSchemaReady,
};
