import React from 'react';
import type { HeldInvoice } from '../types/billing';
import { XIcon, RotateCcwIcon, Trash2Icon } from '../../../components/icons';

interface HoldInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  heldInvoices: HeldInvoice[];
  onRestore: (held: HeldInvoice) => void;
  onDelete: (id: string) => void;
}

export const HoldInvoiceModal: React.FC<HoldInvoiceModalProps> = ({
  isOpen,
  onClose,
  heldInvoices,
  onRestore,
  onDelete,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <RotateCcwIcon className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">Held Invoices (F6)</h3>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.2 rounded-full font-bold">
              {heldInvoices.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 max-h-80 overflow-y-auto divide-y divide-slate-100">
          {heldInvoices.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No bills currently held on this terminal.
            </div>
          ) : (
            heldInvoices.map((held) => (
              <div
                key={held.id}
                className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {held.customerName}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>⏰ {held.timestamp}</span>
                    <span>· 📦 {held.itemCount} items</span>
                    <span className="font-bold text-slate-800 font-mono">
                      ₹{held.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onRestore(held);
                      onClose();
                    }}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-2xs"
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(held.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                    title="Discard"
                  >
                    <Trash2Icon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

