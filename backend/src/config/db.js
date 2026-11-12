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

const testConnection = async () => {
  try {
    // 1. Auto-create database if it does not exist yet
    await ensureDatabaseExists();

    // 2. Connect via Sequelize
    await sequelize.authenticate();
    console.log(`[DB] Connected to MySQL database "${config.db.name}" successfully.`);

    // 3. Ensure all tables are created
    await sequelize.sync();

    // 4. If freshly created database with no users, seed default roles & master data
    const [userCountResult] = await sequelize.query("SELECT COUNT(*) as count FROM users;").catch(() => [[{ count: 0 }]]);
    const userCount = userCountResult && userCountResult[0] ? Number(userCountResult[0].count) : 0;

    if (userCount === 0) {
      console.log(`[DB] Initializing seed data for database "${config.db.name}"...`);
      const { seedRolesAndPermissions } = require('../database/seeders/rolesAndPermissionsSeeder');
      const { seedMasterData } = require('../database/seeders/masterDataSeeder');
      await seedRolesAndPermissions().catch((e) => console.warn('[DB] Role seed note:', e.message));
      await seedMasterData().catch((e) => console.warn('[DB] Master seed note:', e.message));
    }
  } catch (error) {
    console.error('[DB] Unable to connect to MySQL database:', error.message);
  }
};

module.exports = {
  sequelize,
  testConnection,
  ensureDatabaseExists,
};
