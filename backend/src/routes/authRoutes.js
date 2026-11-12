const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/switch-role', authController.switchRole);
router.get('/me', authenticate, authController.getMe);

module.exports = router;

