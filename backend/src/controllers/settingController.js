const settingService = require('../services/settingService');
const { apiSuccess, apiError } = require('../utils/apiResponse');

class SettingController {
  /**
   * GET /api/settings
   * Retrieve all settings (grouped by category and flat list)
   */
  async getAllSettings(req, res) {
    try {
      const data = await settingService.getAllSettings();
      return apiSuccess(res, data, 'System settings retrieved successfully');
    } catch (error) {
      return apiError(res, error.message, {}, 500);
    }
  }

  /**
   * GET /api/settings/public
   * Public settings (business name, mandi bay, license, footer) without auth
   */
  async getPublicSettings(req, res) {
    try {
      const data = await settingService.getPublicSettings();
      return apiSuccess(res, data, 'Public system settings retrieved');
    } catch (error) {
      return apiError(res, error.message, {}, 500);
    }
  }

  /**
   * GET /api/settings/category/:category
   * Retrieve settings for a specific category
   */
  async getCategorySettings(req, res) {
    try {
      const data = await settingService.getSettingsByCategory(req.params.category);
      return apiSuccess(res, data, `Settings for ${req.params.category} retrieved`);
    } catch (error) {
      return apiError(res, error.message, {}, 500);
    }
  }

  /**
   * GET /api/settings/key/:key
   * Retrieve single setting by key
   */
  async getSettingByKey(req, res) {
    try {
      const value = await settingService.getSettingByKey(req.params.key);
      if (value === null) {
        return apiError(res, `Setting key "${req.params.key}" not found`, {}, 404);
      }
      return apiSuccess(res, { key: req.params.key, value }, 'Setting retrieved');
    } catch (error) {
      return apiError(res, error.message, {}, 500);
    }
  }

  /**
   * PUT /api/settings/category/:category
   * Update all settings in a category
   */
  async updateCategorySettings(req, res) {
    try {
      const result = await settingService.updateCategorySettings(
        req.params.category,
        req.body,
        req.user
      );
      return apiSuccess(res, result, `${req.params.category} settings updated successfully`);
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }

  /**
   * PUT /api/settings
   * Batch update settings across all categories
   */
  async updateAllSettings(req, res) {
    try {
      const result = await settingService.updateAllSettings(req.body, req.user);
      return apiSuccess(res, result, 'Settings updated successfully');
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }

  /**
   * PUT /api/settings/key/:key
   * Update a single setting
   */
  async updateSingleSetting(req, res) {
    try {
      const { value } = req.body;
      const result = await settingService.updateSetting(req.params.key, value, req.user);
      return apiSuccess(res, result, `Setting "${req.params.key}" updated`);
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }

  /**
   * POST /api/settings/reset/:category
   * Reset category to factory defaults
   */
  async resetCategory(req, res) {
    try {
      const result = await settingService.resetCategoryToDefault(req.params.category, req.user);
      return apiSuccess(res, result, `${req.params.category} settings reset to defaults`);
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }

  /**
   * POST /api/settings/reset
   * Reset all settings to factory defaults
   */
  async resetAll(req, res) {
    try {
      const result = await settingService.resetAllToDefault(req.user);
      return apiSuccess(res, result, 'All system settings reset to defaults');
    } catch (error) {
      return apiError(res, error.message, {}, 400);
    }
  }
}

module.exports = new SettingController();

