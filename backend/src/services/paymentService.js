const { Payment, PaymentAllocation, Customer, Invoice } = require('../models');

class PaymentService {
  async findById(id, transaction = null) {
    return await Payment.findByPk(id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Invoice, as: 'invoice' },
        { model: PaymentAllocation, as: 'allocations' },
      ],
      transaction,
    });
  }

  async getPaymentReceipt(id) {
    return await this.findById(id);
  }

  async createPayment(data, transaction = null) {
    return await Payment.create(data, { transaction });
  }

  async createAllocation(data, transaction = null) {
    return await PaymentAllocation.create(data, { transaction });
  }
}

module.exports = new PaymentService();

