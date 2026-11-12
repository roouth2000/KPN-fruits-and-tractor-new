import React, { useState, useEffect, useCallback } from 'react';
import {
  UsersIcon,
  SearchIcon,
  PlusIcon,
  XIcon,
  DollarSignIcon,
  BuildingIcon,
  LayersIcon,
} from '../components/icons';
import { salesApi } from '../modules/sales/services/salesApi';
import type { Customer } from '../modules/sales/types/billing';
import { formatINR } from '../utils/helpers';

interface CustomersPageProps {
  onBackToDashboard?: () => void;
  onNavigateBilling?: (customer?: Customer) => void;
  onCollectDue?: (customer: Customer) => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({
  onNavigateBilling,
  onCollectDue,
  onShowToast,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Add Customer Modal State
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
              Wholesale buyers, APMC counter clients, credit exposure limits, and outstanding tray ledger balances
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Prominent Add Customer Button */}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <th className="py-3 px-4 text-right">Outstanding Due</th>
                <th className="py-3 px-4 text-center">Trays / Crates</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading customers directory from Mandi database...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-medium text-slate-600">No customers found</p>
                    <p className="text-[11px] mt-0.5">Click &ldquo;+ Add Customer&rdquo; above to register wholesale buyers.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((cust) => {
                  const due = parseFloat(String(cust.currentDue)) || 0;
                  const limit = parseFloat(String(cust.creditLimit)) || 0;
                  const trays = parseInt(String(cust.outstandingTrays), 10) || 0;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {cust.customerCode}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{cust.name}</div>
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
                        <div className="flex items-center justify-end gap-1.5">
                          {onNavigateBilling && (
                            <button
                              onClick={() => onNavigateBilling(cust)}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-all cursor-pointer"
                              title="Start Bill with this Customer"
                            >
                              + Bill
                            </button>
                          )}
                          {due > 0 && onCollectDue && (
                            <button
                              onClick={() => onCollectDue(cust)}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                              title="Collect Due Payment"
                            >
                              Collect
                            </button>
                          )}
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
      {/* MODAL: ADD NEW MANDI CUSTOMER */}
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
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
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
    </div>
  );
};
