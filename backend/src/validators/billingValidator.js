const { apiError } = require('../utils/apiResponse');

const validateCreateInvoice = (req, res, next) => {
  const { customerId, invoiceDate, items, payments, discount, tax, status } = req.body;
  const errors = {};

  if (!customerId) {
    errors.customerId = 'Please select a customer';
  }

  if (!invoiceDate) {
    errors.invoiceDate = 'Invoice date is required';
  }

  // If status is not DRAFT, items are strictly required
  if (status !== 'DRAFT') {
    if (!Array.isArray(items) || items.length === 0) {
      errors.items = 'Please add at least one product';
    } else {
      items.forEach((item, index) => {
        if (!item.productId) {
          errors[`items[${index}].productId`] = 'Product ID is required';
        }
        if (typeof item.quantity !== 'number' || item.quantity <= 0) {
          errors[`items[${index}].quantity`] = 'Quantity must be greater than zero';
        }
        if (typeof item.rate !== 'number' || item.rate < 0) {
          errors[`items[${index}].rate`] = 'Rate must be a non-negative number';
        }
        if (item.discount && (typeof item.discount !== 'number' || item.discount < 0)) {
          errors[`items[${index}].discount`] = 'Discount cannot be negative';
        }
      });
    }
  }

  if (discount !== undefined && (typeof discount !== 'number' || discount < 0)) {
    errors.discount = 'Invoice discount cannot be negative';
  }

  if (tax !== undefined && (typeof tax !== 'number' || tax < 0)) {
    errors.tax = 'Invoice tax cannot be negative';
  }

  if (payments && Array.isArray(payments)) {
    const validModes = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'];
    payments.forEach((payment, index) => {
      if (typeof payment.amount !== 'number' || payment.amount <= 0) {
        errors[`payments[${index}].amount`] = 'Payment amount must be greater than zero';
      }
      const mode = (payment.method || payment.paymentMode || '').toUpperCase();
      if (!validModes.includes(mode)) {
        errors[`payments[${index}].paymentMode`] = `Invalid payment mode. Supported: ${validModes.join(', ')}`;
      }
    });
  }

  if (Object.keys(errors).length > 0) {
    return apiError(res, 'Validation failed', errors, 422);
  }

  next();
};

const validateCollectDue = (req, res, next) => {
  const { customerId, amount, paymentMode, paymentDate } = req.body;
  const errors = {};

  if (!customerId) {
    errors.customerId = 'Please select a customer';
  }
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    errors.amount = 'Payment amount must be greater than zero';
  }
  const validModes = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'];
  const mode = (paymentMode || '').toUpperCase();
  if (!validModes.includes(mode)) {
    errors.paymentMode = `Invalid payment mode. Supported: ${validModes.join(', ')}`;
  }

  if (Object.keys(errors).length > 0) {
    return apiError(res, 'Validation failed', errors, 422);
  }

  next();
};

module.exports = {
  validateCreateInvoice,
  validateCollectDue,
};

