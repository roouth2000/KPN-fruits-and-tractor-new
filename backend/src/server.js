const app = require('./app');
const config = require('./config/env');
const { ensureSchemaReady } = require('./config/db');

// Hostinger / Passenger Compatibility:
// 1. Unconditionally call app.listen() — do NOT guard with `if (require.main === module)`
// 2. Call app.listen() immediately without blocking with `await ensureSchemaReady()`
const PORT = process.env.PORT || config.port || 5000;

const server = app.listen(PORT, () => {
  console.log(`[Server] Finovore Billing API running on port ${PORT}`);

  // Initialize DB connection & auto-migrate missing columns asynchronously without blocking startup
  ensureSchemaReady().catch((err) => {
    console.error(`[DB Error] Database initialization failed: ${err.message}`);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\x1b[31m[ERROR]\x1b[0m Port ${PORT} is already in use by another process.`);
    console.error(`To free port ${PORT}, run: fuser -k ${PORT}/tcp`);
    process.exit(1);
  } else {
    console.error('[Server Error]', err);
    process.exit(1);
  }
});

module.exports = { app, server };

