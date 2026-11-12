const supplierService = require('../services/supplierService');
const { ApiResponse } = require('../utils/response');

class SupplierController {
  async getSuppliers(req, res) {
    try {
      const { search, page = 1, limit = 50 } = req.query;
      const pagination = {
        limit: parseInt(limit, 10),
        offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      };
      const result = await supplierService.getSuppliers({ search }, pagination);
      return ApiResponse.paginated(res, result.rows, result.count, page, limit, 'Suppliers retrieved');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  async getSupplierById(req, res) {
    try {
      const supplier = await supplierService.getSupplierById(req.params.id);
      return ApiResponse.success(res, supplier, 'Supplier retrieved');
    } catch (error) {
      return ApiResponse.error(res, error.message, 404);
    }
  }

  async createSupplier(req, res) {
    try {
      const supplier = await supplierService.createSupplier(req.body);
      return ApiResponse.created(res, supplier, 'Supplier created successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }

  async recordPayment(req, res) {
    try {
      const result = await supplierService.recordPayment(req.params.id, req.body);
      return ApiResponse.success(res, result, 'Supplier payment recorded successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }

  async recordInwardPurchase(req, res) {
    try {
      const result = await supplierService.recordInwardPurchase(req.body, req.user);
      return ApiResponse.created(res, result, 'Inward purchase recorded and stock incremented');
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }

  async updateSupplier(req, res) {
    try {
      const supplier = await supplierService.updateSupplier(req.params.id, req.body);
      return ApiResponse.success(res, supplier, 'Supplier updated successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }

  async deleteSupplier(req, res) {
    try {
      const result = await supplierService.deleteSupplier(req.params.id);
      return ApiResponse.success(res, result, result.message || 'Supplier deleted successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }
}

module.exports = new SupplierController();

