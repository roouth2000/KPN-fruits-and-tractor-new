import React, { useState, useEffect, useCallback } from 'react';
import {
  UsersIcon,
  SearchIcon,
  PlusIcon,
  XIcon,
  DollarSignIcon,
  BuildingIcon,
  LayersIcon,
  EditIcon,
  Trash2Icon,
  RupeeIcon,
  CheckIcon,
  PrinterIcon,
} from '../components/icons';
import { salesApi } from '../modules/sales/services/salesApi';
import type { Customer } from '../modules/sales/types/billing';
import { formatINR } from '../utils/helpers';
import { receiptRenderer } from '../services/printer/receiptRenderer';

interface CustomersPageProps {
  onBackToDashboard?: () => void;
  onNavigateBilling?: (customer?: Customer) => void;
  onCollectDue?: (customer: Customer) => void;
  onViewPurchaseHistory?: (customer: Customer) => void;
  onViewLedger?: (customer: Customer) => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({
  onNavigateBilling,
  onCollectDue,
  onViewPurchaseHistory,
  onViewLedger,
  onShowToast,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // =========================================================
  // 1. ADD CUSTOMER MODAL STATE
  // =========================================================
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [custCode, setCustCode] = useState('');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custType, setCustType] = useState<'REGULAR' | 'WHOLESALE' | 'WALK_IN'>('WHOLESALE');
  const [custCity, setCustCity] = useState('Mumbai');
  const [custAddress, setCustAddress] = useState('');
  const [custCreditLimit, setCustCreditLimit] = useState<number>(50000);
  const [custOpeningBalance, setCustOpeningBalance] = useState<number>(0);
  const [custTrays, setCustTrays] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // =========================================================
  // 2. EDIT CUSTOMER MODAL STATE
  // =========================================================
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editType, setEditType] = useState<'REGULAR' | 'WHOLESALE' | 'WALK_IN'>('WHOLESALE');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editGstin, setEditGstin] = useState('');
  const [editCreditLimit, setEditCreditLimit] = useState<number>(0);
  const [editOpeningBalance, setEditOpeningBalance] = useState<number>(0);
  const [editTrays, setEditTrays] = useState<number>(0);
  const [editNotes, setEditNotes] = useState('');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // =========================================================
  // 3. DELETE CUSTOMER MODAL STATE
  // =========================================================
  const [isDeleteCustomerOpen, setIsDeleteCustomerOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // =========================================================
  // 4. PAY OPENING BALANCE MODAL STATE
  // =========================================================
  const [isPayOpeningOpen, setIsPayOpeningOpen] = useState(false);
  const [payingCustomer, setPayingCustomer] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState<number | string>('');
  const [payMode, setPayMode] = useState<string>('CASH');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [payRef, setPayRef] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);
  const [lastPaymentReceipt, setLastPaymentReceipt] = useState<any | null>(null);

  const handleOpenLedger = (cust: Customer) => {
    if (onViewLedger) {
      onViewLedger(cust);
    }
  };

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await salesApi.getAllCustomers();
      setCustomers(data || []);
    } catch (err: any) {
      console.error('Failed to load customers:', err);
      onShowToast?.('Failed to Load', 'Could not retrieve customers list.', 'warning');
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // =========================================================
  // ADD CUSTOMER HANDLERS
  // =========================================================
  const handleOpenAddCustomer = () => {
    const nextNum = customers.length + 1;
    setCustCode(`CUST-${String(nextNum).padStart(3, '0')}`);
    setCustName('');
    setCustPhone('');
    setCustType('WHOLESALE');
    setCustCity('Mumbai');
    setCustAddress('');
    setCustCreditLimit(50000);
    setCustOpeningBalance(0);
    setCustTrays(0);
    setIsAddCustomerOpen(true);
  };

  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custPhone.trim()) {
      onShowToast?.('Missing Details', 'Customer name and phone number are required.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await salesApi.createCustomer({
        customerCode: custCode.trim() || undefined,
        name: custName.trim(),
        phone: custPhone.trim(),
        customerType: custType,
        city: custCity.trim(),
        address: custAddress.trim(),
        creditLimit: custCreditLimit,
        openingBalance: custOpeningBalance,
        currentDue: custOpeningBalance,
        outstandingTrays: custTrays,
        isActive: true,
      });

      onShowToast?.(
        'Customer Created',
        `${custName.trim()} registered in Mandi database successfully!`,
        'success'
      );
      setIsAddCustomerOpen(false);
      fetchCustomers();
    } catch (err: any) {
      onShowToast?.(
        'Failed to Create Customer',
        err.response?.data?.message || err.message || 'Error registering customer',
        'warning'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================
  // EDIT CUSTOMER HANDLERS
  // =========================================================
  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setEditCode(cust.customerCode || '');
    setEditName(cust.name || '');
    setEditPhone(cust.phone || '');
    setEditEmail(cust.email || '');
    setEditType(cust.customerType || 'WHOLESALE');
    setEditCity(cust.city || '');
    setEditState(cust.state || '');
    setEditAddress(cust.address || '');
    setEditGstin(cust.gstin || '');
    setEditCreditLimit(parseFloat(String(cust.creditLimit)) || 0);
    setEditOpeningBalance(parseFloat(String(cust.openingBalance)) || 0);
    setEditTrays(parseInt(String(cust.outstandingTrays), 10) || 0);
    setEditNotes(cust.notes || '');
    setEditIsActive(cust.isActive !== false);
    setIsEditCustomerOpen(true);
  };

  const handleUpdateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    if (!editName.trim() || !editPhone.trim()) {
      onShowToast?.('Missing Details', 'Customer name and phone number are required.', 'warning');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      await salesApi.updateCustomer(editingCustomer.id, {
        customerCode: editCode.trim() || undefined,
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim() || null,
        customerType: editType,
        city: editCity.trim(),
        state: editState.trim(),
        address: editAddress.trim(),
        gstin: editGstin.trim() || null,
        creditLimit: editCreditLimit,
        openingBalance: editOpeningBalance,
        outstandingTrays: editTrays,
        notes: editNotes.trim() || null,
        isActive: editIsActive,
      });

      onShowToast?.(
        'Customer Updated',
        `${editName.trim()} updated successfully. Opening balance and ledger adjusted.`,
        'success'
      );
      setIsEditCustomerOpen(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      onShowToast?.(
        'Update Failed',
        err.response?.data?.message || err.message || 'Error updating customer',
        'warning'
      );
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // =========================================================
  // DELETE CUSTOMER HANDLERS
  // =========================================================
  const handleOpenDelete = (cust: Customer) => {
    setDeletingCustomer(cust);
    setDeleteError(null);
    setIsDeleteCustomerOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCustomer) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await salesApi.deleteCustomer(deletingCustomer.id);
      onShowToast?.(
        'Customer Deleted',
        res.message || `Customer ${deletingCustomer.name} removed successfully.`,
        'success'
      );
      setIsDeleteCustomerOpen(false);
      setDeletingCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete customer';
      setDeleteError(msg);
      onShowToast?.('Cannot Delete Customer', msg, 'warning');
    } finally {
      setIsDeleting(false);
    }
  };

  // =========================================================
  // PAY OPENING BALANCE HANDLERS
  // =========================================================
  const handleOpenPayOpening = (cust: Customer) => {
    setPayingCustomer(cust);
    const openingBal = parseFloat(String(cust.openingBalance)) || 0;
    const currentDue = parseFloat(String(cust.currentDue)) || 0;
    const defaultAmt = openingBal > 0 ? openingBal : (currentDue > 0 ? currentDue : 0);
    setPayAmount(defaultAmt > 0 ? defaultAmt : '');
    setPayMode('CASH');
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayRef('');
    setPayNotes(`Opening balance settlement for ${cust.name}`);
    setLastPaymentReceipt(null);
    setIsPayOpeningOpen(true);
  };

  const handlePayOpeningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingCustomer) return;
    const amt = parseFloat(String(payAmount));
    if (isNaN(amt) || amt <= 0) {
      onShowToast?.('Invalid Amount', 'Please enter a payment amount greater than ₹0.', 'warning');
      return;
    }

    setIsSubmittingPay(true);
    try {
      const result = await salesApi.payOpeningBalance(payingCustomer.id, {
        amount: amt,
        paymentMode: payMode,
        transactionRef: payRef.trim() || undefined,
        paymentDate: payDate,
        notes: payNotes.trim() || `Opening balance payment for ${payingCustomer.name}`,
        isOpeningBalance: true,
      });

      setLastPaymentReceipt(result);
      onShowToast?.(
        'Payment Recorded',
        `Payment of ${formatINR(amt)} recorded for ${payingCustomer.name}. Receipt: ${result.paymentNumber}`,
        'success'
      );
      fetchCustomers();
    } catch (err: any) {
      onShowToast?.(
        'Payment Failed',
        err.response?.data?.message || err.message || 'Error recording payment',
        'warning'
      );
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const handlePrintReceipt = async (paymentData: any) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Payment Receipt - ${paymentData.paymentNumber}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 12px;
              color: #000;
              width: 72mm;
              margin: 0 auto;
              padding: 8px 4px;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .double-divider { border-top: 2px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 14px;">SR FRUITS</div>
          <div class="center" style="font-size: 10px;">APMC Market-1, Fruit Section, Vashi</div>
          <div class="center" style="font-size: 10px;">Phone: 9820012345</div>
          <div class="divider"></div>
          <div class="center bold">PAYMENT RECEIPT VOUCHER</div>
          <div class="center" style="font-size: 10px;">(Opening Balance / Due Settlement)</div>
          <div class="divider"></div>
          <div class="row"><span>Receipt No:</span><span class="bold">${paymentData.paymentNumber}</span></div>
          <div class="row"><span>Date:</span><span>${paymentData.paymentDate || new Date().toISOString().slice(0, 10)}</span></div>
          <div class="row"><span>Customer:</span><span class="bold">${paymentData.customerName}</span></div>
          <div class="row"><span>Payment Mode:</span><span class="bold">${paymentData.paymentMode}</span></div>
          ${paymentData.transactionRef ? `<div class="row"><span>Ref / UTR:</span><span>${paymentData.transactionRef}</span></div>` : ''}
          <div class="double-divider"></div>
          <div class="row" style="font-size: 13px;"><span class="bold">AMOUNT PAID:</span><span class="bold">₹${Number(paymentData.amountPaid).toFixed(2)}</span></div>
          <div class="divider"></div>
          <div class="row"><span>Previous Balance:</span><span>₹${Number(paymentData.previousDue).toFixed(2)}</span></div>
          <div class="row"><span>Amount Received:</span><span>-₹${Number(paymentData.amountPaid).toFixed(2)}</span></div>
          <div class="row bold"><span>Remaining Balance:</span><span>₹${Number(paymentData.remainingDue).toFixed(2)}</span></div>
          <div class="divider"></div>
          <div class="center" style="margin-top: 12px; font-size: 10px;">*** Thank You ***</div>
          <div class="center" style="font-size: 9px; color: #555;">Computer Generated Receipt</div>
        </body>
      </html>
    `;
    try {
      await receiptRenderer.printHtml(html);
    } catch (e) {
      console.error('Failed to print receipt:', e);
    }
  };

  const filtered = customers.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.city && c.city.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchType = filterType === 'ALL' || c.customerType === filterType;
    return matchSearch && matchType;
  });

  // Calculate Metrics
  const totalOpening = customers.reduce((acc, c) => acc + (parseFloat(String(c.openingBalance)) || 0), 0);
  const totalDue = customers.reduce((acc, c) => acc + (parseFloat(String(c.currentDue)) || 0), 0);
  const totalLimit = customers.reduce((acc, c) => acc + (parseFloat(String(c.creditLimit)) || 0), 0);
  const totalTrays = customers.reduce((acc, c) => acc + (parseInt(String(c.outstandingTrays), 10) || 0), 0);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Customer Directory &amp; Credit Ledgers
              </h1>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full">
                APMC Registered Buyers
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Wholesale buyers, APMC counter clients, opening balance management, credit exposure limits, and outstanding tray ledger balances
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleOpenAddCustomer}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <PlusIcon className="w-4 h-4 text-white" />
              <span>+ Add Customer</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500">Registered Buyers</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UsersIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
            {customers.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Active APMC accounts in system
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500">Total Opening Bal</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <RupeeIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-800 font-mono tracking-tight">
            {formatINR(totalOpening)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Initial starting credit balances
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500">Total Outstanding Due</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <DollarSignIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-700 font-mono tracking-tight">
            {formatINR(totalDue)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Unsettled customer credit balances
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500">Total Credit Limit</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <BuildingIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
            {formatINR(totalLimit)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Sanctioned buyer credit pool
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500">Crates With Customers</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <LayersIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700 font-mono tracking-tight">
            {totalTrays} Trays
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Unreturned wooden &amp; plastic crates
          </div>
        </div>
      </div>

      {/* Customer List Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <SearchIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone, code or city..."
              className="w-full text-xs bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Account Types</option>
              <option value="WHOLESALE">Wholesale Traders</option>
              <option value="REGULAR">Regular Retailers</option>
              <option value="WALK_IN">Walk-In / Cash</option>
            </select>

            <button
              onClick={handleOpenAddCustomer}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer ml-auto"
            >
              <PlusIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>+ Add Customer</span>
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Customer &amp; Contact</th>
                <th className="py-3 px-4">Account Type</th>
                <th className="py-3 px-4 text-right">Credit Limit</th>
                <th className="py-3 px-4 text-right">Opening Bal</th>
                <th className="py-3 px-4 text-right">Outstanding Due</th>
                <th className="py-3 px-4 text-center">Trays / Crates</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading customers directory from Mandi database...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="font-medium text-slate-600">No customers found</p>
                    <p className="text-[11px] mt-0.5">Click &ldquo;+ Add Customer&rdquo; above to register wholesale buyers.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((cust) => {
                  const opening = parseFloat(String(cust.openingBalance)) || 0;
                  const due = parseFloat(String(cust.currentDue)) || 0;
                  const limit = parseFloat(String(cust.creditLimit)) || 0;
                  const trays = parseInt(String(cust.outstandingTrays), 10) || 0;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {cust.customerCode}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{cust.name}</span>
                          {!cust.isActive && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-normal">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {cust.phone} {cust.city ? `· ${cust.city}` : ''} {cust.address ? `· ${cust.address}` : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            cust.customerType === 'WHOLESALE'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : cust.customerType === 'WALK_IN'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {cust.customerType}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                        {formatINR(limit)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                        {formatINR(opening)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span className={due > 0 ? 'text-rose-700' : 'text-slate-500'}>
                          {formatINR(due)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            trays > 0
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'text-slate-400'
                          }`}
                        >
                          {trays} Trays
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenLedger(cust)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                            title="View Customer Credit Ledger & Balance Statement"
                          >
                            Ledger
                          </button>

                          {onViewPurchaseHistory && (
                            <button
                              type="button"
                              onClick={() => onViewPurchaseHistory(cust)}
                              className="px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors cursor-pointer"
                              title="View Customer Purchase History & Billed Fruits"
                            >
                              Purchases
                            </button>
                          )}

                          {onNavigateBilling && (
                            <button
                              onClick={() => onNavigateBilling(cust)}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-all cursor-pointer"
                              title="Start Bill with this Customer"
                            >
                              + Bill
                            </button>
                          )}

                          {/* Pay Opening Balance / Due Settlement Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenPayOpening(cust)}
                            className="px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            title="Pay Opening Balance / Settle Customer Due"
                          >
                            <RupeeIcon className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Pay Opening</span>
                          </button>

                          {/* Collect Due Button if prop passed and customer has due */}
                          {due > 0 && onCollectDue && (
                            <button
                              type="button"
                              onClick={() => onCollectDue(cust)}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                              title="Collect Due Payment"
                            >
                              Collect
                            </button>
                          )}

                          {/* Edit Customer Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(cust)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg transition-colors cursor-pointer"
                            title="Edit Customer Details"
                          >
                            <EditIcon className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Customer Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(cust)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 rounded-lg transition-colors cursor-pointer"
                            title="Delete Customer Account"
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

      {/* ========================================================= */}
      {/* MODAL 1: ADD NEW MANDI CUSTOMER                           */}
      {/* ========================================================= */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <UsersIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Register Mandi Customer</h3>
                  <p className="text-xs text-slate-400">Add a new wholesale buyer or retail stall account</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddCustomerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Customer Code
                  </label>
                  <input
                    type="text"
                    value={custCode}
                    onChange={(e) => setCustCode(e.target.value)}
                    placeholder="e.g. CUST-002"
                    className="w-full text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Type
                  </label>
                  <select
                    value={custType}
                    onChange={(e) => setCustType(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  >
                    <option value="WHOLESALE">WHOLESALE (Credit Allowed)</option>
                    <option value="REGULAR">REGULAR (Retail Stall)</option>
                    <option value="WALK_IN">WALK_IN (Cash POS)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="e.g. Rajesh Fruit Mart or APMC Bay 14 Trader"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="e.g. 9820012345"
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City / Mandi Area
                  </label>
                  <input
                    type="text"
                    value={custCity}
                    onChange={(e) => setCustCity(e.target.value)}
                    placeholder="e.g. Mumbai, Vashi, Pune"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandi Bay / Stall Address
                </label>
                <input
                  type="text"
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  placeholder="e.g. Gala 24, APMC Market-1, Vashi"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Credit Limit (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={custCreditLimit}
                    onChange={(e) => setCustCreditLimit(parseFloat(e.target.value) || 0)}
                    placeholder="50000"
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Opening Due (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={custOpeningBalance}
                    onChange={(e) => setCustOpeningBalance(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Trays
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={custTrays}
                    onChange={(e) => setCustTrays(parseInt(e.target.value, 10) || 0)}
                    placeholder="0"
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <PlusIcon className="w-3.5 h-3.5 text-white" />
                      <span>Save Customer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: EDIT MANDI CUSTOMER                              */}
      {/* ========================================================= */}
      {isEditCustomerOpen && editingCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <EditIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Customer: {editingCustomer.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Update profile, contact, credit limits, and opening balance
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditCustomerOpen(false);
                  setEditingCustomer(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomerSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Customer Code
                  </label>
                  <input
                    type="text"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Type
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="WHOLESALE">WHOLESALE (Credit Allowed)</option>
                    <option value="REGULAR">REGULAR (Retail Stall)</option>
                    <option value="WALK_IN">WALK_IN (Cash POS)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Customer / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="e.g. buyer@mandi.com"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    value={editGstin}
                    onChange={(e) => setEditGstin(e.target.value)}
                    placeholder="e.g. 27AABCF1234F1Z5"
                    className="w-full text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City / Market Zone
                  </label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={editState}
                    onChange={(e) => setEditState(e.target.value)}
                    placeholder="e.g. Maharashtra"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandi Bay / Stall Address
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="e.g. Gala 24, APMC Market-1, Vashi"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Credit Limit (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editCreditLimit}
                    onChange={(e) => setEditCreditLimit(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Opening Due (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editOpeningBalance}
                    onChange={(e) => setEditOpeningBalance(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Modifying this adjusts the initial ledger balance automatically.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Trays
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editTrays}
                    onChange={(e) => setEditTrays(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / APMC Remarks
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Optional internal remarks or payment terms"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300 cursor-pointer"
                />
                <label htmlFor="editIsActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Active Account (Eligible for billing and sales)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditCustomerOpen(false);
                    setEditingCustomer(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingEdit ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-3.5 h-3.5 text-white" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: DELETE CUSTOMER CONFIRMATION                     */}
      {/* ========================================================= */}
      {isDeleteCustomerOpen && deletingCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Customer Account</h3>
                <p className="text-xs text-slate-400">Permanently remove customer from Mandi directory</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-700">
                Are you sure you want to delete <span className="font-bold text-slate-900">{deletingCustomer.name}</span> ({deletingCustomer.customerCode})?
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Contact:</span>
                  <span className="font-medium text-slate-800">{deletingCustomer.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Opening Balance:</span>
                  <span className="font-mono font-medium text-slate-800">{formatINR(Number(deletingCustomer.openingBalance) || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Outstanding Due:</span>
                  <span className="font-mono font-bold text-rose-700">{formatINR(Number(deletingCustomer.currentDue) || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Outstanding Trays:</span>
                  <span className="font-mono text-amber-700 font-semibold">{deletingCustomer.outstandingTrays} Trays</span>
                </div>
              </div>

              {deleteError ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                  <p className="font-semibold mb-0.5">Cannot Delete Customer</p>
                  <p>{deleteError}</p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Audit &amp; Safety Notice:</span> If this customer has existing sales invoices, deletion will be blocked to maintain tax and audit compliance. Accounts without invoices can be safely removed.
                </p>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteCustomerOpen(false);
                  setDeletingCustomer(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2Icon className="w-3.5 h-3.5 text-white" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: PAY OPENING BALANCE / DUE SETTLEMENT             */}
      {/* ========================================================= */}
      {isPayOpeningOpen && payingCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <RupeeIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Pay Opening Balance / Settle Due
                  </h3>
                  <p className="text-xs text-slate-400">
                    Record payment receipt for {payingCustomer.name} ({payingCustomer.customerCode})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsPayOpeningOpen(false);
                  setPayingCustomer(null);
                  setLastPaymentReceipt(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {lastPaymentReceipt ? (
              /* Success Receipt View */
              <div className="mt-4 space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckIcon className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-emerald-900">
                    Payment Recorded Successfully!
                  </h4>
                  <p className="text-xs text-emerald-700 font-mono font-semibold">
                    Receipt #{lastPaymentReceipt.paymentNumber}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span className="font-semibold text-slate-800">{lastPaymentReceipt.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount Paid:</span>
                    <span className="font-mono font-bold text-emerald-700">{formatINR(lastPaymentReceipt.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Mode:</span>
                    <span className="font-semibold text-slate-800">{lastPaymentReceipt.paymentMode}</span>
                  </div>
                  {lastPaymentReceipt.transactionRef && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Reference / UTR:</span>
                      <span className="font-mono text-slate-700">{lastPaymentReceipt.transactionRef}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-1.5">
                    <span className="text-slate-500">Previous Balance:</span>
                    <span className="font-mono text-slate-700">{formatINR(lastPaymentReceipt.previousDue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">New Remaining Balance:</span>
                    <span className="font-mono font-bold text-slate-900">{formatINR(lastPaymentReceipt.remainingDue)}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => handlePrintReceipt(lastPaymentReceipt)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <PrinterIcon className="w-3.5 h-3.5 text-slate-600" />
                    <span>Print Receipt Slip</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsPayOpeningOpen(false);
                      setPayingCustomer(null);
                      setLastPaymentReceipt(null);
                    }}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer"
                  >
                    Done &amp; Close
                  </button>
                </div>
              </div>
            ) : (
              /* Payment Input Form */
              <form onSubmit={handlePayOpeningSubmit} className="mt-4 space-y-4">
                {/* Balance Summary Header */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Opening Balance</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {formatINR(Number(payingCustomer.openingBalance) || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Current Total Due</span>
                    <span className="text-base font-bold font-mono text-rose-700">
                      {formatINR(Number(payingCustomer.currentDue) || 0)}
                    </span>
                  </div>
                </div>

                {/* Quick Fill Buttons */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Quick Fill:</span>
                  {Number(payingCustomer.openingBalance) > 0 && (
                    <button
                      type="button"
                      onClick={() => setPayAmount(Number(payingCustomer.openingBalance))}
                      className="px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Full Opening ({formatINR(Number(payingCustomer.openingBalance))})
                    </button>
                  )}
                  {Number(payingCustomer.currentDue) > 0 && (
                    <button
                      type="button"
                      onClick={() => setPayAmount(Number(payingCustomer.currentDue))}
                      className="px-2.5 py-1 text-[11px] font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Total Due ({formatINR(Number(payingCustomer.currentDue))})
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full text-sm font-mono font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={payMode}
                      onChange={(e) => setPayMode(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="CASH">CASH (Physical Currency)</option>
                      <option value="UPI">UPI / QR (GPay, PhonePe, Paytm)</option>
                      <option value="BANK_TRANSFER">BANK TRANSFER (NEFT/RTGS/IMPS)</option>
                      <option value="CHEQUE">CHEQUE (APMC Mandi Clearing)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Transaction / UTR Ref
                    </label>
                    <input
                      type="text"
                      value={payRef}
                      onChange={(e) => setPayRef(e.target.value)}
                      placeholder="e.g. UPI-998823 or Cheque #401"
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notes / Memo
                  </label>
                  <input
                    type="text"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="e.g. Cleared opening balance dues"
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>

                {/* Calculation preview */}
                {parseFloat(String(payAmount)) > 0 && (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/70 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Current Due Balance:</span>
                      <span className="font-mono">{formatINR(Number(payingCustomer.currentDue) || 0)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Less This Payment:</span>
                      <span className="font-mono">- {formatINR(parseFloat(String(payAmount)) || 0)}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-bold border-t border-emerald-200 pt-1">
                      <span>Estimated Closing Balance:</span>
                      <span className="font-mono">
                        {formatINR((Number(payingCustomer.currentDue) || 0) - (parseFloat(String(payAmount)) || 0))}
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPayOpeningOpen(false);
                      setPayingCustomer(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPay}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {isSubmittingPay ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <>
                        <RupeeIcon className="w-3.5 h-3.5 text-white" />
                        <span>Record Payment &amp; Receipt</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
