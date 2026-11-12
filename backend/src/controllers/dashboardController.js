const dashboardService = require('../services/dashboardService');
const { ApiResponse } = require('../utils/response');

class DashboardController {
  async getSummary(req, res) {
    try {
      const data = await dashboardService.getSummary(req.query.date);
      return ApiResponse.success(res, data, "Today's summary retrieved successfully");
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  async getFinancialMetrics(req, res) {
    try {
      const data = await dashboardService.getFinancialMetrics();
      return ApiResponse.success(res, data, 'Financial metrics retrieved successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  async getFruitHealth(req, res) {
    try {
      const data = await dashboardService.getFruitHealth();
      return ApiResponse.success(res, data, 'Fruit health metrics retrieved successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  async getTopPerformers(req, res) {
    try {
      const data = await dashboardService.getTopPerformers();
      return ApiResponse.success(res, data, 'Top performers retrieved successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  async getPendingDues(req, res) {
    try {
      const data = await dashboardService.getPendingDues();
      return ApiResponse.success(res, data, 'Pending dues retrieved successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }
}

module.exports = new DashboardController();

