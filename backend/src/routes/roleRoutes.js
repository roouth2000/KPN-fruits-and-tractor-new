const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate);
router.use(requirePermission('roles.manage'));

// List all roles with permission breakdown
router.get('/', roleController.getAllRoles);

// Get list of all permissions grouped by module
router.get('/permissions/all', roleController.getAllPermissions);

// Get single role
router.get('/:id', roleController.getRoleById);

// Update permissions assigned to a role (Superadmin / Admin with roles.manage)
router.put('/:id/permissions', roleController.updateRolePermissions);

module.exports = router;

