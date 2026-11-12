import { apiClient } from '../modules/sales/services/salesApi';

export interface MandiSettings {
  businessName: string;
  licenseNo: string;
  yardBay: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string;
}

export interface BillingSettings {
  invoicePrefix: string;
  printLayout: string;
  autoPrintOnConfirm: boolean;
  roundOffCash: boolean;
  defaultPaymentMethod: string;
  creditGraceDays: string | number;
  notesFooter: string;
}

export interface ApmcSettings {
  marketCessRate: string | number;
  hamaliPerCrate: string | number;
  weighingChargePerBatch: string | number;
  enableGst: boolean;
  defaultGstRate: string | number;
}

export interface InventorySettings {
  lowStockThreshold: string | number;
  traySecurityDeposit: string | number;
  allowNegativeStock: boolean;
  autoAlertExpiry: boolean;
}

export interface SystemSettingsGrouped {
  mandi: MandiSettings;
  billing: BillingSettings;
  apmc: ApmcSettings;
  inventory: InventorySettings;
  printer: Record<string, any>;
}

export interface SettingsResponse {
  grouped: SystemSettingsGrouped;
  flat: Record<string, any>;
  raw: any[];
}

export const settingApi = {
  getAllSettings: async (): Promise<SettingsResponse> => {
    const res = await apiClient.get('/settings');
    return res.data.data;
  },

  getPublicSettings: async (): Promise<Record<string, any>> => {
    const res = await apiClient.get('/settings/public');
    return res.data.data;
  },

  getCategorySettings: async (category: string): Promise<Record<string, any>> => {
    const res = await apiClient.get(`/settings/category/${category}`);
    return res.data.data;
  },

  updateAllSettings: async (data: Partial<SystemSettingsGrouped> | Record<string, any>): Promise<any> => {
    const res = await apiClient.put('/settings', data);
    return res.data.data;
  },

  updateCategorySettings: async (category: string, data: Record<string, any>): Promise<any> => {
    const res = await apiClient.put(`/settings/category/${category}`, data);
    return res.data.data;
  },

  updateSingleSetting: async (key: string, value: any): Promise<any> => {
    const res = await apiClient.put(`/settings/key/${key}`, { value });
    return res.data.data;
  },

  resetCategory: async (category: string): Promise<any> => {
    const res = await apiClient.post(`/settings/reset/${category}`);
    return res.data.data;
  },

  resetAll: async (): Promise<any> => {
    const res = await apiClient.post('/settings/reset');
    return res.data.data;
  },
};

