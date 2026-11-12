const { ApiResponse } = require('./response');

const apiSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  return ApiResponse.success(res, data, message, statusCode);
};

const apiError = (res, message = 'Internal Server Error', errors = {}, statusCode = 500) => {
  return ApiResponse.error(res, message, statusCode, errors);
};

module.exports = {
  ApiResponse,
  apiSuccess,
  apiError,
};
