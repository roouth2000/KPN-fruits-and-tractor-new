import { apiClient } from '../modules/sales/services/salesApi';

export interface SupplierItem {
  id: number;
  supplierCode: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  address?: string;
  gstin?: string;
  currentDue: number;
  outstandingTrays: number;
  isActive: boolean;
}

export const supplierApi = {
  getSuppliers: async (params: any = {}) => {
    const res = await apiClient.get('/suppliers', { params });
    return res.data.data;
  },

  getSupplierById: async (id: number | string) => {
    const res = await apiClient.get(`/suppliers/${id}`);
    return res.data.data;
  },

  createSupplier: async (data: Partial<SupplierItem>) => {
    const res = await apiClient.post('/suppliers', data);
    return res.data.data;
  },

  recordPayment: async (id: number | string, data: { amount: number; paymentMode?: string; reference?: string; notes?: string }) => {
    const res = await apiClient.post(`/suppliers/${id}/pay`, data);
    return res.data.data;
  },

  recordInwardPurchase: async (data: { supplierId: number; productId: number; quantity: number; rate: number; poNumber?: string; notes?: string }) => {
    const res = await apiClient.post('/suppliers/inward-purchase', data);
    return res.data.data;
  },
};

