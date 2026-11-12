const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate);

router.get('/movements', requirePermission('stock.view'), stockController.getMovements);
router.post('/adjust', requirePermission('stock.adjust'), stockController.adjustStock);

module.exports = router;

