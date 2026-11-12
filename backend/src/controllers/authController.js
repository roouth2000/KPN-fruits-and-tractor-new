const authService = require('../services/authService');
const { apiSuccess, apiError } = require('../utils/apiResponse');

class AuthController {
  async login(req, res) {
    try {
      const { email, username, identifier, password } = req.body;
      const id = identifier || email || username;
      const result = await authService.login(id, password);
      return apiSuccess(res, result, 'Login successful');
    } catch (error) {
      return apiError(res, error.message, {}, 401);
    }
  }

  async getMe(req, res) {
    try {
      if (!req.user) {
        return apiError(res, 'Not authenticated', {}, 401);
      }
      const profile = await authService.getUserWithPermissions(req.user.id);
      return apiSuccess(res, profile, 'Profile retrieved');
    } catch (error) {
      return apiError(res, error.message, {}, 500);
    }
  }

  async switchRole(req, res) {
    try {
      const { role } = req.body;
      if (!role) {
        return apiError(res, 'Role slug is required', {}, 400);
      }
      const result = await authService.switchRole(role);
      return apiSuccess(res, result, `Switched active role to ${role}`);
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }
}

module.exports = new AuthController();

