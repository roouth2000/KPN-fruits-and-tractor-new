import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  onViewLedger,
  onShowToast,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterGroup, setFilterGroup] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // =========================================================
  // 1. ADD CUSTOMER MODAL STATE
  // =========================================================
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [custCode, setCustCode] = useState('');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custType, setCustType] = useState<'REGULAR' | 'WHOLESALE' | 'WALK_IN'>('WHOLESALE');
  const [custGroupName, setCustGroupName] = useState('');
  const [custIsGroupLeader, setCustIsGroupLeader] = useState(false);
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
  const [editGroupName, setEditGroupName] = useState('');
  const [editIsGroupLeader, setEditIsGroupLeader] = useState(false);
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
  // 4. ADD CREDIT MODAL STATE (+ Credit: Adds to Due Balance)
  // =========================================================
  const [isAddCreditOpen, setIsAddCreditOpen] = useState(false);
  const [creditingCustomer, setCreditingCustomer] = useState<Customer | null>(null);
  const [creditAmount, setCreditAmount] = useState<number | string>('');
  const [creditRef, setCreditRef] = useState<string>('');
  const [creditDate, setCreditDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [creditProduceDetails, setCreditProduceDetails] = useState<string>('');
  const [creditDescription, setCreditDescription] = useState<string>('');
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);

  // =========================================================
  // 5. REPAY MODAL STATE (₹ Repay: Customer Gives Amount -> Reduces Due)
  // =========================================================
  const [isRepayOpen, setIsRepayOpen] = useState(false);
  const [repayingCustomer, setRepayingCustomer] = useState<Customer | null>(null);
  const [repayAmount, setRepayAmount] = useState<number | string>('');
  const [repayMode, setRepayMode] = useState<string>('CASH');
  const [repayDate, setRepayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [repayRef, setRepayRef] = useState<string>('');
  const [repayNotes, setRepayNotes] = useState<string>('');
  const [isSubmittingRepay, setIsSubmittingRepay] = useState(false);
  const [lastRepayReceipt, setLastRepayReceipt] = useState<any | null>(null);

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

  // Extract distinct groups for dropdown
  const groupOptions = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.groupName && c.groupName.trim()) {
        set.add(c.groupName.trim());
      }
    });
    return Array.from(set).sort();
  }, [customers]);

  // =========================================================
  // ADD CUSTOMER HANDLERS
  // =========================================================
  const handleOpenAddCustomer = () => {
    const nextNum = customers.length + 1;
    setCustCode(`CUST-${String(nextNum).padStart(3, '0')}`);
    setCustName('');
    setCustPhone('');
    setCustType('WHOLESALE');
    setCustGroupName('');
    setCustIsGroupLeader(false);
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
        groupName: custGroupName.trim() || null,
        isGroupLeader: custIsGroupLeader,
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
    setEditGroupName(cust.groupName || '');
    setEditIsGroupLeader(Boolean(cust.isGroupLeader));
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
        groupName: editGroupName.trim() || null,
        isGroupLeader: editIsGroupLeader,
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
        `${editName.trim()} updated successfully.`,
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
  // ADD CREDIT HANDLERS (+ Credit: Adds to Due Balance)
  // =========================================================
  const handleOpenAddCredit = (cust: Customer) => {
    setCreditingCustomer(cust);
    setCreditAmount('');
    setCreditRef(`CR-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`);
    setCreditDate(new Date().toISOString().slice(0, 10));
    setCreditProduceDetails('');
    setCreditDescription(`Goods / Produce on credit for ${cust.name}`);
    setIsAddCreditOpen(true);
  };

  const handleAddCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditingCustomer) return;
    const amt = parseFloat(String(creditAmount));
    if (isNaN(amt) || amt <= 0) {
      onShowToast?.('Invalid Amount', 'Please enter a valid credit amount greater than ₹0.', 'warning');
      return;
    }

    setIsSubmittingCredit(true);
    try {
      const result = await salesApi.addCustomerCredit(creditingCustomer.id, {
        amount: amt,
        reference: creditRef.trim() || undefined,
        date: creditDate,
        description: creditDescription.trim() || undefined,
        produceDetails: creditProduceDetails.trim() || undefined,
      });

      onShowToast?.(
        'Credit Added',
        `Credit of ${formatINR(amt)} added to ${creditingCustomer.name}. New outstanding due is ${formatINR(result.newDue)}.`,
        'success'
      );
      setIsAddCreditOpen(false);
      setCreditingCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      onShowToast?.(
        'Credit Failed',
        err.response?.data?.message || err.message || 'Error adding credit',
        'warning'
      );
    } finally {
      setIsSubmittingCredit(false);
    }
  };

  // =========================================================
  // REPAY HANDLERS (₹ Repay: Customer Gives Amount -> Reduces Due)
  // =========================================================
  const handleOpenRepay = (cust: Customer) => {
    setRepayingCustomer(cust);
    const currentDue = parseFloat(String(cust.currentDue)) || 0;
    const openingBal = parseFloat(String(cust.openingBalance)) || 0;
    const defaultAmt = currentDue > 0 ? currentDue : (openingBal > 0 ? openingBal : '');
    setRepayAmount(defaultAmt);
    setRepayMode('CASH');
    setRepayDate(new Date().toISOString().slice(0, 10));
    setRepayRef('');
    setRepayNotes(`Repayment against outstanding due for ${cust.name}`);
    setLastRepayReceipt(null);
    setIsRepayOpen(true);
  };

  const handleRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayingCustomer) return;
    const amt = parseFloat(String(repayAmount));
    if (isNaN(amt) || amt <= 0) {
      onShowToast?.('Invalid Amount', 'Please enter a repayment amount greater than ₹0.', 'warning');
      return;
    }

    setIsSubmittingRepay(true);
    try {
      const result = await salesApi.repayCustomerDue(repayingCustomer.id, {
        amount: amt,
        paymentMode: repayMode,
        transactionRef: repayRef.trim() || undefined,
        paymentDate: repayDate,
        notes: repayNotes.trim() || `Customer repayment from ${repayingCustomer.name}`,
      });

      setLastRepayReceipt(result);
      onShowToast?.(
        'Repayment Recorded',
        `Repayment of ${formatINR(amt)} received from ${repayingCustomer.name}. Due reduced to ${formatINR(result.remainingDue)}.`,
        'success'
      );
      fetchCustomers();
    } catch (err: any) {
      onShowToast?.(
        'Repayment Failed',
        err.response?.data?.message || err.message || 'Error recording repayment',
        'warning'
      );
    } finally {
      setIsSubmittingRepay(false);
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
          <div class="center bold">CUSTOMER REPAYMENT VOUCHER</div>
          <div class="center" style="font-size: 10px;">(Credit Due Balance Reduction)</div>
          <div class="divider"></div>
          <div class="row"><span>Receipt No:</span><span class="bold">${paymentData.paymentNumber}</span></div>
          <div class="row"><span>Date:</span><span>${paymentData.paymentDate || new Date().toISOString().slice(0, 10)}</span></div>
          <div class="row"><span>Customer:</span><span class="bold">${paymentData.customerName}</span></div>
          <div class="row"><span>Payment Mode:</span><span class="bold">${paymentData.paymentMode}</span></div>
          ${paymentData.transactionRef ? `<div class="row"><span>Ref / UTR:</span><span>${paymentData.transactionRef}</span></div>` : ''}
          <div class="double-divider"></div>
          <div class="row" style="font-size: 13px;"><span class="bold">AMOUNT REPAID:</span><span class="bold">₹${Number(paymentData.amountPaid).toFixed(2)}</span></div>
          <div class="divider"></div>
          <div class="row"><span>Previous Due:</span><span>₹${Number(paymentData.previousDue).toFixed(2)}</span></div>
          <div class="row"><span>Amount Received:</span><span>-₹${Number(paymentData.amountPaid).toFixed(2)}</span></div>
          <div class="row bold"><span>Remaining Due:</span><span>₹${Number(paymentData.remainingDue).toFixed(2)}</span></div>
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

  // Filter logic: Search + Account Type + Group
  const filtered = customers.filter((c) => {
    const q = searchTerm.toLowerCase().trim();
    const matchSearch =
      !q ||
      (c.name || '').toLowerCase().includes(q) ||
      (c.customerCode || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      (c.groupName && c.groupName.toLowerCase().includes(q));

    const matchType = filterType === 'ALL' || c.customerType === filterType;

    const matchGroup =
      filterGroup === 'ALL'
        ? true
        : filterGroup === 'NONE'
        ? !c.groupName || !c.groupName.trim()
        : c.groupName === filterGroup;

    return matchSearch && matchType && matchGroup;
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
              Wholesale buyers, APMC counter clients, credit additions, repayments, group leaders, and outstanding tray ledger balances
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {onNavigateBilling && (
              <button
                type="button"
                onClick={() => onNavigateBilling()}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                <span>+ New Bill</span>
              </button>
            )}
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

      {/* ========================================================= */}
      {/* MAIN CUSTOMER DIRECTORY CARD & UI MATCHING SCREENSHOT     */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Top Controls Bar: Search + All Groups + All Account Types + Add Customer */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-white">
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone, code or city..."
              className="w-full text-xs bg-slate-50/70 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* Filters & Add Customer Button */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            {/* All Groups Dropdown */}
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Groups</option>
              <option value="NONE">Individual / No Group</option>
              {groupOptions.map((grp) => (
                <option key={grp} value={grp}>
                  {grp}
                </option>
              ))}
            </select>

            {/* All Account Types Dropdown */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Account Types</option>
              <option value="WHOLESALE">Wholesale Traders</option>
              <option value="REGULAR">Regular Retailers</option>
              <option value="WALK_IN">Walk-In / Cash</option>
            </select>

            {/* Add Customer Button */}
            <button
              onClick={handleOpenAddCustomer}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <span className="font-bold">+ +</span>
              <span>Add Customer</span>
            </button>
          </div>
        </div>

        {/* Table View Matching Screenshot */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/40">
                <th className="py-3.5 px-4 font-semibold">CODE</th>
                <th className="py-3.5 px-4 font-semibold">CUSTOMER &amp; CONTACT</th>
                <th className="py-3.5 px-4 font-semibold">ACCOUNT TYPE / GROUP &amp; LEADER</th>
                <th className="py-3.5 px-4 text-right font-semibold">CREDIT LIMIT</th>
                <th className="py-3.5 px-4 text-right font-semibold">OPENING BAL</th>
                <th className="py-3.5 px-4 text-right font-semibold">OUTSTANDING DUE</th>
                <th className="py-3.5 px-4 text-center font-semibold">TRAYS / CRATES</th>
                <th className="py-3.5 px-4 text-right font-semibold">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading customers directory from Mandi database...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <p className="font-medium text-slate-600">No customers found</p>
                    <p className="text-[11px] mt-0.5">Click &ldquo;+ + Add Customer&rdquo; above to register buyers.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((cust) => {
                  const opening = parseFloat(String(cust.openingBalance)) || 0;
                  const due = parseFloat(String(cust.currentDue)) || 0;
                  const limit = parseFloat(String(cust.creditLimit)) || 0;
                  const trays = parseInt(String(cust.outstandingTrays), 10) || 0;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. CODE */}
                      <td className="py-4 px-4 font-mono font-bold text-slate-800 text-xs">
                        {cust.customerCode}
                      </td>

                      {/* 2. CUSTOMER & CONTACT */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
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

                      {/* 3. ACCOUNT TYPE / GROUP & LEADER */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Account Type Badge */}
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              cust.customerType === 'WHOLESALE'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : cust.customerType === 'WALK_IN'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {cust.customerType}
                          </span>

                          {/* Group Leader Badge */}
                          {cust.isGroupLeader && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                              <span>⭐</span>
                              <span>Group Leader</span>
                            </span>
                          )}
                        </div>

                        {/* Group Name or Individual Account */}
                        <div className="text-[11px] mt-1 font-medium text-slate-500">
                          {cust.groupName ? (
                            <span>Group: {cust.groupName}</span>
                          ) : (
                            <span className="text-slate-400">Individual Account</span>
                          )}
                        </div>
                      </td>

                      {/* 4. CREDIT LIMIT */}
                      <td className="py-4 px-4 text-right font-mono text-slate-700 font-medium">
                        {formatINR(limit)}
                      </td>

                      {/* 5. OPENING BAL */}
                      <td className="py-4 px-4 text-right font-mono text-slate-700 font-medium">
                        {formatINR(opening)}
                      </td>

                      {/* 6. OUTSTANDING DUE */}
                      <td className="py-4 px-4 text-right font-mono font-bold">
                        <span className={due > 0 ? 'text-rose-600 font-extrabold' : 'text-slate-700'}>
                          {formatINR(due)}
                        </span>
                      </td>

                      {/* 7. TRAYS / CRATES */}
                      <td className="py-4 px-4 text-center font-mono text-xs text-slate-500">
                        {trays} Trays
                      </td>

                      {/* 8. ACTIONS: Ledger, + Credit, ₹ Repay, Edit, Delete */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                          {/* Ledger Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenLedger(cust)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
                            title="View Customer Credit Ledger & Balance Statement"
                          >
                            Ledger
                          </button>

                          {/* + Credit Button (Customer takes goods on credit -> increases due) */}
                          <button
                            type="button"
                            onClick={() => handleOpenAddCredit(cust)}
                            className="px-2.5 py-1 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                            title="Give Produce on Credit (+ Increases Customer Outstanding Due)"
                          >
                            <span>+ Credit</span>
                          </button>

                          {/* ₹ Repay Button (Customer gives amount -> reduces due) */}
                          <button
                            type="button"
                            onClick={() => handleOpenRepay(cust)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer flex items-center gap-0.5"
                            title="Customer Repayment (- Reduces Customer Outstanding Due)"
                          >
                            <span>₹ Repay</span>
                          </button>

                          {/* Edit Customer Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(cust)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="Edit Customer Details"
                          >
                            <EditIcon className="w-3.5 h-3.5 text-slate-500" />
                          </button>

                          {/* Delete Customer Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(cust)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="Delete Customer Account"
                          >
                            <Trash2Icon className="w-3.5 h-3.5 text-slate-500" />
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <UsersIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Register Mandi Customer</h3>
                  <p className="text-xs text-slate-400">Add a wholesale trader, retail stall, or group member</p>
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
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 cursor-pointer"
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
                  placeholder="e.g. Mahesh Super Fruits or Sri Murugan Fruit Mart"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>

              {/* Group & Leader Settings */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Group / Market Association
                  </label>
                  <input
                    type="text"
                    value={custGroupName}
                    onChange={(e) => setCustGroupName(e.target.value)}
                    placeholder="e.g. Vashi APMC Gate-1 Retailers"
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={custIsGroupLeader}
                      onChange={(e) => setCustIsGroupLeader(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4 border-slate-300"
                    />
                    <span>⭐ Assign as Group Leader</span>
                  </label>
                </div>
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
                    placeholder="e.g. Turbhe APMC, Vashi Gate 1"
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
                  placeholder="e.g. Gala 45, Fruit Market or Stall 14"
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
                    placeholder="90000"
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
                    placeholder="25000"
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
                    placeholder="12"
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
                    Update profile, group, contact, credit limits, and opening balance
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

              {/* Group & Leader Settings */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Group / Association
                  </label>
                  <input
                    type="text"
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    placeholder="e.g. Vashi APMC Gate-1 Retailers"
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={editIsGroupLeader}
                      onChange={(e) => setEditIsGroupLeader(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4 border-slate-300"
                    />
                    <span>⭐ Assign as Group Leader</span>
                  </label>
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
                  <span className="text-slate-500">Outstanding Due:</span>
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
                  <span className="font-semibold text-slate-700">Audit &amp; Safety Notice:</span> If this customer has existing sales invoices, deletion will be blocked to maintain tax and audit compliance.
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
      {/* MODAL 4: + CREDIT (Produce on Credit -> Increases Due)     */}
      {/* ========================================================= */}
      {isAddCreditOpen && creditingCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <span className="text-sm font-bold">+</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Add Customer Credit (Give Produce / Increase Due)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Extending credit adds directly to {creditingCustomer.name}&apos;s outstanding due balance
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddCreditOpen(false);
                  setCreditingCustomer(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCreditSubmit} className="mt-4 space-y-4">
              {/* Customer Current Balance Overview */}
              <div className="grid grid-cols-3 gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Due</span>
                  <span className="text-sm font-bold font-mono text-rose-700">
                    {formatINR(Number(creditingCustomer.currentDue) || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Credit Limit</span>
                  <span className="text-sm font-bold font-mono text-slate-800">
                    {formatINR(Number(creditingCustomer.creditLimit) || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Available Pool</span>
                  <span className="text-sm font-bold font-mono text-emerald-700">
                    {formatINR(Math.max(0, (Number(creditingCustomer.creditLimit) || 0) - (Number(creditingCustomer.currentDue) || 0)))}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Credit Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder="e.g. 10000"
                    className="w-full text-sm font-mono font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={creditDate}
                    onChange={(e) => setCreditDate(e.target.value)}
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Produce Items / Bill Description
                </label>
                <input
                  type="text"
                  value={creditProduceDetails}
                  onChange={(e) => setCreditProduceDetails(e.target.value)}
                  placeholder="e.g. 5 BOX Royal Gala Apple @ ₹2,000"
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reference / Voucher #
                  </label>
                  <input
                    type="text"
                    value={creditRef}
                    onChange={(e) => setCreditRef(e.target.value)}
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason / Notes
                  </label>
                  <input
                    type="text"
                    value={creditDescription}
                    onChange={(e) => setCreditDescription(e.target.value)}
                    placeholder="e.g. Goods taken on credit"
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                  />
                </div>
              </div>

              {/* Real-time Calculation Preview */}
              {parseFloat(String(creditAmount)) > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Current Outstanding Due:</span>
                    <span className="font-mono">{formatINR(Number(creditingCustomer.currentDue) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-semibold">
                    <span>Add New Credit Extended:</span>
                    <span className="font-mono">+ {formatINR(parseFloat(String(creditAmount)) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700 font-bold border-t border-slate-200 pt-1 text-sm">
                    <span>New Total Outstanding Due:</span>
                    <span className="font-mono">
                      {formatINR((Number(creditingCustomer.currentDue) || 0) + (parseFloat(String(creditAmount)) || 0))}
                    </span>
                  </div>

                  {Number(creditingCustomer.creditLimit) > 0 &&
                    (Number(creditingCustomer.currentDue) || 0) + (parseFloat(String(creditAmount)) || 0) >
                      Number(creditingCustomer.creditLimit) && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 font-semibold">
                        ⚠️ Limit Alert: New balance exceeds customer credit limit of {formatINR(Number(creditingCustomer.creditLimit))}.
                      </div>
                    )}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddCreditOpen(false);
                    setCreditingCustomer(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCredit}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:bg-black shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingCredit ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Adding Credit...</span>
                    </>
                  ) : (
                    <>
                      <span>+ Add Credit to Due</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: ₹ REPAY (Customer Gives Amount -> Reduces Due)   */}
      {/* ========================================================= */}
      {isRepayOpen && repayingCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <RupeeIcon className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Customer Repayment (Reduce Due Balance)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Customer payment reduces outstanding due for {repayingCustomer.name} ({repayingCustomer.customerCode})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsRepayOpen(false);
                  setRepayingCustomer(null);
                  setLastRepayReceipt(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {lastRepayReceipt ? (
              /* Success Receipt View */
              <div className="mt-4 space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckIcon className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-emerald-900">
                    Repayment Received Successfully!
                  </h4>
                  <p className="text-xs text-emerald-700 font-mono font-semibold">
                    Voucher #{lastRepayReceipt.paymentNumber}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span className="font-semibold text-slate-800">{lastRepayReceipt.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount Repaid:</span>
                    <span className="font-mono font-bold text-emerald-700">{formatINR(lastRepayReceipt.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Mode:</span>
                    <span className="font-semibold text-slate-800">{lastRepayReceipt.paymentMode}</span>
                  </div>
                  {lastRepayReceipt.transactionRef && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Reference / UTR:</span>
                      <span className="font-mono text-slate-700">{lastRepayReceipt.transactionRef}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-1.5">
                    <span className="text-slate-500">Previous Outstanding Due:</span>
                    <span className="font-mono text-slate-700">{formatINR(lastRepayReceipt.previousDue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Remaining Due Balance:</span>
                    <span className="font-mono font-bold text-rose-700">{formatINR(lastRepayReceipt.remainingDue)}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => handlePrintReceipt(lastRepayReceipt)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <PrinterIcon className="w-3.5 h-3.5 text-slate-600" />
                    <span>Print Receipt Slip</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsRepayOpen(false);
                      setRepayingCustomer(null);
                      setLastRepayReceipt(null);
                    }}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer"
                  >
                    Done &amp; Close
                  </button>
                </div>
              </div>
            ) : (
              /* Repayment Input Form */
              <form onSubmit={handleRepaySubmit} className="mt-4 space-y-4">
                {/* Balance Summary Header */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Current Outstanding Due</span>
                    <span className="text-base font-bold font-mono text-rose-700">
                      {formatINR(Number(repayingCustomer.currentDue) || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Opening Balance</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {formatINR(Number(repayingCustomer.openingBalance) || 0)}
                    </span>
                  </div>
                </div>

                {/* Quick Fill Buttons */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Quick Fill:</span>
                  {Number(repayingCustomer.currentDue) > 0 && (
                    <button
                      type="button"
                      onClick={() => setRepayAmount(Number(repayingCustomer.currentDue))}
                      className="px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
                    >
                      Full Due ({formatINR(Number(repayingCustomer.currentDue))})
                    </button>
                  )}
                  {Number(repayingCustomer.openingBalance) > 0 && (
                    <button
                      type="button"
                      onClick={() => setRepayAmount(Number(repayingCustomer.openingBalance))}
                      className="px-2.5 py-1 text-[11px] font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Opening Bal ({formatINR(Number(repayingCustomer.openingBalance))})
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Repayment Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={repayAmount}
                      onChange={(e) => setRepayAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full text-sm font-mono font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={repayMode}
                      onChange={(e) => setRepayMode(e.target.value)}
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
                      value={repayDate}
                      onChange={(e) => setRepayDate(e.target.value)}
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Transaction / UTR Ref
                    </label>
                    <input
                      type="text"
                      value={repayRef}
                      onChange={(e) => setRepayRef(e.target.value)}
                      placeholder="e.g. UPI-998823 or Cheque #401"
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notes / Memo
                  </label>
                  <input
                    type="text"
                    value={repayNotes}
                    onChange={(e) => setRepayNotes(e.target.value)}
                    placeholder="e.g. Settle partial credit dues"
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                {/* Calculation preview */}
                {parseFloat(String(repayAmount)) > 0 && (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/70 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Current Due Balance:</span>
                      <span className="font-mono">{formatINR(Number(repayingCustomer.currentDue) || 0)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Less This Repayment:</span>
                      <span className="font-mono">- {formatINR(parseFloat(String(repayAmount)) || 0)}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-bold border-t border-emerald-200 pt-1">
                      <span>Remaining Due Balance:</span>
                      <span className="font-mono">
                        {formatINR(Math.max(0, (Number(repayingCustomer.currentDue) || 0) - (parseFloat(String(repayAmount)) || 0)))}
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRepayOpen(false);
                      setRepayingCustomer(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRepay}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {isSubmittingRepay ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Recording Repayment...</span>
                      </>
                    ) : (
                      <>
                        <RupeeIcon className="w-3.5 h-3.5 text-white" />
                        <span>Record Repayment &amp; Reduce Due</span>
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
