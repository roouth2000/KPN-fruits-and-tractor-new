const { Op } = require('sequelize');
const {
  sequelize,
  Customer,
  Supplier,
  TrayMovement,
} = require('../models');

class TrayService {
  async getSummary() {
    const movements = await TrayMovement.findAll({
      order: [['id', 'DESC']],
      limit: 50,
    });

    const customers = await Customer.findAll({
      where: { outstandingTrays: { [Op.gt]: 0 } },
      attributes: ['id', 'name', 'outstandingTrays'],
    });

    const totalCustTrays = customers.reduce((acc, c) => acc + (c.outstandingTrays || 0), 0);

    return {
      totalCirculating: totalCustTrays,
      totalYardStock: 340,
      customerBalances: customers,
      recentMovements: movements,
    };
  }

  /**
   * Record Issue or Return of Trays
   */
  async recordMovement(data) {
    const transaction = await sequelize.transaction();
    try {
      const { customerId, supplierId, movementType, quantity, notes } = data;
      const qty = parseInt(quantity, 10);
      if (isNaN(qty) || qty <= 0) throw new Error('Valid tray quantity required');

      let customer = null;
      let supplier = null;

      if (customerId) {
        customer = await Customer.findByPk(customerId, { transaction });
        if (!customer) throw new Error('Customer not found');

        let newTrays = customer.outstandingTrays || 0;
        if (movementType === 'ISSUE') {
          newTrays += qty;
        } else if (movementType === 'RETURN') {
          newTrays = Math.max(0, newTrays - qty);
        }
        await customer.update({ outstandingTrays: newTrays }, { transaction });
      }

      if (supplierId) {
        supplier = await Supplier.findByPk(supplierId, { transaction });
        if (!supplier) throw new Error('Supplier not found');

        let newTrays = supplier.outstandingTrays || 0;
        if (movementType === 'ISSUE') {
          newTrays += qty;
        } else if (movementType === 'RETURN') {
          newTrays = Math.max(0, newTrays - qty);
        }
        await supplier.update({ outstandingTrays: newTrays }, { transaction });
      }

      const movement = await TrayMovement.create({
        customerId: customerId || null,
        supplierId: supplierId || null,
        movementType,
        trayType: 'PLASTIC_MANDI_CRATE',
        quantity: qty,
        depositAmount: qty * 100,
        referenceType: 'MANUAL_DISPATCH',
        referenceId: `TRY-${Date.now().toString().slice(-4)}`,
        notes: notes || `Direct crate ${movementType.toLowerCase()}`,
      }, { transaction });

      await transaction.commit();
      return { success: true, movement, customer, supplier };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}

module.exports = new TrayService();

