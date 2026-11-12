const billingService = require('../services/billingService');
const paymentService = require('../services/paymentService');
const { apiSuccess, apiError } = require('../utils/apiResponse');

class PaymentController {
  async collectPreviousDue(req, res) {
    try {
      const result = await billingService.collectPreviousDue(req.body, req.user);
      return apiSuccess(res, result, 'Previous due payment collected successfully', 201);
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }

  async getPaymentReceipt(req, res) {
    try {
      const payment = await paymentService.getPaymentReceipt(req.params.id);
      if (!payment) return apiError(res, 'Payment receipt not found', {}, 404);

      return apiSuccess(res, payment, 'Payment receipt retrieved');
    } catch (error) {
      return apiError(res, error.message, {}, 500);
    }
  }
}

module.exports = new PaymentController();

