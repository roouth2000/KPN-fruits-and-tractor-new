import React, { useState, useEffect, useRef } from 'react';
import type { BillingItem, Unit, SaleType, Product } from '../types/billing';
import { useProductSearch } from '../hooks/useProducts';
import { Trash2Icon, PackageIcon, SearchIcon } from '../../../components/icons';

interface BillingItemsTableProps {
  items: BillingItem[];
  availableUnits?: Unit[];
  onUpdateItem: (id: string, updates: Partial<BillingItem>) => void;
  onRemoveItem: (id: string) => void;
  onSelectProduct?: (product: Product) => string;
  onOpenProductModal?: () => void;
  saleType?: SaleType;
}

export const BillingItemsTable: React.FC<BillingItemsTableProps> = ({
  items,
  onUpdateItem,
  onRemoveItem,
  onSelectProduct,
  saleType = 'WHOLESALE',
}) => {
  // Focus management refs for Qty and Rate
  const qtyRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const rateRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const inputSearchRef = useRef<HTMLInputElement>(null);
  const dropdownContainerRef = useRef<HTMLTableCellElement>(null);
  const selectedRowRef = useRef<HTMLTableRowElement>(null);

  // In-table product search state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { searchTerm, setSearchTerm, products } = useProductSearch();

  // Scroll active row into view
  useEffect(() => {
    if (selectedRowRef.current) {
      selectedRowRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // F3 keyboard shortcut to focus the in-table input box
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        inputSearchRef.current?.focus();
        inputSearchRef.current?.select();
        setIsDropdownOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAddProduct = (product: Product) => {
    if (!onSelectProduct) return;
    const newId = onSelectProduct(product);
    setSearchTerm('');
    setIsDropdownOpen(false);
    // Focus quantity of the newly added item
    setTimeout(() => {
      const nextQty = qtyRefs.current[newId];
      if (nextQty) {
        nextQty.focus();
        nextQty.select();
      }
    }, 60);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsDropdownOpen(true);
      if (products.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % products.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsDropdownOpen(true);
      if (products.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + products.length) % products.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isDropdownOpen && products[selectedIndex]) {
        handleAddProduct(products[selectedIndex]);
      } else if (products.length > 0) {
        handleAddProduct(products[0]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsDropdownOpen(false);
    }
  };

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
            · Press <kbd className="font-mono bg-white border border-slate-300 px-1.5 py-0.5 rounded text-slate-700 font-bold shadow-2xs">F3</kbd> to focus entry
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              inputSearchRef.current?.focus();
              setIsDropdownOpen(true);
            }}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs rounded-lg transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            title="Focus input box to add product (F3)"
          >
            <PackageIcon className="w-3.5 h-3.5" />
            <span>+ Add Product</span>
            <kbd className="text-[10px] bg-amber-600 text-amber-100 px-1.5 py-0.2 rounded font-mono font-bold">
              F3
            </kbd>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto flex-1 min-h-[360px] pb-32">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
              <th className="py-2.5 px-3 w-10 text-center">S.No</th>
              <th className="py-2.5 px-3 w-28">Product Code</th>
              <th className="py-2.5 px-3 min-w-[200px]">Description</th>
              <th className="py-2.5 px-3 w-24">Variety</th>
              <th className="py-2.5 px-2 w-14 text-center">Grade</th>
              <th className="py-2.5 px-3 w-24 text-right">Quantity</th>
              <th className="py-2.5 px-3 w-24 text-right">SaleRate (₹)</th>
              <th className="py-2.5 px-4 w-32 text-right font-extrabold text-slate-800">Amount (₹)</th>
              <th className="py-2.5 px-2 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* Added Lines */}
            {items.map((item, index) => {
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

                  {/* Product Code */}
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                    {item.productCode || '—'}
                  </td>

                  {/* Fruit / Description */}
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          inputSearchRef.current?.focus();
                        }
                      }}
                      className="w-20 text-right font-semibold bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                    />
                  </td>

                  {/* Line Amount */}
                  <td className="py-2.5 px-4 text-right font-mono font-extrabold text-slate-900 text-sm">
                    ₹{item.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
            })}

            {/* In-Table Entry Row */}
            <tr className="bg-amber-50/20 border-t border-dashed border-amber-300">
              <td className="py-2.5 px-3 text-center text-amber-700 font-mono font-bold text-[11px]">
                {items.length + 1}
              </td>

              <td colSpan={4} className="py-2 px-3 relative" ref={dropdownContainerRef}>
                <div className="relative flex items-center">
                  <SearchIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                  <input
                    ref={inputSearchRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsDropdownOpen(true);
                      setSelectedIndex(0);
                    }}
                    onFocus={() => {
                      setIsDropdownOpen(true);
                    }}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Click & type product code or fruit name (e.g. 42, Apple, Kiwi)..."
                    className="w-full pl-8 pr-20 py-1.5 bg-white border border-amber-300 focus:border-amber-500 rounded-lg text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-xs"
                  />
                  <span className="absolute right-2 text-[10px] bg-amber-100 text-amber-800 font-mono px-1.5 py-0.5 rounded font-bold pointer-events-none">
                    Enter to Add
                  </span>
                </div>

                {/* Floating Product List in TABLE FORMAT */}
                {isDropdownOpen && products.length > 0 && (
                  <div className="absolute left-3 top-full mt-1 z-50 bg-white rounded-xl shadow-2xl border border-slate-300 w-[640px] max-w-[95vw] max-h-72 overflow-y-auto animate-in fade-in duration-100">
                    <div className="bg-slate-900 text-white px-3 py-1.5 flex items-center justify-between text-[11px] font-bold sticky top-0 z-10">
                      <span className="flex items-center gap-1.5">
                        <PackageIcon className="w-3.5 h-3.5 text-amber-400" />
                        <span>SELECT PRODUCT (Use ↑↓ to navigate, Enter to add)</span>
                      </span>
                      <span className="text-amber-400 font-mono">{products.length} found</span>
                    </div>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-7 z-10">
                          <th className="py-2 px-3">Product Code</th>
                          <th className="py-2 px-3">Description</th>
                          <th className="py-2 px-3">Variety</th>
                          <th className="py-2 px-2 text-center">Grade</th>
                          <th className="py-2 px-3 text-right">SaleRate</th>
                          <th className="py-2 px-3 text-right">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {products.map((p, idx) => {
                          const rate = saleType === 'RETAIL' ? p.retailRate : p.wholesaleRate;
                          const isSelected = idx === selectedIndex;
                          return (
                            <tr
                              key={p.id}
                              ref={isSelected ? selectedRowRef : null}
                              onMouseDown={(e) => {
                                e.preventDefault(); // prevent blur
                                handleAddProduct(p);
                              }}
                              onMouseEnter={() => setSelectedIndex(idx)}
                              className={`cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-amber-100/90 text-amber-950 font-bold'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <td className="py-2 px-3 font-bold text-slate-900 font-mono">{p.productCode}</td>
                              <td className="py-2 px-3 font-sans font-bold text-slate-900">{p.name}</td>
                              <td className="py-2 px-3 font-sans text-slate-600">{p.variety || '—'}</td>
                              <td className="py-2 px-2 text-center">
                                <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                                  {p.grade || 'A'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right text-emerald-700 font-bold">
                                ₹{Number(rate).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <span className={Number(p.currentStock) > 0 ? 'text-emerald-600 font-semibold' : 'text-rose-500 font-semibold'}>
                                  {p.currentStock} {p.defaultUnit}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </td>

              <td className="py-2.5 px-3 text-right text-slate-400 font-mono text-[11px]">—</td>
              <td className="py-2.5 px-3 text-right text-slate-400 font-mono text-[11px]">—</td>
              <td className="py-2.5 px-4 text-right text-slate-300 font-mono text-[11px]">₹0.00</td>
              <td className="py-2.5 px-2 text-center"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
