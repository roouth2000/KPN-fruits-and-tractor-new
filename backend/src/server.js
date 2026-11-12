const app = require('./app');
const config = require('./config/env');
const { testConnection } = require('./config/db');

// Hostinger / Passenger Compatibility:
// 1. Unconditionally call app.listen() — do NOT guard with `if (require.main === module)`
// 2. Call app.listen() immediately without blocking with `await testConnection()`
const PORT = process.env.PORT || config.port || 5000;

const server = app.listen(PORT, () => {
  console.log(`[Server] Finovore Billing API running on port ${PORT}`);

  // Test database connection asynchronously in background without blocking startup
  testConnection().catch((err) => {
    console.error(`[DB Error] Database connection failed: ${err.message}`);
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

