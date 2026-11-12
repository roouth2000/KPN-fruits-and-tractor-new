import React from 'react';

interface BillingTotalsProps {
  subtotal: number;
  invoiceDiscount: number;
  itemDiscounts: number;
  invoiceTax: number;
  itemTaxes: number;
  previousDue: number;
  totalPaid: number;
  onChangeInvoiceDiscount: (val: number) => void;
  onChangeInvoiceTax: (val: number) => void;
}

export const BillingTotals: React.FC<BillingTotalsProps> = ({
  subtotal,
  invoiceDiscount,
  itemDiscounts,
  invoiceTax,
  itemTaxes,
  previousDue,
  totalPaid,
  onChangeInvoiceDiscount,
  onChangeInvoiceTax,
}) => {
  const totalDiscount = itemDiscounts + (invoiceDiscount || 0);
  const totalTax = itemTaxes + (invoiceTax || 0);
  const currentSaleTotal = Math.max(0, subtotal - totalDiscount + totalTax);
  const totalPayable = previousDue + currentSaleTotal;
  const balanceDue = Math.max(0, totalPayable - totalPaid);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs space-y-2.5 text-xs">
      <div className="flex items-center justify-between text-slate-600">
        <span>Items Subtotal:</span>
        <span className="font-semibold text-slate-800 font-mono">
          ₹{subtotal.toLocaleString('en-IN')}
        </span>
      </div>

      {/* Invoice Discount Input */}
      <div className="flex items-center justify-between text-slate-600">
        <span className="flex items-center gap-1">
          <span>Overall Discount:</span>
          {itemDiscounts > 0 && (
            <span className="text-[10px] text-slate-400 font-mono">
              (₹{itemDiscounts} item disc)
            </span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-slate-400">₹</span>
          <input
            type="number"
            min="0"
            value={invoiceDiscount || ''}
            onChange={(e) => onChangeInvoiceDiscount(parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="w-20 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-slate-900"
          />
        </div>
      </div>

      {/* Tax Input */}
      <div className="flex items-center justify-between text-slate-600">
        <span className="flex items-center gap-1">
          <span>Taxes (GST):</span>
          {itemTaxes > 0 && (
            <span className="text-[10px] text-slate-400 font-mono">
              (₹{itemTaxes} line taxes)
            </span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-slate-400">₹</span>
          <input
            type="number"
            min="0"
            value={invoiceTax || ''}
            onChange={(e) => onChangeInvoiceTax(parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="w-20 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-slate-900"
          />
        </div>
      </div>

      {/* Current Sale Grand Total */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-900">
        <span className="font-bold text-xs">Current Sale Grand Total:</span>
        <span className="font-extrabold text-base font-mono">
          ₹{currentSaleTotal.toLocaleString('en-IN')}
        </span>
      </div>

      {/* Previous Due */}
      {previousDue > 0 && (
        <div className="flex items-center justify-between text-rose-600 pt-1">
          <span className="font-semibold text-xs">Customer Previous Due:</span>
          <span className="font-bold text-xs font-mono">
            + ₹{previousDue.toLocaleString('en-IN')}
          </span>
        </div>
      )}

      {/* Total Payable (Scenario 8 & 52: Previous Due + Current Sale) */}
      <div className="pt-2 border-t-2 border-slate-200 flex items-center justify-between bg-slate-50 -mx-4 -mb-4 p-4 rounded-b-xl">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Total Payable (Due + Sale)
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono">
            ₹{totalPayable.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Remaining Due
          </div>
          <div
            className={`text-xl font-extrabold font-mono ${
              balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            ₹{balanceDue.toLocaleString('en-IN')}
          </div>
        </div>
      </div>
    </div>
  );
};

