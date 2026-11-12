import { apiClient } from '../modules/sales/services/salesApi';

export interface TodaySummaryData {
  todaySummary: {
    sales: number;
    collection: number;
    due: number;
    purchase: number;
    invoicesCount: number;
  };
  assetSummary: {
    stockValue: number;
    customerDue: number;
    supplierDue: number;
    trayWithCustomers: number;
  };
}

export interface FinancialMetricItem {
  id: string;
  label: string;
  amount: number;
  sub: string;
  change: string;
  type: 'positive' | 'negative' | 'neutral';
}

export interface DamagedFruitItem {
  id: number;
  name: string;
  quantity: string;
  lossAmount: number;
  reason: string;
  date: string;
}

export interface ReturnedFruitItem {
  id: number;
  name: string;
  quantity: string;
  customer: string;
  reason: string;
  refundAmount: number;
  date: string;
}

export interface LowStockFruitItem {
  id: number;
  name: string;
  currentStock: string;
  minStock: string;
  status: string;
  reorderQty: string;
}

export interface FruitHealthData {
  damagedFruits: DamagedFruitItem[];
  returnedFruits: ReturnedFruitItem[];
  lowStockFruits: LowStockFruitItem[];
}

export interface TopFruitItem {
  id: number;
  name: string;
  cratesSold: number;
  revenue: number;
  trend: string;
}

export interface TopCustomerItem {
  id: number;
  name: string;
  ordersCount: number;
  totalValue: number;
  status: string;
}

export interface TopPerformersData {
  topFruits: TopFruitItem[];
  topCustomers: TopCustomerItem[];
}

export interface PendingCustomerDueItem {
  id: number;
  name: string;
  phone: string;
  dueAmount: number;
  outstandingTrays: number;
  creditLimit: number;
}

export interface PendingSupplierPayableItem {
  id: number;
  name: string;
  phone: string;
  dueAmount: number;
  outstandingTrays: number;
  city: string;
}

export interface PendingDuesData {
  pendingCustomers: PendingCustomerDueItem[];
  pendingSuppliers: PendingSupplierPayableItem[];
}

export const dashboardApi = {
  getSummary: async (date?: string): Promise<TodaySummaryData> => {
    const res = await apiClient.get('/dashboard/summary', { params: { date } });
    return res.data.data;
  },

  getFinancialMetrics: async (): Promise<FinancialMetricItem[]> => {
    const res = await apiClient.get('/dashboard/financial-metrics');
    return res.data.data;
  },

  getFruitHealth: async (): Promise<FruitHealthData> => {
    const res = await apiClient.get('/dashboard/fruit-health');
    return res.data.data;
  },

  getTopPerformers: async (): Promise<TopPerformersData> => {
    const res = await apiClient.get('/dashboard/top-performers');
    return res.data.data;
  },

  getPendingDues: async (): Promise<PendingDuesData> => {
    const res = await apiClient.get('/dashboard/pending-dues');
    return res.data.data;
  },
};

