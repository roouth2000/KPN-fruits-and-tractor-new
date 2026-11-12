const { HTTP_STATUS } = require('../constants');

/**
 * Standardized API Response Helper
 */
const ApiResponse = {
  /**
   * Send successful response
   */
  success(res, data = null, message = 'Success', statusCode = HTTP_STATUS.OK) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Send created response
   */
  created(res, data = null, message = 'Resource created successfully') {
    return this.success(res, data, message, HTTP_STATUS.CREATED);
  },

  /**
   * Send error response
   */
  error(res, message = 'Internal Server Error', statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errors = null) {
    const payload = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    };
    if (errors) {
      payload.errors = errors;
    }
    return res.status(statusCode).json(payload);
  },

  /**
   * Send bad request error
   */
  badRequest(res, message = 'Bad Request', errors = null) {
    return this.error(res, message, HTTP_STATUS.BAD_REQUEST, errors);
  },

  /**
   * Send unauthorized error
   */
  unauthorized(res, message = 'Unauthorized access') {
    return this.error(res, message, HTTP_STATUS.UNAUTHORIZED);
  },

  /**
   * Send forbidden error
   */
  forbidden(res, message = 'Access forbidden') {
    return this.error(res, message, HTTP_STATUS.FORBIDDEN);
  },

  /**
   * Send not found error
   */
  notFound(res, message = 'Resource not found') {
    return this.error(res, message, HTTP_STATUS.NOT_FOUND);
  },

  /**
   * Send paginated list response
   */
  paginated(res, items, total, page = 1, limit = 20, message = 'Data retrieved successfully') {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message,
      data: items,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString(),
    });
  },
};

module.exports = {
  ApiResponse,
  ...ApiResponse,
};

