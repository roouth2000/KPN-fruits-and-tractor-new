const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate);

// 1. Daily Sales Report
router.get('/daily-sales', requirePermission('reports.view'), reportController.getDailySales);

// 2. Monthly Sales Report
router.get('/monthly-sales', requirePermission('reports.view'), reportController.getMonthlySales);

// 3. Purchase Report
router.get('/purchase', requirePermission('reports.view'), reportController.getPurchaseReport);

// 4. Stock Report
router.get('/stock', requirePermission('reports.view'), reportController.getStockReport);

// 5. Profit Report (Financial)
router.get('/profit', requirePermission('reports.financial'), reportController.getProfitReport);

// 6. Loss Report (Financial)
router.get('/loss', requirePermission('reports.financial'), reportController.getLossReport);

// 7. Damage Report
router.get('/damage', requirePermission('reports.view'), reportController.getDamageReport);

// 8. Returns Report
router.get('/returns', requirePermission('reports.view'), reportController.getReturnsReport);

// 9. Customer Due Report
router.get('/customer-due', requirePermission('reports.view'), reportController.getCustomerDueReport);

// 10. Supplier Due Report
router.get('/supplier-due', requirePermission('reports.view'), reportController.getSupplierDueReport);

// 11. Tray Report
router.get('/tray', requirePermission('reports.view'), reportController.getTrayReport);

module.exports = router;

