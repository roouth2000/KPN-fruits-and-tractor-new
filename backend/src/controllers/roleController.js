const roleService = require('../services/roleService');
const { apiSuccess, apiError } = require('../utils/apiResponse');

class RoleController {
  async getAllRoles(req, res) {
    try {
      const roles = await roleService.getAllRoles();
      return apiSuccess(res, roles, 'Roles retrieved successfully');
    } catch (error) {
      return apiError(res, error.message, {}, 500);
    }
  }

  async getRoleById(req, res) {
    try {
      const role = await roleService.getRoleById(req.params.id);
      return apiSuccess(res, role, 'Role retrieved successfully');
    } catch (error) {
      return apiError(res, error.message, {}, 404);
    }
  }

  async updateRolePermissions(req, res) {
    try {
      const { permissions } = req.body;
      const role = await roleService.updateRolePermissions(req.params.id, permissions, req.user);
      return apiSuccess(res, role, 'Role permissions updated successfully');
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }

  async getAllPermissions(req, res) {
    try {
      const perms = await roleService.getAllPermissionsGrouped();
      return apiSuccess(res, perms, 'Permissions retrieved successfully');
    } catch (error) {
      return apiError(res, error.message, {}, 500);
    }
  }
}

module.exports = new RoleController();

