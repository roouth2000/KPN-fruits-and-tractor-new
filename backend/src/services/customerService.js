const {
  Customer,
  CustomerLedger,
  TrayMovement,
  Invoice,
  InvoiceItem,
  Payment,
  AuditLog,
} = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { generatePaymentNumber } = require('../utils/sequenceGenerator');

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
      attributes: ['type', 'debit', 'credit'],
      transaction,
    });

    const hasOpening = entries.some((e) => e.type === 'OPENING');
    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      totalDebit += parseFloat(entry.debit) || 0;
      totalCredit += parseFloat(entry.credit) || 0;
    }

    if (!hasOpening) {
      const cust = await Customer.findByPk(customerId, {
        attributes: ['openingBalance'],
        transaction,
      });
      if (cust && parseFloat(cust.openingBalance) > 0) {
        totalDebit += parseFloat(cust.openingBalance);
      }
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

  async getCustomerLedger(id, limit = 100, offset = 0, filters = {}) {
    const customer = await this.findById(id);
    if (!customer) throw new Error('Customer not found');

    const where = { customerId: id };
    if (filters.startDate && filters.endDate) {
      where.date = { [Op.between]: [filters.startDate, filters.endDate] };
    } else if (filters.startDate) {
      where.date = { [Op.gte]: filters.startDate };
    } else if (filters.endDate) {
      where.date = { [Op.lte]: filters.endDate };
    }
    if (filters.type && filters.type !== 'ALL') {
      where.type = filters.type;
    }

    const result = await CustomerLedger.findAndCountAll({
      where,
      order: [['date', 'DESC'], ['id', 'DESC']],
      limit: parseInt(limit, 10) || 100,
      offset: parseInt(offset, 10) || 0,
    });

    // Fetch full invoice details for SALE entries in this ledger page
    const invoiceNumbers = result.rows
      .filter((e) => e.type === 'SALE' || (e.reference && e.reference.startsWith('INV-')))
      .map((e) => e.reference);

    const invoiceMap = new Map();
    if (invoiceNumbers.length > 0) {
      const invoices = await Invoice.findAll({
        where: { invoiceNumber: { [Op.in]: invoiceNumbers } },
        include: [
          {
            model: InvoiceItem,
            as: 'items',
            attributes: [
              'id',
              'productId',
              'productName',
              'variety',
              'grade',
              'unit',
              'quantity',
              'rate',
              'discount',
              'taxRate',
              'taxAmount',
              'totalAmount',
              'trayQuantity',
            ],
          },
          {
            model: Payment,
            as: 'payments',
            attributes: ['id', 'paymentNumber', 'paymentMode', 'amount', 'transactionRef', 'paymentDate'],
          },
        ],
      });
      invoices.forEach((inv) => invoiceMap.set(inv.invoiceNumber, inv));
    }

    // Fetch payment details for PAYMENT entries
    const paymentNumbers = result.rows
      .filter((e) => e.type === 'PAYMENT' || (e.reference && e.reference.startsWith('PAY-')))
      .map((e) => e.reference);

    const paymentMap = new Map();
    if (paymentNumbers.length > 0) {
      const payments = await Payment.findAll({
        where: { paymentNumber: { [Op.in]: paymentNumbers } },
        attributes: ['id', 'paymentNumber', 'paymentMode', 'amount', 'transactionRef', 'paymentDate', 'notes', 'invoiceId'],
      });
      payments.forEach((p) => paymentMap.set(p.paymentNumber, p));
    }

    const enhancedEntries = result.rows.map((row) => {
      const plain = row.toJSON ? row.toJSON() : { ...row };
      if (invoiceMap.has(plain.reference)) {
        const inv = invoiceMap.get(plain.reference);
        const sub = parseFloat(inv.subtotal) || parseFloat(inv.grandTotal) || 0;
        const disc = parseFloat(inv.discount) || 0;
        const net = parseFloat(inv.grandTotal) || (sub - disc);
        const openBal = parseFloat(inv.previousDueSnapshot) || 0;
        const totOut = parseFloat(inv.totalPayableSnapshot) || (openBal + net);
        const paid = parseFloat(inv.paidAmount) || 0;
        const closeBal = parseFloat(inv.balanceDue) || (totOut - paid);

        plain.invoice = {
          ...inv.toJSON(),
          grossAmount: sub,
          discount: disc,
          netAmount: net,
          openingBalance: openBal,
          totalOutstanding: totOut,
          amountPaid: paid,
          closingBalance: closeBal,
        };
      }
      if (paymentMap.has(plain.reference)) {
        plain.payment = paymentMap.get(plain.reference);
      }
      return plain;
    });

    const allEntries = await CustomerLedger.findAll({
      where: { customerId: id },
      attributes: ['type', 'debit', 'credit'],
    });

    const hasOpening = allEntries.some((e) => e.type === 'OPENING');
    let totalDebit = 0;
    let totalCredit = 0;
    let openingBal = 0;

    for (const e of allEntries) {
      if (e.type === 'OPENING') {
        openingBal += parseFloat(e.debit) || 0;
      }
      totalDebit += parseFloat(e.debit) || 0;
      totalCredit += parseFloat(e.credit) || 0;
    }

    if (!hasOpening && parseFloat(customer.openingBalance) > 0) {
      openingBal = parseFloat(customer.openingBalance);
      totalDebit += openingBal;
    }

    const currentDue = Math.round((totalDebit - totalCredit) * 100) / 100;

    return {
      customer: {
        id: customer.id,
        customerCode: customer.customerCode,
        name: customer.name,
        phone: customer.phone,
        city: customer.city,
        address: customer.address,
        customerType: customer.customerType,
        creditLimit: parseFloat(customer.creditLimit) || 0,
        openingBalance: openingBal,
        totalDebit: Math.round(totalDebit * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
        currentDue,
        closingBalance: currentDue,
      },
      total: result.count,
      entries: enhancedEntries,
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

  async updateCustomer(id, data, user = null) {
    const transaction = await sequelize.transaction();
    try {
      const customer = await Customer.findByPk(id, { transaction });
      if (!customer) {
        throw new Error('Customer not found');
      }

      // If customerCode is changing, check uniqueness
      if (data.customerCode && data.customerCode.trim() !== customer.customerCode) {
        const existing = await Customer.findOne({
          where: {
            customerCode: data.customerCode.trim(),
            id: { [Op.ne]: id },
          },
          transaction,
        });
        if (existing) {
          throw new Error(`Customer code "${data.customerCode}" is already in use by another customer`);
        }
      }

      // Check if openingBalance is changing
      const oldOpening = parseFloat(customer.openingBalance) || 0;
      const newOpening = data.openingBalance !== undefined ? parseFloat(data.openingBalance) || 0 : oldOpening;

      const fieldsToUpdate = {};
      if (data.name !== undefined) fieldsToUpdate.name = data.name.trim();
      if (data.customerCode !== undefined) fieldsToUpdate.customerCode = data.customerCode.trim();
      if (data.phone !== undefined) fieldsToUpdate.phone = data.phone.trim();
      if (data.email !== undefined) fieldsToUpdate.email = data.email ? data.email.trim() : null;
      if (data.address !== undefined) fieldsToUpdate.address = data.address ? data.address.trim() : '';
      if (data.city !== undefined) fieldsToUpdate.city = data.city ? data.city.trim() : '';
      if (data.state !== undefined) fieldsToUpdate.state = data.state ? data.state.trim() : '';
      if (data.gstin !== undefined) fieldsToUpdate.gstin = data.gstin ? data.gstin.trim() : null;
      if (data.customerType !== undefined) {
        fieldsToUpdate.customerType = ['REGULAR', 'WHOLESALE', 'WALK_IN'].includes(data.customerType)
          ? data.customerType
          : customer.customerType;
      }
      if (data.creditLimit !== undefined) fieldsToUpdate.creditLimit = parseFloat(data.creditLimit) || 0;
      if (data.outstandingTrays !== undefined) fieldsToUpdate.outstandingTrays = parseInt(data.outstandingTrays, 10) || 0;
      if (data.isActive !== undefined) fieldsToUpdate.isActive = Boolean(data.isActive);
      if (data.notes !== undefined) fieldsToUpdate.notes = data.notes;

      // Update opening balance if provided
      if (data.openingBalance !== undefined) {
        fieldsToUpdate.openingBalance = newOpening;

        // If opening balance changed, update or create the OPENING entry in CustomerLedger
        if (Math.abs(newOpening - oldOpening) > 0.001) {
          const openingEntry = await CustomerLedger.findOne({
            where: {
              customerId: id,
              type: 'OPENING',
            },
            transaction,
          });

          if (openingEntry) {
            await openingEntry.update({
              debit: newOpening,
              runningBalance: newOpening,
            }, { transaction });
          } else if (newOpening > 0) {
            await CustomerLedger.create({
              customerId: customer.id,
              date: new Date().toISOString().slice(0, 10),
              type: 'OPENING',
              reference: `OP-${customer.customerCode}`,
              description: `Opening Ledger Balance for ${customer.name}`,
              debit: newOpening,
              credit: 0.00,
              runningBalance: newOpening,
              createdById: user ? user.id : 1,
            }, { transaction });
          }
        }
      }

      await customer.update(fieldsToUpdate, { transaction });

      // Recalculate true currentDue based on updated ledger
      const recalculatedDue = await this.calculateCustomerDue(id, transaction);
      await customer.update({ currentDue: recalculatedDue }, { transaction });

      // Recalculate trays if not explicitly provided
      if (data.outstandingTrays === undefined) {
        const recalculatedTrays = await this.calculateOutstandingTrays(id, transaction);
        await customer.update({ outstandingTrays: recalculatedTrays }, { transaction });
      }

      // Audit Log
      await AuditLog.create({
        userId: user ? user.id : null,
        userName: user ? user.name : 'System',
        action: 'CUSTOMER_UPDATED',
        entity: 'CUSTOMER',
        entityId: String(customer.id),
        newValue: JSON.stringify(fieldsToUpdate),
      }, { transaction });

      await transaction.commit();

      const updated = await Customer.findByPk(id);
      return updated;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async deleteCustomer(id, force = false, user = null) {
    const transaction = await sequelize.transaction();
    try {
      const customer = await Customer.findByPk(id, { transaction });
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Check linked confirmed or draft invoices
      const invoiceCount = await Invoice.count({ where: { customerId: id }, transaction });
      if (invoiceCount > 0) {
        throw new Error(
          `Cannot delete customer "${customer.name}" because they have ${invoiceCount} linked sales invoice(s). You can mark the customer as inactive instead.`
        );
      }

      // Check linked payments
      const paymentCount = await Payment.count({ where: { customerId: id }, transaction });
      if (paymentCount > 0 && !force) {
        throw new Error(
          `Cannot delete customer "${customer.name}" because they have ${paymentCount} linked payment(s).`
        );
      }

      // Delete linked ledger entries (e.g. OPENING balance or payments if force)
      await CustomerLedger.destroy({ where: { customerId: id }, transaction });
      await TrayMovement.destroy({ where: { customerId: id }, transaction });
      if (force && paymentCount > 0) {
        await Payment.destroy({ where: { customerId: id }, transaction });
      }

      // Audit Log before deletion
      await AuditLog.create({
        userId: user ? user.id : null,
        userName: user ? user.name : 'System',
        action: 'CUSTOMER_DELETED',
        entity: 'CUSTOMER',
        entityId: String(customer.id),
        newValue: JSON.stringify({
          customerCode: customer.customerCode,
          name: customer.name,
          phone: customer.phone,
        }),
      }, { transaction });

      // Delete the customer
      await customer.destroy({ transaction });

      await transaction.commit();
      return { success: true, message: `Customer "${customer.name}" deleted successfully` };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async payOpeningBalance(customerId, payload, user = null) {
    const transaction = await sequelize.transaction();
    try {
      const customer = await Customer.findByPk(customerId, { transaction });
      if (!customer) {
        throw new Error('Customer not found');
      }

      const pAmt = parseFloat(payload.amount);
      if (isNaN(pAmt) || pAmt <= 0) {
        throw new Error('Payment amount must be greater than zero');
      }

      const paymentMode = (payload.paymentMode || 'CASH').toUpperCase();
      const validModes = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'];
      if (!validModes.includes(paymentMode)) {
        throw new Error(`Invalid payment mode. Supported modes: ${validModes.join(', ')}`);
      }

      const paymentDate = payload.paymentDate || new Date().toISOString().slice(0, 10);
      const transactionRef = payload.transactionRef ? payload.transactionRef.trim() : null;
      const isOpening = payload.isOpeningBalance !== false;

      // Calculate previous due before this payment
      const previousDue = await this.calculateCustomerDue(customerId, transaction);
      const remainingDue = Math.round((previousDue - pAmt) * 100) / 100;

      const paymentNumber = await generatePaymentNumber(transaction);

      // Create Payment record
      const payment = await Payment.create({
        paymentNumber,
        customerId: customer.id,
        customerName: customer.name,
        invoiceId: null,
        paymentType: 'PREVIOUS_DUE_COLLECTION',
        amount: pAmt,
        paymentMode,
        transactionRef,
        paymentDate,
        notes: payload.notes || `Payment against opening balance for ${customer.name}`,
        status: 'CONFIRMED',
        createdById: user ? user.id : 1,
      }, { transaction });

      // Create Customer Ledger entry
      await CustomerLedger.create({
        customerId: customer.id,
        date: paymentDate,
        type: 'PAYMENT',
        reference: paymentNumber,
        description: isOpening
          ? `Opening Balance Payment (${paymentMode})${transactionRef ? ` - Ref: ${transactionRef}` : ''}`
          : `Previous Due Collection (${paymentMode})${transactionRef ? ` - Ref: ${transactionRef}` : ''}`,
        debit: 0.00,
        credit: pAmt,
        runningBalance: remainingDue,
        createdById: user ? user.id : 1,
      }, { transaction });

      // Update Customer currentDue
      const finalRealDue = await this.calculateCustomerDue(customerId, transaction);
      await customer.update(
        { currentDue: finalRealDue },
        { where: { id: customer.id }, transaction }
      );

      // Audit Log
      await AuditLog.create({
        userId: user ? user.id : null,
        userName: user ? user.name : 'System',
        action: isOpening ? 'OPENING_BALANCE_PAID' : 'PREVIOUS_DUE_COLLECTED',
        entity: 'PAYMENT',
        entityId: String(payment.id),
        newValue: JSON.stringify({
          paymentNumber,
          customer: customer.name,
          amount: pAmt,
          previousDue,
          remainingDue: finalRealDue,
        }),
      }, { transaction });

      await transaction.commit();

      return {
        success: true,
        paymentId: payment.id,
        paymentNumber,
        customerName: customer.name,
        amountPaid: pAmt,
        previousDue,
        remainingDue: finalRealDue,
        paymentMode,
        transactionRef,
        paymentDate,
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}

module.exports = new CustomerService();
