const { Op } = require('sequelize');
const {
  sequelize,
  Product,
  StockMovement,
} = require('../models');

class StockService {
  async getMovements(filters = {}, pagination = { limit: 50, offset: 0 }) {
    const where = {};
    if (filters.productId) where.productId = filters.productId;
    if (filters.movementType) where.movementType = filters.movementType;

    return await StockMovement.findAndCountAll({
      where,
      include: [{ model: Product, as: 'product', attributes: ['name', 'variety', 'defaultUnit'] }],
      order: [['id', 'DESC']],
      limit: parseInt(pagination.limit, 10) || 50,
      offset: parseInt(pagination.offset, 10) || 0,
    });
  }

  /**
   * Stock Adjustment (Damage, Spoilage, or Physical Count Correction)
   */
  async adjustStock(data, user) {
    const transaction = await sequelize.transaction();
    try {
      const { productId, adjustmentType, quantity, reason } = data;
      const product = await Product.findByPk(productId, { transaction });
      if (!product) throw new Error('Product not found');

      const qty = parseFloat(quantity);
      if (isNaN(qty) || qty <= 0) throw new Error('Valid quantity required');

      let newStock = parseFloat(product.currentStock);
      // If DAMAGE or WASTAGE, reduce stock
      if (adjustmentType === 'DAMAGE' || adjustmentType === 'WASTAGE' || adjustmentType === 'REDUCTION') {
        newStock = Math.max(0, newStock - qty);
      } else {
        // ADDITION or CORRECTION
        newStock += qty;
      }

      await product.update({ currentStock: newStock }, { transaction });

      const movement = await StockMovement.create({
        productId: product.id,
        movementType: adjustmentType === 'REDUCTION' ? 'DAMAGE' : adjustmentType,
        quantity: qty,
        baseQuantity: qty * (parseFloat(product.conversionFactor) || 20),
        unit: product.defaultUnit,
        rate: product.wholesaleRate,
        referenceType: 'PHYSICAL_ADJUSTMENT',
        referenceId: `ADJ-${Date.now().toString().slice(-4)}`,
        notes: reason || 'Physical inventory audit correction',
        createdById: user ? user.id : 1,
      }, { transaction });

      await transaction.commit();
      return { success: true, newStock, movement };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}

module.exports = new StockService();

