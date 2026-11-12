const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate);

// 1. Today's Summary & Asset Valuation
router.get('/summary', requirePermission('reports.view'), dashboardController.getSummary);

// 2. Financial Metrics Bar
router.get('/financial-metrics', requirePermission('reports.view'), dashboardController.getFinancialMetrics);

// 3. Fruit Inventory Health
router.get('/fruit-health', requirePermission('reports.view'), dashboardController.getFruitHealth);

// 4. Top Selling Fruits & Top Customers
router.get('/top-performers', requirePermission('reports.view'), dashboardController.getTopPerformers);

// 5. Pending Customer Dues & Supplier Payables
router.get('/pending-dues', requirePermission('reports.view'), dashboardController.getPendingDues);

module.exports = router;

