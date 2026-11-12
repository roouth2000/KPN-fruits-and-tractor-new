const { Op } = require('sequelize');
const {
  sequelize,
  Supplier,
  SupplierLedger,
  StockMovement,
  Product,
  Batch,
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

  /**
   * Update Supplier Details
   */
  async updateSupplier(id, data) {
    const supplier = await Supplier.findByPk(id);
    if (!supplier) throw new Error('Supplier not found');

    if (data.supplierCode && data.supplierCode.trim() !== supplier.supplierCode) {
      const existing = await Supplier.findOne({
        where: { supplierCode: data.supplierCode.trim(), id: { [Op.ne]: id } },
      });
      if (existing) throw new Error(`Supplier code "${data.supplierCode.trim()}" is already in use`);
      supplier.supplierCode = data.supplierCode.trim();
    }

    if (data.name !== undefined && data.name.trim()) supplier.name = data.name.trim();
    if (data.phone !== undefined) supplier.phone = data.phone;
    if (data.email !== undefined) supplier.email = data.email;
    if (data.address !== undefined) supplier.address = data.address;
    if (data.city !== undefined) supplier.city = data.city;
    if (data.gstin !== undefined) supplier.gstin = data.gstin;
    if (data.openingBalance !== undefined && !isNaN(parseFloat(data.openingBalance))) {
      supplier.openingBalance = parseFloat(data.openingBalance);
    }
    if (data.currentDue !== undefined && !isNaN(parseFloat(data.currentDue))) {
      supplier.currentDue = parseFloat(data.currentDue);
    }
    if (data.outstandingTrays !== undefined && !isNaN(parseInt(data.outstandingTrays, 10))) {
      supplier.outstandingTrays = parseInt(data.outstandingTrays, 10);
    }
    if (data.isActive !== undefined) supplier.isActive = Boolean(data.isActive);
    if (data.notes !== undefined) supplier.notes = data.notes;

    await supplier.save();
    return supplier;
  }

  /**
   * Delete or archive a Supplier
   */
  async deleteSupplier(id) {
    const supplier = await Supplier.findByPk(id);
    if (!supplier) throw new Error('Supplier not found');

    const batchCount = await Batch.count({ where: { supplierId: id } });
    const ledgerCount = await SupplierLedger.count({ where: { supplierId: id } });
    const currentDue = parseFloat(supplier.currentDue) || 0;

    if (batchCount > 0 || ledgerCount > 0 || currentDue > 0) {
      // Soft-delete / deactivate to preserve historical audit trail & inventory batch tracking
      supplier.isActive = false;
      await supplier.save();
      return {
        success: true,
        message: `Supplier "${supplier.name}" has ${batchCount} batches / ₹${currentDue} dues and was archived safely.`,
        archived: true,
      };
    }

    await supplier.destroy();
    return {
      success: true,
      message: `Supplier "${supplier.name}" has been permanently deleted.`,
      deleted: true,
    };
  }
}

module.exports = new SupplierService();

