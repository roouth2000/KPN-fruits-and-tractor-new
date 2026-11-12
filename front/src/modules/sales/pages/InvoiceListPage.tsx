import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  SearchIcon,
  DownloadIcon,
  PrinterIcon,
  PlusIcon,
  DollarSignIcon,
  RefreshCwIcon,
  EyeIcon,
  EditIcon,
  Trash2Icon,
  ReceiptTextIcon,
  XIcon,
} from '../../../components/icons';
import { salesApi } from '../services/salesApi';
import { useAuth } from '../../../context/AuthContext';
import { InvoicePreview } from '../components/InvoicePreview';
import { qzTrayService } from '../../../services/qzTrayService';
import { PrinterSettingsModal } from '../../../components/PrinterSettingsModal';

interface InvoiceListPageProps {
  onNavigateNewBill: () => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const InvoiceListPage: React.FC<InvoiceListPageProps> = ({
  onNavigateNewBill,
  onShowToast,
}) => {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('sales.edit');
  const canCancel = hasPermission('sales.cancel');

  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Selected invoice for preview modal
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState<boolean>(false);
  const [printingId, setPrintingId] = useState<number | null>(null);

  // 1-Click Silent Print via QZ Tray
  const handleDirectPrintInvoice = async (inv: any) => {
    setPrintingId(inv.id);
    try {
      const full = await salesApi.getInvoiceById(inv.id);
      const res = await qzTrayService.printInvoice(full || inv);
      if (res.method === 'QZ_TRAY') {
        onShowToast?.(
          'Receipt Printed via QZ Tray',
          `Invoice #${inv.invoiceNumber} sent silently to ${res.printer}.`,
          'success'
        );
      } else {
        onShowToast?.('Browser Print Opened', `Printed #${inv.invoiceNumber} via Browser Print Dialog.`, 'info');
      }
    } catch (err: any) {
      onShowToast?.('Print Failed', err?.message || 'Error printing invoice', 'warning');
    } finally {
      setPrintingId(null);
    }
  };

  // Cancel dialog state
  const [cancelModalInvoice, setCancelModalInvoice] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Customer request / Bill correction');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  const onShowToastRef = useRef(onShowToast);
  useEffect(() => {
    onShowToastRef.current = onShowToast;
  }, [onShowToast]);

  const isFetchingRef = useRef(false);

  const fetchInvoices = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setIsLoading(true);
      const params: any = {
        page,
        limit: 15,
      };
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      const res = await salesApi.getInvoices(params);
      if (res) {
        setInvoices(res.invoices || []);
        setTotalCount(res.total || 0);
        setTotalPages(res.totalPages || 1);
      }
    } catch (err: any) {
      console.error('Failed to load invoices:', err);
      onShowToastRef.current?.('Error', 'Failed to retrieve invoices from server', 'warning');
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [page, searchTerm, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Financial aggregates calculation
  const totalSales = invoices.reduce((acc, curr) => acc + (Number(curr.grandTotal) || 0), 0);
  const totalPaid = invoices.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);
  const totalDue = invoices.reduce((acc, curr) => acc + (Number(curr.balanceDue) || 0), 0);
  const pendingInvoicesCount = invoices.filter((inv) => Number(inv.balanceDue) > 0 && inv.status !== 'CANCELLED').length;

  const handleOpenPreview = async (inv: any) => {
    try {
      // Fetch full details if needed
      const full = await salesApi.getInvoiceById(inv.id);
      setSelectedInvoice(full || inv);
    } catch {
      setSelectedInvoice(inv);
    }
    setIsPreviewOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalInvoice) return;
    try {
      setIsCancelling(true);
      await salesApi.cancelInvoice(cancelModalInvoice.id, cancelReason);
      if (onShowToast) {
        onShowToast(
          'Invoice Voided',
          `Invoice #${cancelModalInvoice.invoiceNumber} was cancelled and inventory reversed.`,
          'info'
        );
      }
      setCancelModalInvoice(null);
      fetchInvoices();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to cancel invoice';
      if (onShowToast) {
        onShowToast('Cancellation Error', msg, 'warning');
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const handleExportCSV = () => {
    if (invoices.length === 0) return;
    const headers = ['Invoice Number', 'Date', 'Customer', 'Sale Type', 'Status', 'Grand Total', 'Paid Amount', 'Balance Due'];
    const rows = invoices.map((i) => [
      i.invoiceNumber,
      i.invoiceDate,
      `"${i.customerName}"`,
      i.saleType,
      i.status,
      i.grandTotal,
      i.paidAmount,
      i.balanceDue,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Finovore_Invoices_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onShowToast) {
      onShowToast('Exported', 'Invoices exported to CSV successfully.', 'success');
    }
  };

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
          PARTIAL DUE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        CREDIT DUE
      </span>
    );
  };

  const getSaleTypeBadge = (saleType: string) => {
    switch (saleType) {
      case 'WHOLESALE':
        return <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">Wholesale</span>;
      case 'CASH':
        return <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Cash Counter</span>;
      case 'CREDIT':
        return <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Credit Memo</span>;
      default:
        return <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{saleType}</span>;
    }
  };

  return (
    <div className="space-y-5 pb-12 font-sans">
      {/* Top Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200/60">
              <ReceiptTextIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sales Invoices & Bills</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Browse sales bills, monitor payment settlements, reprint vouchers, and inspect customer ledger impacts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchInvoices()}
            title="Refresh Invoices"
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCwIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsPrinterModalOpen(true)}
            title="Configure Thermal Printer & QZ Tray"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all shadow-2xs cursor-pointer"
          >
            <PrinterIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>Thermal Printer</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all shadow-2xs cursor-pointer"
          >
            <DownloadIcon className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onNavigateNewBill}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <PlusIcon className="w-4 h-4 text-white" />
            <span>+ Create New Bill (F8)</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Bills Recorded</span>
            <ReceiptTextIcon className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {totalCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Across all mandi customer accounts</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Gross Sales Volume</span>
            <DollarSignIcon className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2 font-mono">
            ₹{totalSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1">
            Sum of current page invoices
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Collections Received</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            ₹{totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Cash, UPI & Bank settlements
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200/80 bg-rose-50/20 shadow-xs">
          <div className="flex items-center justify-between text-xs text-rose-700 font-medium">
            <span>Pending Balance Due</span>
            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
              {pendingInvoicesCount} Pending
            </span>
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-2 font-mono">
            ₹{totalDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-rose-600 mt-1">
            Outstanding receivables from customers
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[260px]">
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search by invoice # (e.g. INV-2026-000001) or customer name..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/60 text-xs">
          <button
            onClick={() => {
              setStatusFilter('ALL');
              setPage(1);
            }}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              statusFilter === 'ALL' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Bills
          </button>
          <button
            onClick={() => {
              setStatusFilter('PAID');
              setPage(1);
            }}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              statusFilter === 'PAID' ? 'bg-white text-emerald-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Paid
          </button>
          <button
            onClick={() => {
              setStatusFilter('PARTIALLY_PAID');
              setPage(1);
            }}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              statusFilter === 'PARTIALLY_PAID' ? 'bg-white text-amber-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Partially Paid
          </button>
          <button
            onClick={() => {
              setStatusFilter('CONFIRMED');
              setPage(1);
            }}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              statusFilter === 'CONFIRMED' ? 'bg-white text-blue-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Credit / Due
          </button>
          <button
            onClick={() => {
              setStatusFilter('CANCELLED');
              setPage(1);
            }}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              statusFilter === 'CANCELLED' ? 'bg-white text-slate-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cancelled
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCwIcon className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
            <div className="text-sm font-medium">Loading sales invoices from finovore database...</div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <ReceiptTextIcon className="w-6 h-6" />
            </div>
            <div className="text-base font-semibold text-slate-800">No invoices found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'ALL'
                ? 'No invoices match the specified search query or status filter.'
                : 'There are no sales bills generated yet. Click "+ Create New Bill" to create your first wholesale invoice.'}
            </p>
            <button
              onClick={onNavigateNewBill}
              className="inline-flex items-center gap-1.5 px-4 py-2 mt-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Go to Billing Counter</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Sale Type</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Trays</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const due = Number(inv.balanceDue) || 0;
                  const total = Number(inv.grandTotal) || 0;
                  const paid = Number(inv.paidAmount) || 0;

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/90 transition-colors group cursor-pointer"
                      onClick={() => handleOpenPreview(inv)}
                    >
                      {/* Invoice Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 group-hover:text-emerald-700">
                        <div className="flex items-center gap-1.5">
                          <span>{inv.invoiceNumber}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {inv.invoiceDate}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 truncate max-w-[200px]">
                          {inv.customerName}
                        </div>
                        {inv.customerPhone && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            {inv.customerPhone}
                          </div>
                        )}
                      </td>

                      {/* Sale Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getSaleTypeBadge(inv.saleType)}
                      </td>

                      {/* Grand Total */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-700">
                        ₹{paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Balance Due */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                        {due > 0 ? (
                          <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                            ₹{due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-normal">
                            ₹0.00
                          </span>
                        )}
                      </td>

                      {/* Trays */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        {inv.trayIssued > 0 || inv.trayReturned > 0 ? (
                          <span className="text-[11px] text-slate-700 font-semibold">
                            +{inv.trayIssued} / -{inv.trayReturned}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {getStatusBadge(inv.status, due)}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View details / Print */}
                          <button
                            onClick={() => handleOpenPreview(inv)}
                            title="View Full Bill & Print Receipt"
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                          >
                            <EyeIcon className="w-3.5 h-3.5" />
                          </button>

                          {/* 1-Click Direct Thermal Print via QZ Tray */}
                          <button
                            onClick={() => handleDirectPrintInvoice(inv)}
                            disabled={printingId === inv.id}
                            title="Direct Silent Print to Thermal Printer (QZ Tray)"
                            className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                          >
                            <PrinterIcon className={`w-3.5 h-3.5 ${printingId === inv.id ? 'animate-bounce text-indigo-600' : 'text-indigo-600'}`} />
                          </button>

                          {/* Print PDF Download */}
                          <button
                            onClick={() => window.open(salesApi.getInvoicePdfUrl(inv.id), '_blank')}
                            title="Download Official PDF Invoice"
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <DownloadIcon className="w-3.5 h-3.5" />
                          </button>

                          {/* Admin Edit */}
                          {canEdit && inv.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleOpenPreview(inv)}
                              title="Edit Invoice Terms / Notes (Admin Permission)"
                              className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors"
                            >
                              <EditIcon className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Admin Cancel */}
                          {canCancel && inv.status !== 'CANCELLED' && (
                            <button
                              onClick={() => setCancelModalInvoice(inv)}
                              title="Cancel & Void Invoice (Stock Reversal)"
                              className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                            >
                              <Trash2Icon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination Footer */}
        {!isLoading && invoices.length > 0 && (
          <div className="p-3.5 bg-slate-50/60 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-800">{(page - 1) * 15 + 1}</span> to{' '}
              <span className="font-semibold text-slate-800">{Math.min(page * 15, totalCount)}</span> of{' '}
              <span className="font-semibold text-slate-800">{totalCount}</span> invoices
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700"
              >
                Previous
              </button>

              <span className="px-2 py-1 font-mono text-xs font-semibold text-slate-800">
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Preview & Printable Dialog */}
      {selectedInvoice && (
        <InvoicePreview
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setSelectedInvoice(null);
          }}
          invoiceData={selectedInvoice}
          onInvoiceUpdated={() => {
            fetchInvoices();
          }}
        />
      )}

      {/* Invoice Void / Cancellation Confirmation Modal */}
      {cancelModalInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <Trash2Icon className="w-4 h-4 text-rose-600" />
                <span>Void & Cancel Invoice #{cancelModalInvoice.invoiceNumber}</span>
              </div>
              <button
                onClick={() => setCancelModalInvoice(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-rose-800 leading-relaxed">
                <strong>Attention:</strong> Voiding this invoice will atomically:
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-rose-700">
                  <li>Restore subtracted fruit stock quantities back to warehouse inventory.</li>
                  <li>Reverse customer debit transaction from customer ledger.</li>
                  <li>Revert issued crate / tray balances.</li>
                </ul>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Reason for Cancellation
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Price dispute, customer order cancelled before delivery, duplicate entry..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalInvoice(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Keep Invoice
                </button>
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={handleConfirmCancel}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs disabled:opacity-50"
                >
                  {isCancelling ? 'Voiding...' : 'Yes, Void & Cancel Invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POS Thermal Printer Settings Modal */}
      <PrinterSettingsModal
        isOpen={isPrinterModalOpen}
        onClose={() => setIsPrinterModalOpen(false)}
        onShowToast={onShowToast}
      />
    </div>
  );
};
