const { Customer, CustomerLedger, TrayMovement } = require('../models');
const { Op } = require('sequelize');

class CustomerService {
  async findById(id, transaction = null) {
    return await Customer.findByPk(id, { transaction });
  }

  async findByCode(customerCode, transaction = null) {
    return await Customer.findOne({ where: { customerCode }, transaction });
  }

  async searchCustomers(query = '', limit = 20) {
    const where = { isActive: true };
    if (query && query.trim() !== '') {
      const q = `%${query.trim()}%`;
      where[Op.or] = [
        { name: { [Op.like]: q } },
        { phone: { [Op.like]: q } },
        { customerCode: { [Op.like]: q } },
        { city: { [Op.like]: q } },
      ];
    }

    return await Customer.findAll({
      where,
      limit: parseInt(limit, 10) || 20,
      order: [['name', 'ASC']],
    });
  }

  /**
   * Source of Truth: calculates real customer balance strictly from transactions in ledger
   */
  async calculateCustomerDue(customerId, transaction = null) {
    const entries = await CustomerLedger.findAll({
      where: { customerId },
      attributes: ['debit', 'credit'],
      transaction,
    });

    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      totalDebit += parseFloat(entry.debit) || 0;
      totalCredit += parseFloat(entry.credit) || 0;
    }

    return Math.round((totalDebit - totalCredit) * 100) / 100;
  }

  /**
   * Source of Truth: calculates outstanding trays strictly from tray movements
   */
  async calculateOutstandingTrays(customerId, transaction = null) {
    const movements = await TrayMovement.findAll({
      where: { customerId },
      attributes: ['movementType', 'quantity'],
      transaction,
    });

    let outstanding = 0;
    for (const m of movements) {
      const qty = parseInt(m.quantity, 10) || 0;
      if (m.movementType === 'ISSUE') {
        outstanding += qty;
      } else if (['RETURN', 'LOST', 'DAMAGED'].includes(m.movementType)) {
        outstanding -= qty;
      }
    }

    return Math.max(0, outstanding);
  }

  async getCustomerBalance(id) {
    const customer = await this.findById(id);
    if (!customer) throw new Error('Customer not found');

    const calculatedDue = await this.calculateCustomerDue(id);
    const calculatedTrays = await this.calculateOutstandingTrays(id);

    return {
      customerId: customer.id,
      customerCode: customer.customerCode,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      customerType: customer.customerType,
      creditLimit: parseFloat(customer.creditLimit) || 0,
      previousDue: calculatedDue,
      availableCredit: Math.max(0, (parseFloat(customer.creditLimit) || 0) - calculatedDue),
      outstandingTrays: calculatedTrays,
    };
  }

  async getCustomerLedger(id, limit = 50, offset = 0) {
    const customer = await this.findById(id);
    if (!customer) throw new Error('Customer not found');

    const result = await CustomerLedger.findAndCountAll({
      where: { customerId: id },
      order: [['date', 'DESC'], ['id', 'DESC']],
      limit: parseInt(limit, 10) || 50,
      offset: parseInt(offset, 10) || 0,
    });

    const currentDue = await this.calculateCustomerDue(id);

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        currentDue,
      },
      total: result.count,
      entries: result.rows,
    };
  }

  async createCustomer(data, transaction = null) {
    let customerCode = data.customerCode && data.customerCode.trim();
    if (!customerCode) {
      const count = await Customer.count({ transaction });
      customerCode = `CUST-${String(count + 1).padStart(3, '0')}`;
    }

    const existing = await this.findByCode(customerCode, transaction);
    if (existing) {
      const count = await Customer.count({ transaction });
      customerCode = `CUST-${String(count + 1).padStart(3, '0')}-${Date.now().toString().slice(-3)}`;
    }

    const initialDue = parseFloat(data.openingBalance) || parseFloat(data.currentDue) || 0.00;

    const payload = {
      ...data,
      customerCode,
      name: data.name ? data.name.trim() : 'Unnamed Customer',
      phone: data.phone ? data.phone.trim() : '',
      city: data.city ? data.city.trim() : 'Mandi Vashi',
      address: data.address ? data.address.trim() : '',
      customerType: ['REGULAR', 'WHOLESALE', 'WALK_IN'].includes(data.customerType) ? data.customerType : 'WHOLESALE',
      creditLimit: parseFloat(data.creditLimit) || 50000.00,
      openingBalance: initialDue,
      currentDue: initialDue,
      outstandingTrays: parseInt(data.outstandingTrays, 10) || 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
    };

    const customer = await Customer.create(payload, { transaction });

    // If customer starts with opening due, record opening ledger entry
    if (initialDue > 0) {
      await CustomerLedger.create({
        customerId: customer.id,
        date: new Date().toISOString().slice(0, 10),
        type: 'OPENING',
        reference: `OP-${customer.customerCode}`,
        description: `Opening Ledger Balance for ${customer.name}`,
        debit: initialDue,
        credit: 0.00,
        runningBalance: initialDue,
        createdById: data.createdById || 1,
      }, { transaction });
    }

    return customer;
  }

  async updateCustomer(id, data, transaction = null) {
    return await Customer.update(data, {
      where: { id },
      transaction,
    });
  }
}

module.exports = new CustomerService();
