const { logger } = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      const msg = `[API] ${req.method} ${req.originalUrl || req.url} ${res.statusCode} (${duration}ms)`;
      if (res.statusCode >= 500) {
        logger.error(msg);
      } else if (res.statusCode >= 400) {
        logger.warn(msg);
      } else {
        logger.info(msg);
      }
    }
  });
  next();
};

module.exports = requestLogger;
