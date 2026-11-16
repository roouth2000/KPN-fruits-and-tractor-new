import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  expenseApi,
  type ExpenseItem,
  type CreateExpenseInput,
} from '../services/expenseApi';
import { formatINR } from '../utils/helpers';
import {
  PlusIcon,
  SearchIcon,
  RupeeIcon,
  Trash2Icon,
  EditIcon,
  DownloadIcon,
  XIcon,
  CheckIcon,
  RefreshCwIcon,
} from '../components/icons';

interface ExpenseManagementPageProps {
  onBackToDashboard?: () => void;
  onShowToast: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

const CATEGORY_META: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  FREIGHT_TRANSPORT: {
    label: 'Inward Freight / Transport',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    icon: '🚚',
  },
  LABOR_HAMALI: {
    label: 'Dock Labor (Hamali)',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: '👷',
  },
  COLD_STORAGE: {
    label: 'Cold Chamber & Electricity',
    bg: 'bg-cyan-50',
    text: 'text-cyan-800',
    border: 'border-cyan-200',
    icon: '❄️',
  },
  MARKET_CESS: {
    label: 'Mandi Tax / Cess / Market Fees',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    icon: '🏛️',
  },
  PACKAGING: {
    label: 'Packaging / Crates / Materials',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: '📦',
  },
  SHOP_EXPENSE: {
    label: 'Tea, Refreshments & Allowance',
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
    icon: '☕',
  },
  RENT_MAINTENANCE: {
    label: 'Stall Rent & Maintenance',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    icon: '🏢',
  },
  MISCELLANEOUS: {
    label: 'Other Operating Expense',
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-200',
    icon: '📝',
  },
};

export const ExpenseManagementPage: React.FC<ExpenseManagementPageProps> = ({
  onBackToDashboard,
  onShowToast,
}) => {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [cancelExpenseTarget, setCancelExpenseTarget] = useState<ExpenseItem | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('month');

  // Summary Metrics
  const [todayTotal, setTodayTotal] = useState<number>(0);
  const [monthTotal, setMonthTotal] = useState<number>(0);
  const [filteredTotal, setFilteredTotal] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, number>>({});
  const [categoriesMap, setCategoriesMap] = useState<Record<string, string>>({});

  // Form State
  const [formDate, setFormDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [formCategory, setFormCategory] = useState<string>('FREIGHT_TRANSPORT');
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);
  const [customCategoryName, setCustomCategoryName] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formPaymentMode, setFormPaymentMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
  const [formPaidTo, setFormPaidTo] = useState<string>('');
  const [formReferenceNumber, setFormReferenceNumber] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      let startDate: string | undefined = undefined;
      let endDate: string | undefined = undefined;

      if (dateRange === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        startDate = todayStr;
        endDate = todayStr;
      } else if (dateRange === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        startDate = d.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
      } else if (dateRange === 'month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = firstDay.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
      }

      const params: any = {
        category: selectedCategory,
        paymentMode: selectedPaymentMode,
        search: searchTerm,
      };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await expenseApi.getExpenses(params);
      setExpenses(res.expenses || []);
      setTodayTotal(res.todayTotal || 0);
      setMonthTotal(res.monthTotal || 0);
      setFilteredTotal(res.filteredTotal || 0);
      setTotalCount(res.totalCount || 0);
      setCategoryBreakdown(res.categoryBreakdown || {});
      if (res.categories) {
        setCategoriesMap(res.categories);
      }
    } catch (err: any) {
      console.error('Failed to load expenses:', err);
      onShowToast('Error', 'Failed to load expense ledger records', 'warning');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, selectedCategory, selectedPaymentMode, searchTerm, onShowToast]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleOpenModal = () => {
    setEditingExpense(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormCategory('FREIGHT_TRANSPORT');
    setIsCustomCategory(false);
    setCustomCategoryName('');
    setFormAmount('');
    setFormPaymentMode('CASH');
    setFormPaidTo('');
    setFormReferenceNumber('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleEditExpense = (item: ExpenseItem) => {
    setEditingExpense(item);
    setFormDate(item.date);
    if (CATEGORY_META[item.category]) {
      setFormCategory(item.category);
      setIsCustomCategory(false);
      setCustomCategoryName('');
    } else {
      setIsCustomCategory(true);
      setCustomCategoryName(item.categoryLabel || item.category);
    }
    setFormAmount(String(item.amount));
    setFormPaymentMode(item.paymentMode);
    setFormPaidTo(item.paidTo || '');
    setFormReferenceNumber(item.referenceNumber || '');
    setFormNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(formAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      onShowToast('Validation Error', 'Please enter a valid expense amount greater than 0', 'warning');
      return;
    }

    if (isCustomCategory && !customCategoryName.trim()) {
      onShowToast('Validation Error', 'Please enter a name for the custom category', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateExpenseInput = {
        date: formDate,
        category: isCustomCategory ? customCategoryName.trim() : formCategory,
        categoryLabel: isCustomCategory ? customCategoryName.trim() : undefined,
        amount: parsedAmount,
        paymentMode: formPaymentMode,
        paidTo: formPaidTo.trim() || undefined,
        referenceNumber: formReferenceNumber.trim() || undefined,
        notes: formNotes.trim() || undefined,
      };

      if (editingExpense) {
        const updated = await expenseApi.updateExpense(editingExpense.id, payload);
        onShowToast(
          'Expense Updated',
          `Successfully updated ${updated.expenseNumber} for ${formatINR(parsedAmount)}`,
          'success'
        );
      } else {
        const created = await expenseApi.createExpense(payload);
        onShowToast(
          'Expense Recorded',
          `Successfully logged ${created.expenseNumber} for ${formatINR(parsedAmount)}`,
          'success'
        );
      }

      setIsModalOpen(false);
      setEditingExpense(null);
      await fetchExpenses();
    } catch (err: any) {
      console.error('Failed to save expense:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to save expense';
      onShowToast('Error', msg, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelExpense = async () => {
    if (!cancelExpenseTarget) return;
    setIsSubmitting(true);
    try {
      await expenseApi.cancelExpense(cancelExpenseTarget.id);
      onShowToast(
        'Expense Cancelled',
        `Voided expense entry ${cancelExpenseTarget.expenseNumber}`,
        'info'
      );
      setCancelExpenseTarget(null);
      await fetchExpenses();
    } catch (err: any) {
      console.error('Failed to cancel expense:', err);
      onShowToast('Error', err.response?.data?.message || 'Failed to void expense', 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Find top spending category in current view
  const topCategory = useMemo(() => {
    const entries = Object.entries(categoryBreakdown);
    if (!entries.length) return null;
    entries.sort((a, b) => b[1] - a[1]);
    const [topCat, amount] = entries[0];
    const meta = CATEGORY_META[topCat] || { label: topCat, icon: '🏷️' };
    return { name: meta.label, icon: meta.icon, amount };
  }, [categoryBreakdown]);

  // Export CSV
  const handleExportCSV = () => {
    if (!expenses.length) {
      onShowToast('Notice', 'No expense records available to export', 'info');
      return;
    }

    const headers = ['Expense #', 'Date', 'Category', 'Paid To', 'Payment Mode', 'Ref / Voucher', 'Notes', 'Amount (INR)'];
    const rows = expenses.map((e) => [
      `"${e.expenseNumber}"`,
      `"${e.date}"`,
      `"${e.categoryLabel || e.category}"`,
      `"${e.paidTo || '-'}"`,
      `"${e.paymentMode}"`,
      `"${e.referenceNumber || '-'}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
      e.amount,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Expense_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Export Complete', 'Expense report downloaded as CSV', 'success');
  };

  return (
    <div className="space-y-5 pb-12 max-w-7xl mx-auto">
      {/* 1. Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
              <RupeeIcon className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              APMC Expense Management
            </h1>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Record and reconcile mandi terminal expenses, inward transport freight, dock hamali, cold chamber electricity, and packaging costs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <span>← Dashboard</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <DownloadIcon className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs hover:shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <PlusIcon className="w-4 h-4 text-white stroke-[2.5]" />
            <span>+ Add Expense</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Today's Expenses</span>
            <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded border border-rose-100">
              Daily Outflow
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {formatINR(todayTotal)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Recorded dockside & transit costs today
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>This Month</span>
            <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded">
              Current Month
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {formatINR(monthTotal)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Cumulative operating expenses
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Top Cost Center</span>
            <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-100">
              Primary Outflow
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 truncate">
            {topCategory ? (
              <>
                <span className="text-base">{topCategory.icon}</span>
                <span className="text-base font-bold text-slate-800 truncate">
                  {topCategory.name}
                </span>
              </>
            ) : (
              <span className="text-base font-bold text-slate-400">No records</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            {topCategory ? `Total: ${formatINR(topCategory.amount)}` : 'Awaiting entries'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Filtered Total</span>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-100">
              {totalCount} Vouchers
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {formatINR(filteredTotal)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Sum of current table filter criteria
          </p>
        </div>
      </div>

      {/* 3. Filters and Search Control Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Date Presets */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold text-slate-600">
          {(['today', 'week', 'month', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-3 py-1.5 rounded-md transition-all capitalize cursor-pointer ${
                dateRange === r
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {r === 'all' ? 'All Time' : r === 'today' ? 'Today' : r === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>

        {/* Filter Dropdowns & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">All Categories</option>
            {Object.entries({
              ...Object.fromEntries(
                Object.entries(CATEGORY_META).map(([k, v]) => [k, v.label])
              ),
              ...categoriesMap,
            }).map(([key, label]) => {
              const meta = CATEGORY_META[key];
              const icon = meta?.icon || '🏷️';
              return (
                <option key={key} value={key}>
                  {icon} {label}
                </option>
              );
            })}
          </select>

          {/* Payment Mode */}
          <select
            value={selectedPaymentMode}
            onChange={(e) => setSelectedPaymentMode(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">All Payment Modes</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI / GPay / QR</option>
            <option value="BANK_TRANSFER">Bank Transfer (NEFT)</option>
            <option value="CHEQUE">Cheque</option>
          </select>

          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <SearchIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by ref, payee, notes..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => fetchExpenses()}
            title="Refresh Ledger"
            className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 cursor-pointer"
          >
            <RefreshCwIcon className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4. Expense Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">Expense Vouchers & Disbursals</h2>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {expenses.length} entries
            </span>
          </div>

          {filteredTotal > 0 && (
            <div className="text-xs font-bold text-slate-700">
              Total Outflow: <span className="font-mono text-rose-600 font-extrabold">{formatINR(filteredTotal)}</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Voucher #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Paid To / Payee</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Ref / Slip #</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCwIcon className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>Fetching live expense ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="max-w-xs mx-auto text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-lg">
                        🧾
                      </div>
                      <p className="text-sm font-bold text-slate-800">No expenses found</p>
                      <p className="text-xs text-slate-400">
                        No expense records match your selected range or filter criteria.
                      </p>
                      <button
                        onClick={handleOpenModal}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <PlusIcon className="w-3.5 h-3.5" />
                        <span>Record Expense</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((item) => {
                  const meta = CATEGORY_META[item.category] || {
                    label: item.categoryLabel || item.category,
                    bg: 'bg-slate-100',
                    text: 'text-slate-700',
                    border: 'border-slate-200',
                    icon: '📝',
                  };

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {item.expenseNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {item.date}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${meta.bg} ${meta.text} ${meta.border}`}
                        >
                          <span>{meta.icon}</span>
                          <span>{meta.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {item.paidTo ? (
                          <span className="truncate block max-w-[180px]">{item.paidTo}</span>
                        ) : (
                          <span className="text-slate-300 italic">Self / APMC Dock</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.paymentMode === 'CASH'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.paymentMode === 'UPI'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : item.paymentMode === 'BANK_TRANSFER'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {item.paymentMode}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {item.referenceNumber || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px] max-w-[200px] truncate">
                        {item.notes || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 text-sm whitespace-nowrap">
                        {formatINR(parseFloat(String(item.amount)))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditExpense(item)}
                            title="Edit Expense Voucher"
                            className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-all cursor-pointer"
                          >
                            <EditIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setCancelExpenseTarget(item)}
                            title="Void / Cancel Voucher"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                          >
                            <Trash2Icon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${editingExpense ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {editingExpense ? <EditIcon className="w-4 h-4" /> : <RupeeIcon className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingExpense ? `Edit Expense: ${editingExpense.expenseNumber}` : 'Record Operating Expense'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingExpense ? 'Update amount, category, payment mode, payee, or notes' : 'Mandi terminal, transit, labor, or cold chain disbursal'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingExpense(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveExpense} className="p-6 space-y-4 overflow-y-auto">
              {/* Category Dropdown Select Input & Create Option */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="expense-category-select" className="text-xs font-bold text-slate-700">
                    Expense Category <span className="text-rose-500">*</span>
                  </label>
                  {!isCustomCategory ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCategory(true);
                        setCustomCategoryName('');
                      }}
                      className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer"
                    >
                      + Create Custom Category
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCategory(false);
                        setFormCategory('FREIGHT_TRANSPORT');
                      }}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      ← Choose from List
                    </button>
                  )}
                </div>

                {!isCustomCategory ? (
                  <div className="relative">
                    <select
                      id="expense-category-select"
                      required
                      value={formCategory}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsCustomCategory(true);
                          setCustomCategoryName('');
                        } else {
                          setFormCategory(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium cursor-pointer focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="" disabled>-- Select Expense Category --</option>
                      {Object.entries({
                        ...Object.fromEntries(
                          Object.entries(CATEGORY_META).map(([k, v]) => [k, v.label])
                        ),
                        ...categoriesMap,
                      }).map(([key, label]) => {
                        const meta = CATEGORY_META[key];
                        const icon = meta?.icon || '🏷️';
                        return (
                          <option key={key} value={key}>
                            {icon} {label}
                          </option>
                        );
                      })}
                      <option value="__NEW__">➕ + Create New Category...</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        autoFocus
                        value={customCategoryName}
                        onChange={(e) => setCustomCategoryName(e.target.value)}
                        placeholder="e.g. Weighbridge / Kanta Charges, Ice Slush..."
                        className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Enter the custom category name. It will be recorded and added to your categories.
                    </p>
                  </div>
                )}
              </div>

              {/* Amount and Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold text-base focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1 mt-1.5">
                    {[500, 1000, 2000, 5000].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setFormAmount(String((parseFloat(formAmount) || 0) + val))}
                        className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                      >
                        +{val}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Disbursal Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-medium focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Payment Mode Pills */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Payment Mode
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'CASH', label: 'Cash' },
                      { id: 'UPI', label: 'UPI / QR' },
                      { id: 'BANK_TRANSFER', label: 'NEFT / Bank' },
                      { id: 'CHEQUE', label: 'Cheque' },
                    ] as const
                  ).map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setFormPaymentMode(m.id)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold text-center border transition-all cursor-pointer ${
                        formPaymentMode === m.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paid To & Reference Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Paid To / Vendor / Driver
                  </label>
                  <input
                    type="text"
                    value={formPaidTo}
                    onChange={(e) => setFormPaidTo(e.target.value)}
                    placeholder="e.g. Ramesh Transporter, Hamali Toli"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Voucher / LR / Transaction #
                  </label>
                  <input
                    type="text"
                    value={formReferenceNumber}
                    onChange={(e) => setFormReferenceNumber(e.target.value)}
                    placeholder="e.g. LR-4491, UTR-881290"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-mono focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Notes / Narration */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Narration / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Detail goods lot, vehicle number, or mandi bay reference..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingExpense(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs hover:shadow transition-all cursor-pointer active:scale-95"
                >
                  {isSubmitting ? (
                    <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckIcon className="w-3.5 h-3.5" />
                  )}
                  <span>{editingExpense ? 'Update Expense' : 'Save Expense'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Cancel / Void Confirmation Dialog */}
      {cancelExpenseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                <Trash2Icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Void Expense Entry?</h4>
                <p className="text-xs text-slate-500">
                  {cancelExpenseTarget.expenseNumber} · {formatINR(parseFloat(String(cancelExpenseTarget.amount)))}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel this expense entry? This will reverse the outflow from today's ledger calculation.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelExpenseTarget(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg cursor-pointer"
              >
                Keep Record
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCancelExpense}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Voiding...' : 'Yes, Void Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
