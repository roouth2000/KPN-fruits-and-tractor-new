import React, { useState, useEffect, useRef } from 'react';
import { useProductSearch } from '../hooks/useProducts';
import type { Product } from '../types/billing';
import { PackageIcon, SearchIcon, XIcon } from '../../../components/icons';

interface ProductSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export const ProductSelectModal: React.FC<ProductSelectModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectedRowRef = useRef<HTMLTableRowElement>(null);

  const { searchTerm, setSearchTerm, products, isLoading } = useProductSearch();

  // Reset search and auto-focus when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen, setSearchTerm]);

  // Scroll active row into view
  useEffect(() => {
    if (selectedRowRef.current) {
      selectedRowRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Global Esc to close when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (product: Product) => {
    onSelectProduct(product);
    onClose();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (products.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % products.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + products.length) % products.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (products[selectedIndex]) {
        handleSelect(products[selectedIndex]);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Dark Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between text-xs flex-shrink-0">
          <div className="flex items-center gap-2">
            <PackageIcon className="w-4 h-4 text-amber-400" />
            <span className="font-extrabold tracking-wide text-sm">SELECT FRUIT PRODUCT</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline ml-2">
              (Use <kbd className="bg-slate-800 text-amber-300 px-1 py-0.5 rounded font-mono font-bold">↑↓</kbd> to move, <kbd className="bg-slate-800 text-amber-300 px-1 py-0.5 rounded font-mono font-bold">Enter</kbd> to select)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 font-mono">
              {products.length} found
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar Input */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex-shrink-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="w-4 h-4 text-slate-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="Scan barcode or type fruit name, variety, SKU (e.g. Apple, Kiwi, Pomegranate)..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-10 py-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 shadow-2xs transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedIndex(0);
                  searchInputRef.current?.focus();
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Table of Products */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Searching fruit inventory...
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No matching fruit products found for "{searchTerm}"
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase tracking-wider sticky top-0 border-b border-slate-200 select-none shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3 w-28">Code</th>
                  <th className="py-2.5 px-3 min-w-[150px]">Fruit Name</th>
                  <th className="py-2.5 px-3 w-28">Variety</th>
                  <th className="py-2.5 px-2 w-16 text-center">Grade</th>
                  <th className="py-2.5 px-3 w-24 text-right">Wholesale</th>
                  <th className="py-2.5 px-3 w-24 text-right">Retail</th>
                  <th className="py-2.5 px-3 w-24 text-right">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {products.map((p, idx) => {
                  const isSelected = idx === selectedIndex;
                  const stock = parseFloat(String(p.currentStock)) || 0;
                  const isLow = stock <= 15;

                  return (
                    <tr
                      key={p.id}
                      ref={isSelected ? selectedRowRef : undefined}
                      onClick={() => handleSelect(p)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-100 text-amber-950 font-bold border-l-4 border-amber-500'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                        {p.productCode}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {p.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {p.variety}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold font-mono">
                          {p.grade || 'A'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(p.wholesaleRate).toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] font-normal text-slate-400">/{p.defaultUnit}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        ₹{Number(p.retailRate).toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] font-normal text-slate-400">/{p.defaultUnit}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        <span
                          className={
                            stock <= 0
                              ? 'text-rose-600'
                              : isLow
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }
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

        {/* Modal Footer with quick instructions */}
        <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between flex-shrink-0">
          <span>Click any product row or navigate with arrow keys and press <kbd className="bg-white border border-slate-300 text-slate-700 px-1 py-0.5 rounded font-mono font-bold">Enter</kbd> to add.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
