import React, { useState, useEffect, useCallback } from 'react';
import { ReportHeader } from './components/ReportHeader';
import { ReportKpis } from './components/ReportKpis';
import { ReportTable } from './components/ReportTable';
import type { ReportColumn, ReportKpi } from './types';
import { formatINR } from '../../utils/helpers';
import { reportApi } from '../../services/reportApi';
import { salesApi } from '../../modules/sales/services/salesApi';
import {
  PlusIcon,
  EditIcon,
  Trash2Icon,
  ReceiptTextIcon,
  CheckIcon,
  XIcon,
  BuildingIcon,
} from '../../components/icons';

interface SupplierDueRow {
  id: string;
  code: string;
  name: string;
  phone: string;
  city: string;
  address?: string;
  dueAmount: number;
  outstandingTrays: number;
  paymentTerms: string;
  aging: string;
  status: string;
  isActive?: boolean;
}

interface SupplierDueReportPageProps {
  onBackToDashboard: () => void;
  onExport: () => void;
  onSchedulePayment?: (supplier: string) => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const SupplierDueReportPage: React.FC<SupplierDueReportPageProps> = ({
  onBackToDashboard,
  onExport,
  onSchedulePayment,
  onShowToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRange, setSelectedRange] = useState('All Payables');
  const [kpis, setKpis] = useState<ReportKpi[]>([]);
  const [rows, setRows] = useState<SupplierDueRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierDueRow | null>(null);
  const [deleteSupplierModal, setDeleteSupplierModal] = useState<SupplierDueRow | null>(null);
  const [payingSupplier, setPayingSupplier] = useState<SupplierDueRow | null>(null);

  // Add Form State
  const [addName, setAddName] = useState('');
  const [addCode, setAddCode] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addCity, setAddCity] = useState('');
  const [addAddress, setAddAddress] = useState('');
  const [addOpeningBalance, setAddOpeningBalance] = useState<number>(0);
  const [addTrays, setAddTrays] = useState<number>(0);
  const [addNotes, setAddNotes] = useState('');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDueAmount, setEditDueAmount] = useState<number>(0);
  const [editTrays, setEditTrays] = useState<number>(0);
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Pay Form State
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<string>('BANK_TRANSFER');
  const [payRef, setPayRef] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  const loadData = useCallback(() => {
    setIsLoading(true);
    reportApi
      .getSupplierDueReport()
      .then((res) => {
        if (res) {
          setKpis(res.kpis || []);
          setRows(res.rows || []);
        }
      })
      .catch((err) => console.error('Failed to load supplier dues:', err))
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Add Modal
  const handleOpenAdd = () => {
    const autoCode = `SUPP-${Date.now().toString().slice(-4)}`;
    setAddCode(autoCode);
    setAddName('');
    setAddPhone('');
    setAddCity('Shimla');
    setAddAddress('');
    setAddOpeningBalance(0);
    setAddTrays(0);
    setAddNotes('Mandi Consignment Vendor');
    setIsAddModalOpen(true);
  };

  // Submit Add Supplier
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) {
      onShowToast?.('Missing Name', 'Supplier / Grower name is required.', 'warning');
      return;
    }

    setIsSubmittingAdd(true);
    try {
      await salesApi.createSupplier({
        name: addName.trim(),
        supplierCode: addCode.trim() || `SUPP-${Date.now().toString().slice(-4)}`,
        phone: addPhone.trim(),
        city: addCity.trim(),
        address: addAddress.trim(),
        openingBalance: Number(addOpeningBalance) || 0,
        outstandingTrays: Number(addTrays) || 0,
        notes: addNotes.trim(),
        isActive: true,
      } as any);

      onShowToast?.(
        'Supplier Registered',
        `Grower ${addName.trim()} (${addCode}) successfully added to accounts payable roster.`,
        'success'
      );
      setIsAddModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error('Failed to create supplier:', err);
      const msg = err.response?.data?.message || err.message || 'Error registering supplier';
      onShowToast?.('Registration Failed', msg, 'warning');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (supplier: SupplierDueRow) => {
    setEditingSupplier(supplier);
    setEditName(supplier.name || '');
    setEditCode(supplier.code || '');
    setEditPhone(supplier.phone || '');
    setEditCity(supplier.city || '');
    setEditAddress(supplier.address || '');
    setEditDueAmount(supplier.dueAmount || 0);
    setEditTrays(supplier.outstandingTrays || 0);
    setEditIsActive(supplier.isActive !== false);
  };

  // Submit Edit Supplier
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;

    setIsSubmittingEdit(true);
    try {
      await salesApi.updateSupplier(parseInt(editingSupplier.id, 10), {
        name: editName.trim(),
        supplierCode: editCode.trim(),
        phone: editPhone.trim(),
        city: editCity.trim(),
        address: editAddress.trim(),
        currentDue: Number(editDueAmount),
        outstandingTrays: Number(editTrays),
        isActive: editIsActive,
      });

      onShowToast?.(
        'Supplier Updated',
        `Details for ${editName} (${editCode}) updated successfully.`,
        'success'
      );
      setEditingSupplier(null);
      loadData();
    } catch (err: any) {
      console.error('Failed to update supplier:', err);
      const msg = err.response?.data?.message || err.message || 'Error updating supplier';
      onShowToast?.('Update Failed', msg, 'warning');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Confirm Delete Supplier
  const handleConfirmDelete = async () => {
    if (!deleteSupplierModal) return;

    try {
      const res = await salesApi.deleteSupplier(parseInt(deleteSupplierModal.id, 10));
      onShowToast?.(
        'Supplier Removed',
        res?.message || `Supplier ${deleteSupplierModal.name} was removed from the roster.`,
        'success'
      );
      setDeleteSupplierModal(null);
      loadData();
    } catch (err: any) {
      console.error('Failed to delete supplier:', err);
      const msg = err.response?.data?.message || err.message || 'Error removing supplier';
      onShowToast?.('Delete Failed', msg, 'warning');
    }
  };

  // Open Pay Vendor Modal
  const handleOpenPay = (supplier: SupplierDueRow) => {
    setPayingSupplier(supplier);
    setPayAmount(supplier.dueAmount > 0 ? supplier.dueAmount : 10000);
    setPayMode('BANK_TRANSFER');
    setPayRef(`DISB-${Date.now().toString().slice(-4)}`);
    setPayNotes('Weekly Mandi Consignment Settlement');
  };

  // Submit Pay Vendor
  const handleSavePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSupplier) return;

    if (payAmount <= 0) {
      onShowToast?.('Invalid Amount', 'Please specify a positive disbursement amount.', 'warning');
      return;
    }

    setIsSubmittingPay(true);
    try {
      await salesApi.recordSupplierPayment(parseInt(payingSupplier.id, 10), {
        amount: Number(payAmount),
        paymentMode: payMode,
        reference: payRef.trim(),
        notes: payNotes.trim(),
      });

      onShowToast?.(
        'Disbursement Recorded',
        `Payment of ${formatINR(payAmount)} to ${payingSupplier.name} recorded in vendor ledger.`,
        'success'
      );
      onSchedulePayment?.(payingSupplier.name);
      setPayingSupplier(null);
      loadData();
    } catch (err: any) {
      console.error('Failed to disburse payment:', err);
      const msg = err.response?.data?.message || err.message || 'Error processing payment';
      onShowToast?.('Disbursement Failed', msg, 'warning');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const filtered = rows.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: ReportColumn<SupplierDueRow>[] = [
    {
      key: 'code',
      header: 'Supplier Code',
      render: (row) => <span className="font-mono font-bold text-slate-900">{row.code}</span>,
    },
    {
      key: 'name',
      header: 'Grower / Supplier Name',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.name}</div>
          <div className="text-[11px] text-slate-400">
            {row.phone} · {row.city}
          </div>
        </div>
      ),
    },
    {
      key: 'paymentTerms',
      header: 'Settlement Terms',
      render: (row) => <span className="text-xs text-slate-600">{row.paymentTerms}</span>,
    },
    {
      key: 'outstandingTrays',
      header: 'Grower Crates in Mandi',
      align: 'center',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          {row.outstandingTrays} Trays
        </span>
      ),
    },
    {
      key: 'dueAmount',
      header: 'Payable Balance',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold text-slate-900">
          {formatINR(row.dueAmount)}
        </span>
      ),
    },
    {
      key: 'aging',
      header: 'Due Aging',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
          {row.aging}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Payment Status',
      render: (row) => {
        const isSettled = row.status === 'Settled';
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
              isSettled
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {row.status}
          </span>
        );
      },
    },
    {
      key: 'id',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenPay(row)}
            className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
            title={`Pay / Disburse to ${row.name}`}
          >
            Pay Vendor
          </button>
          <button
            type="button"
            onClick={() => handleOpenEdit(row)}
            className="p-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg transition-colors cursor-pointer"
            title={`Edit ${row.name}`}
          >
            <EditIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteSupplierModal(row)}
            className="p-1 text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
            title={`Delete ${row.name}`}
          >
            <Trash2Icon className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Supplier & Grower Payables"
        description="Weekly Mandi disbursement schedules, orchard consignments, and crate returns to farm transport."
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
        onBackToDashboard={onBackToDashboard}
        onExport={onExport}
      >
        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>+ Add Supplier / Grower</span>
        </button>
      </ReportHeader>

      <ReportKpis kpis={kpis} />

      <ReportTable
        title="Supplier Accounts Payable Roster"
        subtitle={
          isLoading
            ? 'Fetching live supplier ledger records...'
            : `${filtered.length} suppliers and grower cooperatives registered`
        }
        columns={columns}
        data={filtered}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Filter suppliers by name or city..."
      />

      {/* ========================================================= */}
      {/* MODAL 1: ADD SUPPLIER / GROWER */}
      {/* ========================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <BuildingIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Register New Supplier / Grower</h3>
                  <p className="text-xs text-slate-400">Add an orchard grower or cooperative to Mandi roster</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Grower / Cooperative Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Sahyadri Farmers Producer Co"
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supplier Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={addCode}
                    onChange={(e) => setAddCode(e.target.value)}
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    placeholder="e.g. 9822012345"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    APMC Yard / City
                  </label>
                  <input
                    type="text"
                    value={addCity}
                    onChange={(e) => setAddCity(e.target.value)}
                    placeholder="e.g. Nashik, MH"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Payable Balance (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={addOpeningBalance}
                    onChange={(e) => setAddOpeningBalance(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Farm / Orchard / Mandi Stall Address
                  </label>
                  <input
                    type="text"
                    value={addAddress}
                    onChange={(e) => setAddAddress(e.target.value)}
                    placeholder="e.g. Mohadi, Dindori Road, Nashik, MH"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Outstanding Crates (Trays)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addTrays}
                    onChange={(e) => setAddTrays(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Consignment Notes
                  </label>
                  <input
                    type="text"
                    value={addNotes}
                    onChange={(e) => setAddNotes(e.target.value)}
                    placeholder="e.g. Royal Gala & Alphonso shipments"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingAdd ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <PlusIcon className="w-3.5 h-3.5 text-white" />
                      <span>Register Supplier</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: EDIT SUPPLIER */}
      {/* ========================================================= */}
      {editingSupplier && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <EditIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Supplier: {editingSupplier.name}</h3>
                  <p className="text-xs text-slate-400">Update contact, payable dues, and crate balance</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Grower / Cooperative Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supplier Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    APMC Yard / City
                  </label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Payable Due (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editDueAmount}
                    onChange={(e) => setEditDueAmount(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Address / Farm Location
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Outstanding Crates / Trays
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editTrays}
                    onChange={(e) => setEditTrays(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editIsActive}
                      onChange={(e) => setEditIsActive(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-slate-700">Active Trading Vendor</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
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
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-3.5 h-3.5 text-white" />
                      <span>Update Supplier</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: DELETE SUPPLIER CONFIRMATION */}
      {/* ========================================================= */}
      {deleteSupplierModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2Icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Delete Supplier?</h3>
                  <p className="text-xs text-slate-400">{deleteSupplierModal.name} ({deleteSupplierModal.code})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteSupplierModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Supplier Code:</span>
                  <span className="font-mono font-bold text-slate-900">{deleteSupplierModal.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payable Due:</span>
                  <span className="font-mono font-bold text-rose-600">{formatINR(deleteSupplierModal.dueAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mandi Crates:</span>
                  <span className="font-mono font-semibold text-amber-700">{deleteSupplierModal.outstandingTrays} Trays</span>
                </div>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 leading-relaxed">
                If inventory batches or financial ledger movements exist for this supplier, the system will safely deactivate and archive the record to maintain historical accounting auditability.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteSupplierModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2Icon className="w-3.5 h-3.5 text-white" />
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: PAY VENDOR DISBURSEMENT */}
      {/* ========================================================= */}
      {payingSupplier && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ReceiptTextIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Disburse Payment to Vendor</h3>
                  <p className="text-xs text-slate-400">{payingSupplier.name} ({payingSupplier.code})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayingSupplier(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePay} className="mt-4 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Outstanding Payable Balance</span>
                  <span className="text-base font-bold font-mono text-slate-900">
                    {formatINR(payingSupplier.dueAmount)}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Verified Ledger
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full text-base font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="BANK_TRANSFER">Bank NEFT/RTGS</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CASH">Cash Counter</option>
                    <option value="CHEQUE">Bank Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reference / UTR / Cheque #
                  </label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="e.g. UTR-9821829"
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Disbursement Notes
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Consignment lot #MH-12 full settlement"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPayingSupplier(null)}
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
                      <ReceiptTextIcon className="w-3.5 h-3.5 text-white" />
                      <span>Confirm Disbursement</span>
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
