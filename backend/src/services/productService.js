const { Product, Unit, TaxConfig, StockMovement, sequelize } = require('../models');
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
}

module.exports = new ProductService();
