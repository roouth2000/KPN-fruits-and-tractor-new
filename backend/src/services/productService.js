const { Product, Batch, Unit, TaxConfig, StockMovement, sequelize } = require('../models');
const { Op } = require('sequelize');
const fifoService = require('./fifoService');

class ProductService {
  async findById(id, transaction = null) {
    return await Product.findByPk(id, { transaction });
  }

  async findByCodeOrBarcode(code, transaction = null) {
    return await Product.findOne({
      where: {
        [Op.or]: [
          { productCode: code },
          { barcode: code },
        ],
      },
      transaction,
    });
  }

  async searchProducts(query = '', limit = 30) {
    const where = { isActive: true };
    if (query && query.trim() !== '') {
      const q = `%${query.trim()}%`;
      where[Op.or] = [
        { name: { [Op.like]: q } },
        { variety: { [Op.like]: q } },
        { productCode: { [Op.like]: q } },
        { barcode: { [Op.like]: q } },
        { grade: { [Op.like]: q } },
      ];
    }

    return await Product.findAll({
      where,
      limit: parseInt(limit, 10) || 30,
      order: [['name', 'ASC'], ['variety', 'ASC']],
    });
  }

  async updateStock(id, newStock, transaction = null) {
    return await Product.update(
      { currentStock: newStock },
      { where: { id }, transaction }
    );
  }

  async getProductStock(id) {
    const product = await this.findById(id);
    if (!product) throw new Error('Product not found');

    return {
      id: product.id,
      name: product.name,
      variety: product.variety,
      grade: product.grade,
      currentStock: parseFloat(product.currentStock) || 0,
      defaultUnit: product.defaultUnit,
      baseUnit: product.baseUnit,
      conversionFactor: parseFloat(product.conversionFactor) || 1.0,
      wholesaleRate: parseFloat(product.wholesaleRate) || 0,
      retailRate: parseFloat(product.retailRate) || 0,
    };
  }

  async getUnits() {
    return await Unit.findAll({
      order: [['name', 'ASC']],
    });
  }

  async getTaxConfigs() {
    return await TaxConfig.findAll({
      where: { isActive: true },
      order: [['ratePercentage', 'ASC']],
    });
  }

  /**
   * Inward fresh stock / lot into warehouse inventory with FIFO Batch Tracking
   * Rules:
   * 1. Even if Product Name is same, each Supplier Stock is stored as a separate Batch
   * 2. Each Batch has a Unique Batch ID
   * 3. Sort based on Purchase Date in FIFO order
   * 7. If backdated, recalculate FIFO
   */
  async addStock(params, maybeQuantity, maybeNotes, maybeUnit, maybePurchaseRate, maybeUser) {
    let data = {};
    if (typeof params === 'object' && params !== null && params.productId) {
      data = { ...params, user: maybeQuantity || params.user };
    } else {
      data = {
        productId: params,
        quantity: maybeQuantity,
        notes: maybeNotes,
        unit: maybeUnit,
        purchaseRate: maybePurchaseRate,
        user: maybeUser,
      };
    }

    const { batch, recalculated } = await fifoService.createBatch(data);
    const updatedProduct = await Product.findByPk(data.productId);

    return {
      product: updatedProduct,
      batch,
      recalculated,
    };
  }

  /**
   * Get all warehouse batches in strict FIFO order
   */
  async getAllBatches(status = null) {
    return await fifoService.getAllBatches(status);
  }

  /**
   * Get sales bill allocations (Rule 6 supplier trace audit)
   */
  async getAllBatchAllocations(limit = 60) {
    return await fifoService.getAllBatchAllocations(limit);
  }

  /**
   * Get all active & completed batches for a product sorted in FIFO order
   */
  async getProductBatches(productId) {
    return await fifoService.getBatchesForProduct(productId);
  }

  /**
   * Recalculate FIFO allocations for a product (Rule 7)
   */
  async recalculateProductFIFO(productId) {
    return await fifoService.recalculateFIFO(productId);
  }

  /**
   * Recalculate FIFO for all products
   */
  async recalculateAllFIFO() {
    return await fifoService.recalculateAll();
  }

  /**
   * Update an existing warehouse batch (Rule 1, 2, 3, 7)
   */
  async updateBatch(batchId, data, user = null) {
    return await fifoService.updateBatch(batchId, data, user);
  }

  /**
   * Delete a warehouse batch (Rule 7 auto-recalculates)
   */
  async deleteBatch(batchId, user = null) {
    return await fifoService.deleteBatch(batchId, user);
  }

  /**
   * Register new fruit / product SKU in catalog
   */
  async createProduct(data, user = null) {
    const transaction = await sequelize.transaction();
    try {
      let productCode = data.productCode && data.productCode.trim();
      if (!productCode) {
        const count = await Product.count({ transaction });
        const prefix = String(data.name || 'FRUIT').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
        productCode = `PROD-${prefix}-${String(count + 1).padStart(3, '0')}`;
      }

      const existing = await Product.findOne({ where: { productCode }, transaction });
      if (existing) {
        throw new Error(`Product with code "${productCode}" already exists`);
      }

      const initialStock = parseFloat(data.initialStock || data.currentStock) || 0.00;

      const payload = {
        productCode,
        barcode: data.barcode || null,
        name: data.name ? data.name.trim() : 'New Fruit',
        variety: data.variety ? data.variety.trim() : 'Standard',
        grade: data.grade ? data.grade.trim() : 'A',
        batchNumber: data.batchNumber || `BATCH-${new Date().getFullYear()}-${Date.now().toString().slice(-3)}`,
        defaultUnit: data.defaultUnit || 'BOX',
        baseUnit: data.baseUnit || 'KG',
        conversionFactor: parseFloat(data.conversionFactor) || 20.0,
        wholesaleRate: parseFloat(data.wholesaleRate) || 0.00,
        retailRate: parseFloat(data.retailRate) || 0.00,
        purchaseRate: parseFloat(data.purchaseRate) || 0.00,
        currentStock: initialStock,
        minStockLevel: parseFloat(data.minStockLevel) || 20.0,
        isTrayRequired: !!data.isTrayRequired,
        trayType: data.trayType || 'PLASTIC',
        isActive: true,
      };

      const product = await Product.create(payload, { transaction });

      if (initialStock > 0) {
        await StockMovement.create({
          productId: product.id,
          movementType: 'OPENING',
          quantity: initialStock,
          baseQuantity: initialStock * payload.conversionFactor,
          unit: payload.defaultUnit,
          rate: payload.purchaseRate,
          referenceType: 'INITIAL_STOCK',
          referenceId: `INIT-${product.productCode}`,
          notes: 'Initial inventory stock upon fruit registration',
          createdById: user ? user.id : 1,
        }, { transaction });
      }

      await transaction.commit();
      return product;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * Update an existing fruit / product SKU
   */
  async updateProduct(id, data, user = null) {
    const product = await Product.findByPk(id);
    if (!product) {
      throw new Error(`Product #${id} not found`);
    }

    if (data.productCode && data.productCode.trim() !== product.productCode) {
      const existing = await Product.findOne({
        where: { productCode: data.productCode.trim(), id: { [Op.ne]: id } },
      });
      if (existing) {
        throw new Error(`Product code "${data.productCode.trim()}" is already in use`);
      }
      product.productCode = data.productCode.trim();
    }

    if (data.name !== undefined && data.name.trim()) product.name = data.name.trim();
    if (data.variety !== undefined) product.variety = data.variety.trim();
    if (data.grade !== undefined) product.grade = data.grade.trim();
    if (data.barcode !== undefined) product.barcode = data.barcode;
    if (data.defaultUnit !== undefined) product.defaultUnit = data.defaultUnit;
    if (data.baseUnit !== undefined) product.baseUnit = data.baseUnit;
    if (data.conversionFactor !== undefined && !isNaN(parseFloat(data.conversionFactor))) {
      product.conversionFactor = parseFloat(data.conversionFactor);
    }
    if (data.wholesaleRate !== undefined && !isNaN(parseFloat(data.wholesaleRate))) {
      product.wholesaleRate = parseFloat(data.wholesaleRate);
    }
    if (data.retailRate !== undefined && !isNaN(parseFloat(data.retailRate))) {
      product.retailRate = parseFloat(data.retailRate);
    }
    if (data.purchaseRate !== undefined && !isNaN(parseFloat(data.purchaseRate))) {
      product.purchaseRate = parseFloat(data.purchaseRate);
    }
    if (data.minStockLevel !== undefined && !isNaN(parseFloat(data.minStockLevel))) {
      product.minStockLevel = parseFloat(data.minStockLevel);
    }
    if (data.isTrayRequired !== undefined) product.isTrayRequired = !!data.isTrayRequired;
    if (data.trayType !== undefined) product.trayType = data.trayType;
    if (data.isActive !== undefined) product.isActive = !!data.isActive;

    await product.save();
    return product;
  }

  /**
   * Delete or archive a fruit / product SKU
   */
  async deleteProduct(id, user = null) {
    const product = await Product.findByPk(id);
    if (!product) {
      throw new Error(`Product #${id} not found`);
    }

    const batchCount = await Batch.count({ where: { productId: id } });
    if (batchCount > 0) {
      product.isActive = false;
      await product.save();
      return {
        success: true,
        message: `Fruit SKU "${product.name}" has ${batchCount} existing batches and was safely archived.`,
        archived: true,
      };
    }

    await product.destroy();
    return {
      success: true,
      message: `Fruit SKU "${product.name}" has been permanently deleted.`,
      deleted: true,
    };
  }
}

module.exports = new ProductService();
