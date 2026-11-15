import React, { useState, useEffect, useRef } from 'react';
import type { BillingItem, Unit, Product, SaleType } from '../types/billing';
import { Trash2Icon, PackageIcon, EyeIcon } from '../../../components/icons';
import { useProductSearch } from '../hooks/useProducts';

interface BillingItemsTableProps {
  items: BillingItem[];
  availableUnits?: Unit[];
  onUpdateItem: (id: string, updates: Partial<BillingItem>) => void;
  onRemoveItem: (id: string) => void;
  onSelectProduct: (product: Product) => string | void;
  saleType?: SaleType;
}

export const BillingItemsTable: React.FC<BillingItemsTableProps> = ({
  items,
  onUpdateItem,
  onRemoveItem,
  onSelectProduct,
}) => {
  // Option to show/hide Unit & Tray columns (default Hidden / removed as requested)
  const [showUnitAndTray, setShowUnitAndTray] = useState<boolean>(() => {
    return localStorage.getItem('kbn_billing_show_unit_tray') === 'true';
  });

  const toggleUnitAndTray = () => {
    setShowUnitAndTray((prev) => {
      const next = !prev;
      localStorage.setItem('kbn_billing_show_unit_tray', String(next));
      return next;
    });
  };

  // Inline Product Search inside the table
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inlineSearchInputRef = useRef<HTMLInputElement>(null);
  const selectedRowRef = useRef<HTMLTableRowElement>(null);

  // Focus management refs for Qty and Rate
  const qtyRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const rateRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { searchTerm, setSearchTerm, products, isLoading } = useProductSearch();

  // Scroll active dropdown row into view when navigating with Arrow keys
  useEffect(() => {
    if (selectedRowRef.current) {
      selectedRowRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Global F3 shortcut to focus the inline Fruit / Product cell
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        inlineSearchInputRef.current?.focus();
        setIsDropdownOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inlineSearchInputRef.current &&
        !inlineSearchInputRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProductSelect = (product: Product) => {
    const targetId = onSelectProduct(product);
    setSearchTerm('');
    setIsDropdownOpen(false);
    setSelectedIndex(0);

    // Auto-focus and select the Qty input of the newly added row
    if (targetId) {
      setTimeout(() => {
        const qtyEl = qtyRefs.current[targetId];
        if (qtyEl) {
          qtyEl.focus();
          qtyEl.select();
        }
      }, 70);
    }
  };

  const handleSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || products.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsDropdownOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % products.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + products.length) % products.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const safeIndex = Math.min(selectedIndex, Math.max(0, products.length - 1));
      if (products[safeIndex]) {
        handleProductSelect(products[safeIndex]);
      }
    } else if (e.key === 'Escape') {
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
            · Press <kbd className="font-mono bg-white border border-slate-300 px-1.5 py-0.5 rounded text-slate-700 font-bold shadow-2xs">F3</kbd> or click product row to search
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Unit & Tray Toggle Option */}
          <button
            type="button"
            onClick={toggleUnitAndTray}
            title={showUnitAndTray ? 'Hide Unit and Tray columns' : 'Show Unit and Tray columns'}
            className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 shadow-2xs ${
              showUnitAndTray
                ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <EyeIcon className="w-3.5 h-3.5" />
            <span>Unit & Tray:</span>
            <span className={showUnitAndTray ? 'text-amber-700 font-bold' : 'text-slate-400 font-semibold'}>
              {showUnitAndTray ? 'Shown' : 'Hidden'}
            </span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto flex-1 min-h-[360px] pb-12">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
              <th className="py-2.5 px-3 w-8 text-center">#</th>
              <th className="py-2.5 px-3 min-w-[200px]">Fruit / Product</th>
              <th className="py-2.5 px-2 w-24">Variety</th>
              <th className="py-2.5 px-2 w-16 text-center">Grade</th>
              {showUnitAndTray && <th className="py-2.5 px-2 w-20">Unit</th>}
              <th className="py-2.5 px-2 w-24 text-right">Qty</th>
              <th className="py-2.5 px-2 w-24 text-right">Rate (₹)</th>
              <th className="py-2.5 px-3 w-28 text-right font-extrabold text-slate-800">Amount (₹)</th>
              {showUnitAndTray && <th className="py-2.5 px-2 w-16 text-center">Tray</th>}
              <th className="py-2.5 px-2 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* Added Items List */}
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
                  <td className="py-2.5 px-2 text-slate-600 font-medium">
                    {item.variety}
                  </td>

                  {/* Grade */}
                  <td className="py-2.5 px-2 text-center">
                    <span className="inline-block text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200/60">
                      {item.grade}
                    </span>
                  </td>

                  {/* Unit (Only if toggled shown) */}
                  {showUnitAndTray && (
                    <td className="py-2.5 px-2">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {item.unit}
                      </span>
                    </td>
                  )}

                  {/* Qty Input */}
                  <td className="py-2.5 px-2 text-right">
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
                  <td className="py-2.5 px-2 text-right">
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
                          // Cycle to inline product search input to add next fruit
                          inlineSearchInputRef.current?.focus();
                        }
                      }}
                      className="w-20 text-right font-semibold bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                    />
                  </td>

                  {/* Line Amount */}
                  <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900 text-sm">
                    ₹{item.totalAmount.toLocaleString('en-IN')}
                  </td>

                  {/* Tray (Only if toggled shown) */}
                  {showUnitAndTray && (
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={item.trayQuantity || 0}
                        onChange={(e) => handleTrayChange(item, parseInt(e.target.value, 10) || 0)}
                        className="w-12 text-center font-bold bg-amber-50/60 border border-amber-200/80 text-amber-900 rounded-md px-1 py-1 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </td>
                  )}

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
            })}

            {/* Active Inline Table Entry Row (Click or F3 to type product name directly) */}
            <tr className="bg-amber-50/30 hover:bg-amber-50/50 transition-colors border-t-2 border-dashed border-amber-200">
              <td className="py-2 px-3 text-center text-amber-700 font-mono font-bold text-xs">
                {items.length + 1}
              </td>

              {/* Fruit / Product Search Input Cell */}
              <td className="py-1.5 px-3 relative">
                <div className="relative">
                  <input
                    ref={inlineSearchInputRef}
                    type="text"
                    value={searchTerm}
                    onFocus={() => setIsDropdownOpen(true)}
                    onClick={() => setIsDropdownOpen(true)}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsDropdownOpen(true);
                      setSelectedIndex(0);
                    }}
                    onKeyDown={handleSearchInputKeyDown}
                    placeholder="Type fruit name or press F3..."
                    className="w-full bg-white border border-amber-300 rounded-lg pl-3 pr-10 py-1.5 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 shadow-2xs"
                  />
                  <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                    <kbd className="text-[9px] bg-amber-100 border border-amber-300 text-amber-800 px-1.5 py-0.5 rounded font-mono font-bold">
                      F3
                    </kbd>
                  </div>

                  {/* Live Table-Format Product Selection Dropdown */}
                  {isDropdownOpen && (
                    <div
                      ref={dropdownRef}
                      className="absolute left-0 mt-1 w-[720px] max-w-[calc(100vw-3rem)] bg-white border border-slate-300 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                      style={{ minWidth: '640px' }}
                    >
                      {/* Dropdown Header */}
                      <div className="bg-slate-900 text-white px-3.5 py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <PackageIcon className="w-4 h-4 text-amber-400" />
                          <span className="font-bold tracking-wide">SELECT FRUIT PRODUCT</span>
                          <span className="text-[11px] text-slate-400">
                            (Use <kbd className="bg-slate-800 text-amber-300 px-1 py-0.2 rounded font-mono">↑↓</kbd> to move, <kbd className="bg-slate-800 text-amber-300 px-1 py-0.2 rounded font-mono">Enter</kbd> to select)
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {products.length} found
                        </span>
                      </div>

                      {/* Table Format Product List */}
                      <div className="max-h-72 overflow-y-auto">
                        {isLoading ? (
                          <div className="py-8 text-center text-xs text-slate-400">
                            Searching fruit inventory...
                          </div>
                        ) : products.length === 0 ? (
                          <div className="py-8 text-center text-xs text-slate-500">
                            No matching fruit found for "{searchTerm}"
                          </div>
                        ) : (
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-slate-100/95 text-[10px] font-bold text-slate-600 uppercase tracking-wider sticky top-0 border-b border-slate-200 select-none">
                              <tr>
                                <th className="py-2 px-3 w-20">Code</th>
                                <th className="py-2 px-3 min-w-[150px]">Fruit Name</th>
                                <th className="py-2 px-3 w-24">Variety</th>
                                <th className="py-2 px-2 w-14 text-center">Grade</th>
                                <th className="py-2 px-3 w-24 text-right">Wholesale</th>
                                <th className="py-2 px-3 w-24 text-right">Retail</th>
                                <th className="py-2 px-3 w-24 text-right">Stock</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {products.map((p, idx) => {
                                const isSelected = idx === selectedIndex;
                                const stock = parseFloat(String(p.currentStock)) || 0;
                                const isLow = stock <= 15;
                                const isOutOfStock = stock <= 0;

                                return (
                                  <tr
                                    key={p.id}
                                    ref={isSelected ? selectedRowRef : undefined}
                                    onClick={() => handleProductSelect(p)}
                                    className={`cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'bg-amber-100/90 text-amber-950 font-bold border-l-4 border-amber-500'
                                        : 'hover:bg-slate-50 text-slate-800'
                                    }`}
                                  >
                                    <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                                      {p.productCode}
                                    </td>
                                    <td className="py-2 px-3">
                                      <span className="font-bold text-slate-900">{p.name}</span>
                                      {p.barcode && (
                                        <span className="text-[10px] text-slate-400 ml-1.5 font-mono">
                                          · {p.barcode}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-slate-600 font-medium">
                                      {p.variety || '—'}
                                    </td>
                                    <td className="py-2 px-2 text-center">
                                      <span className="inline-block text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200/70">
                                        {p.grade || 'A'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-right font-semibold text-slate-900">
                                      ₹{Number(p.wholesaleRate).toLocaleString('en-IN')}
                                      <span className="text-[10px] font-normal text-slate-400">/{p.defaultUnit}</span>
                                    </td>
                                    <td className="py-2 px-3 text-right text-slate-600">
                                      ₹{Number(p.retailRate).toLocaleString('en-IN')}
                                      <span className="text-[10px] font-normal text-slate-400">/{p.defaultUnit}</span>
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                      <span
                                        className={`font-bold text-[11px] ${
                                          isOutOfStock
                                            ? 'text-rose-600'
                                            : isLow
                                            ? 'text-amber-600'
                                            : 'text-emerald-600'
                                        }`}
                                      >
                                        {stock} {p.defaultUnit}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </td>

              <td className="py-2 px-2 text-slate-400 text-xs italic">—</td>
              <td className="py-2 px-2 text-center text-slate-400 text-xs italic">—</td>
              {showUnitAndTray && <td className="py-2 px-2 text-slate-400 text-xs italic">—</td>}
              <td className="py-2 px-2 text-right">
                <span className="text-slate-400 font-mono text-xs">—</span>
              </td>
              <td className="py-2 px-2 text-right">
                <span className="text-slate-400 font-mono text-xs">—</span>
              </td>
              <td className="py-2 px-3 text-right font-mono font-bold text-slate-400 text-xs">
                ₹0.00
              </td>
              {showUnitAndTray && <td className="py-2 px-2 text-center text-slate-400 text-xs italic">—</td>}
              <td className="py-2 px-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    inlineSearchInputRef.current?.focus();
                    setIsDropdownOpen(true);
                  }}
                  title="Add fruit (F3)"
                  className="p-1 text-amber-600 hover:text-amber-800 rounded hover:bg-amber-100 transition-colors"
                >
                  <span className="font-bold text-xs">+</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
