const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate);

router.get('/', requirePermission('supplier.view'), supplierController.getSuppliers);
router.post('/', requirePermission('supplier.create'), supplierController.createSupplier);
router.get('/:id', requirePermission('supplier.view'), supplierController.getSupplierById);
router.post('/:id/pay', requirePermission('supplier.edit'), supplierController.recordPayment);
router.post('/inward-purchase', requirePermission('supplier.create'), supplierController.recordInwardPurchase);

module.exports = router;

