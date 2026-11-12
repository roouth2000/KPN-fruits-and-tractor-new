import React, { useEffect } from 'react';
import type { SaleType } from '../types/billing';

interface InvoiceActionsProps {
  invoiceNumber: string;
  invoiceDate: string;
  saleType: SaleType;
  onChangeSaleType: (type: SaleType) => void;
  onChangeDate: (date: string) => void;
  onSaveDraft: () => void;
  onHoldInvoice: () => void;
  onOpenHeldModal: () => void;
  heldCount: number;
  onSaveInvoice: () => void;
  onSaveAndPrint: () => void;
  onResetInvoice: () => void;
  isSaving: boolean;
}

export const InvoiceActions: React.FC<InvoiceActionsProps> = ({
  invoiceNumber,
  invoiceDate,
  saleType,
  onChangeSaleType,
  onChangeDate,
  onSaveDraft,
  onHoldInvoice,
  onOpenHeldModal,
  heldCount,
  onSaveInvoice,
  onSaveAndPrint,
  onResetInvoice,
  isSaving,
}) => {
  // Global hotkeys: F5 (Hold), F6 (Retrieve), F8 (Save), F9 (Save & Print)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        onHoldInvoice();
      } else if (e.key === 'F6') {
        e.preventDefault();
        onOpenHeldModal();
      } else if (e.key === 'F8') {
        e.preventDefault();
        onSaveInvoice();
      } else if (e.key === 'F9') {
        e.preventDefault();
        onSaveAndPrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onHoldInvoice, onOpenHeldModal, onSaveInvoice, onSaveAndPrint]);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
      {/* Left: Invoice Number & Date & Sale Type */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Invoice #
          </span>
          <span className="font-mono font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
            {invoiceNumber}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Date
          </span>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => onChangeDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-900"
          />
        </div>

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        {/* Sale Type Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Type
          </span>
          <select
            value={saleType}
            onChange={(e) => onChangeSaleType(e.target.value as SaleType)}
            className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-900"
          >
            <option value="WHOLESALE">Wholesale Sale</option>
            <option value="RETAIL">Retail Counter</option>
            <option value="CASH">Cash Spot Sale</option>
            <option value="CREDIT">Credit Sale</option>
          </select>
        </div>
      </div>

      {/* Right: Action Buttons with Keyboard Badges */}
      <div className="flex items-center gap-2">
        {/* Hold Bill (F5) */}
        <button
          type="button"
          onClick={onHoldInvoice}
          title="Hold current invoice in memory (F5)"
          className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
        >
          <span>Hold</span>
          <kbd className="text-[10px] bg-white border border-slate-300 text-slate-500 px-1 rounded font-mono shadow-2xs">
            F5
          </kbd>
        </button>

        {/* Retrieve Held Bills (F6) */}
        <button
          type="button"
          onClick={onOpenHeldModal}
          title="View and restore held invoices (F6)"
          className="relative px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
        >
          <span>Held Bills</span>
          {heldCount > 0 && (
            <span className="bg-amber-500 text-white font-bold text-[10px] w-4 h-4 rounded-full inline-flex items-center justify-center">
              {heldCount}
            </span>
          )}
          <kbd className="text-[10px] bg-white border border-slate-300 text-slate-500 px-1 rounded font-mono shadow-2xs">
            F6
          </kbd>
        </button>

        {/* Save Draft */}
        <button
          type="button"
          disabled={isSaving}
          onClick={onSaveDraft}
          className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
        >
          Save Draft
        </button>

        {/* Cancel / Clear */}
        <button
          type="button"
          onClick={onResetInvoice}
          className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
        >
          Reset
        </button>

        {/* Save (F8) */}
        <button
          type="button"
          disabled={isSaving}
          onClick={onSaveInvoice}
          className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
        >
          <span>Save Invoice</span>
          <kbd className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-1 rounded font-mono">
            F8
          </kbd>
        </button>

        {/* Save & Print (F9) */}
        <button
          type="button"
          disabled={isSaving}
          onClick={onSaveAndPrint}
          className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
        >
          <span>Save & Print</span>
          <kbd className="text-[10px] bg-emerald-700 border border-emerald-600 text-emerald-100 px-1 rounded font-mono">
            F9
          </kbd>
        </button>
      </div>
    </div>
  );
};
