const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { validateCreateInvoice } = require('../validators/billingValidator');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate);

// List Invoices
router.get('/', requirePermission('sales.view'), billingController.getInvoices);

// Get Next Sequential Invoice Number
router.get('/next-number', requirePermission('sales.view'), billingController.getNextInvoiceNumber);

// Get Invoice by ID
router.get('/:id', requirePermission('sales.view'), billingController.getInvoiceById);

// Update / Edit Invoice (Admin / Superadmin only)
router.put('/:id', requirePermission('sales.edit'), billingController.updateInvoice);

// Create New Invoice (Common Billing Transaction)
router.post('/', requirePermission('sales.create'), validateCreateInvoice, billingController.createInvoice);

// Cancel Invoice
router.post('/:id/cancel', requirePermission('sales.cancel'), billingController.cancelInvoice);

// Process Sales Return
router.post('/:id/return', requirePermission('sales.return'), billingController.processReturn);

// Generate Invoice PDF
router.get('/:id/pdf', requirePermission('invoice.print'), billingController.generateInvoicePdf);

module.exports = router;

