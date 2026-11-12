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

// Get all warehouse batches in FIFO order
router.get('/batches/all', requirePermission('stock.view'), productController.getAllBatches);

// Get all sales bill batch allocations (Rule 6 supplier trace audit)
router.get('/batches/allocations', requirePermission('stock.view'), productController.getAllBatchAllocations);

// Update a batch (Rules 1, 2, 3, 7)
router.put('/batches/:id', requirePermission('stock.view'), productController.updateBatch);

// Delete a batch (Rule 7 auto-recalculates)
router.delete('/batches/:id', requirePermission('stock.view'), productController.deleteBatch);

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

// Update fruit / product SKU
router.put('/:id', requirePermission('stock.view'), productController.updateProduct);

// Delete fruit / product SKU
router.delete('/:id', requirePermission('stock.view'), productController.deleteProduct);

module.exports = router;

