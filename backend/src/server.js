const app = require('./app');
const config = require('./config/env');
const { testConnection } = require('./config/db');

const startServer = async () => {
  await testConnection();

  const server = app.listen(config.port, () => {
    console.log(`[Server] Finovore Billing API running on http://localhost:${config.port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\x1b[31m[ERROR]\x1b[0m Port ${config.port} is already in use by another process.`);
      console.error(`To free port ${config.port}, run: fuser -k ${config.port}/tcp`);
      process.exit(1);
    } else {
      console.error('[Server Error]', err);
      process.exit(1);
    }
  });

  return server;
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
