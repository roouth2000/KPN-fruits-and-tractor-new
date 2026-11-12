const billingService = require('../services/billingService');
const pdfService = require('../services/pdfService');
const { generateInvoiceNumber } = require('../utils/sequenceGenerator');
const { apiSuccess, apiError } = require('../utils/apiResponse');

class BillingController {
  async createInvoice(req, res) {
    try {
      const result = await billingService.createInvoice(req.body, req.user);
      return apiSuccess(res, result, 'Invoice created successfully', 201);
    } catch (error) {
      console.error('[BillingController.createInvoice] Error:', error.message);
      return apiError(res, error.message, {}, 400);
    }
  }

  async getInvoices(req, res) {
    try {
      const { customerId, status, startDate, endDate, search, page = 1, limit = 20 } = req.query;
      const pagination = {
        limit: parseInt(limit, 10) || 20,
        offset: (parseInt(page, 10) - 1) * (parseInt(limit, 10) || 20),
      };
      const filters = { customerId, status, startDate, endDate, search };

      const result = await billingService.getInvoices(filters, pagination);
      return apiSuccess(res, {
        total: result.count,
        page: parseInt(page, 10),
        limit: pagination.limit,
        totalPages: Math.ceil(result.count / pagination.limit),
        invoices: result.rows,
      }, 'Invoices retrieved successfully');
    } catch (error) {
      return apiError(res, error.message, {}, 500);
    }
  }

  async getInvoiceById(req, res) {
    try {
      const invoice = await billingService.getInvoiceById(req.params.id);
      return apiSuccess(res, invoice, 'Invoice retrieved successfully');
    } catch (error) {
      return apiError(res, error.message, {}, 404);
    }
  }

  async updateInvoice(req, res) {
    try {
      const result = await billingService.updateInvoice(req.params.id, req.body, req.user);
      return apiSuccess(res, result, 'Invoice updated successfully');
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }

  async cancelInvoice(req, res) {
    try {
      const { reason } = req.body;
      const result = await billingService.cancelInvoice(req.params.id, reason, req.user);
      return apiSuccess(res, result, 'Invoice cancelled successfully');
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }

  async processReturn(req, res) {
    try {
      const result = await billingService.processSalesReturn(req.params.id, req.body, req.user);
      return apiSuccess(res, result, 'Sales return processed successfully');
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }

  async generateInvoicePdf(req, res) {
    try {
      const invoice = await billingService.getInvoiceById(req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`);
      return await pdfService.generateInvoicePdf(invoice, res);
    } catch (error) {
      return apiError(res, error.message, {}, 404);
    }
  }

  async getNextInvoiceNumber(req, res) {
    try {
      const nextNumber = await generateInvoiceNumber();
      return apiSuccess(res, { nextInvoiceNumber: nextNumber }, 'Next invoice number generated');
    } catch (error) {
      return apiError(res, error.message, {}, 500);
    }
  }
}

module.exports = new BillingController();

