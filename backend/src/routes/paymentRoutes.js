const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { validateCollectDue } = require('../validators/billingValidator');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate);

// Standalone previous due collection
router.post('/', requirePermission('customer.payment'), validateCollectDue, paymentController.collectPreviousDue);

// Get payment receipt
router.get('/:id/receipt', requirePermission('invoice.print'), paymentController.getPaymentReceipt);

module.exports = router;

