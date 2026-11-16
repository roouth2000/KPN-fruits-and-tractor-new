const expenseService = require('../services/expenseService');
const { apiSuccess, apiError } = require('../utils/apiResponse');

class ExpenseController {
  async getExpenses(req, res) {
    try {
      const data = await expenseService.listExpenses(req.query);
      return apiSuccess(res, data, 'Expenses retrieved successfully');
    } catch (error) {
      return apiError(res, error.message, {}, 500);
    }
  }

  async createExpense(req, res) {
    try {
      const expense = await expenseService.createExpense(req.body, req.user);
      return apiSuccess(res, expense, 'Expense recorded successfully', 201);
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }

  async updateExpense(req, res) {
    try {
      const { id } = req.params;
      const expense = await expenseService.updateExpense(id, req.body, req.user);
      return apiSuccess(res, expense, 'Expense updated successfully');
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }

  async getSummary(req, res) {
    try {
      const summary = await expenseService.getSummary();
      return apiSuccess(res, summary, 'Expense summary retrieved successfully');
    } catch (error) {
      return apiError(res, error.message, {}, 500);
    }
  }

  async cancelExpense(req, res) {
    try {
      const { id } = req.params;
      const expense = await expenseService.cancelExpense(id, req.user);
      return apiSuccess(res, expense, 'Expense cancelled successfully');
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }
}

module.exports = new ExpenseController();
