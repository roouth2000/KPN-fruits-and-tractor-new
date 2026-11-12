const { Op } = require('sequelize');
const {
  sequelize,
  Supplier,
  SupplierLedger,
  StockMovement,
  Product,
} = require('../models');
const fifoService = require('./fifoService');

class SupplierService {
  async getSuppliers(filters = {}, pagination = { limit: 50, offset: 0 }) {
    const where = {};
    if (filters.search) {
      const q = `%${filters.search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.like]: q } },
        { supplierCode: { [Op.like]: q } },
        { phone: { [Op.like]: q } },
        { city: { [Op.like]: q } },
      ];
    }

    return await Supplier.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      limit: parseInt(pagination.limit, 10) || 50,
      offset: parseInt(pagination.offset, 10) || 0,
    });
  }

  async getSupplierById(id) {
    const supplier = await Supplier.findByPk(id, {
      include: [
        {
          model: SupplierLedger,
          as: 'ledgerEntries',
          limit: 30,
          order: [['id', 'DESC']],
        },
      ],
    });
    if (!supplier) throw new Error('Supplier not found');
    return supplier;
  }

  async createSupplier(data) {
    const supplierCode = data.supplierCode || `SUPP-${Date.now().toString().slice(-4)}`;
    return await Supplier.create({
      ...data,
      supplierCode,
      currentDue: data.openingBalance || 0,
    });
  }

  /**
   * Record Supplier Payment (Settling Accounts Payable)
   */
  async recordPayment(supplierId, { amount, paymentMode = 'BANK_TRANSFER', reference, notes }) {
    const transaction = await sequelize.transaction();
    try {
      const supplier = await Supplier.findByPk(supplierId, { transaction });
      if (!supplier) throw new Error('Supplier not found');

      const payAmt = parseFloat(amount);
      if (isNaN(payAmt) || payAmt <= 0) throw new Error('Valid payment amount required');

      const newDue = Math.max(0, parseFloat(supplier.currentDue) - payAmt);
      await supplier.update({ currentDue: newDue }, { transaction });

      // Record in Supplier Ledger (Debit reduces liability)
      const ledger = await SupplierLedger.create({
        supplierId: supplier.id,
        date: new Date().toISOString().slice(0, 10),
        type: 'PAYMENT',
        reference: reference || `PAY-SUPP-${Date.now().toString().slice(-4)}`,
        description: `Payment via ${paymentMode}${notes ? `: ${notes}` : ''}`,
        debit: payAmt,
        credit: 0.00,
        runningBalance: newDue,
      }, { transaction });

      await transaction.commit();
      return { supplier, ledger, newDue };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * Record Inward Fruit Purchase (Consignment from Orchard)
   */
  async recordInwardPurchase(data, user) {
    const transaction = await sequelize.transaction();
    try {
      const { supplierId, productId, quantity, rate, unit = 'BOX', poNumber, notes } = data;

      const supplier = await Supplier.findByPk(supplierId, { transaction });
      if (!supplier) throw new Error('Supplier not found');

      const product = await Product.findByPk(productId, { transaction });
      if (!product) throw new Error('Product not found');

      const qty = parseFloat(quantity);
      const r = parseFloat(rate);
      const totalCost = qty * r;
      const ref = poNumber || `PO-2026-${Date.now().toString().slice(-4)}`;

      // 1. Create separate FIFO Batch (Rule 1 & Rule 2)
      const { batch, recalculated } = await fifoService.createBatch({
        productId: product.id,
        supplierId: supplier.id,
        purchaseDate: data.purchaseDate || new Date().toISOString().slice(0, 10),
        quantity: qty,
        unit,
        purchaseRate: r,
        batchNumber: data.batchNumber || null,
        notes: notes || `Inward Consignment from ${supplier.name} (${ref})`,
        user,
      }, transaction);

      // 2. Increase supplier liability (credit)
      const newDue = parseFloat(supplier.currentDue) + totalCost;
      await supplier.update({ currentDue: newDue }, { transaction });

      // 3. Record in Supplier Ledger
      await SupplierLedger.create({
        supplierId: supplier.id,
        date: data.purchaseDate || new Date().toISOString().slice(0, 10),
        type: 'PURCHASE',
        reference: ref,
        description: `Inward Purchase: ${qty} ${unit} of ${product.name} (${product.variety}) @ ₹${r}`,
        debit: 0.00,
        credit: totalCost,
        runningBalance: newDue,
      }, { transaction });

      await transaction.commit();
      const updatedProduct = await Product.findByPk(product.id);
      return { success: true, ref, newStock: updatedProduct.currentStock, newDue, batch, recalculated };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}

module.exports = new SupplierService();

