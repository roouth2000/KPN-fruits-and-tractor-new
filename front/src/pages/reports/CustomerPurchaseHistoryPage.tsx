import React, { useState, useEffect, useCallback } from 'react';
import { ReportHeader } from './components/ReportHeader';
import { ReportKpis } from './components/ReportKpis';
import {
  UsersIcon,
  PackageIcon,
  ReceiptTextIcon,
  DownloadIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  RefreshCwIcon,
  PlusIcon,
} from '../../components/icons';
import { formatINR } from '../../utils/helpers';
import { reportApi } from '../../services/reportApi';
import { salesApi } from '../../modules/sales/services/salesApi';
import type { Customer } from '../../modules/sales/types/billing';

interface CustomerPurchaseHistoryPageProps {
  initialCustomerId?: number | null;
  onBackToDashboard?: () => void;
  onNavigateBilling?: (customer?: Customer) => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const CustomerPurchaseHistoryPage: React.FC<CustomerPurchaseHistoryPageProps> = ({
  initialCustomerId = null,
  onBackToDashboard,
  onNavigateBilling,
  onShowToast,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(initialCustomerId);
  const [selectedRange, setSelectedRange] = useState<string>('All Time');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'invoices' | 'products' | 'ranking'>('invoices');
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Record<number, boolean>>({});

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [reportData, setReportData] = useState<any>({
    kpis: [],
    invoices: [],
    productBreakdown: [],
    customerSummary: [],
    totalPurchases: 0,
    totalOrders: 0,
    totalPaid: 0,
    totalDue: 0,
  });

  // Load customer directory for the selector dropdown
  useEffect(() => {
    salesApi
      .getAllCustomers()
      .then((res) => setCustomers(res || []))
      .catch((err) => console.error('Failed to load customers:', err));
  }, []);

  // Update selectedCustomerId if initialCustomerId changes
  useEffect(() => {
    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
    }
  }, [initialCustomerId]);

  // Fetch report data based on filters
  const loadReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (selectedCustomerId) {
        params.customerId = selectedCustomerId;
      }
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      // Compute dates based on selectedRange
      const now = new Date();
      if (selectedRange === 'Today') {
        params.startDate = now.toISOString().slice(0, 10);
        params.endDate = now.toISOString().slice(0, 10);
      } else if (selectedRange === 'Yesterday') {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        params.startDate = y.toISOString().slice(0, 10);
        params.endDate = y.toISOString().slice(0, 10);
      } else if (selectedRange === 'Last 7 Days') {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        params.startDate = d.toISOString().slice(0, 10);
        params.endDate = now.toISOString().slice(0, 10);
      } else if (selectedRange === 'This Month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        params.startDate = start.toISOString().slice(0, 10);
        params.endDate = now.toISOString().slice(0, 10);
      } else if (selectedRange === 'Last Month') {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        params.startDate = start.toISOString().slice(0, 10);
        params.endDate = end.toISOString().slice(0, 10);
      }

      const res = await reportApi.getCustomerPurchaseHistory(params);
      if (res) {
        setReportData(res);
      }
    } catch (err: any) {
      console.error('Failed to load customer purchase history:', err);
      onShowToast?.('Failed to Load', 'Could not retrieve customer purchase history.', 'warning');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCustomerId, selectedRange, statusFilter, searchTerm, onShowToast]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Toggle line-item expansion for an invoice
  const toggleInvoiceExpand = (invId: number) => {
    setExpandedInvoiceIds((prev) => ({
      ...prev,
      [invId]: !prev[invId],
    }));
  };

  // Export data as CSV
  const handleExportCSV = () => {
    if (activeTab === 'products') {
      const headers = ['Product Code', 'Fruit Description', 'Variety', 'Grade', 'Total Qty', 'Unit', 'Avg Rate (INR)', 'Total Spent (INR)', 'Orders Count', 'Last Purchase Date'];
      const rows = (reportData.productBreakdown || []).map((p: any) => [
        p.productCode || '',
        `"${p.name}"`,
        `"${p.variety || ''}"`,
        p.grade || 'A',
        p.totalQuantity,
        p.unit || 'BOX',
        p.avgRate,
        p.totalSpent,
        p.orderCount,
        p.lastPurchaseDate || '',
      ]);
      const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
      const uri = encodeURI(csv);
      const link = document.createElement('a');
      link.href = uri;
      link.download = `Customer_Products_Purchased_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ['Invoice Number', 'Date', 'Customer Name', 'Phone', 'Sale Type', 'Grand Total', 'Paid', 'Balance Due', 'Status', 'Items Details'];
      const rows = (reportData.invoices || []).map((inv: any) => {
        const itemSummary = (inv.items || [])
          .map((i: any) => `${i.productName} (${i.quantity} ${i.unit} @ ₹${i.rate})`)
          .join('; ');
        return [
          inv.invoiceNumber,
          inv.invoiceDate,
          `"${inv.customerName}"`,
          inv.customerPhone || '',
          inv.saleType,
          inv.grandTotal,
          inv.paidAmount,
          inv.balanceDue,
          inv.status,
          `"${itemSummary}"`,
        ];
      });
      const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
      const uri = encodeURI(csv);
      const link = document.createElement('a');
      link.href = uri;
      link.download = `Customer_Purchase_History_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    onShowToast?.('Exported', 'Customer purchase history downloaded successfully.', 'success');
  };

  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomerId);

  const getStatusBadge = (status: string, due: number) => {
    if (status === 'CANCELLED') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 line-through">
          CANCELLED
        </span>
      );
    }
    if (status === 'PAID' || due <= 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          ● PAID
        </span>
      );
    }
    if (status === 'PARTIALLY_PAID') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          PARTIAL
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        CREDIT DUE
      </span>
    );
  };

  return (
    <div className="space-y-5 font-sans pb-16">
      {/* Top Header Card with Customer Filter & Time Range Controls */}
      <ReportHeader
        title="Customer-wise Purchase History"
        subtitle="Track purchase transactions, items bought, prices paid, and outstanding balances by customer"
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
        rangeOptions={['All Time', 'Today', 'Yesterday', 'Last 7 Days', 'This Month', 'Last Month']}
        onExport={handleExportCSV}
        onBackToDashboard={onBackToDashboard}
      >
        {/* Customer Selector Dropdown in Header */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedCustomerId || ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : null;
                setSelectedCustomerId(val);
              }}
              className="text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer shadow-2xs"
            >
              <option value="">👥 All Mandi Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.customerCode || c.phone}) · Due: ₹{Number(c.currentDue || 0).toLocaleString('en-IN')}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value="ALL">All Status</option>
            <option value="PAID">Fully Paid</option>
            <option value="CONFIRMED">Credit Due</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
          </select>
        </div>
      </ReportHeader>

      {/* Selected Customer Highlight Card (if filtered to one buyer) */}
      {selectedCustomerObj && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-400 font-bold font-mono">
              <UsersIcon className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{selectedCustomerObj.name}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
                  {selectedCustomerObj.customerCode}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {selectedCustomerObj.customerType}
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-3 mt-1 font-mono">
                <span>📞 {selectedCustomerObj.phone}</span>
                {selectedCustomerObj.city && <span>📍 {selectedCustomerObj.city}</span>}
                {selectedCustomerObj.address && <span className="truncate max-w-xs">{selectedCustomerObj.address}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-6 text-xs">
            <div>
              <div className="text-slate-400 text-[11px]">Sanctioned Credit</div>
              <div className="font-mono font-bold text-slate-200">
                {formatINR(Number(selectedCustomerObj.creditLimit || 0))}
              </div>
            </div>
            <div>
              <div className="text-slate-400 text-[11px]">Current Outstanding</div>
              <div className="font-mono font-bold text-rose-400 text-sm">
                {formatINR(Number(selectedCustomerObj.currentDue || 0))}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-2">
              {onNavigateBilling && (
                <button
                  type="button"
                  onClick={() => onNavigateBilling(selectedCustomerObj)}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>+ Create Bill</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedCustomerId(null)}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-slate-300 text-xs rounded-lg transition-colors cursor-pointer"
                title="View all customers history"
              >
                Clear Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Overview Cards */}
      <ReportKpis kpis={reportData.kpis || []} />

      {/* Navigation Tabs Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-2 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${
              activeTab === 'invoices'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Purchase Invoices ({reportData.invoices?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🍎 Fruit Varieties Bought ({reportData.productBreakdown?.length || 0})
          </button>
          {!selectedCustomerId && (
            <button
              type="button"
              onClick={() => setActiveTab('ranking')}
              className={`px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'ranking'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              👥 Customer Ranking ({reportData.customerSummary?.length || 0})
            </button>
          )}
        </div>

        {/* Search Bar for Table Content */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by invoice # or fruit name..."
            className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: INVOICES & PURCHASE TRANSACTIONS (EXPANDABLE)                      */}
      {/* ========================================================================= */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Detailed Purchase Transactions
            </span>
            <span className="text-slate-400 text-[11px]">
              Click on an invoice to view line-item fruit quantities and rates
            </span>
          </div>

          {isLoading ? (
            <div className="p-16 text-center text-slate-400 space-y-3">
              <RefreshCwIcon className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
              <div className="text-sm font-medium">Loading customer purchase records...</div>
            </div>
          ) : reportData.invoices?.length === 0 ? (
            <div className="p-16 text-center space-y-2 text-slate-400">
              <ReceiptTextIcon className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
              <div className="font-semibold text-slate-700 text-sm">No purchase transactions found</div>
              <p className="text-xs text-slate-500">
                {selectedCustomerObj
                  ? `There are no purchase bills recorded for ${selectedCustomerObj.name} in this date period.`
                  : 'No customer invoices match the applied filter criteria.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3 w-8"></th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Invoice #</th>
                    <th className="py-3 px-4">Customer Details</th>
                    <th className="py-3 px-3">Produce Items Summary</th>
                    <th className="py-3 px-3 text-right">Grand Total</th>
                    <th className="py-3 px-3 text-right">Paid</th>
                    <th className="py-3 px-3 text-right">Balance Due</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.invoices.map((inv: any) => {
                    const isExpanded = !!expandedInvoiceIds[inv.id];
                    const due = parseFloat(inv.balanceDue) || 0;
                    const items = inv.items || [];
                    const itemsSummary = items
                      .map((i: any) => `${i.productName} (${i.quantity} ${i.unit || 'BOX'})`)
                      .join(', ');

                    return (
                      <React.Fragment key={inv.id}>
                        <tr
                          onClick={() => toggleInvoiceExpand(inv.id)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        >
                          {/* Expand chevron */}
                          <td className="py-3 px-3 text-center text-slate-400 group-hover:text-slate-600">
                            {isExpanded ? (
                              <ChevronDownIcon className="w-3.5 h-3.5 text-slate-700" />
                            ) : (
                              <ChevronRightIcon className="w-3.5 h-3.5" />
                            )}
                          </td>

                          {/* Date */}
                          <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                            {inv.invoiceDate}
                          </td>

                          {/* Invoice # */}
                          <td className="py-3 px-3 font-mono font-bold text-slate-900 group-hover:text-emerald-700">
                            {inv.invoiceNumber}
                          </td>

                          {/* Customer Details */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 truncate max-w-[180px]">
                              {inv.customerName}
                            </div>
                            {inv.customerPhone && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                {inv.customerPhone}
                              </div>
                            )}
                          </td>

                          {/* Items Summary */}
                          <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={itemsSummary}>
                            {itemsSummary || '—'}
                          </td>

                          {/* Grand Total */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatINR(inv.grandTotal)}
                          </td>

                          {/* Paid */}
                          <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                            {formatINR(inv.paidAmount)}
                          </td>

                          {/* Balance Due */}
                          <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                            {due > 0 ? (
                              <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                                {formatINR(due)}
                              </span>
                            ) : (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-normal">
                                ₹0.00
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {getStatusBadge(inv.status, due)}
                          </td>

                          {/* 1-Click PDF Download */}
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => salesApi.downloadInvoicePdf(inv.id, inv.invoiceNumber)}
                              title="Download official PDF invoice"
                              className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <DownloadIcon className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>

                        {/* Expandable Line-Items Row */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90 border-b border-slate-200">
                            <td colSpan={10} className="py-3 px-6">
                              <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
                                <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-700">
                                  <span>Invoice #{inv.invoiceNumber} Produce Breakdown ({items.length} Line Items)</span>
                                  <span className="font-mono text-slate-500">Sale Type: {inv.saleType}</span>
                                </div>
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                                      <th className="py-2 px-3">#</th>
                                      <th className="py-2 px-3">Produce / Fruit</th>
                                      <th className="py-2 px-3">Variety</th>
                                      <th className="py-2 px-2 text-center">Grade</th>
                                      <th className="py-2 px-3 text-right">Quantity</th>
                                      <th className="py-2 px-3 text-right">Rate (₹)</th>
                                      <th className="py-2 px-4 text-right">Total Amount (₹)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-mono">
                                    {items.map((it: any, idx: number) => (
                                      <tr key={it.id || idx} className="hover:bg-slate-50/60">
                                        <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                                        <td className="py-2 px-3 font-sans font-bold text-slate-800">
                                          {it.productName}
                                        </td>
                                        <td className="py-2 px-3 font-sans text-slate-600">{it.variety || '—'}</td>
                                        <td className="py-2 px-2 text-center">
                                          <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                                            {it.grade || 'A'}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                                          {it.quantity} {it.unit || 'BOX'}
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-700">
                                          ₹{Number(it.rate).toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-2 px-4 text-right font-extrabold text-slate-900">
                                          ₹{Number(it.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PRODUCT-LEVEL FREQUENCY & VOLUME PURCHASED                         */}
      {/* ========================================================================= */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Produce Varieties Purchased by Customer(s)
            </span>
            <span className="text-slate-400 text-[11px]">
              Ranked by total expenditure and buying volume
            </span>
          </div>

          {reportData.productBreakdown?.length === 0 ? (
            <div className="p-16 text-center text-slate-400 space-y-2">
              <PackageIcon className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
              <div className="font-semibold text-slate-700 text-sm">No produce purchase data</div>
              <p className="text-xs text-slate-500">No items match the selected time range.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Product Code</th>
                    <th className="py-3 px-4">Fruit / Description</th>
                    <th className="py-3 px-4">Variety</th>
                    <th className="py-3 px-3 text-center">Grade</th>
                    <th className="py-3 px-4 text-right">Total Quantity</th>
                    <th className="py-3 px-4 text-right">Average Rate</th>
                    <th className="py-3 px-4 text-right font-bold text-slate-800">Total Spent</th>
                    <th className="py-3 px-4 text-center">Billed in Orders</th>
                    <th className="py-3 px-4 text-center">Last Purchase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {reportData.productBreakdown.map((p: any, idx: number) => (
                    <tr key={p.productId || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-400 text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{p.productCode || '—'}</td>
                      <td className="py-3 px-4 font-sans font-bold text-slate-900">{p.name}</td>
                      <td className="py-3 px-4 font-sans text-slate-600">{p.variety || '—'}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                          {p.grade || 'A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        {p.totalQuantity} {p.unit || 'BOX'}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700">
                        ₹{Number(p.avgRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                        {formatINR(p.totalSpent)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {p.orderCount} Orders
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500 font-sans text-[11px]">
                        {p.lastPurchaseDate || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CUSTOMER RANKING & SUMMARY TABLE                                   */}
      {/* ========================================================================= */}
      {activeTab === 'ranking' && !selectedCustomerId && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Customer Buyer Ranking &amp; Volume Summary
            </span>
            <span className="text-slate-400 text-[11px]">
              Sorted by gross purchases volume
            </span>
          </div>

          {reportData.customerSummary?.length === 0 ? (
            <div className="p-16 text-center text-slate-400 space-y-2">
              <UsersIcon className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
              <div className="font-semibold text-slate-700 text-sm">No customer summary data</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Customer Code</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4 text-center">Total Orders</th>
                    <th className="py-3 px-4 text-right font-bold text-slate-900">Total Purchases</th>
                    <th className="py-3 px-4 text-right">Total Paid</th>
                    <th className="py-3 px-4 text-right">Current Due</th>
                    <th className="py-3 px-4 text-center">Last Purchase</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.customerSummary.map((c: any, idx: number) => (
                    <tr key={c.customerId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.customerCode || '—'}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{c.customerName}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {c.phone} {c.city ? `· ${c.city}` : ''}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        {c.totalOrders}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900">
                        {formatINR(c.totalSpent)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                        {formatINR(c.totalPaid)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                        {formatINR(c.currentDue)}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500 text-[11px]">
                        {c.lastPurchaseDate || '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId(c.customerId);
                            setActiveTab('invoices');
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-all cursor-pointer"
                        >
                          View History
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
