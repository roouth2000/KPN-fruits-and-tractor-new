import { apiClient } from '../modules/sales/services/salesApi';
import type { ReportKpi } from '../pages/reports/types';

export interface ReportResponse<T> {
  kpis: ReportKpi[];
  rows: T[];
  totalGross?: number;
  totalCollected?: number;
  totalDue?: number;
  totalSales?: number;
  totalCrates?: number;
  count?: number;
}

export const reportApi = {
  getDailySales: async (params: any = {}): Promise<ReportResponse<any>> => {
    const res = await apiClient.get('/reports/daily-sales', { params });
    return res.data.data;
  },

  getMonthlySales: async (params: any = {}): Promise<ReportResponse<any>> => {
    const res = await apiClient.get('/reports/monthly-sales', { params });
    return res.data.data;
  },

  getPurchaseReport: async (): Promise<ReportResponse<any>> => {
    const res = await apiClient.get('/reports/purchase');
    return res.data.data;
  },

  getStockReport: async (): Promise<ReportResponse<any>> => {
    const res = await apiClient.get('/reports/stock');
    return res.data.data;
  },

  getProfitReport: async (): Promise<ReportResponse<any>> => {
    const res = await apiClient.get('/reports/profit');
    return res.data.data;
  },

  getLossReport: async (): Promise<ReportResponse<any>> => {
    const res = await apiClient.get('/reports/loss');
    return res.data.data;
  },

  getDamageReport: async (): Promise<ReportResponse<any>> => {
    const res = await apiClient.get('/reports/damage');
    return res.data.data;
  },

  getReturnsReport: async (): Promise<ReportResponse<any>> => {
    const res = await apiClient.get('/reports/returns');
    return res.data.data;
  },

  getCustomerDueReport: async (): Promise<ReportResponse<any>> => {
    const res = await apiClient.get('/reports/customer-due');
    return res.data.data;
  },

  getSupplierDueReport: async (): Promise<ReportResponse<any>> => {
    const res = await apiClient.get('/reports/supplier-due');
    return res.data.data;
  },

  getTrayReport: async (): Promise<ReportResponse<any>> => {
    const res = await apiClient.get('/reports/tray');
    return res.data.data;
  },
};

