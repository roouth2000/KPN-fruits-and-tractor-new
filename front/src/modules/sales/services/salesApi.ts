import axios from 'axios';
import type {
  Customer,
  CustomerBalanceInfo,
  Product,
  Unit,
  TaxConfig,
  CreateInvoiceResponse,
  Batch,
  Supplier,
} from '../types/billing';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token and active simulation role header
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('finovore_token');
  const activeRole = localStorage.getItem('finovore_role');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (activeRole) {
    config.headers['x-user-role'] = activeRole;
  }
  return config;
});

export const salesApi = {
  // Customer APIs
  searchCustomers: async (q = ''): Promise<Customer[]> => {
    const res = await apiClient.get('/customers/search', { params: { q, limit: 25 } });
    return res.data.data || [];
  },

  getCustomerBalance: async (id: number): Promise<CustomerBalanceInfo> => {
    const res = await apiClient.get(`/customers/${id}/balance`);
    return res.data.data;
  },

  getCustomerLedger: async (id: number, page = 1, limit = 50) => {
    const res = await apiClient.get(`/customers/${id}/ledger`, { params: { page, limit } });
    return res.data.data;
  },

  getAllCustomers: async (): Promise<Customer[]> => {
    const res = await apiClient.get('/customers');
    return res.data.data || [];
  },

  createCustomer: async (data: Partial<Customer>): Promise<Customer> => {
    const res = await apiClient.post('/customers', data);
    return res.data.data;
  },

  // Product APIs
  getAllProducts: async (): Promise<Product[]> => {
    const res = await apiClient.get('/products');
    return res.data.data || [];
  },

  searchProducts: async (q = ''): Promise<Product[]> => {
    const res = await apiClient.get('/products/search', { params: { q, limit: 30 } });
    return res.data.data || [];
  },

  getProductStock: async (id: number) => {
    const res = await apiClient.get(`/products/${id}/stock`);
    return res.data.data;
  },

  addStock: async (payload: {
    productId: number;
    quantity: number;
    supplierId?: number | null;
    purchaseDate?: string;
    batchNumber?: string;
    notes?: string;
    unit?: string;
    purchaseRate?: number;
  }) => {
    const res = await apiClient.post('/products/add-stock', payload);
    return res.data.data;
  },

  getAllBatches: async (status = 'ALL'): Promise<any[]> => {
    const res = await apiClient.get('/products/batches/all', { params: { status } });
    return res.data.data || [];
  },

  getAllBatchAllocations: async (limit = 60): Promise<any[]> => {
    const res = await apiClient.get('/products/batches/allocations', { params: { limit } });
    return res.data.data || [];
  },

  getProductBatches: async (productId: number): Promise<Batch[]> => {
    const res = await apiClient.get(`/products/${productId}/batches`);
    return res.data.data || [];
  },

  updateBatch: async (batchId: number, data: any): Promise<any> => {
    const res = await apiClient.put(`/products/batches/${batchId}`, data);
    return res.data.data;
  },

  deleteBatch: async (batchId: number): Promise<any> => {
    const res = await apiClient.delete(`/products/batches/${batchId}`);
    return res.data.data;
  },

  updateProduct: async (id: number, data: any): Promise<any> => {
    const res = await apiClient.put(`/products/${id}`, data);
    return res.data.data;
  },

  deleteProduct: async (id: number): Promise<any> => {
    const res = await apiClient.delete(`/products/${id}`);
    return res.data.data;
  },

  recalculateProductFIFO: async (productId: number) => {
    const res = await apiClient.post(`/products/${productId}/recalculate-fifo`);
    return res.data.data;
  },

  recalculateAllFIFO: async () => {
    const res = await apiClient.post('/products/recalculate-all-fifo');
    return res.data.data;
  },

  // Supplier APIs
  getSuppliers: async (search = ''): Promise<Supplier[]> => {
    const res = await apiClient.get('/suppliers', { params: { search, limit: 50 } });
    return res.data.data?.rows || res.data.data || [];
  },

  createSupplier: async (data: Partial<Supplier>): Promise<Supplier> => {
    const res = await apiClient.post('/suppliers', data);
    return res.data.data;
  },

  updateSupplier: async (id: number, data: Partial<Supplier>): Promise<Supplier> => {
    const res = await apiClient.put(`/suppliers/${id}`, data);
    return res.data.data;
  },

  deleteSupplier: async (id: number): Promise<any> => {
    const res = await apiClient.delete(`/suppliers/${id}`);
    return res.data.data;
  },

  recordSupplierPayment: async (id: number, data: { amount: number; paymentMode?: string; reference?: string; notes?: string }): Promise<any> => {
    const res = await apiClient.post(`/suppliers/${id}/pay`, data);
    return res.data.data;
  },

  createProduct: async (payload: any) => {
    const res = await apiClient.post('/products', payload);
    return res.data.data;
  },

  getUnits: async (): Promise<Unit[]> => {
    const res = await apiClient.get('/products/units');
    return res.data.data || [];
  },

  getTaxConfigs: async (): Promise<TaxConfig[]> => {
    const res = await apiClient.get('/products/tax-configs');
    return res.data.data || [];
  },

  // Invoice APIs
  getNextInvoiceNumber: async (): Promise<string> => {
    const res = await apiClient.get('/sales/invoices/next-number');
    return res.data.data.nextInvoiceNumber;
  },

  createInvoice: async (payload: any): Promise<CreateInvoiceResponse> => {
    const res = await apiClient.post('/sales/invoices', payload);
    return res.data.data;
  },

  getInvoices: async (params: any = {}) => {
    const res = await apiClient.get('/sales/invoices', { params });
    return res.data.data;
  },

  getInvoiceById: async (id: number | string) => {
    const res = await apiClient.get(`/sales/invoices/${id}`);
    return res.data.data;
  },

  updateInvoice: async (id: number | string, payload: { notes?: string; invoiceDiscount?: number; paymentTerms?: string }) => {
    const res = await apiClient.put(`/sales/invoices/${id}`, payload);
    return res.data.data;
  },

  cancelInvoice: async (id: number | string, reason: string) => {
    const res = await apiClient.post(`/sales/invoices/${id}/cancel`, { reason });
    return res.data;
  },

  // Previous Due Standalone Collection
  collectPreviousDue: async (payload: {
    customerId: number;
    amount: number;
    paymentMode: string;
    transactionRef?: string;
    paymentDate?: string;
    notes?: string;
  }) => {
    const res = await apiClient.post('/customer-payments', payload);
    return res.data.data;
  },

  getInvoicePdfUrl: (id: number | string) => {
    const token = localStorage.getItem('finovore_token') || '';
    const role = localStorage.getItem('finovore_role') || '';
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    if (role) params.set('role', role);
    const qs = params.toString();
    return `${API_BASE_URL}/sales/invoices/${id}/pdf${qs ? `?${qs}` : ''}`;
  },

  /**
   * Download Invoice PDF via authenticated blob to prevent authentication errors
   */
  downloadInvoicePdf: async (id: number | string, invoiceNumber?: string) => {
    const res = await apiClient.get(`/sales/invoices/${id}/pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice-${invoiceNumber || id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Open Invoice PDF in a new browser tab via authenticated blob
   */
  openInvoicePdf: async (id: number | string) => {
    const res = await apiClient.get(`/sales/invoices/${id}/pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
  },
};

