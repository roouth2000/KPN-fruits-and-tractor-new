import React, { useEffect, useRef } from 'react';
import type { PaymentEntry, PaymentMode } from '../types/billing';
import { DollarSignIcon, PlusIcon, Trash2Icon } from '../../../components/icons';

interface PaymentPanelProps {
  totalPayable: number;
  payments: PaymentEntry[];
  onChangePayments: (payments: PaymentEntry[]) => void;
}

export const PaymentPanel: React.FC<PaymentPanelProps> = ({
  totalPayable,
  payments,
  onChangePayments,
}) => {
  const firstPaymentInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut F4 to focus payment input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault();
        firstPaymentInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(String(p.amount)) || 0), 0);
  const remainingDue = Math.max(0, totalPayable - totalPaid);
  const changeReturn = Math.max(0, totalPaid - totalPayable);

  const handleAddPaymentRow = () => {
    const remaining = Math.max(0, totalPayable - totalPaid);
    onChangePayments([
      ...payments,
      { method: 'UPI', amount: remaining, transactionRef: '' },
    ]);
  };

  const handleUpdatePayment = (index: number, updates: Partial<PaymentEntry>) => {
    const updated = [...payments];
    updated[index] = { ...updated[index], ...updates };
    onChangePayments(updated);
  };

  const handleRemovePayment = (index: number) => {
    const updated = payments.filter((_, idx) => idx !== index);
    onChangePayments(updated);
  };

  const handleQuickPayFull = (method: PaymentMode) => {
    onChangePayments([
      { method, amount: totalPayable },
    ]);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <DollarSignIcon className="w-3.5 h-3.5 text-slate-500" />
          <span>Payment Breakdown (F4)</span>
        </label>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleQuickPayFull('CASH')}
            className="text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 px-2 py-0.5 rounded transition-colors"
          >
            Cash Full
          </button>
          <button
            type="button"
            onClick={() => handleQuickPayFull('UPI')}
            className="text-[10px] font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200/60 px-2 py-0.5 rounded transition-colors"
          >
            UPI Full
          </button>
        </div>
      </div>

      {/* Payment Rows */}
      <div className="space-y-2">
        {payments.map((p, index) => (
          <div key={index} className="flex items-center gap-2">
            <select
              value={p.method}
              onChange={(e) => handleUpdatePayment(index, { method: e.target.value as PaymentMode })}
              className="w-28 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-900"
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI / QR</option>
              <option value="BANK_TRANSFER">Bank / NEFT</option>
              <option value="CHEQUE">Cheque</option>
            </select>

            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs text-slate-400 font-bold">
                ₹
              </span>
              <input
                ref={index === 0 ? firstPaymentInputRef : undefined}
                type="number"
                min="0"
                step="any"
                value={p.amount || ''}
                onChange={(e) => handleUpdatePayment(index, { amount: parseFloat(e.target.value) || 0 })}
                placeholder="Amount"
                className="w-full text-right font-bold text-xs bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>

            {p.method !== 'CASH' && (
              <input
                type="text"
                value={p.transactionRef || ''}
                onChange={(e) => handleUpdatePayment(index, { transactionRef: e.target.value })}
                placeholder="UTR / Ref #"
                className="w-28 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 focus:outline-none focus:border-slate-900"
              />
            )}

            {payments.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemovePayment(index)}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
              >
                <Trash2Icon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAddPaymentRow}
        className="w-full py-1 border border-dashed border-slate-300 hover:border-slate-400 text-slate-600 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors"
      >
        <PlusIcon className="w-3 h-3" />
        <span>Add Split Payment Method</span>
      </button>

      {/* Payment Settlement Summary */}
      <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
          <div className="text-[10px] text-slate-400">Total Paid</div>
          <div className="font-extrabold text-emerald-600 font-mono">
            ₹{totalPaid.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
          <div className="text-[10px] text-slate-400">Remaining Due</div>
          <div className={`font-extrabold font-mono ${remainingDue > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
            ₹{remainingDue.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
          <div className="text-[10px] text-slate-400">Change Return</div>
          <div className={`font-extrabold font-mono ${changeReturn > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
            ₹{changeReturn.toLocaleString('en-IN')}
          </div>
        </div>
      </div>
    </div>
  );
};

