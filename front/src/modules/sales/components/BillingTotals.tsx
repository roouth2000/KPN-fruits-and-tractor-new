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
  // Canonical 7-Field Billing Calculation Engine
  const grossAmount = subtotal; // 1. Gross Amount = Sum of all product amounts
  const totalDiscount = itemDiscounts + (invoiceDiscount || 0); // 2. Discount = Total discount applied
  const totalTax = itemTaxes + (invoiceTax || 0);
  const netAmount = Math.max(0, grossAmount - totalDiscount + totalTax); // 3. Net Invoice Amount = Gross Amount - Discount (+ tax)
  const openingBalance = previousDue; // 4. Opening Balance = Customer's previous outstanding balance
  const totalOutstanding = openingBalance + netAmount; // 5. Total Outstanding = Opening Balance + Net Invoice Amount
  const amountPaid = totalPaid; // 6. Amount Paid = Payment received from the customer
  const closingBalance = totalOutstanding - amountPaid; // 7. Closing Balance = Total Outstanding - Amount Paid

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs space-y-3 text-xs">
      <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
        <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500">
          Billing Calculation Summary
        </span>
        <span className="text-[10px] text-slate-400 font-mono">
          Prev Due + Net Sale - Paid = Due
        </span>
      </div>

      {/* 1. Gross Amount */}
      <div className="flex items-center justify-between text-slate-700">
        <span className="font-medium">Gross Amount</span>
        <span className="font-bold text-slate-900 font-mono">
          ₹{grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* 2. Discount */}
      <div className="flex items-center justify-between text-slate-700">
        <span className="flex items-center gap-1">
          <span className="font-medium">Discount</span>
          {itemDiscounts > 0 && (
            <span className="text-[10px] text-slate-400 font-mono">
              (₹{itemDiscounts.toFixed(2)} item)
            </span>
          )}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-mono">-₹</span>
          <input
            type="number"
            min="0"
            value={invoiceDiscount || ''}
            onChange={(e) => onChangeInvoiceDiscount(parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="w-20 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs text-rose-600 font-bold font-mono focus:outline-hidden focus:border-slate-900"
          />
        </div>
      </div>

      {/* Optional Taxes if enabled */}
      {totalTax > 0 && (
        <div className="flex items-center justify-between text-slate-600">
          <span className="flex items-center gap-1">
            <span>Taxes (GST):</span>
            {itemTaxes > 0 && (
              <span className="text-[10px] text-slate-400 font-mono">
                (₹{itemTaxes.toFixed(2)} line)
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
              className="w-20 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-800 font-mono focus:outline-hidden focus:border-slate-900"
            />
          </div>
        </div>
      )}

      {/* 3. Net Amount */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-900">
        <span className="font-bold text-xs">Net Amount</span>
        <span className="font-extrabold text-sm font-mono text-emerald-700">
          ₹{netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* 4. Opening Balance */}
      <div className="flex items-center justify-between text-slate-700">
        <span className="font-medium">Previous / Opening Balance</span>
        <span className={`font-mono font-bold ${openingBalance > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
          ₹{openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* 5. Total Outstanding */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-900 bg-slate-50/70 -mx-4 px-4 py-2">
        <div>
          <span className="font-bold text-xs block text-slate-800">Total Outstanding</span>
          <span className="text-[10px] text-slate-500">Opening Balance + Net Amount</span>
        </div>
        <span className="font-extrabold text-base font-mono text-slate-900">
          ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* 6. Amount Paid */}
      <div className="flex items-center justify-between text-emerald-700">
        <span className="font-medium">Amount Paid</span>
        <span className="font-bold font-mono">
          -₹{amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* 7. Closing Balance */}
      <div className="pt-2.5 border-t-2 border-slate-200 bg-slate-50 -mx-4 -mb-4 p-4 rounded-b-xl space-y-1.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Closing / Remaining Balance
            </div>
            <div className="text-[10px] text-slate-500">
              Total Outstanding - Amount Paid
            </div>
          </div>
          <div
            className={`text-xl font-extrabold font-mono ${
              closingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            ₹{closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Dynamic Formula Display */}
        <div className="pt-1.5 border-t border-slate-200 text-[10px] text-slate-500 font-mono text-center truncate">
          ₹{openingBalance.toLocaleString('en-IN')} (Open) + ₹{netAmount.toLocaleString('en-IN')} (Net) - ₹{amountPaid.toLocaleString('en-IN')} (Paid) = <span className="font-bold text-slate-800">₹{closingBalance.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
};

