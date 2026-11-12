const { Setting, sequelize } = require('../models');
const { DEFAULT_SETTINGS } = require('../database/seeders/settingsSeeder');

class SettingService {
  /**
   * Helper to parse stored setting value based on dataType
   */
  parseValue(value, dataType) {
    if (value === null || value === undefined) return value;
    switch (dataType) {
      case 'BOOLEAN':
        return value === 'true' || value === true || value === 1 || value === '1';
      case 'NUMBER':
        return isNaN(Number(value)) ? value : Number(value);
      case 'JSON':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      case 'STRING':
      default:
        return String(value);
    }
  }

  /**
   * Helper to format value for storage in DB
   */
  stringifyValue(value, dataType) {
    if (value === null || value === undefined) return '';
    if (dataType === 'BOOLEAN') return String(Boolean(value));
    if (dataType === 'JSON') return typeof value === 'string' ? value : JSON.stringify(value);
    return String(value);
  }

  /**
   * Retrieve all settings categorized and flattened
   */
  async getAllSettings() {
    const settings = await Setting.findAll({
      order: [['category', 'ASC'], ['key', 'ASC']],
    });

    const grouped = {
      mandi: {},
      billing: {},
      apmc: {},
      inventory: {},
      printer: {},
    };

    const flat = {};

    settings.forEach((s) => {
      const cat = (s.category || 'general').toLowerCase();
      const parsedVal = this.parseValue(s.value, s.dataType);
      flat[s.key] = parsedVal;

      if (!grouped[cat]) {
        grouped[cat] = {};
      }

      // If key is e.g. 'mandi.businessName', subKey is 'businessName'
      const parts = s.key.split('.');
      const subKey = parts.length > 1 ? parts.slice(1).join('.') : s.key;
      grouped[cat][subKey] = parsedVal;
    });

    return {
      grouped,
      flat,
      raw: settings,
    };
  }

  /**
   * Retrieve public settings accessible without authentication
   */
  async getPublicSettings() {
    const settings = await Setting.findAll({
      where: { isPublic: true },
      order: [['category', 'ASC'], ['key', 'ASC']],
    });

    const publicMap = {};
    settings.forEach((s) => {
      publicMap[s.key] = this.parseValue(s.value, s.dataType);
    });

    return publicMap;
  }

  /**
   * Get settings for a single category
   */
  async getSettingsByCategory(category) {
    const catUpper = String(category || '').toUpperCase();
    const settings = await Setting.findAll({
      where: { category: catUpper },
      order: [['key', 'ASC']],
    });

    const result = {};
    settings.forEach((s) => {
      const parts = s.key.split('.');
      const subKey = parts.length > 1 ? parts.slice(1).join('.') : s.key;
      result[subKey] = this.parseValue(s.value, s.dataType);
    });

    return result;
  }

  /**
   * Get setting by exact key
   */
  async getSettingByKey(key) {
    const setting = await Setting.findOne({ where: { key } });
    if (!setting) return null;
    return this.parseValue(setting.value, setting.dataType);
  }

  /**
   * Update or upsert a single setting
   */
  async updateSetting(key, value, user = null) {
    let setting = await Setting.findOne({ where: { key } });
    if (!setting) {
      // Find category and dataType from DEFAULT_SETTINGS if known
      const defaultItem = DEFAULT_SETTINGS.find((d) => d.key === key);
      const category = defaultItem ? defaultItem.category : (key.split('.')[0] || 'GENERAL').toUpperCase();
      const dataType = defaultItem ? defaultItem.dataType : typeof value === 'boolean' ? 'BOOLEAN' : typeof value === 'number' ? 'NUMBER' : 'STRING';

      setting = await Setting.create({
        key,
        value: this.stringifyValue(value, dataType),
        category,
        dataType,
        description: defaultItem ? defaultItem.description : null,
        isPublic: defaultItem ? defaultItem.isPublic : false,
        updatedById: user ? user.id : null,
      });
    } else {
      setting.value = this.stringifyValue(value, setting.dataType);
      if (user) setting.updatedById = user.id;
      await setting.save();
    }

    return {
      key: setting.key,
      value: this.parseValue(setting.value, setting.dataType),
      category: setting.category,
    };
  }

  /**
   * Update all settings in a category
   */
  async updateCategorySettings(category, data, user = null) {
    const catUpper = String(category || '').toUpperCase();
    const catLower = catUpper.toLowerCase();

    return await sequelize.transaction(async (t) => {
      const updatedKeys = [];

      for (const [rawKey, val] of Object.entries(data)) {
        // Support both bare keys like 'businessName' and prefixed keys like 'mandi.businessName'
        const fullKey = rawKey.includes('.') ? rawKey : `${catLower}.${rawKey}`;

        let setting = await Setting.findOne({ where: { key: fullKey }, transaction: t });
        if (!setting) {
          const defaultItem = DEFAULT_SETTINGS.find((d) => d.key === fullKey);
          const dataType = defaultItem ? defaultItem.dataType : typeof val === 'boolean' ? 'BOOLEAN' : typeof val === 'number' ? 'NUMBER' : 'STRING';

          setting = await Setting.create({
            key: fullKey,
            value: this.stringifyValue(val, dataType),
            category: catUpper,
            dataType,
            description: defaultItem ? defaultItem.description : null,
            isPublic: defaultItem ? defaultItem.isPublic : false,
            updatedById: user ? user.id : null,
          }, { transaction: t });
        } else {
          setting.value = this.stringifyValue(val, setting.dataType);
          if (user) setting.updatedById = user.id;
          await setting.save({ transaction: t });
        }

        updatedKeys.push(fullKey);
      }

      return {
        category: catUpper,
        updatedCount: updatedKeys.length,
        updatedKeys,
      };
    });
  }

  /**
   * Update settings across multiple categories in one batch
   */
  async updateAllSettings(data, user = null) {
    return await sequelize.transaction(async (t) => {
      const updatedKeys = [];

      for (const [catOrKey, val] of Object.entries(data)) {
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          // Object format e.g. { mandi: { businessName: '...' } }
          const catUpper = catOrKey.toUpperCase();
          const catLower = catOrKey.toLowerCase();

          for (const [subKey, subVal] of Object.entries(val)) {
            const fullKey = subKey.includes('.') ? subKey : `${catLower}.${subKey}`;
            let setting = await Setting.findOne({ where: { key: fullKey }, transaction: t });

            if (!setting) {
              const defaultItem = DEFAULT_SETTINGS.find((d) => d.key === fullKey);
              const dataType = defaultItem ? defaultItem.dataType : typeof subVal === 'boolean' ? 'BOOLEAN' : typeof subVal === 'number' ? 'NUMBER' : 'STRING';

              setting = await Setting.create({
                key: fullKey,
                value: this.stringifyValue(subVal, dataType),
                category: catUpper,
                dataType,
                description: defaultItem ? defaultItem.description : null,
                isPublic: defaultItem ? defaultItem.isPublic : false,
                updatedById: user ? user.id : null,
              }, { transaction: t });
            } else {
              setting.value = this.stringifyValue(subVal, setting.dataType);
              if (user) setting.updatedById = user.id;
              await setting.save({ transaction: t });
            }
            updatedKeys.push(fullKey);
          }
        } else {
          // Flat key-value format e.g. { 'mandi.businessName': '...' }
          const fullKey = catOrKey;
          let setting = await Setting.findOne({ where: { key: fullKey }, transaction: t });

          if (!setting) {
            const defaultItem = DEFAULT_SETTINGS.find((d) => d.key === fullKey);
            const category = defaultItem ? defaultItem.category : (fullKey.split('.')[0] || 'GENERAL').toUpperCase();
            const dataType = defaultItem ? defaultItem.dataType : typeof val === 'boolean' ? 'BOOLEAN' : typeof val === 'number' ? 'NUMBER' : 'STRING';

            setting = await Setting.create({
              key: fullKey,
              value: this.stringifyValue(val, dataType),
              category,
              dataType,
              description: defaultItem ? defaultItem.description : null,
              isPublic: defaultItem ? defaultItem.isPublic : false,
              updatedById: user ? user.id : null,
            }, { transaction: t });
          } else {
            setting.value = this.stringifyValue(val, setting.dataType);
            if (user) setting.updatedById = user.id;
            await setting.save({ transaction: t });
          }
          updatedKeys.push(fullKey);
        }
      }

      return {
        success: true,
        updatedCount: updatedKeys.length,
        updatedKeys,
      };
    });
  }

  /**
   * Reset a category to default settings
   */
  async resetCategoryToDefault(category, user = null) {
    const catUpper = String(category || '').toUpperCase();
    const defaults = DEFAULT_SETTINGS.filter((d) => d.category === catUpper);

    if (defaults.length === 0) {
      throw new Error(`No default configurations found for category "${category}"`);
    }

    return await sequelize.transaction(async (t) => {
      for (const item of defaults) {
        let setting = await Setting.findOne({ where: { key: item.key }, transaction: t });
        if (!setting) {
          await Setting.create({
            ...item,
            updatedById: user ? user.id : null,
          }, { transaction: t });
        } else {
          setting.value = item.value;
          if (user) setting.updatedById = user.id;
          await setting.save({ transaction: t });
        }
      }

      return {
        success: true,
        category: catUpper,
        resetCount: defaults.length,
      };
    });
  }

  /**
   * Reset all settings to default
   */
  async resetAllToDefault(user = null) {
    return await sequelize.transaction(async (t) => {
      for (const item of DEFAULT_SETTINGS) {
        let setting = await Setting.findOne({ where: { key: item.key }, transaction: t });
        if (!setting) {
          await Setting.create({
            ...item,
            updatedById: user ? user.id : null,
          }, { transaction: t });
        } else {
          setting.value = item.value;
          if (user) setting.updatedById = user.id;
          await setting.save({ transaction: t });
        }
      }

      return {
        success: true,
        resetCount: DEFAULT_SETTINGS.length,
      };
    });
  }
}

module.exports = new SettingService();

