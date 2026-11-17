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
      const { limit = 100, page = 1, startDate, endDate, type } = req.query;
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const ledger = await customerService.getCustomerLedger(req.params.id, limit, offset, {
        startDate,
        endDate,
        type,
      });
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

  async updateCustomer(req, res) {
    try {
      const customer = await customerService.updateCustomer(req.params.id, req.body, req.user);
      return apiSuccess(res, customer, 'Customer updated successfully');
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }

  async deleteCustomer(req, res) {
    try {
      const { force } = req.query;
      const result = await customerService.deleteCustomer(req.params.id, force === 'true', req.user);
      return apiSuccess(res, result, result.message || 'Customer deleted successfully');
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }

  async payOpeningBalance(req, res) {
    try {
      const result = await customerService.payOpeningBalance(req.params.id, req.body, req.user);
      return apiSuccess(res, result, 'Opening balance payment recorded successfully', 201);
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }
}

module.exports = new CustomerController();

