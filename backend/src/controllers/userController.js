const userService = require('../services/userService');
const { apiSuccess, apiError } = require('../utils/apiResponse');

class UserController {
  async getUsers(req, res) {
    try {
      const users = await userService.getUsers();
      return apiSuccess(res, users, 'Users retrieved successfully');
    } catch (error) {
      return apiError(res, error.message, {}, 500);
    }
  }

  async createUser(req, res) {
    try {
      const user = await userService.createUser(req.body, req.user);
      return apiSuccess(res, user, 'User created successfully', 201);
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }

  async updateUser(req, res) {
    try {
      const user = await userService.updateUser(req.params.id, req.body, req.user);
      return apiSuccess(res, user, 'User updated successfully');
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }
}

module.exports = new UserController();

