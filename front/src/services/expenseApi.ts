import { apiClient } from '../modules/sales/services/salesApi';

export interface ExpenseItem {
  id: number;
  expenseNumber: string;
  date: string;
  category: string;
  categoryLabel: string;
  amount: number | string;
  paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
  referenceNumber?: string | null;
  paidTo?: string | null;
  notes?: string | null;
  status: 'ACTIVE' | 'CANCELLED';
  creator?: {
    id: number;
    name: string;
    username: string;
  };
  createdAt: string;
}

export interface CreateExpenseInput {
  date?: string;
  category: string;
  categoryLabel?: string;
  amount: number;
  paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
  referenceNumber?: string;
  paidTo?: string;
  notes?: string;
}

export interface ExpenseListResponse {
  expenses: ExpenseItem[];
  totalCount: number;
  filteredTotal: number;
  todayTotal: number;
  monthTotal: number;
  categoryBreakdown: Record<string, number>;
  categories: Record<string, string>;
}

export interface ExpenseSummaryResponse {
  todayTotal: number;
  monthTotal: number;
  categorySummary: Record<string, number>;
  paymentModeSummary: Record<string, number>;
  categories: Record<string, string>;
}

export const expenseApi = {
  getExpenses: async (params: any = {}): Promise<ExpenseListResponse> => {
    const res = await apiClient.get('/expenses', { params });
    return res.data.data;
  },

  createExpense: async (data: CreateExpenseInput): Promise<ExpenseItem> => {
    const res = await apiClient.post('/expenses', data);
    return res.data.data;
  },

  updateExpense: async (id: number, data: Partial<CreateExpenseInput>): Promise<ExpenseItem> => {
    const res = await apiClient.put(`/expenses/${id}`, data);
    return res.data.data;
  },

  getSummary: async (): Promise<ExpenseSummaryResponse> => {
    const res = await apiClient.get('/expenses/summary');
    return res.data.data;
  },

  cancelExpense: async (id: number): Promise<ExpenseItem> => {
    const res = await apiClient.delete(`/expenses/${id}`);
    return res.data.data;
  },
};
