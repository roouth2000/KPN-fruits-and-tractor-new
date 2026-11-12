const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate);

// Get all products
router.get('/', requirePermission('stock.view'), productController.getAllProducts);

// Search products by name, code, barcode, variety, grade
router.get('/search', requirePermission('stock.view'), productController.searchProducts);

// Get all units and conversions
router.get('/units', requirePermission('stock.view'), productController.getUnits);

// Get tax configurations
router.get('/tax-configs', requirePermission('stock.view'), productController.getTaxConfigs);

// Get real-time product stock
router.get('/:id/stock', requirePermission('stock.view'), productController.getProductStock);

// Get product batches in FIFO order
router.get('/:id/batches', requirePermission('stock.view'), productController.getProductBatches);

// Recalculate FIFO allocations for a product
router.post('/:id/recalculate-fifo', requirePermission('stock.view'), productController.recalculateProductFIFO);

// Recalculate FIFO allocations for all products
router.post('/recalculate-all-fifo', requirePermission('stock.view'), productController.recalculateAllFIFO);

// Add inward stock to a product
router.post('/add-stock', requirePermission('stock.view'), productController.addStock);

// Create new product / fruit SKU
router.post('/', requirePermission('stock.view'), productController.createProduct);

module.exports = router;

