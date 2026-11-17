const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate);

// Get all customers
router.get('/', requirePermission('customer.view'), customerController.getAllCustomers);

// Search customers (fast, debounced)
router.get('/search', requirePermission('customer.view'), customerController.searchCustomers);

// Get calculated balance & trays (source of truth from ledger)
router.get('/:id/balance', requirePermission('customer.view'), customerController.getCustomerBalance);

// Get customer ledger transactions
router.get('/:id/ledger', requirePermission('customer.view'), customerController.getCustomerLedger);

// Get customer ledger PDF statement
router.get('/:id/ledger/pdf', requirePermission('customer.view'), customerController.generateCustomerLedgerPdf);

// Create new customer
router.post('/', requirePermission('customer.view'), customerController.createCustomer);

// Update customer
router.put('/:id', requirePermission(['customer.edit', 'customer.view']), customerController.updateCustomer);

// Delete customer
router.delete('/:id', requirePermission(['customer.edit', 'customer.view']), customerController.deleteCustomer);

// Pay opening balance / settle balance
router.post('/:id/pay-opening-balance', requirePermission(['payment.collect', 'customer.view']), customerController.payOpeningBalance);
router.post('/:id/collect-due', requirePermission(['payment.collect', 'customer.view']), customerController.payOpeningBalance);

// Add credit (increases customer outstanding due balance)
router.post('/:id/credit', requirePermission(['sales.create', 'customer.edit', 'customer.view']), customerController.addCredit);
router.post('/:id/add-credit', requirePermission(['sales.create', 'customer.edit', 'customer.view']), customerController.addCredit);

// Customer Repayment (reduces customer outstanding due balance)
router.post('/:id/repay', requirePermission(['payment.collect', 'customer.view']), customerController.repayCustomerDue);

module.exports = router;

