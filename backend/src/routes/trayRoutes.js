const express = require('express');
const router = express.Router();
const trayController = require('../controllers/trayController');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate);

router.get('/summary', requirePermission('tray.view'), trayController.getSummary);
router.post('/movement', requirePermission('tray.manage'), trayController.recordMovement);

module.exports = router;

