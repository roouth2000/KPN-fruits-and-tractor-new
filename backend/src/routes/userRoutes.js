const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate);

// List staff accounts
router.get('/', requirePermission('users.view'), userController.getUsers);

// Create new staff account
router.post('/', requirePermission('users.manage'), userController.createUser);

// Update staff account / role
router.put('/:id', requirePermission('users.manage'), userController.updateUser);

module.exports = router;

