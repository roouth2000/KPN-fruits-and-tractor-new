import React, { useState, useEffect, useRef } from 'react';
import { useCustomerSearch, useCustomerBalance, useCreateCustomer } from '../hooks/useCustomers';
import type { Customer } from '../types/billing';
import { SearchIcon, PlusIcon, UsersIcon, XIcon } from '../../../components/icons';

interface CustomerSelectorProps {
  selectedCustomerId: number | null;
  onSelectCustomer: (customer: Customer | null) => void;
  onOpenDueCollection?: (customer: Customer) => void;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  selectedCustomerId,
  onSelectCustomer,
  onOpenDueCollection,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { searchTerm, setSearchTerm, customers, isLoading } = useCustomerSearch();
  const { data: customerBalance } = useCustomerBalance(selectedCustomerId);
  const createCustomerMutation = useCreateCustomer();

  // New customer form state
  const [newCustCode, setNewCustCode] = useState('CUST-801');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustType, setNewCustType] = useState<'REGULAR' | 'WHOLESALE' | 'WALK_IN'>('WHOLESALE');
  const [newCustCreditLimit, setNewCustCreditLimit] = useState(50000);

  // Keyboard shortcut F2 to focus customer search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (cust: Customer) => {
    onSelectCustomer(cust);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleSelectCashCustomer = () => {
    const cashCustomer = customers.find((c) => c.customerType === 'WALK_IN' || c.customerCode === 'CUST-CASH');
    if (cashCustomer) {
      onSelectCustomer(cashCustomer);
    } else {
      onSelectCustomer({
        id: 2,
        customerCode: 'CUST-CASH',
        name: 'Cash Customer',
        phone: '9999999999',
        customerType: 'WALK_IN',
        creditLimit: 0,
        openingBalance: 0,
        currentDue: 0,
        outstandingTrays: 0,
        isActive: true,
      });
    }
    setIsOpen(false);
  };

  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;

    try {
      const created = await createCustomerMutation.mutateAsync({
        customerCode: newCustCode,
        name: newCustName,
        phone: newCustPhone,
        address: newCustAddress,
        customerType: newCustType,
        creditLimit: newCustCreditLimit,
        openingBalance: 0,
        currentDue: 0,
        outstandingTrays: 0,
      });
      onSelectCustomer(created);
      setIsAddCustomerOpen(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustAddress('');
      setNewCustCode(`CUST-${Math.floor(100 + Math.random() * 900)}`);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to create customer');
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs relative" ref={dropdownRef}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <UsersIcon className="w-3.5 h-3.5 text-slate-500" />
          <span>Customer (F2)</span>
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSelectCashCustomer}
            className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 px-2 py-0.5 rounded transition-colors"
          >
            Cash Customer
          </button>
          <button
            type="button"
            onClick={() => setIsAddCustomerOpen(true)}
            className="text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
          >
            <PlusIcon className="w-3 h-3 text-slate-600" />
            <span>New Customer</span>
          </button>
        </div>
      </div>

      {/* Trigger & Search Bar */}
      <div className="relative">
        <div
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => searchInputRef.current?.focus(), 50);
          }}
          className={`w-full flex items-center justify-between bg-slate-50 border rounded-lg px-3 py-2 text-xs cursor-pointer transition-all ${
            isOpen ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <SearchIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            {selectedCustomer ? (
              <span className="font-semibold text-slate-900 truncate">
                {selectedCustomer.name} ({selectedCustomer.customerCode})
              </span>
            ) : (
              <span className="text-slate-400">Search customer by name, mobile, code...</span>
            )}
          </div>
          <kbd className="text-[10px] bg-white border border-slate-200 text-slate-400 px-1 rounded shadow-2xs font-mono">
            F2
          </kbd>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2 border-b border-slate-100 bg-slate-50/50">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type customer name or mobile number..."
                className="w-full text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-4 text-center text-xs text-slate-400">Searching customers...</div>
              ) : customers.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-xs text-slate-500">No customer found for "{searchTerm}"</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setIsAddCustomerOpen(true);
                      setNewCustName(searchTerm);
                    }}
                    className="mt-2 text-xs font-semibold text-slate-900 hover:underline inline-flex items-center gap-1"
                  >
                    <PlusIcon className="w-3 h-3" />
                    <span>Add "{searchTerm}" as new customer</span>
                  </button>
                </div>
              ) : (
                customers.map((cust) => (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => handleSelect(cust)}
                    className={`w-full text-left p-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between group ${
                      cust.id === selectedCustomerId ? 'bg-slate-50' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900 group-hover:text-slate-950">
                          {cust.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 rounded">
                          {cust.customerCode}
                        </span>
                        {cust.customerType === 'WALK_IN' && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 rounded-full">
                            Cash
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>📞 {cust.phone}</span>
                        {cust.city && <span>· 📍 {cust.city}</span>}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-2">
                      <div className={`text-xs font-bold ${Number(cust.currentDue) > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                        Due: ₹{Number(cust.currentDue).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Trays: {cust.outstandingTrays}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Customer Highlight Card */}
      {selectedCustomer && (
        <div className="mt-3 p-3 bg-slate-50/80 rounded-lg border border-slate-200/70 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-sm">{selectedCustomer.name}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
              {selectedCustomer.customerType}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600 border-t border-slate-200/60">
            <div>
              <span className="text-slate-400">Mobile: </span>
              <span className="font-medium text-slate-800">{selectedCustomer.phone}</span>
            </div>
            <div>
              <span className="text-slate-400">Credit Limit: </span>
              <span className="font-medium text-slate-800">
                ₹{Number(selectedCustomer.creditLimit).toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Address: </span>
              <span className="font-medium text-slate-800 truncate block">
                {selectedCustomer.address || 'APMC Market'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Trays Due: </span>
              <span className="font-bold text-amber-700">
                {customerBalance ? customerBalance.outstandingTrays : selectedCustomer.outstandingTrays}
              </span>
            </div>
          </div>

          {/* Previous Due Alert Bar */}
          {selectedCustomer.customerType !== 'WALK_IN' && (
            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500">Previous Due: </span>
                <span className="text-sm font-extrabold text-rose-600 ml-1">
                  ₹{Number(customerBalance ? customerBalance.previousDue : selectedCustomer.currentDue).toLocaleString('en-IN')}
                </span>
              </div>
              {onOpenDueCollection && Number(customerBalance ? customerBalance.previousDue : selectedCustomer.currentDue) > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenDueCollection(selectedCustomer)}
                  className="text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-2 py-1 rounded shadow-2xs transition-colors"
                >
                  Collect Due Only
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add New Customer Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Add New Customer</h3>
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Ramesh Fruits"
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Customer Code</label>
                  <input
                    type="text"
                    value={newCustCode}
                    onChange={(e) => setNewCustCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Customer Type</label>
                  <select
                    value={newCustType}
                    onChange={(e) => setNewCustType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-slate-900"
                  >
                    <option value="WHOLESALE">Wholesale</option>
                    <option value="REGULAR">Regular Retail</option>
                    <option value="WALK_IN">Walk-in Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    value={newCustCreditLimit}
                    onChange={(e) => setNewCustCreditLimit(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Shop / Delivery Address</label>
                <textarea
                  rows={2}
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="Gala #, APMC Market, City..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCustomerMutation.isPending}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {createCustomerMutation.isPending ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
