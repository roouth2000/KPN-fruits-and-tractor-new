const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { authenticate } = require('../middleware/auth');

// All expense routes require authentication
router.use(authenticate);

router.get('/', expenseController.getExpenses);
router.post('/', expenseController.createExpense);
router.put('/:id', expenseController.updateExpense);
router.get('/summary', expenseController.getSummary);
router.delete('/:id', expenseController.cancelExpense);

module.exports = router;
