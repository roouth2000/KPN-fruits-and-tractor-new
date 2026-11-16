const { Op } = require('sequelize');
const { Expense, User, sequelize } = require('../models');
const { generateExpenseNumber } = require('../utils/sequenceGenerator');

const EXPENSE_CATEGORIES = {
  FREIGHT_TRANSPORT: 'Inward Freight / Transport',
  LABOR_HAMALI: 'Dock Labor (Hamali)',
  COLD_STORAGE: 'Cold Chamber & Electricity',
  MARKET_CESS: 'Mandi Tax / Cess / Market Fees',
  PACKAGING: 'Packaging / Crates / Materials',
  SHOP_EXPENSE: 'Tea, Refreshments & Allowance',
  RENT_MAINTENANCE: 'Stall Rent & Maintenance',
  MISCELLANEOUS: 'Other Operating Expense',
};

class ExpenseService {
  /**
   * Get all active expenses with filtering and summary metrics
   */
  async listExpenses(query = {}) {
    const {
      startDate,
      endDate,
      category,
      paymentMode,
      search,
      page = 1,
      limit = 100,
    } = query;

    const where = { status: 'ACTIVE' };

    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      where.date = { [Op.gte]: startDate };
    } else if (endDate) {
      where.date = { [Op.lte]: endDate };
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (paymentMode && paymentMode !== 'ALL') {
      where.paymentMode = paymentMode;
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      where[Op.or] = [
        { expenseNumber: { [Op.like]: term } },
        { paidTo: { [Op.like]: term } },
        { referenceNumber: { [Op.like]: term } },
        { notes: { [Op.like]: term } },
      ];
    }

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const parsedLimit = Math.min(200, Math.max(1, parseInt(limit, 10)));

    const { count, rows: expenses } = await Expense.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'username'],
        },
      ],
      order: [['date', 'DESC'], ['id', 'DESC']],
      limit: parsedLimit,
      offset,
    });

    // Compute metrics
    const totalFilteredAmount = expenses.reduce(
      (sum, exp) => sum + parseFloat(exp.amount || 0),
      0
    );

    // Today's summary
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTotal = (await Expense.sum('amount', {
      where: {
        status: 'ACTIVE',
        date: todayStr,
      },
    })) || 0;

    // This month's summary
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const monthTotal = (await Expense.sum('amount', {
      where: {
        status: 'ACTIVE',
        date: { [Op.gte]: firstDayOfMonth },
      },
    })) || 0;

    // Category breakdown for current filter
    const categoryBreakdown = {};
    const categoriesMap = { ...EXPENSE_CATEGORIES };
    for (const exp of expenses) {
      const cat = exp.category;
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + parseFloat(exp.amount || 0);
      if (exp.category && exp.categoryLabel && !categoriesMap[exp.category]) {
        categoriesMap[exp.category] = exp.categoryLabel;
      }
    }

    return {
      expenses,
      totalCount: count,
      filteredTotal: totalFilteredAmount,
      todayTotal,
      monthTotal,
      categoryBreakdown,
      categories: categoriesMap,
    };
  }

  /**
   * Create a new expense entry
   */
  async createExpense(data, user) {
    const {
      date,
      category,
      amount,
      paymentMode,
      referenceNumber,
      paidTo,
      notes,
    } = data;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Expense amount must be a valid positive number greater than 0');
    }

    let validCategory = 'MISCELLANEOUS';
    let categoryLabel = 'Other Operating Expense';

    if (category && EXPENSE_CATEGORIES[category]) {
      validCategory = category;
      categoryLabel = data.categoryLabel || EXPENSE_CATEGORIES[category];
    } else if (category && typeof category === 'string' && category.trim()) {
      validCategory = category.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_').substring(0, 50);
      categoryLabel = data.categoryLabel ? String(data.categoryLabel).trim() : category.trim();
    }

    const validPaymentModes = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'];
    const selectedMode = validPaymentModes.includes(paymentMode) ? paymentMode : 'CASH';

    return await sequelize.transaction(async (t) => {
      const expenseNumber = await generateExpenseNumber(t);

      const expense = await Expense.create(
        {
          expenseNumber,
          date: date || new Date().toISOString().split('T')[0],
          category: validCategory,
          categoryLabel,
          amount: parsedAmount,
          paymentMode: selectedMode,
          referenceNumber: referenceNumber ? String(referenceNumber).trim() : null,
          paidTo: paidTo ? String(paidTo).trim() : null,
          notes: notes ? String(notes).trim() : null,
          status: 'ACTIVE',
          createdById: user ? user.id : null,
        },
        { transaction: t }
      );

      return expense;
    });
  }

  /**
   * Update an existing expense entry
   */
  async updateExpense(id, data, user) {
    const expense = await Expense.findByPk(id);
    if (!expense) {
      throw new Error('Expense record not found');
    }

    if (expense.status === 'CANCELLED') {
      throw new Error('Cannot edit a cancelled expense voucher');
    }

    const {
      date,
      category,
      categoryLabel,
      amount,
      paymentMode,
      referenceNumber,
      paidTo,
      notes,
    } = data;

    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Expense amount must be a valid positive number greater than 0');
      }
      expense.amount = parsedAmount;
    }

    if (category !== undefined) {
      if (EXPENSE_CATEGORIES[category]) {
        expense.category = category;
        expense.categoryLabel = categoryLabel || EXPENSE_CATEGORIES[category];
      } else if (category && typeof category === 'string' && category.trim()) {
        expense.category = category.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_').substring(0, 50);
        expense.categoryLabel = categoryLabel ? String(categoryLabel).trim() : category.trim();
      }
    }

    if (paymentMode !== undefined) {
      const validPaymentModes = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'];
      if (validPaymentModes.includes(paymentMode)) {
        expense.paymentMode = paymentMode;
      }
    }

    if (date !== undefined) {
      expense.date = date;
    }

    if (referenceNumber !== undefined) {
      expense.referenceNumber = referenceNumber ? String(referenceNumber).trim() : null;
    }

    if (paidTo !== undefined) {
      expense.paidTo = paidTo ? String(paidTo).trim() : null;
    }

    if (notes !== undefined) {
      expense.notes = notes ? String(notes).trim() : null;
    }

    await expense.save();
    return expense;
  }

  /**
   * Cancel / soft-delete an expense
   */
  async cancelExpense(id, user) {
    const expense = await Expense.findByPk(id);
    if (!expense) {
      throw new Error('Expense record not found');
    }

    if (expense.status === 'CANCELLED') {
      throw new Error('Expense is already cancelled');
    }

    expense.status = 'CANCELLED';
    await expense.save();
    return expense;
  }

  /**
   * Get expense summary metrics for dashboards and reports
   */
  async getSummary() {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];

    const todayTotal = (await Expense.sum('amount', {
      where: {
        status: 'ACTIVE',
        date: todayStr,
      },
    })) || 0;

    const monthTotal = (await Expense.sum('amount', {
      where: {
        status: 'ACTIVE',
        date: { [Op.gte]: firstDayOfMonth },
      },
    })) || 0;

    const allExpenses = await Expense.findAll({
      where: { status: 'ACTIVE' },
      attributes: ['category', 'categoryLabel', 'amount', 'paymentMode', 'date'],
    });

    const categorySummary = {};
    const paymentModeSummary = { CASH: 0, UPI: 0, BANK_TRANSFER: 0, CHEQUE: 0 };
    const categoriesMap = { ...EXPENSE_CATEGORIES };

    for (const exp of allExpenses) {
      const amt = parseFloat(exp.amount || 0);
      categorySummary[exp.category] = (categorySummary[exp.category] || 0) + amt;
      if (paymentModeSummary[exp.paymentMode] !== undefined) {
        paymentModeSummary[exp.paymentMode] += amt;
      }
      if (exp.category && exp.categoryLabel && !categoriesMap[exp.category]) {
        categoriesMap[exp.category] = exp.categoryLabel;
      }
    }

    return {
      todayTotal,
      monthTotal,
      categorySummary,
      paymentModeSummary,
      categories: categoriesMap,
    };
  }
}

module.exports = new ExpenseService();
