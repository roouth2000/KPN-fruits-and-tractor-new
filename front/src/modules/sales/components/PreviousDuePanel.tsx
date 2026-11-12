import React, { useState } from 'react';
import type { Customer } from '../types/billing';
import { DollarSignIcon, XIcon, CheckSquareIcon } from '../../../components/icons';

interface PreviousDuePanelProps {
  customer: Customer | null;
  previousDue: number;
  onCollectDue: (payload: {
    customerId: number;
    amount: number;
    paymentMode: string;
    transactionRef?: string;
    notes?: string;
  }) => Promise<any>;
}

export const PreviousDuePanel: React.FC<PreviousDuePanelProps> = ({
  customer,
  previousDue,
  onCollectDue,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState<number>(previousDue);
  const [paymentMode, setPaymentMode] = useState<string>('CASH');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);

  if (!customer || customer.customerType === 'WALK_IN' || previousDue <= 0) {
    return null;
  }

  const handleOpen = () => {
    setAmount(previousDue);
    setReceiptData(null);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    try {
      setIsSubmitting(true);
      const res = await onCollectDue({
        customerId: customer.id,
        amount,
        paymentMode,
        transactionRef,
        notes,
      });
      setReceiptData(res);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Payment collection failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold text-amber-900 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Outstanding Customer Ledger Due</span>
          </div>
          <div className="text-base font-extrabold text-amber-950 font-mono mt-0.5">
            ₹{previousDue.toLocaleString('en-IN')}
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpen}
          className="text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 border border-amber-300 px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
        >
          Collect Due Only
        </button>
      </div>

      {/* Due Collection Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <DollarSignIcon className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Collect Previous Due (Scenario 54)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {receiptData ? (
              <div className="p-5 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckSquareIcon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Payment Receipt Generated</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Receipt #{receiptData.paymentNumber}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5 text-left border border-slate-200/70">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span className="font-semibold text-slate-900">{receiptData.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Previous Due:</span>
                    <span className="font-mono text-slate-700">₹{receiptData.previousDue?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount Paid:</span>
                    <span className="font-mono font-bold text-emerald-600">₹{receiptData.paidAmount?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1.5">
                    <span className="font-semibold text-slate-700">Remaining Balance Due:</span>
                    <span className="font-mono font-extrabold text-rose-600">₹{receiptData.remainingDue?.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
                >
                  Close Receipt
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
                  <div className="flex justify-between text-slate-600">
                    <span>Customer:</span>
                    <span className="font-bold text-slate-900">{customer.name}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 mt-1">
                    <span>Outstanding Ledger Due:</span>
                    <span className="font-extrabold text-rose-600 font-mono">
                      ₹{previousDue.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Payment Amount to Collect (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={previousDue}
                    required
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full text-base font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                  <div className="flex gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setAmount(previousDue)}
                      className="text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded"
                    >
                      Full ₹{previousDue.toLocaleString('en-IN')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmount(Math.round(previousDue / 2))}
                      className="text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded"
                    >
                      Half ₹{Math.round(previousDue / 2).toLocaleString('en-IN')}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Payment Mode</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-900 focus:outline-none focus:border-slate-900"
                    >
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI / QR Code</option>
                      <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Transaction Ref / UTR</label>
                    <input
                      type="text"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="e.g. UPI-984210"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Notes / APMC Terminal</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Mandi counter collection..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || amount <= 0}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
                  >
                    {isSubmitting ? 'Recording Payment...' : `Confirm ₹${amount.toLocaleString('en-IN')} Payment`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

