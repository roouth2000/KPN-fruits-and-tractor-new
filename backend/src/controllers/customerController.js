const customerService = require('../services/customerService');
const { Customer } = require('../models');
const { apiSuccess, apiError } = require('../utils/apiResponse');

class CustomerController {
  async getAllCustomers(req, res) {
    try {
      const customers = await Customer.findAll({ order: [['name', 'ASC']] });
      return apiSuccess(res, customers, 'All customers retrieved');
    } catch (error) {
      return apiError(res, error.message, {}, 500);
    }
  }

  async searchCustomers(req, res) {
    try {
      const { q = '', limit = 20 } = req.query;
      const customers = await customerService.searchCustomers(q, limit);
      return apiSuccess(res, customers, 'Customers found');
    } catch (error) {
      return apiError(res, error.message, {}, 500);
    }
  }

  async getCustomerBalance(req, res) {
    try {
      const balance = await customerService.getCustomerBalance(req.params.id);
      return apiSuccess(res, balance, 'Customer balance retrieved');
    } catch (error) {
      return apiError(res, error.message, {}, 404);
    }
  }

  async getCustomerLedger(req, res) {
    try {
      const { limit = 50, page = 1 } = req.query;
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const ledger = await customerService.getCustomerLedger(req.params.id, limit, offset);
      return apiSuccess(res, ledger, 'Customer ledger retrieved');
    } catch (error) {
      return apiError(res, error.message, {}, 404);
    }
  }

  async createCustomer(req, res) {
    try {
      const customer = await customerService.createCustomer({
        ...req.body,
        createdById: req.user ? req.user.id : 1,
      });
      return apiSuccess(res, customer, 'Customer created successfully', 201);
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }
}

module.exports = new CustomerController();

