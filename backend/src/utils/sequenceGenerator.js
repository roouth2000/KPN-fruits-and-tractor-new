const { Invoice, Payment } = require('../models');
const { Op } = require('sequelize');

const generateInvoiceNumber = async (transaction = null) => {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;

  const lastInvoice = await Invoice.findOne({
    where: {
      invoiceNumber: {
        [Op.like]: `${prefix}%`,
      },
    },
    order: [['id', 'DESC']],
    attributes: ['invoiceNumber'],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  let nextSequence = 1;
  if (lastInvoice && lastInvoice.invoiceNumber) {
    const parts = lastInvoice.invoiceNumber.split('-');
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) {
      nextSequence = lastNum + 1;
    }
  }

  return `${prefix}${String(nextSequence).padStart(6, '0')}`;
};

const generatePaymentNumber = async (transaction = null) => {
  const currentYear = new Date().getFullYear();
  const prefix = `PAY-${currentYear}-`;

  const lastPayment = await Payment.findOne({
    where: {
      paymentNumber: {
        [Op.like]: `${prefix}%`,
      },
    },
    order: [['id', 'DESC']],
    attributes: ['paymentNumber'],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  let nextSequence = 1;
  if (lastPayment && lastPayment.paymentNumber) {
    const parts = lastPayment.paymentNumber.split('-');
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) {
      nextSequence = lastNum + 1;
    }
  }

  return `${prefix}${String(nextSequence).padStart(6, '0')}`;
};

const generateReturnNumber = async (transaction = null) => {
  const currentYear = new Date().getFullYear();
  const prefix = `SR-${currentYear}-`;

  const lastInvoice = await Invoice.findOne({
    where: {
      invoiceNumber: {
        [Op.like]: `${prefix}%`,
      },
    },
    order: [['id', 'DESC']],
    attributes: ['invoiceNumber'],
    transaction,
  });

  let nextSequence = 1;
  if (lastInvoice && lastInvoice.invoiceNumber) {
    const parts = lastInvoice.invoiceNumber.split('-');
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) {
      nextSequence = lastNum + 1;
    }
  }

  return `${prefix}${String(nextSequence).padStart(6, '0')}`;
};

module.exports = {
  generateInvoiceNumber,
  generatePaymentNumber,
  generateReturnNumber,
};

