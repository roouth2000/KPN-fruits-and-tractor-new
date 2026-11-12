const reportService = require('../services/reportService');
const { ApiResponse } = require('../utils/response');

class ReportController {
  async getDailySales(req, res) {
    try {
      const data = await reportService.getDailySales(req.query);
      return ApiResponse.success(res, data, 'Daily sales report retrieved successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  async getMonthlySales(req, res) {
    try {
      const data = await reportService.getMonthlySales(req.query);
      return ApiResponse.success(res, data, 'Monthly sales report retrieved successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  async getPurchaseReport(req, res) {
    try {
      const data = await reportService.getPurchaseReport();
      return ApiResponse.success(res, data, 'Purchase report retrieved successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  async getStockReport(req, res) {
    try {
      const data = await reportService.getStockReport();
      return ApiResponse.success(res, data, 'Stock inventory report retrieved successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  async getProfitReport(req, res) {
    try {
      const data = await reportService.getProfitReport();
      return ApiResponse.success(res, data, 'Profit report retrieved successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  async getLossReport(req, res) {
    try {
      const data = await reportService.getLossReport();
      return ApiResponse.success(res, data, 'Loss report retrieved successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  async getDamageReport(req, res) {
    try {
      const data = await reportService.getDamageReport();
      return ApiResponse.success(res, data, 'Damage report retrieved successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  async getReturnsReport(req, res) {
    try {
      const data = await reportService.getReturnsReport();
      return ApiResponse.success(res, data, 'Returns report retrieved successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  async getCustomerDueReport(req, res) {
    try {
      const data = await reportService.getCustomerDueReport();
      return ApiResponse.success(res, data, 'Customer due report retrieved successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  async getSupplierDueReport(req, res) {
    try {
      const data = await reportService.getSupplierDueReport();
      return ApiResponse.success(res, data, 'Supplier due report retrieved successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  async getTrayReport(req, res) {
    try {
      const data = await reportService.getTrayReport();
      return ApiResponse.success(res, data, 'Tray report retrieved successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }
}

module.exports = new ReportController();

