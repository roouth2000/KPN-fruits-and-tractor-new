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

// Create new customer
router.post('/', requirePermission('customer.view'), customerController.createCustomer);

// Update customer
router.put('/:id', requirePermission(['customer.edit', 'customer.view']), customerController.updateCustomer);

// Delete customer
router.delete('/:id', requirePermission(['customer.edit', 'customer.view']), customerController.deleteCustomer);

// Pay opening balance / settle balance
router.post('/:id/pay-opening-balance', requirePermission(['payment.collect', 'customer.view']), customerController.payOpeningBalance);
router.post('/:id/collect-due', requirePermission(['payment.collect', 'customer.view']), customerController.payOpeningBalance);

module.exports = router;

