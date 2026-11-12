const { logger } = require('../utils/logger');
const { ApiResponse } = require('../utils/response');
const { HTTP_STATUS } = require('../constants');

/**
 * Global Error Handling Middleware
 * Intercepts all unhandled errors, logs detailed diagnostics with line numbers,
 * and sends standardized API responses.
 */
const errorHandler = (err, req, res, next) => {
  // Determine HTTP status code
  let statusCode = err.statusCode || err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
  } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
  }

  // Format error details / field validations
  let errors = err.errors || null;
  if (err.name === 'SequelizeValidationError' && Array.isArray(err.errors)) {
    errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
      value: e.value,
    }));
  }

  // Log comprehensive diagnostic error block (File, Line number, Code snippet, Request details, Reference data)
  logger.logError(err, req, {
    statusCode,
    validationErrors: errors,
  });

  const message = err.message || 'Internal Server Error';

  return ApiResponse.error(res, message, statusCode, errors);
};

module.exports = errorHandler;
