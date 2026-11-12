const stockService = require('../services/stockService');
const { ApiResponse } = require('../utils/response');

class StockController {
  async getMovements(req, res) {
    try {
      const { productId, movementType, page = 1, limit = 50 } = req.query;
      const pagination = {
        limit: parseInt(limit, 10),
        offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      };
      const result = await stockService.getMovements({ productId, movementType }, pagination);
      return ApiResponse.paginated(res, result.rows, result.count, page, limit, 'Stock movements retrieved');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  async adjustStock(req, res) {
    try {
      const result = await stockService.adjustStock(req.body, req.user);
      return ApiResponse.success(res, result, 'Stock adjusted successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }
}

module.exports = new StockController();

