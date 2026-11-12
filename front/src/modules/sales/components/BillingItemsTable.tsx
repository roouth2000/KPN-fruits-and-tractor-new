import React from 'react';
import type { BillingItem, Unit } from '../types/billing';
import { Trash2Icon, PackageIcon } from '../../../components/icons';

interface BillingItemsTableProps {
  items: BillingItem[];
  availableUnits?: Unit[];
  onUpdateItem: (id: string, updates: Partial<BillingItem>) => void;
  onRemoveItem: (id: string) => void;
}

export const BillingItemsTable: React.FC<BillingItemsTableProps> = ({
  items,
  onUpdateItem,
  onRemoveItem,
}) => {
  const handleQuantityChange = (item: BillingItem, newQty: number) => {
    const qty = Math.max(0, newQty);
    const baseQuantity = Math.round(qty * item.conversionFactor * 1000) / 1000;
    const totalAmount = Math.round(qty * item.rate * 100) / 100;

    onUpdateItem(item.id, {
      quantity: qty,
      baseQuantity,
      discount: 0,
      taxRate: 0,
      taxAmount: 0,
      totalAmount,
      trayQuantity: Math.ceil(qty),
    });
  };

  const handleRateChange = (item: BillingItem, newRate: number) => {
    const rate = Math.max(0, newRate);
    const totalAmount = Math.round(item.quantity * rate * 100) / 100;

    onUpdateItem(item.id, {
      rate,
      discount: 0,
      taxRate: 0,
      taxAmount: 0,
      totalAmount,
    });
  };

  const handleTrayChange = (item: BillingItem, newTray: number) => {
    onUpdateItem(item.id, {
      trayQuantity: Math.max(0, newTray),
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col flex-1">
      <div className="overflow-x-auto flex-1 min-h-[300px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
              <th className="py-2.5 px-3 w-8 text-center">#</th>
              <th className="py-2.5 px-3 min-w-[140px]">Fruit / Product</th>
              <th className="py-2.5 px-2 w-20">Variety</th>
              <th className="py-2.5 px-2 w-16 text-center">Grade</th>
              <th className="py-2.5 px-2 w-20">Unit</th>
              <th className="py-2.5 px-2 w-24 text-right">Qty</th>
              <th className="py-2.5 px-2 w-24 text-right">Rate (₹)</th>
              <th className="py-2.5 px-3 w-28 text-right font-extrabold text-slate-800">Amount (₹)</th>
              <th className="py-2.5 px-2 w-16 text-center">Tray</th>
              <th className="py-2.5 px-2 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <PackageIcon className="w-8 h-8 text-slate-300 stroke-1" />
                    <p className="font-medium text-xs">No fruit items added to invoice yet</p>
                    <p className="text-[11px] text-slate-400">
                      Scan a barcode or press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-[10px]">F3</kbd> to search products
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const isInsufficientStock = item.quantity > item.currentStock;

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isInsufficientStock ? 'bg-rose-50/40' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {index + 1}
                    </td>

                    {/* Fruit / Product Name */}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{item.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Base: {item.baseQuantity} {item.baseUnit} · Stk: {item.currentStock} {item.unit}
                      </div>
                      {isInsufficientStock && (
                        <div className="text-[10px] font-bold text-rose-600">
                          ⚠️ Exceeds available stock ({item.currentStock})
                        </div>
                      )}
                    </td>

                    {/* Variety */}
                    <td className="py-2.5 px-2 text-slate-600 font-medium">
                      {item.variety}
                    </td>

                    {/* Grade */}
                    <td className="py-2.5 px-2 text-center">
                      <span className="inline-block text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200/60">
                        {item.grade}
                      </span>
                    </td>

                    {/* Unit */}
                    <td className="py-2.5 px-2">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {item.unit}
                      </span>
                    </td>

                    {/* Qty Input */}
                    <td className="py-2.5 px-2 text-right">
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={item.quantity || ''}
                        onChange={(e) => handleQuantityChange(item, parseFloat(e.target.value) || 0)}
                        className={`w-20 text-right font-bold bg-slate-50 border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 ${
                          isInsufficientStock
                            ? 'border-rose-400 bg-rose-50 text-rose-700 focus:ring-rose-500'
                            : 'border-slate-200 text-slate-900 focus:border-slate-900 focus:ring-slate-900'
                        }`}
                      />
                    </td>

                    {/* Rate Input */}
                    <td className="py-2.5 px-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.rate || ''}
                        onChange={(e) => handleRateChange(item, parseFloat(e.target.value) || 0)}
                        className="w-20 text-right font-semibold bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                      />
                    </td>

                    {/* Line Amount */}
                    <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900 text-sm">
                      ₹{item.totalAmount.toLocaleString('en-IN')}
                    </td>

                    {/* Tray */}
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={item.trayQuantity || 0}
                        onChange={(e) => handleTrayChange(item, parseInt(e.target.value, 10) || 0)}
                        className="w-12 text-center font-bold bg-amber-50/60 border border-amber-200/80 text-amber-900 rounded-md px-1 py-1 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </td>

                    {/* Remove Action */}
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        title="Remove product"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                      >
                        <Trash2Icon className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
