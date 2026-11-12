const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { authenticate, requirePermission } = require('../middleware/auth');

// Public settings route (no auth required for business name, contact, invoice headers)
router.get('/public', settingController.getPublicSettings);

// QZ Tray security certificate & signature verification (used by QZ Tray WebSocket)
router.get('/qz-certificate', settingController.getQzCertificate);
router.all('/qz-sign', settingController.signQzRequest);

// Authenticated routes - protected by settings.manage permission
router.use(authenticate);

// Get all system settings
router.get('/', requirePermission('settings.manage'), settingController.getAllSettings);

// Get settings for a specific category
router.get('/category/:category', requirePermission('settings.manage'), settingController.getCategorySettings);

// Get a single setting by key
router.get('/key/:key', requirePermission('settings.manage'), settingController.getSettingByKey);

// Update all settings in batch
router.put('/', requirePermission('settings.manage'), settingController.updateAllSettings);

// Update all settings in a category
router.put('/category/:category', requirePermission('settings.manage'), settingController.updateCategorySettings);

// Update a single setting
router.put('/key/:key', requirePermission('settings.manage'), settingController.updateSingleSetting);

// Reset a category to default settings
router.post('/reset/:category', requirePermission('settings.manage'), settingController.resetCategory);

// Reset all settings to default
router.post('/reset', requirePermission('settings.manage'), settingController.resetAll);

module.exports = router;

