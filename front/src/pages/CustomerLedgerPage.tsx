import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Customer } from '../modules/sales/types/billing';
import { salesApi } from '../modules/sales/services/salesApi';
import { formatINR } from '../utils/helpers';
import { printerService } from '../services/printer/printerService';
import { receiptRenderer } from '../services/printer/receiptRenderer';
import {
  ReceiptTextIcon,
  UsersIcon,
  SearchIcon,
  RefreshCwIcon,
  PrinterIcon,
  DownloadIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CalendarIcon,
  BuildingIcon,
  DollarSignIcon,
  ArrowLeftIcon,
  CheckIcon,
  RupeeIcon,
  LayersIcon,
} from '../components/icons';

interface CustomerLedgerPageProps {
  initialCustomer?: Customer | null;
  onBackToCustomers?: () => void;
  onNavigateBilling?: () => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const CustomerLedgerPage: React.FC<CustomerLedgerPageProps> = ({
  initialCustomer = null,
  onBackToCustomers,
  onNavigateBilling,
  onShowToast,
}) => {
  // Customer list & selection
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    initialCustomer ? initialCustomer.id : null
  );
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  // Ledger records & loading
  const [ledgerData, setLedgerData] = useState<any | null>(null);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  // Filters
  const [dateFilter, setDateFilter] = useState<
    'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'
  >('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SALE' | 'PAYMENT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'TABLE' | 'DATE_WISE'>('TABLE');

  // Accordion state: set of expanded invoice references (e.g. 'INV-2026-000008')
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());

  // Printing & PDF status
  const [printingId, setPrintingId] = useState<number | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<number | null>(null);
  const [isDownloadingLedgerPdf, setIsDownloadingLedgerPdf] = useState(false);

  // Fetch all customers on mount
  useEffect(() => {
    let mounted = true;
    setIsLoadingCustomers(true);
    salesApi
      .getAllCustomers()
      .then((data) => {
        if (!mounted) return;
        setCustomers(data);
        if (!selectedCustomerId && data.length > 0) {
          // If no customer was pre-selected, select the first one
          setSelectedCustomerId(data[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to load customers for ledger:', err);
        onShowToast?.('Load Error', 'Could not load customer accounts list.', 'warning');
      })
      .finally(() => {
        if (mounted) setIsLoadingCustomers(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Update selected customer if initialCustomer prop changes
  useEffect(() => {
    if (initialCustomer && initialCustomer.id !== selectedCustomerId) {
      setSelectedCustomerId(initialCustomer.id);
    }
  }, [initialCustomer]);

  // Current selected customer object
  const currentCustomer: Customer | undefined = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || initialCustomer || undefined;
  }, [customers, selectedCustomerId, initialCustomer]);

  // Compute date range strings based on preset
  const dateRangeBounds = useMemo(() => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (dateFilter === 'TODAY') {
      const todayStr = toYMD(today);
      return { startDate: todayStr, endDate: todayStr };
    }
    if (dateFilter === 'YESTERDAY') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yStr = toYMD(y);
      return { startDate: yStr, endDate: yStr };
    }
    if (dateFilter === 'THIS_WEEK') {
      const start = new Date(today);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday
      start.setDate(diff);
      return { startDate: toYMD(start), endDate: toYMD(today) };
    }
    if (dateFilter === 'THIS_MONTH') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: toYMD(start), endDate: toYMD(today) };
    }
    if (dateFilter === 'CUSTOM') {
      return {
        startDate: customStartDate || undefined,
        endDate: customEndDate || undefined,
      };
    }
    return { startDate: undefined, endDate: undefined };
  }, [dateFilter, customStartDate, customEndDate]);

  // Fetch ledger data whenever customer or filters change
  const fetchLedger = useCallback(async () => {
    if (!selectedCustomerId) return;
    setIsLoadingLedger(true);
    try {
      const data = await salesApi.getCustomerLedger(selectedCustomerId, 1, 300, {
        startDate: dateRangeBounds.startDate,
        endDate: dateRangeBounds.endDate,
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
      });
      setLedgerData(data);
    } catch (err: any) {
      console.error('Failed to load ledger records:', err);
      onShowToast?.('Ledger Query Failed', 'Could not fetch customer ledger from server.', 'warning');
    } finally {
      setIsLoadingLedger(false);
    }
  }, [selectedCustomerId, dateRangeBounds, typeFilter, onShowToast]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Toggle single invoice accordion
  const toggleInvoiceAccordion = (ref: string) => {
    setExpandedInvoices((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) {
        next.delete(ref);
      } else {
        next.add(ref);
      }
      return next;
    });
  };

  // Expand / Collapse all
  const handleToggleExpandAll = (expand: boolean) => {
    if (!expand) {
      setExpandedInvoices(new Set());
      return;
    }
    const allRefs = new Set<string>();
    ledgerData?.entries?.forEach((entry: any) => {
      if (entry.type === 'SALE' && entry.reference) {
        allRefs.add(entry.reference);
      }
    });
    setExpandedInvoices(allRefs);
  };

  // 1-Click Thermal Print for an invoice
  const handleDirectPrintInvoice = async (inv: any) => {
    setPrintingId(inv.id);
    try {
      const full = await salesApi.getInvoiceById(inv.id);
      const invoiceData = full || inv;
      const res = await printerService.printInvoice(invoiceData);
      if (res.success) {
        onShowToast?.(
          'Receipt Printed',
          `Invoice #${inv.invoiceNumber} sent to printer (${res.printerName || 'Thermal Printer'}).`,
          'success'
        );
      } else {
        const settings = printerService.getSettings();
        const html = await receiptRenderer.renderInvoiceToHtml(invoiceData, {
          ...settings,
          transport: 'BROWSER_DIALOG',
        });
        await receiptRenderer.printHtml(html);
        onShowToast?.(
          'Receipt Printed',
          `Invoice #${inv.invoiceNumber} sent to system printer.`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('Print error:', err);
      onShowToast?.('Print Notification', 'Failed to communicate with printer.', 'warning');
    } finally {
      setPrintingId(null);
    }
  };

  // 1-Click PDF Download for Single Invoice
  const handleDownloadPdf = async (inv: any) => {
    try {
      setDownloadingPdfId(inv.id);
      await salesApi.downloadInvoicePdf(inv.id, inv.invoiceNumber);
      onShowToast?.('PDF Downloaded', `Invoice #${inv.invoiceNumber} PDF downloaded.`, 'success');
    } catch {
      window.open(salesApi.getInvoicePdfUrl(inv.id), '_blank');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // 1-Click PDF Download for Entire Customer Ledger & Account Statement
  const handleDownloadLedgerPdf = async () => {
    if (!selectedCustomerId) {
      onShowToast?.('Select Customer', 'Please select a customer to download account statement.', 'warning');
      return;
    }

    setIsDownloadingLedgerPdf(true);
    try {
      const filters: any = {};
      if (dateFilter === 'CUSTOM') {
        if (customStartDate) filters.startDate = customStartDate;
        if (customEndDate) filters.endDate = customEndDate;
      } else if (dateFilter === 'TODAY') {
        const todayStr = new Date().toISOString().slice(0, 10);
        filters.startDate = todayStr;
        filters.endDate = todayStr;
      } else if (dateFilter === 'YESTERDAY') {
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        const yestStr = yest.toISOString().slice(0, 10);
        filters.startDate = yestStr;
        filters.endDate = yestStr;
      } else if (dateFilter === 'THIS_MONTH') {
        const d = new Date();
        filters.startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        filters.endDate = d.toISOString().slice(0, 10);
      }

      if (typeFilter !== 'ALL') {
        filters.type = typeFilter;
      }

      await salesApi.downloadCustomerLedgerPdf(
        selectedCustomerId,
        currentCustomer?.name || 'Customer',
        filters
      );

      onShowToast?.(
        'Statement Downloaded',
        `Account Statement PDF for ${currentCustomer?.name || 'Customer'} downloaded successfully.`,
        'success'
      );
    } catch (err: any) {
      console.error('Failed to download ledger statement PDF:', err);
      window.open(salesApi.getCustomerLedgerPdfUrl(selectedCustomerId), '_blank');
    } finally {
      setIsDownloadingLedgerPdf(false);
    }
  };

  // Print complete ledger statement via system dialog
  const handlePrintStatement = () => {
    window.print();
  };

  // Filter entries by search query
  const filteredEntries = useMemo(() => {
    if (!ledgerData?.entries) return [];
    if (!searchQuery.trim()) return ledgerData.entries;
    const q = searchQuery.toLowerCase().trim();
    return ledgerData.entries.filter((entry: any) => {
      const refMatch = entry.reference?.toLowerCase().includes(q);
      const descMatch = entry.description?.toLowerCase().includes(q);
      const typeMatch = entry.type?.toLowerCase().includes(q);
      // Also search line item fruit names if attached
      const itemMatch = entry.invoice?.items?.some((i: any) =>
        i.productName?.toLowerCase().includes(q) || i.variety?.toLowerCase().includes(q)
      );
      return refMatch || descMatch || typeMatch || itemMatch;
    });
  }, [ledgerData?.entries, searchQuery]);

  // Group entries date-wise (descending order)
  interface DateGroup {
    date: string;
    formattedDate: string;
    entries: any[];
    totalDebit: number;
    totalCredit: number;
    closingBalance: number;
  }

  const dateGroups: DateGroup[] = useMemo(() => {
    if (!filteredEntries || filteredEntries.length === 0) return [];

    const map = new Map<string, any[]>();
    filteredEntries.forEach((entry: any) => {
      const d = entry.date || 'Unknown Date';
      if (!map.has(d)) {
        map.set(d, []);
      }
      map.get(d)!.push(entry);
    });

    const groups: DateGroup[] = [];
    map.forEach((entries, dateStr) => {
      let debitSum = 0;
      let creditSum = 0;
      entries.forEach((e) => {
        debitSum += parseFloat(e.debit) || 0;
        creditSum += parseFloat(e.credit) || 0;
      });

      // Format date for visual display
      let formatted = dateStr;
      try {
        const dObj = new Date(`${dateStr}T00:00:00`);
        if (!isNaN(dObj.getTime())) {
          formatted = dObj.toLocaleDateString('en-IN', {
            weekday: 'long',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
        }
      } catch {
        formatted = dateStr;
      }

      // Closing balance for the day is the running balance of the first entry in that day (since sorted DESC)
      const dayClosing = parseFloat(entries[0]?.runningBalance) || 0;

      groups.push({
        date: dateStr,
        formattedDate: formatted,
        entries,
        totalDebit: debitSum,
        totalCredit: creditSum,
        closingBalance: dayClosing,
      });
    });

    // Sort groups descending by date
    groups.sort((a, b) => b.date.localeCompare(a.date));
    return groups;
  }, [filteredEntries]);

  // Summary Metrics
  const openingBal = parseFloat(ledgerData?.customer?.openingBalance || 0);
  const totalDebit = parseFloat(ledgerData?.customer?.totalDebit || 0);
  const totalCredit = parseFloat(ledgerData?.customer?.totalCredit || 0);
  const closingBal =
    parseFloat(ledgerData?.customer?.closingBalance ?? ledgerData?.customer?.currentDue ?? 0);

  return (
    <div className="space-y-6 font-sans pb-16">
      {/* ========================================================= */}
      {/* 1. TOP HEADER & CUSTOMER SELECTOR */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            {onBackToCustomers && (
              <button
                type="button"
                onClick={onBackToCustomers}
                className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex-shrink-0"
                title="Back to Customer Directory"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <ReceiptTextIcon className="w-5 h-5 text-emerald-600" />
                  <span>Customer Ledger &amp; Account Statement</span>
                </h1>
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Date-wise Audit
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Full chronological billing audit, produce invoice breakdowns, and verified closing balance reconciliations
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'TABLE'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Normal Table View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('DATE_WISE')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'DATE_WISE'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Date-wise View
              </button>
            </div>

            {onNavigateBilling && (
              <button
                type="button"
                onClick={onNavigateBilling}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <DollarSignIcon className="w-4 h-4 text-slate-600" />
                <span>New Bill</span>
              </button>
            )}

            {/* 1-Click Page PDF Download */}
            <button
              type="button"
              onClick={handleDownloadLedgerPdf}
              disabled={isDownloadingLedgerPdf || !selectedCustomerId}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Download Formal A4 Customer Ledger & Account Statement PDF"
            >
              <DownloadIcon className={`w-4 h-4 text-white ${isDownloadingLedgerPdf ? 'animate-bounce' : ''}`} />
              <span>{isDownloadingLedgerPdf ? 'Downloading PDF...' : 'Download PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrintStatement}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
              title="Print Customer Ledger Statement"
            >
              <PrinterIcon className="w-4 h-4 text-slate-600" />
              <span>Print Statement</span>
            </button>
            <button
              type="button"
              onClick={fetchLedger}
              disabled={isLoadingLedger}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCwIcon className={`w-4 h-4 text-white ${isLoadingLedger ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Customer Selector Dropdown & Profile Banner */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Select Customer Account
            </label>
            <div className="relative">
              <UsersIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedCustomerId || ''}
                onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
              >
                {isLoadingCustomers && <option value="">Loading accounts...</option>}
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.customerCode}) · {c.city || 'APMC'} · Due: {formatINR(parseFloat(String(c.currentDue)) || 0)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {currentCustomer && (
            <div className="flex flex-col gap-2.5 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Contact</span>
                  <span className="font-semibold text-slate-800">{currentCustomer.phone}</span>
                </div>
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Location</span>
                  <span className="font-semibold text-slate-800">{currentCustomer.city || 'APMC Mandi'}</span>
                </div>
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Credit Limit</span>
                  <span className="font-semibold font-mono text-slate-800">
                    {formatINR(parseFloat(String(currentCustomer.creditLimit)) || 0)}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                    <LayersIcon className="w-3 h-3 text-amber-600" />
                    <span>Crates Held</span>
                  </span>
                  <span className="font-semibold font-mono text-amber-700">
                    {currentCustomer.outstandingTrays || 0} Trays
                  </span>
                </div>
              </div>

              {/* Clean Balance Overview Strip */}
              <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center gap-3 text-xs font-mono">
                <div className="flex items-center gap-1 text-slate-600">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-sans">Opening:</span>
                  <span className="font-semibold text-slate-800">{formatINR(openingBal)}</span>
                </div>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1 text-blue-700">
                  <span className="text-[10px] uppercase font-bold text-blue-600 font-sans">Billed Debits:</span>
                  <span className="font-semibold">{formatINR(totalDebit)}</span>
                </div>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1 text-emerald-700">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 font-sans">Paid Credits:</span>
                  <span className="font-semibold">{formatINR(totalCredit)}</span>
                </div>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 font-sans">Closing Balance Due:</span>
                  <span className={`font-extrabold ${closingBal > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {formatINR(closingBal)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. SUMMARY METRIC CARDS (SHOWN ONLY IN DATE-WISE VIEW)    */}
      {/* ========================================================= */}
      {viewMode === 'DATE_WISE' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Card 1: Opening Balance */}
            <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                  Opening Balance
                </span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <BuildingIcon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-amber-900 tracking-tight">
                {formatINR(openingBal)}
              </div>
              <div className="text-[11px] text-amber-700/80 mt-1">
                Customer balance prior to statement
              </div>
            </div>

            {/* Card 2: Net Invoices (Debits) */}
            <div className="bg-white border border-blue-200/80 rounded-2xl p-4 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                  Net Invoices (Debits)
                </span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ReceiptTextIcon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-blue-900 tracking-tight">
                {formatINR(totalDebit)}
              </div>
              <div className="text-[11px] text-blue-700/80 mt-1">
                Produce sales billed &amp; delivered
              </div>
            </div>

            {/* Card 3: Amount Paid (Credits) */}
            <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Amount Paid (Credits)
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckIcon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-900 tracking-tight">
                {formatINR(totalCredit)}
              </div>
              <div className="text-[11px] text-emerald-700/80 mt-1">
                Payments &amp; settlements received
              </div>
            </div>

            {/* Card 4: Closing Balance */}
            <div className="bg-white border border-rose-200/80 rounded-2xl p-4 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                  Closing / Remaining Due
                </span>
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <DollarSignIcon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-rose-900 tracking-tight">
                {formatINR(closingBal)}
              </div>
              <div className="text-[11px] text-rose-700/80 mt-1">
                Current net unsettled balance
              </div>
            </div>
          </div>

          {/* Canonical Formula Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Canonical Formula
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  Previous Balance + Current Net Amount - Amount Paid = Closing Balance
                </span>
              </div>
              <div className="text-xs sm:text-sm font-mono font-bold text-white flex flex-wrap items-center gap-2">
                <span className="text-amber-300">Opening ({formatINR(openingBal)})</span>
                <span className="text-slate-400">+</span>
                <span className="text-blue-300">Net Sales ({formatINR(totalDebit)})</span>
                <span className="text-slate-400">-</span>
                <span className="text-emerald-300">Paid ({formatINR(totalCredit)})</span>
                <span className="text-slate-400">=</span>
                <span className="text-rose-300 font-extrabold text-base bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/40">
                  Closing ({formatINR(closingBal)})
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* 4. FILTERS & SEARCH CONTROLS */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Preset Date Range Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Date:
            </span>
            {(['ALL', 'TODAY', 'YESTERDAY', 'THIS_WEEK', 'THIS_MONTH', 'CUSTOM'] as const).map(
              (p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDateFilter(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    dateFilter === p
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p === 'ALL'
                    ? 'All Time'
                    : p === 'TODAY'
                    ? 'Today'
                    : p === 'YESTERDAY'
                    ? 'Yesterday'
                    : p === 'THIS_WEEK'
                    ? 'This Week'
                    : p === 'THIS_MONTH'
                    ? 'This Month'
                    : 'Custom Range'}
                </button>
              )
            )}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Type:
            </span>
            {(['ALL', 'SALE', 'PAYMENT'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  typeFilter === t
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t === 'ALL' ? 'All Transactions' : t === 'SALE' ? 'Invoices (Debits)' : 'Payments (Credits)'}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Pickers (if CUSTOM selected) */}
        {dateFilter === 'CUSTOM' && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={fetchLedger}
              className="px-3 py-1 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              Apply Filter
            </button>
          </div>
        )}

        {/* Search bar & Expand All / Collapse All */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by invoice #, payment ref, description, fruit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleToggleExpandAll(true)}
              className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer"
            >
              Expand All Invoices
            </button>
            <button
              type="button"
              onClick={() => handleToggleExpandAll(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Collapse All
            </button>
            <button
              type="button"
              onClick={handleDownloadLedgerPdf}
              disabled={isDownloadingLedgerPdf || !selectedCustomerId}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              title="Download Customer Account Statement as PDF"
            >
              <DownloadIcon className={`w-3.5 h-3.5 text-indigo-600 ${isDownloadingLedgerPdf ? 'animate-bounce' : ''}`} />
              <span>{isDownloadingLedgerPdf ? 'Generating...' : 'PDF Statement'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. LEDGER TABLE / TRANSACTIONS VIEW                       */}
      {/* ========================================================= */}
      {viewMode === 'TABLE' ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-28 font-semibold">DATE</th>
                  <th className="py-3.5 px-3 w-24 font-semibold">TYPE</th>
                  <th className="py-3.5 px-3 w-36 font-semibold">REFERENCE</th>
                  <th className="py-3.5 px-4 min-w-[260px] font-semibold">PARTICULARS / BREAKDOWN</th>
                  <th className="py-3.5 px-4 text-right w-28 font-semibold">DEBIT</th>
                  <th className="py-3.5 px-4 text-right w-28 font-semibold">CREDIT</th>
                  <th className="py-3.5 px-4 text-right w-32 font-semibold">BALANCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingLedger ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-slate-400">
                      <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <span>Loading customer ledger records...</span>
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-slate-400">
                      <p className="font-medium text-slate-600">No ledger transactions found</p>
                      <p className="text-[11px] mt-0.5">Try adjusting date filters or search terms.</p>
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry: any) => {
                    const debit = parseFloat(entry.debit) || 0;
                    const credit = parseFloat(entry.credit) || 0;
                    const running = parseFloat(entry.runningBalance !== undefined ? entry.runningBalance : 0);
                    const isSale = entry.type === 'SALE';
                    const isPayment = entry.type === 'PAYMENT';
                    const isOpening = entry.type === 'OPENING';
                    const isExpanded = isSale && expandedInvoices.has(entry.reference);
                    const invoice = entry.invoice;
                    const items = invoice?.items || [];

                    return (
                      <React.Fragment key={entry.id}>
                        <tr className="hover:bg-slate-50/70 transition-colors">
                          {/* 1. DATE */}
                          <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                            {entry.date}
                          </td>

                          {/* 2. TYPE */}
                          <td className="py-3.5 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                isSale
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : isPayment
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isOpening
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {entry.type}
                            </span>
                          </td>

                          {/* 3. REFERENCE */}
                          <td className="py-3.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {entry.reference || '—'}
                          </td>

                          {/* 4. PARTICULARS / BREAKDOWN */}
                          <td className="py-3.5 px-4 text-slate-700">
                            <div className="flex items-center justify-between gap-2">
                              <span>{entry.description}</span>
                              {isSale && items.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleInvoiceAccordion(entry.reference)}
                                  className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline flex-shrink-0"
                                >
                                  {isExpanded ? 'Hide items ▲' : `${items.length} fruit items ▼`}
                                </button>
                              )}
                            </div>
                            {isPayment && entry.payment && (
                              <div className="mt-1 text-[11px] text-slate-500 font-mono">
                                <span>Mode: {entry.payment.paymentMode || 'CASH'}</span>
                                {entry.payment.transactionRef && (
                                  <span className="ml-2">· Ref: {entry.payment.transactionRef}</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* 5. DEBIT */}
                          <td className="py-3.5 px-4 text-right font-mono font-semibold text-blue-800">
                            {debit > 0 ? formatINR(debit) : '—'}
                          </td>

                          {/* 6. CREDIT */}
                          <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-800">
                            {credit > 0 ? `-${formatINR(credit)}` : '—'}
                          </td>

                          {/* 7. BALANCE */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                            {formatINR(running)}
                          </td>
                        </tr>

                        {/* Collapsible Produce breakdown in normal table */}
                        {isExpanded && items.length > 0 && (
                          <tr className="bg-slate-50/90 border-b border-slate-200">
                            <td colSpan={7} className="py-3 px-6">
                              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
                                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                                  Produce Items Breakdown for {invoice.invoiceNumber}
                                </div>
                                <div className="divide-y divide-slate-100 text-xs font-mono">
                                  {items.map((it: any, idx: number) => (
                                    <div key={idx} className="py-1.5 flex justify-between items-center text-slate-700">
                                      <span className="font-sans font-medium text-slate-800">
                                        • {it.productName || 'Produce'} {it.variety ? `(${it.variety})` : ''}
                                      </span>
                                      <span>
                                        {it.quantity} {it.unit || 'BOX'} × {formatINR(Number(it.rate || 0))} = <strong className="text-slate-900">{formatINR(Number(it.totalAmount || 0))}</strong>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-xs text-slate-900">
                  <td colSpan={4} className="py-3.5 px-4 uppercase tracking-wider font-extrabold text-slate-800">
                    TOTALS &amp; CLOSING BALANCE DUE
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-blue-900 font-bold">
                    {formatINR(totalDebit)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-900 font-bold">
                    {formatINR(totalCredit)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-extrabold text-rose-700 text-sm">
                    {formatINR(closingBal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
      <div className="space-y-6">
        {isLoadingLedger ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
            <RefreshCwIcon className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Loading Date-wise Customer Ledger...</h3>
            <p className="text-xs text-slate-400 mt-1">Retrieving invoices, item line totals, and payment snapshots</p>
          </div>
        ) : dateGroups.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
            <ReceiptTextIcon className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Ledger Transactions Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              There are no transactions matching your selected filters for this customer account.
            </p>
          </div>
        ) : (
          dateGroups.map((group) => (
            <div
              key={group.date}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
            >
              {/* Date Block Header Banner */}
              <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>{group.formattedDate}</span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                        {group.entries.length} {group.entries.length === 1 ? 'transaction' : 'transactions'}
                      </span>
                    </h2>
                    <span className="text-[11px] font-mono text-slate-500">{group.date}</span>
                  </div>
                </div>

                {/* Day Summary Badges */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                  {group.totalDebit > 0 && (
                    <div className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-medium">
                      <span className="text-[10px] text-blue-600 uppercase font-bold mr-1">Billed:</span>
                      <span className="font-mono font-bold">{formatINR(group.totalDebit)}</span>
                    </div>
                  )}
                  {group.totalCredit > 0 && (
                    <div className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium">
                      <span className="text-[10px] text-emerald-600 uppercase font-bold mr-1">Paid:</span>
                      <span className="font-mono font-bold">-{formatINR(group.totalCredit)}</span>
                    </div>
                  )}
                  <div className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-medium">
                    <span className="text-[10px] text-slate-500 uppercase font-bold mr-1">Day Closing:</span>
                    <span className="font-mono font-bold">{formatINR(group.closingBalance)}</span>
                  </div>
                </div>
              </div>

              {/* Transactions in this Date Block */}
              <div className="divide-y divide-slate-100">
                {group.entries.map((entry) => {
                  const debit = parseFloat(entry.debit) || 0;
                  const credit = parseFloat(entry.credit) || 0;
                  const running = parseFloat(entry.runningBalance) || 0;
                  const isSale = entry.type === 'SALE';
                  const isPayment = entry.type === 'PAYMENT';
                  const isOpening = entry.type === 'OPENING';
                  const isExpanded = isSale && expandedInvoices.has(entry.reference);
                  const invoice = entry.invoice;

                  return (
                    <div key={entry.id} className="transition-colors hover:bg-slate-50/40">
                      {/* Main Transaction Row */}
                      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                          {/* Type Badge */}
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                              isSale
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : isPayment
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isOpening
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {entry.type}
                          </span>

                          {/* Reference Number */}
                          <div className="font-mono font-bold text-xs text-slate-900 flex-shrink-0">
                            {entry.reference || '—'}
                          </div>

                          {/* Description & Items count */}
                          <div className="text-xs text-slate-600 truncate flex-1">
                            <span>{entry.description}</span>
                            {invoice?.items?.length > 0 && (
                              <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                {invoice.items.length} {invoice.items.length === 1 ? 'fruit item' : 'fruit items'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Financial Columns & Expand Action */}
                        <div className="flex items-center justify-between md:justify-end gap-4 text-xs font-mono">
                          {/* Debit */}
                          <div className="text-right min-w-[90px]">
                            <div className="text-[10px] font-bold uppercase text-slate-400 block md:hidden">Debit</div>
                            <span className={debit > 0 ? 'font-bold text-blue-700' : 'text-slate-300'}>
                              {debit > 0 ? formatINR(debit) : '—'}
                            </span>
                          </div>

                          {/* Credit */}
                          <div className="text-right min-w-[90px]">
                            <div className="text-[10px] font-bold uppercase text-slate-400 block md:hidden">Credit</div>
                            <span className={credit > 0 ? 'font-bold text-emerald-700' : 'text-slate-300'}>
                              {credit > 0 ? `-${formatINR(credit)}` : '—'}
                            </span>
                          </div>

                          {/* Closing Balance */}
                          <div className="text-right min-w-[100px]">
                            <div className="text-[10px] font-bold uppercase text-slate-400 block md:hidden">Balance</div>
                            <span className="font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                              {formatINR(running)}
                            </span>
                          </div>

                          {/* Collapsible Action Button for Invoices */}
                          {isSale && (
                            <button
                              type="button"
                              onClick={() => toggleInvoiceAccordion(entry.reference)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                isExpanded
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                              title={isExpanded ? 'Collapse Invoice Details' : 'Expand Full Invoice Details'}
                            >
                              <span>{isExpanded ? 'Hide' : 'Details'}</span>
                              {isExpanded ? (
                                <ChevronDownIcon className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRightIcon className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* ========================================================= */}
                      {/* COLLAPSIBLE FULL INVOICE DETAILS ACCORDION */}
                      {/* ========================================================= */}
                      {isSale && isExpanded && (
                        <div className="bg-slate-50/70 border-t border-b border-blue-200/60 p-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
                          {/* Invoice Header Details & Action Toolbar */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-900 font-mono">
                                  {invoice?.invoiceNumber || entry.reference}
                                </h3>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                    invoice?.paymentStatus === 'PAID'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : invoice?.paymentStatus === 'PARTIALLY_PAID'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {invoice?.paymentStatus || 'INVOICED'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Issued: {invoice?.invoiceDate || entry.date} · Customer: {currentCustomer?.name} (
                                {currentCustomer?.customerCode})
                              </p>
                            </div>

                            {/* Print / Download shortcuts */}
                            <div className="flex items-center gap-2">
                              {invoice?.id && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleDirectPrintInvoice(invoice)}
                                    disabled={printingId === invoice.id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                    title="1-Click Thermal Print"
                                  >
                                    <PrinterIcon className={`w-3.5 h-3.5 ${printingId === invoice.id ? 'animate-bounce text-emerald-600' : 'text-slate-600'}`} />
                                    <span>{printingId === invoice.id ? 'Printing...' : 'Print Receipt'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadPdf(invoice)}
                                    disabled={downloadingPdfId === invoice.id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                    title="Download 80mm PDF Thermal Invoice"
                                  >
                                    <DownloadIcon className="w-3.5 h-3.5 text-slate-600" />
                                    <span>PDF</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Produce Line Items Table */}
                          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                            <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Produce Items Billed
                              </span>
                              <span className="text-xs text-slate-500">
                                {invoice?.items?.length || 0} line items
                              </span>
                            </div>

                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  <th className="py-2.5 px-3">#</th>
                                  <th className="py-2.5 px-3">Produce Item</th>
                                  <th className="py-2.5 px-3">Variety / Grade</th>
                                  <th className="py-2.5 px-3 text-right">Quantity</th>
                                  <th className="py-2.5 px-3 text-right">Rate</th>
                                  <th className="py-2.5 px-3 text-right">Discount</th>
                                  <th className="py-2.5 px-3 text-right">Line Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-mono">
                                {(!invoice?.items || invoice.items.length === 0) ? (
                                  <tr>
                                    <td colSpan={7} className="py-6 text-center text-slate-400 font-sans">
                                      Line item details not loaded.
                                    </td>
                                  </tr>
                                ) : (
                                  invoice.items.map((item: any, iIdx: number) => {
                                    const qty = parseFloat(item.quantity) || 0;
                                    const rate = parseFloat(item.rate) || 0;
                                    const disc = parseFloat(item.discount) || 0;
                                    const tot = parseFloat(item.totalAmount) || (qty * rate - disc);

                                    return (
                                      <tr key={item.id || iIdx} className="hover:bg-slate-50/60">
                                        <td className="py-2 px-3 text-slate-400">{iIdx + 1}</td>
                                        <td className="py-2 px-3 font-sans font-bold text-slate-900">
                                          {item.productName}
                                        </td>
                                        <td className="py-2 px-3 font-sans text-slate-600">
                                          {item.variety || '—'} {item.grade ? `(${item.grade})` : ''}
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-800">
                                          {qty} {item.unit || 'BOX'}
                                          {item.trayQuantity > 0 && (
                                            <span className="ml-1 text-[10px] text-amber-600 font-sans">
                                              ({item.trayQuantity}T)
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-700">
                                          {formatINR(rate)}
                                        </td>
                                        <td className="py-2 px-3 text-right text-rose-600">
                                          {disc > 0 ? `-${formatINR(disc)}` : '—'}
                                        </td>
                                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                                          {formatINR(tot)}
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* ========================================================= */}
                          {/* CANONICAL 7-FIELD BILLING CALCULATION ACCORDION BREAKDOWN */}
                          {/* ========================================================= */}
                          {invoice && (
                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <RupeeIcon className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Canonical 7-Field Billing Calculation</span>
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  Formula: Previous + Net - Paid = Closing
                                </span>
                              </div>

                              {/* 7 Fields Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
                                {/* Field 1: Gross Amount */}
                                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    1. Gross Amount
                                  </div>
                                  <div className="text-sm font-bold font-mono text-slate-900 mt-1">
                                    {formatINR(invoice.grossAmount || invoice.subtotal || debit)}
                                  </div>
                                  <div className="text-[9px] text-slate-400 mt-0.5">Produce sum</div>
                                </div>

                                {/* Field 2: Discount */}
                                <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-2.5">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                                    2. Discount
                                  </div>
                                  <div className="text-sm font-bold font-mono text-rose-900 mt-1">
                                    -{formatINR(invoice.discount || 0)}
                                  </div>
                                  <div className="text-[9px] text-rose-600 mt-0.5">Trade discount</div>
                                </div>

                                {/* Field 3: Net Amount */}
                                <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-2.5">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                                    3. Net Amount
                                  </div>
                                  <div className="text-sm font-bold font-mono text-blue-900 mt-1">
                                    {formatINR(invoice.netAmount || invoice.grandTotal || debit)}
                                  </div>
                                  <div className="text-[9px] text-blue-600 mt-0.5">Gross - Disc</div>
                                </div>

                                {/* Field 4: Previous / Opening Balance */}
                                <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-2.5">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                                    4. Opening Balance
                                  </div>
                                  <div className="text-sm font-bold font-mono text-amber-900 mt-1">
                                    {formatINR(invoice.openingBalance || 0)}
                                  </div>
                                  <div className="text-[9px] text-amber-600 mt-0.5">Previous due</div>
                                </div>

                                {/* Field 5: Total Outstanding */}
                                <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-2.5">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                                    5. Total Outstanding
                                  </div>
                                  <div className="text-sm font-bold font-mono text-indigo-900 mt-1">
                                    {formatINR(invoice.totalOutstanding || 0)}
                                  </div>
                                  <div className="text-[9px] text-indigo-600 mt-0.5">Opening + Net</div>
                                </div>

                                {/* Field 6: Amount Paid */}
                                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-2.5">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                    6. Amount Paid
                                  </div>
                                  <div className="text-sm font-bold font-mono text-emerald-900 mt-1">
                                    -{formatINR(invoice.amountPaid || 0)}
                                  </div>
                                  <div className="text-[9px] text-emerald-600 mt-0.5">Payment received</div>
                                </div>

                                {/* Field 7: Closing Balance */}
                                <div className="bg-rose-50 border border-rose-300 rounded-xl p-2.5">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                                    7. Closing Balance
                                  </div>
                                  <div className="text-sm font-bold font-mono text-rose-950 mt-1">
                                    {formatINR(invoice.closingBalance || 0)}
                                  </div>
                                  <div className="text-[9px] text-rose-700 mt-0.5">Outstanding - Paid</div>
                                </div>
                              </div>

                              {/* Mathematical Equation Ribbon */}
                              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[11px] font-mono text-slate-700 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <span className="font-semibold text-slate-500">Net Calculation: </span>
                                  <span className="font-bold text-slate-900">
                                    Gross ({formatINR(invoice.grossAmount || invoice.subtotal || debit)}) - Discount ({formatINR(invoice.discount || 0)}) = Net ({formatINR(invoice.netAmount || invoice.grandTotal || debit)})
                                  </span>
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-500">Closing Calculation: </span>
                                  <span className="font-bold text-slate-900">
                                    Opening ({formatINR(invoice.openingBalance || 0)}) + Net ({formatINR(invoice.netAmount || invoice.grandTotal || debit)}) - Paid ({formatINR(invoice.amountPaid || 0)}) = Closing ({formatINR(invoice.closingBalance || 0)})
                                  </span>
                                </div>
                              </div>

                              {/* Payment settlements if attached */}
                              {invoice.payments && invoice.payments.length > 0 && (
                                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                    Payment Received:
                                  </span>
                                  {invoice.payments.map((p: any) => (
                                    <span
                                      key={p.id}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[11px]"
                                    >
                                      <CheckIcon className="w-3 h-3 text-emerald-600" />
                                      <span>
                                        {p.paymentMode}: {formatINR(p.amount)}
                                      </span>
                                      {p.transactionRef && (
                                        <span className="text-[10px] text-slate-500 font-sans">
                                          (Ref: {p.transactionRef})
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* PAYMENT Detail pill if applicable */}
                      {isPayment && entry.payment && (
                        <div className="px-5 pb-3 pt-1 text-[11px] text-slate-500 flex items-center gap-2">
                          <span className="font-semibold text-emerald-700">
                            Mode: {entry.payment.paymentMode || 'CASH'}
                          </span>
                          {entry.payment.transactionRef && (
                            <span>· Ref: {entry.payment.transactionRef}</span>
                          )}
                          {entry.payment.notes && <span>· Note: {entry.payment.notes}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
      )}
    </div>
  );
};
