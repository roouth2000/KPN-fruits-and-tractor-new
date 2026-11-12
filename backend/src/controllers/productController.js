const productService = require('../services/productService');
const { Product } = require('../models');
const { apiSuccess, apiError } = require('../utils/apiResponse');

class ProductController {
  async getAllProducts(req, res) {
    try {
      const products = await Product.findAll({ order: [['name', 'ASC']] });
      return apiSuccess(res, products, 'All products retrieved');
    } catch (error) {
      return apiError(res, error.message, {}, 500);
    }
  }

  async searchProducts(req, res) {
    try {
      const { q = '', limit = 30 } = req.query;
      const products = await productService.searchProducts(q, limit);
      return apiSuccess(res, products, 'Products found');
    } catch (error) {
      return apiError(res, error.message, {}, 500);
    }
  }

  async getProductStock(req, res) {
    try {
      const stock = await productService.getProductStock(req.params.id);
      return apiSuccess(res, stock, 'Product stock retrieved');
    } catch (error) {
      return apiError(res, error.message, {}, 404);
    }
  }

  async getUnits(req, res) {
    try {
      const units = await productService.getUnits();
      return apiSuccess(res, units, 'Units retrieved');
    } catch (error) {
      return apiError(res, error.message, {}, 500);
    }
  }

  async getTaxConfigs(req, res) {
    try {
      const taxes = await productService.getTaxConfigs();
      return apiSuccess(res, taxes, 'Tax configurations retrieved');
    } catch (error) {
      return apiError(res, error.message, {}, 500);
    }
  }

  async addStock(req, res) {
    try {
      const { productId, quantity, supplierId, purchaseDate, batchNumber, notes, unit, purchaseRate } = req.body;
      if (!productId || !quantity) {
        return apiError(res, 'Product ID and valid quantity are required', {}, 400);
      }
      const result = await productService.addStock({
        productId,
        quantity,
        supplierId,
        purchaseDate,
        batchNumber,
        notes,
        unit,
        purchaseRate,
      }, req.user);
      return apiSuccess(res, result, 'Stock added successfully with FIFO batch allocation');
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }

  async getProductBatches(req, res) {
    try {
      const batches = await productService.getProductBatches(req.params.id);
      return apiSuccess(res, batches, 'Product batches retrieved in FIFO order');
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }

  async recalculateProductFIFO(req, res) {
    try {
      const result = await productService.recalculateProductFIFO(req.params.id);
      return apiSuccess(res, result, 'FIFO allocation recalculated successfully');
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }

  async recalculateAllFIFO(req, res) {
    try {
      const result = await productService.recalculateAllFIFO();
      return apiSuccess(res, result, 'Catalog FIFO allocations recalculated successfully');
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }

  async createProduct(req, res) {
    try {
      const product = await productService.createProduct(req.body, req.user);
      return apiSuccess(res, product, 'Product created successfully', 201);
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }
}

module.exports = new ProductController();

