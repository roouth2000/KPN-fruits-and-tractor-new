const trayService = require('../services/trayService');
const { ApiResponse } = require('../utils/response');

class TrayController {
  async getSummary(req, res) {
    try {
      const summary = await trayService.getSummary();
      return ApiResponse.success(res, summary, 'Tray summary retrieved');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  async recordMovement(req, res) {
    try {
      const result = await trayService.recordMovement(req.body);
      return ApiResponse.success(res, result, 'Tray movement logged successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message, 400);
    }
  }
}

module.exports = new TrayController();

