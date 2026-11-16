import React, { useRef } from 'react';
import type { BillingItem, Unit, SaleType } from '../types/billing';
import { Trash2Icon, PackageIcon } from '../../../components/icons';

interface BillingItemsTableProps {
  items: BillingItem[];
  availableUnits?: Unit[];
  onUpdateItem: (id: string, updates: Partial<BillingItem>) => void;
  onRemoveItem: (id: string) => void;
  onOpenProductModal?: () => void;
  saleType?: SaleType;
}

export const BillingItemsTable: React.FC<BillingItemsTableProps> = ({
  items,
  onUpdateItem,
  onRemoveItem,
  onOpenProductModal,
}) => {
  // Focus management refs for Qty and Rate
  const qtyRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const rateRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
      trayQuantity: 0,
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

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs relative flex flex-col flex-1">
      {/* Table Toolbar Header */}
      <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
            Fruit Items
          </span>
          <span className="bg-slate-200 text-slate-700 font-mono text-[11px] font-bold px-2 py-0.5 rounded-full">
            {items.length}
          </span>
          <span className="text-[11px] text-slate-500 font-normal ml-1">
            · Press <kbd className="font-mono bg-white border border-slate-300 px-1.5 py-0.5 rounded text-slate-700 font-bold shadow-2xs">F3</kbd> to search products
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenProductModal}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs rounded-lg transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            title="Search and add fruit products (F3)"
          >
            <PackageIcon className="w-3.5 h-3.5" />
            <span>+ Add Product</span>
            <kbd className="text-[10px] bg-amber-600 text-amber-100 px-1.5 py-0.2 rounded font-mono font-bold">
              F3
            </kbd>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto flex-1 min-h-[360px] pb-6">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3 min-w-[200px]">Fruit / Product</th>
              <th className="py-2.5 px-3 w-28">Variety</th>
              <th className="py-2.5 px-2 w-16 text-center">Grade</th>
              <th className="py-2.5 px-3 w-24 text-right">Qty</th>
              <th className="py-2.5 px-3 w-24 text-right">Rate (₹)</th>
              <th className="py-2.5 px-4 w-32 text-right font-extrabold text-slate-800">Amount (₹)</th>
              <th className="py-2.5 px-2 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-20 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <PackageIcon className="w-10 h-10 text-slate-300 stroke-1" />
                    <p className="font-semibold text-sm text-slate-700">No fruit items added to invoice yet</p>
                    <p className="text-xs text-slate-400">Scan barcode or press F3 to search and add products</p>
                    <button
                      type="button"
                      onClick={onOpenProductModal}
                      className="mt-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      <PackageIcon className="w-4 h-4 text-amber-400" />
                      <span>Search Fruit Products</span>
                      <kbd className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                        F3
                      </kbd>
                    </button>
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
                      <div className="font-bold text-slate-900">{item.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Stk: {item.currentStock} {item.unit} · Base: {item.baseQuantity} {item.baseUnit}
                      </div>
                      {isInsufficientStock && (
                        <div className="text-[10px] font-bold text-rose-600">
                          ⚠️ Exceeds stock ({item.currentStock})
                        </div>
                      )}
                    </td>

                    {/* Variety */}
                    <td className="py-2.5 px-3 text-slate-600 font-medium">
                      {item.variety || '—'}
                    </td>

                    {/* Grade */}
                    <td className="py-2.5 px-2 text-center">
                      <span className="inline-block text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200/60 font-mono">
                        {item.grade || 'A'}
                      </span>
                    </td>

                    {/* Qty Input */}
                    <td className="py-2.5 px-3 text-right">
                      <input
                        ref={(el) => {
                          qtyRefs.current[item.id] = el;
                        }}
                        type="number"
                        min="0.1"
                        step="any"
                        value={item.quantity || ''}
                        onChange={(e) => handleQuantityChange(item, parseFloat(e.target.value) || 0)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const nextRate = rateRefs.current[item.id];
                            if (nextRate) {
                              nextRate.focus();
                              nextRate.select();
                            }
                          }
                        }}
                        className={`w-20 text-right font-bold bg-slate-50 border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 ${
                          isInsufficientStock
                            ? 'border-rose-400 bg-rose-50 text-rose-700 focus:ring-rose-500'
                            : 'border-slate-300 text-slate-900 focus:border-slate-900 focus:ring-slate-900/10'
                        }`}
                      />
                    </td>

                    {/* Rate Input */}
                    <td className="py-2.5 px-3 text-right">
                      <input
                        ref={(el) => {
                          rateRefs.current[item.id] = el;
                        }}
                        type="number"
                        min="0"
                        step="any"
                        value={item.rate || ''}
                        onChange={(e) => handleRateChange(item, parseFloat(e.target.value) || 0)}
                        className="w-20 text-right font-semibold bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                      />
                    </td>

                    {/* Line Amount */}
                    <td className="py-2.5 px-4 text-right font-mono font-extrabold text-slate-900 text-sm">
                      ₹{item.totalAmount.toLocaleString('en-IN')}
                    </td>

                    {/* Remove Action */}
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        title="Remove product"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
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
