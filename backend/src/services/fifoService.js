const { Op } = require('sequelize');
const {
  sequelize,
  Batch,
  InvoiceItemBatch,
  Product,
  Supplier,
  Invoice,
  InvoiceItem,
  StockMovement,
} = require('../models');

class FifoService {
  /**
   * Rule 2: Generate a guaranteed Unique Batch ID
   * Format: BATCH-YYYYMMDD-S<supplierId>-<random4>
   */
  async generateUniqueBatchId(supplierId = null, purchaseDate = null, prefix = 'BATCH', transaction = null) {
    const dateStr = purchaseDate
      ? purchaseDate.replace(/[^0-9]/g, '').slice(0, 8)
      : new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suppTag = supplierId ? `S${supplierId}` : 'DIRECT';

    let isUnique = false;
    let candidate = '';
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      attempts++;
      const randNum = Math.floor(1000 + Math.random() * 9000);
      candidate = `${prefix}-${dateStr}-${suppTag}-${randNum}`;

      const existing = await Batch.findOne({
        where: { batchNumber: candidate },
        transaction,
      });
      if (!existing) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      candidate = `${prefix}-${dateStr}-${suppTag}-${Date.now().toString().slice(-6)}`;
    }

    return candidate;
  }

  /**
   * Rule 1: Even if Product Name is same, each Supplier Stock stored as separate Batch
   * Rule 2: Each Batch has a Unique Batch ID
   * Rule 3: Sort based on Purchase Date in FIFO order
   * Rule 7: Recalculate FIFO if backdated purchase arrives
   */
  async createBatch(data, externalTransaction = null) {
    const runInTransaction = async (t) => {
      const {
        productId,
        supplierId = null,
        purchaseDate,
        quantity,
        unit,
        purchaseRate = 0.00,
        batchNumber = null,
        notes = '',
        user = null,
      } = data;

      const product = await Product.findByPk(productId, { transaction: t });
      if (!product) throw new Error('Product not found');

      const qty = parseFloat(quantity);
      if (isNaN(qty) || qty <= 0) throw new Error('Valid inward batch quantity is required');

      let finalBatchNumber = batchNumber && batchNumber.trim();
      if (!finalBatchNumber) {
        finalBatchNumber = await this.generateUniqueBatchId(supplierId, purchaseDate, 'BATCH', t);
      } else {
        // Verify uniqueness
        const existing = await Batch.findOne({ where: { batchNumber: finalBatchNumber }, transaction: t });
        if (existing) {
          finalBatchNumber = `${finalBatchNumber}-${Date.now().toString().slice(-4)}`;
        }
      }

      const dateVal = purchaseDate || new Date().toISOString().slice(0, 10);
      const rateVal = parseFloat(purchaseRate) >= 0 ? parseFloat(purchaseRate) : parseFloat(product.purchaseRate) || 0.00;
      const unitVal = unit || product.defaultUnit || 'BOX';

      // Create new separate batch record
      const batch = await Batch.create({
        batchNumber: finalBatchNumber,
        productId: product.id,
        supplierId: supplierId || null,
        purchaseDate: dateVal,
        initialQuantity: qty,
        currentQuantity: qty,
        unit: unitVal,
        purchaseRate: rateVal,
        status: 'ACTIVE',
        notes: notes || 'Direct Mandi dock consignment arrival',
        createdById: user ? user.id : null,
      }, { transaction: t });

      // Record corresponding Stock Movement
      await StockMovement.create({
        productId: product.id,
        movementType: 'PURCHASE',
        quantity: qty,
        baseQuantity: qty * (parseFloat(product.conversionFactor) || 20),
        unit: unitVal,
        rate: rateVal,
        referenceType: 'BATCH_INWARD',
        referenceId: finalBatchNumber,
        batchNumber: finalBatchNumber,
        batchId: batch.id,
        supplierId: supplierId || null,
        notes: notes || `Batch inward from supplier #${supplierId || 'Direct'}`,
        createdById: user ? user.id : null,
      }, { transaction: t });

      // Update product latest purchase rate
      if (rateVal > 0) {
        await product.update({ purchaseRate: rateVal }, { transaction: t });
      }

      // Check Rule 7: Is this purchase backdated?
      // Check if there is any confirmed sale for this product with invoiceDate >= dateVal
      const laterSalesCount = await InvoiceItem.count({
        include: [{
          model: Invoice,
          as: 'invoice',
          where: {
            status: { [Op.ne]: 'CANCELLED' },
            invoiceDate: { [Op.gte]: dateVal },
          },
        }],
        where: { productId: product.id },
        transaction: t,
      });

      let wasRecalculated = false;
      if (laterSalesCount > 0) {
        // Backdated entry! Recalculate FIFO allocations
        await this.recalculateFIFO(product.id, t);
        wasRecalculated = true;
      } else {
        // Forward entry: simply increment product total current stock
        const totalStock = await Batch.sum('currentQuantity', {
          where: { productId: product.id, status: { [Op.ne]: 'EXPIRED' } },
          transaction: t,
        }) || 0;
        await product.update({ currentStock: totalStock }, { transaction: t });
      }

      // Reload batch with supplier details
      const reloadedBatch = await Batch.findByPk(batch.id, {
        include: [{ model: Supplier, as: 'supplier', attributes: ['id', 'name', 'supplierCode', 'city'] }],
        transaction: t,
      });

      return {
        batch: reloadedBatch,
        recalculated: wasRecalculated,
      };
    };

    if (externalTransaction) {
      return await runInTransaction(externalTransaction);
    }
    return await sequelize.transaction(runInTransaction);
  }

  /**
   * Rule 3: Sort based on Purchase Date in FIFO order
   * Rule 4: When creating a Sales Bill, deduct first from Oldest Stock
   * Rule 5: Move to next Batch only after old Batch is completely finished
   * Rule 6: In each Bill, record how much stock from which Supplier was sold
   */
  async allocateFIFO(productId, requestedQuantity, invoice, invoiceItem, transaction) {
    const qtyNeeded = parseFloat(requestedQuantity);
    if (isNaN(qtyNeeded) || qtyNeeded <= 0) return [];

    // Fetch active batches in strict FIFO order (Oldest purchaseDate first, then id)
    const availableBatches = await Batch.findAll({
      where: {
        productId,
        currentQuantity: { [Op.gt]: 0 },
        status: 'ACTIVE',
      },
      order: [
        ['purchaseDate', 'ASC'],
        ['id', 'ASC'],
      ],
      include: [{ model: Supplier, as: 'supplier' }],
      transaction,
      lock: transaction.LOCK ? transaction.LOCK.UPDATE : true,
    });

    let remainingToAllocate = qtyNeeded;
    const allocations = [];
    let totalCogsForThisItem = 0.00;

    for (const batch of availableBatches) {
      if (remainingToAllocate <= 0) break;

      const batchStock = parseFloat(batch.currentQuantity);
      if (batchStock <= 0) continue;

      // Deduct first from oldest stock
      const takeQty = Math.min(remainingToAllocate, batchStock);
      const newBatchQty = Math.round((batchStock - takeQty) * 100) / 100;
      const isFinished = newBatchQty <= 0;

      // Update batch stock & status
      await batch.update({
        currentQuantity: newBatchQty,
        status: isFinished ? 'DEPLETED' : 'ACTIVE',
      }, { transaction });

      // Rule 6: Record in InvoiceItemBatch how much stock from which Supplier was sold
      const allocationRecord = await InvoiceItemBatch.create({
        invoiceId: invoice.id,
        invoiceItemId: invoiceItem.id,
        batchId: batch.id,
        productId,
        supplierId: batch.supplierId || null,
        quantity: takeQty,
        unit: invoiceItem.unit || batch.unit || 'BOX',
        purchaseRate: batch.purchaseRate || 0.00,
        saleRate: invoiceItem.rate || 0.00,
        allocatedDate: invoice.invoiceDate || new Date().toISOString().slice(0, 10),
      }, { transaction });

      // Track COGS
      const batchCost = takeQty * parseFloat(batch.purchaseRate || 0);
      totalCogsForThisItem += batchCost;

      // Create Stock Movement record for this batch
      await StockMovement.create({
        productId,
        movementType: 'SALE',
        quantity: -takeQty,
        baseQuantity: -takeQty * (parseFloat(invoiceItem.baseQuantity || 1) / parseFloat(invoiceItem.quantity || 1)),
        unit: invoiceItem.unit || batch.unit || 'BOX',
        rate: invoiceItem.rate,
        referenceType: 'INVOICE',
        referenceId: invoice.invoiceNumber,
        batchNumber: batch.batchNumber,
        batchId: batch.id,
        supplierId: batch.supplierId || null,
        notes: `FIFO sale from Batch #${batch.batchNumber} (${batch.supplier ? batch.supplier.name : 'Direct'}) via #${invoice.invoiceNumber}`,
        createdById: invoice.createdById || null,
      }, { transaction });

      allocations.push({
        id: allocationRecord.id,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        supplierId: batch.supplierId,
        supplierName: batch.supplier ? batch.supplier.name : 'Direct Mandi Consignment',
        quantity: takeQty,
        unit: invoiceItem.unit || batch.unit,
        purchaseRate: parseFloat(batch.purchaseRate || 0),
        saleRate: parseFloat(invoiceItem.rate || 0),
      });

      remainingToAllocate = Math.round((remainingToAllocate - takeQty) * 100) / 100;
      // Rule 5: Move to next batch only after old batch is completely finished
    }

    // If remainingToAllocate > 0, warehouse ran out of tracked batches for this quantity
    if (remainingToAllocate > 0) {
      console.warn(`[FIFO WARNING] Product #${productId} has insufficient batch stock! Deficit: ${remainingToAllocate}`);
    }

    // Update InvoiceItem COGS
    if (totalCogsForThisItem > 0) {
      await invoiceItem.update({
        cogsAmount: Math.round(totalCogsForThisItem * 100) / 100,
      }, { transaction });
    }

    return allocations;
  }

  /**
   * Rule 7: Recalculate FIFO allocations
   * If a backdated Purchase or Sales comes in, recalculate the entire FIFO allocation.
   */
  async recalculateFIFO(productId, externalTransaction = null) {
    const runInTransaction = async (t) => {
      const product = await Product.findByPk(productId, { transaction: t });
      if (!product) throw new Error(`Product #${productId} not found`);

      // 1. Fetch all batches for this product in strict FIFO purchase order
      const allBatches = await Batch.findAll({
        where: { productId },
        order: [
          ['purchaseDate', 'ASC'],
          ['id', 'ASC'],
        ],
        transaction: t,
        lock: t.LOCK ? t.LOCK.UPDATE : true,
      });

      // 2. Reset every batch's currentQuantity to its initialQuantity and status to ACTIVE
      for (const b of allBatches) {
        b.currentQuantity = parseFloat(b.initialQuantity);
        b.status = 'ACTIVE';
        await b.save({ transaction: t });
      }

      // 3. Delete existing InvoiceItemBatch allocations for this product for active invoices
      await InvoiceItemBatch.destroy({
        where: { productId },
        transaction: t,
      });

      // 4. Fetch all confirmed, non-cancelled invoice items for this product ordered chronologically
      const invoiceItems = await InvoiceItem.findAll({
        where: { productId },
        include: [{
          model: Invoice,
          as: 'invoice',
          where: {
            status: { [Op.ne]: 'CANCELLED' },
          },
          attributes: ['id', 'invoiceNumber', 'invoiceDate', 'createdById'],
        }],
        order: [
          [{ model: Invoice, as: 'invoice' }, 'invoiceDate', 'ASC'],
          [{ model: Invoice, as: 'invoice' }, 'id', 'ASC'],
          ['id', 'ASC'],
        ],
        transaction: t,
      });

      // 5. Replay all sales through FIFO engine sequentially
      for (const item of invoiceItems) {
        const invoice = item.invoice;
        let qtyNeeded = parseFloat(item.quantity);
        let itemCogs = 0.00;

        // Find available batches that arrived on or before the invoice date (or earliest available)
        // Rule 3 & 4: Deduct first from oldest stock
        for (const batch of allBatches) {
          if (qtyNeeded <= 0) break;
          const currentBatchQty = parseFloat(batch.currentQuantity);
          if (currentBatchQty <= 0) continue;

          const take = Math.min(qtyNeeded, currentBatchQty);
          batch.currentQuantity = Math.round((currentBatchQty - take) * 100) / 100;
          if (batch.currentQuantity <= 0) {
            batch.status = 'DEPLETED';
          }
          await batch.save({ transaction: t });

          // Re-create allocation record
          await InvoiceItemBatch.create({
            invoiceId: invoice.id,
            invoiceItemId: item.id,
            batchId: batch.id,
            productId,
            supplierId: batch.supplierId || null,
            quantity: take,
            unit: item.unit || batch.unit || 'BOX',
            purchaseRate: batch.purchaseRate || 0.00,
            saleRate: item.rate || 0.00,
            allocatedDate: invoice.invoiceDate,
          }, { transaction: t });

          itemCogs += take * parseFloat(batch.purchaseRate || 0);
          qtyNeeded = Math.round((qtyNeeded - take) * 100) / 100;
          // Rule 5: Move to next batch only after old batch is completely finished
        }

        // Update item COGS
        await item.update({
          cogsAmount: Math.round(itemCogs * 100) / 100,
        }, { transaction: t });
      }

      // 6. Update product currentStock to sum of all remaining batch stock
      const finalStock = allBatches.reduce((sum, b) => sum + (parseFloat(b.currentQuantity) || 0), 0);
      await product.update({
        currentStock: Math.round(finalStock * 100) / 100,
      }, { transaction: t });

      return {
        productId: product.id,
        productName: product.name,
        batchesCount: allBatches.length,
        salesReplayed: invoiceItems.length,
        finalStock: Math.round(finalStock * 100) / 100,
      };
    };

    if (externalTransaction) {
      return await runInTransaction(externalTransaction);
    }
    return await sequelize.transaction(runInTransaction);
  }

  /**
   * Recalculate FIFO for all products across the catalog
   */
  async recalculateAll(transaction = null) {
    const products = await Product.findAll({ attributes: ['id', 'name'], transaction });
    const results = [];
    for (const p of products) {
      const res = await this.recalculateFIFO(p.id, transaction);
      results.push(res);
    }
    return results;
  }

  /**
   * Get all batches for a specific product with supplier information
   */
  async getBatchesForProduct(productId) {
    return await Batch.findAll({
      where: { productId },
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'supplierCode', 'city'],
        },
      ],
      order: [
        ['purchaseDate', 'ASC'],
        ['id', 'ASC'],
      ],
    });
  }

  /**
   * Get batch allocations for an invoice (Rule 6 audit trace)
   */
  async getInvoiceAllocations(invoiceId) {
    return await InvoiceItemBatch.findAll({
      where: { invoiceId },
      include: [
        {
          model: Batch,
          as: 'batch',
          attributes: ['id', 'batchNumber', 'purchaseDate', 'unit', 'purchaseRate'],
        },
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'supplierCode', 'city'],
        },
      ],
      order: [['id', 'ASC']],
    });
  }
}

module.exports = new FifoService();
