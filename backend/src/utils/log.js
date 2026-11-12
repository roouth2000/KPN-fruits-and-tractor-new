/**
 * Finovore Central Logger & Error Diagnostics
 * Exports structured logger and full error inspector
 */
const { logger, parseErrorLocation } = require('./logger');

module.exports = {
  logger,
  log: logger,
  parseErrorLocation,
};

