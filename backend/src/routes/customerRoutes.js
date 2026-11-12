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

module.exports = router;

