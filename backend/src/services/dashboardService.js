const { Op, fn, col } = require('sequelize');
const {
  sequelize,
  Customer,
  Supplier,
  Product,
  Invoice,
  InvoiceItem,
  Payment,
  StockMovement,
} = require('../models');

class DashboardService {
  /**
   * 1. Today's Summary & Asset Valuation
   */
  async getSummary(targetDate = null) {
    const today = targetDate || new Date().toISOString().slice(0, 10);

    // Today's Sales
    const salesAgg = await Invoice.findOne({
      attributes: [
        [fn('COALESCE', fn('SUM', col('grandTotal')), 0), 'totalSales'],
        [fn('COALESCE', fn('SUM', col('paidAmount')), 0), 'totalPaid'],
        [fn('COALESCE', fn('SUM', col('balanceDue')), 0), 'totalDue'],
        [fn('COUNT', col('id')), 'invoicesCount'],
      ],
      where: {
        invoiceDate: today,
        status: { [Op.ne]: 'CANCELLED' },
      },
      raw: true,
    });

    const todaySales = parseFloat(salesAgg?.totalSales || 0);
    const todayCollection = parseFloat(salesAgg?.totalPaid || 0);
    const todayDue = parseFloat(salesAgg?.totalDue || 0);
    const todayInvoices = parseInt(salesAgg?.invoicesCount || 0, 10);

    // Today's Purchases
    const purchaseAgg = await StockMovement.findOne({
      attributes: [
        [fn('COALESCE', fn('SUM', sequelize.literal('quantity * rate')), 0), 'totalPurchase'],
      ],
      where: {
        movementType: 'PURCHASE',
      },
      raw: true,
    });
    const todayPurchase = parseFloat(purchaseAgg?.totalPurchase || 0);

    // Stock Valuation: Sum of currentStock * wholesaleRate
    const products = await Product.findAll({ attributes: ['currentStock', 'wholesaleRate', 'purchaseRate'], raw: true });
    let stockValue = 0;
    products.forEach((p) => {
      stockValue += (parseFloat(p.currentStock) || 0) * (parseFloat(p.wholesaleRate) || 0);
    });

    // Total Customer Due
    const customerDueAgg = await Customer.findOne({
      attributes: [
        [fn('COALESCE', fn('SUM', sequelize.literal('CASE WHEN currentDue > 0 THEN currentDue ELSE 0 END')), 0), 'totalCustomerDue'],
        [fn('COALESCE', fn('SUM', col('outstandingTrays')), 0), 'totalTrays'],
      ],
      raw: true,
    });
    const customerDue = parseFloat(customerDueAgg?.totalCustomerDue || 0);
    const trayWithCustomers = parseInt(customerDueAgg?.totalTrays || 0, 10);

    // Total Supplier Due
    const supplierDueAgg = await Supplier.findOne({
      attributes: [
        [fn('COALESCE', fn('SUM', col('currentDue')), 0), 'totalSupplierDue'],
      ],
      raw: true,
    });
    const supplierDue = parseFloat(supplierDueAgg?.totalSupplierDue || 0);

    return {
      todaySummary: {
        sales: todaySales,
        collection: todayCollection,
        due: todayDue,
        purchase: todayPurchase,
        invoicesCount: todayInvoices,
      },
      assetSummary: {
        stockValue,
        customerDue,
        supplierDue,
        trayWithCustomers,
      },
    };
  }

  /**
   * 2. Financial Metrics Bar (Sales, Purchases, Collections, Expenses, Profit)
   */
  async getFinancialMetrics() {
    const summary = await this.getSummary();

    const expensesAmount = 0;
    const profitAmount = Math.max(0, summary.todaySummary.sales - summary.todaySummary.purchase - expensesAmount);

    return [
      {
        id: 'report-daily-sales',
        label: "Today's Sales",
        amount: summary.todaySummary.sales,
        sub: `${summary.todaySummary.invoicesCount} bills · Avg ₹${summary.todaySummary.invoicesCount > 0 ? Math.round(summary.todaySummary.sales / summary.todaySummary.invoicesCount) : 0}`,
        change: summary.todaySummary.sales > 0 ? '+100%' : '0%',
        type: summary.todaySummary.sales > 0 ? 'positive' : 'neutral',
      },
      {
        id: 'report-purchase',
        label: "Today's Purchase",
        amount: summary.todaySummary.purchase,
        sub: 'Inward consignments',
        change: 'Procured',
        type: 'neutral',
      },
      {
        id: 'report-daily-sales',
        label: "Today's Collection",
        amount: summary.todaySummary.collection,
        sub: 'Cash + UPI settlements',
        change: summary.todaySummary.sales > 0 ? `${Math.round((summary.todaySummary.collection / summary.todaySummary.sales) * 100)}%` : '0%',
        type: 'positive',
      },
      {
        id: 'expenses',
        label: "Today's Expenses",
        amount: expensesAmount,
        sub: 'Freight & terminal fee',
        change: '0 items',
        type: 'neutral',
      },
      {
        id: 'report-profit',
        label: "Today's Profit",
        amount: profitAmount,
        sub: 'Net margin after expenses',
        change: profitAmount > 0 ? 'Profitable' : '0.0%',
        type: profitAmount > 0 ? 'positive' : 'neutral',
      },
    ];
  }

  /**
   * 3. Fruit Inventory Health (Damaged, Returned, Low Stock)
   */
  async getFruitHealth() {
    // Damaged Fruits
    const damagedMovements = await StockMovement.findAll({
      where: { movementType: 'DAMAGE' },
      include: [{ model: Product, as: 'product', attributes: ['name', 'variety', 'defaultUnit'] }],
      order: [['id', 'DESC']],
      limit: 6,
    });

    const damagedFruits = damagedMovements.map((dm) => ({
      id: dm.id,
      name: dm.product ? `${dm.product.name} (${dm.product.variety})` : 'Fruit Lot',
      quantity: `${parseFloat(dm.quantity)} ${dm.unit}`,
      lossAmount: parseFloat(dm.quantity) * (parseFloat(dm.rate) || 1200),
      reason: dm.notes || 'Transit damage',
      date: dm.createdAt ? dm.createdAt.toISOString().slice(0, 10) : 'Recent',
    }));

    // Returned Fruits (RMA)
    const returnedMovements = await StockMovement.findAll({
      where: { movementType: 'SALE_RETURN' },
      include: [{ model: Product, as: 'product', attributes: ['name', 'variety', 'defaultUnit'] }],
      order: [['id', 'DESC']],
      limit: 6,
    });

    const returnedFruits = returnedMovements.map((rm) => ({
      id: rm.id,
      name: rm.product ? `${rm.product.name} (${rm.product.variety})` : 'Fruit Lot',
      quantity: `${parseFloat(rm.quantity)} ${rm.unit}`,
      customer: rm.notes ? rm.notes.split(':')[0] : 'Customer',
      reason: rm.notes ? rm.notes.split(':')[1] || rm.notes : 'Quality variance',
      refundAmount: parseFloat(rm.quantity) * (parseFloat(rm.rate) || 1800),
      date: rm.createdAt ? rm.createdAt.toISOString().slice(0, 10) : 'Recent',
    }));

    // Low Stock Fruits
    const lowStockProducts = await Product.findAll({
      where: {
        [Op.or]: [
          sequelize.where(col('currentStock'), '<=', col('minStockLevel')),
          { currentStock: { [Op.lte]: 100 } },
        ],
      },
      order: [['currentStock', 'ASC']],
      limit: 6,
    });

    const lowStockFruits = lowStockProducts.map((p) => ({
      id: p.id,
      name: `${p.name} (${p.variety})`,
      currentStock: `${parseFloat(p.currentStock)} ${p.defaultUnit}`,
      minStock: `${parseFloat(p.minStockLevel)} ${p.defaultUnit}`,
      status: parseFloat(p.currentStock) <= 50 ? 'Critical' : 'Reorder Needed',
      reorderQty: `${(parseFloat(p.minStockLevel) * 2 - parseFloat(p.currentStock))} ${p.defaultUnit}`,
    }));

    return {
      damagedFruits,
      returnedFruits,
      lowStockFruits,
    };
  }

  /**
   * 4. Top Performers (Top Selling Fruits & Top Customers)
   */
  async getTopPerformers() {
    // Top selling fruits aggregated from invoice items
    const topItems = await InvoiceItem.findAll({
      attributes: [
        'productName',
        'variety',
        [fn('SUM', col('quantity')), 'totalQuantity'],
        [fn('SUM', col('totalAmount')), 'totalRevenue'],
      ],
      group: ['productName', 'variety'],
      order: [[fn('SUM', col('totalAmount')), 'DESC']],
      limit: 5,
      raw: true,
    });

    const topFruits = topItems.map((item, idx) => ({
      id: idx + 1,
      name: `${item.productName} (${item.variety || 'A Grade'})`,
      cratesSold: parseInt(item.totalQuantity || 0, 10),
      revenue: parseFloat(item.totalRevenue || 0),
      trend: '+12%',
    }));

    // Top Customers aggregated from invoices
    const topCusts = await Invoice.findAll({
      attributes: [
        'customerId',
        'customerName',
        [fn('COUNT', col('id')), 'billsCount'],
        [fn('SUM', col('grandTotal')), 'totalSpent'],
        [fn('SUM', col('paidAmount')), 'totalPaid'],
      ],
      where: { status: { [Op.ne]: 'CANCELLED' } },
      group: ['customerId', 'customerName'],
      order: [[fn('SUM', col('grandTotal')), 'DESC']],
      limit: 5,
      raw: true,
    });

    const topCustomers = topCusts.map((c, idx) => ({
      id: c.customerId || idx + 1,
      name: c.customerName,
      ordersCount: parseInt(c.billsCount || 0, 10),
      totalValue: parseFloat(c.totalSpent || 0),
      status: 'Active Premium',
    }));

    return {
      topFruits,
      topCustomers,
    };
  }

  /**
   * 5. Pending Dues (Customer Dues & Supplier Payables)
   */
  async getPendingDues() {
    const customers = await Customer.findAll({
      where: { currentDue: { [Op.gt]: 0 } },
      order: [['currentDue', 'DESC']],
      limit: 6,
    });

    const pendingCustomers = customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      dueAmount: parseFloat(c.currentDue),
      outstandingTrays: c.outstandingTrays,
      creditLimit: parseFloat(c.creditLimit),
    }));

    const suppliers = await Supplier.findAll({
      where: { currentDue: { [Op.gt]: 0 } },
      order: [['currentDue', 'DESC']],
      limit: 6,
    });

    const pendingSuppliers = suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      dueAmount: parseFloat(s.currentDue),
      outstandingTrays: s.outstandingTrays,
      city: s.city,
    }));

    return {
      pendingCustomers,
      pendingSuppliers,
    };
  }
}

module.exports = new DashboardService();

