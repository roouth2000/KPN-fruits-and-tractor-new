import React, { useState, useEffect, useRef } from 'react';
import { useProductSearch } from '../hooks/useProducts';
import type { Product } from '../types/billing';
import { SearchIcon, PackageIcon } from '../../../components/icons';

interface ProductSearchProps {
  onSelectProduct: (product: Product) => void;
}

export const ProductSearch: React.FC<ProductSearchProps> = ({ onSelectProduct }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { searchTerm, setSearchTerm, products, isLoading } = useProductSearch();

  // Keyboard shortcut F3 to focus product search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Keyboard navigation inside search results (Arrow Up, Arrow Down, Enter, Esc)
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || products.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % products.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + products.length) % products.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (products[selectedIndex]) {
        handleProductSelect(products[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    onSelectProduct(product);
    setSearchTerm('');
    setIsOpen(false);
    setSelectedIndex(0);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon className="w-4 h-4 text-slate-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder="Scan barcode or search fruit (e.g. Apple, Kiwi, Pomegranate, SKU, Variety)... (F3)"
          className="w-full bg-white border border-slate-200/90 rounded-xl pl-9 pr-14 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 shadow-2xs transition-all"
        />
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
          <kbd className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-mono shadow-2xs">
            F3
          </kbd>
        </div>
      </div>

      {/* Live Dropdown Results */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-slate-400">Searching inventory...</div>
            ) : products.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No matching fruit product found for "{searchTerm}"
              </div>
            ) : (
              products.map((p, idx) => {
                const stock = parseFloat(String(p.currentStock)) || 0;
                const isSelected = idx === selectedIndex;
                const isLowStock = stock <= 15;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProductSelect(p)}
                    className={`w-full text-left p-2.5 transition-colors flex items-center justify-between group ${
                      isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-600 font-bold text-xs">
                        <PackageIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-slate-950">
                            {p.name}
                          </span>
                          <span className="text-[11px] text-slate-600 font-medium">
                            · {p.variety}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200/60">
                            Grade {p.grade}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                          <span>{p.productCode}</span>
                          {p.barcode && <span>· 📟 {p.barcode}</span>}
                          <span>· 1 {p.defaultUnit} = {p.conversionFactor} {p.baseUnit}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-3">
                      <div className="text-xs font-extrabold text-slate-900">
                        ₹{Number(p.wholesaleRate).toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] font-normal text-slate-400">/{p.defaultUnit}</span>
                      </div>
                      <div
                        className={`text-[11px] font-bold ${
                          stock <= 0
                            ? 'text-rose-600'
                            : isLowStock
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        Stock: {stock} {p.defaultUnit}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

