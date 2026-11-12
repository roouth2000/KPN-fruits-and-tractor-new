import React, { useState, useEffect } from 'react';
import { SearchIcon, XIcon, PackageIcon, ReceiptTextIcon, BuildingIcon, UsersIcon } from './icons';
import { salesApi } from '../modules/sales/services/salesApi';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction?: (action: string) => void;
}

interface SearchItem {
  type: 'product' | 'customer' | 'order' | 'supplier';
  title: string;
  sub: string;
  icon: React.FC<{ className?: string }>;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onSelectAction }) => {
  const [query, setQuery] = useState('');
  const [liveResults, setLiveResults] = useState<SearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !query.trim()) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [products, customers] = await Promise.allSettled([
          salesApi.searchProducts(query),
          salesApi.searchCustomers(query),
        ]);

        const items: SearchItem[] = [];

        if (products.status === 'fulfilled' && Array.isArray(products.value)) {
          products.value.slice(0, 5).forEach((p) => {
            items.push({
              type: 'product',
              title: `${p.name} (${p.variety}) - Grade ${p.grade || 'A'}`,
              sub: `SKU: ${p.productCode} · Stock: ${p.currentStock || 0} ${p.defaultUnit || 'BOX'} · Rate: ₹${p.wholesaleRate}`,
              icon: PackageIcon,
            });
          });
        }

        if (customers.status === 'fulfilled' && Array.isArray(customers.value)) {
          customers.value.slice(0, 5).forEach((c) => {
            items.push({
              type: 'customer',
              title: c.name,
              sub: `Code: ${c.customerCode} · Phone: ${c.phone} · Due: ₹${c.currentDue} · Trays: ${c.outstandingTrays}`,
              icon: UsersIcon,
            });
          });
        }

        setLiveResults(items);
      } catch (err) {
        console.warn('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [isOpen, query]);

  if (!isOpen) return null;

  const defaultItems: SearchItem[] = [
    { type: 'product', title: 'Alphonso Mango (Ratnagiri Grade A)', sub: 'Mandi Bay #4 · 380 Crates in stock', icon: PackageIcon },
    { type: 'product', title: 'Kashmir Royal Gala Apples (Grade A)', sub: 'Cold Storage Room · 450 Crates in stock', icon: PackageIcon },
    { type: 'product', title: 'Nagpur Oranges (Sweet & Juicy)', sub: 'Mandi Dock · 28 Crates (Low stock alert)', icon: PackageIcon },
    { type: 'order', title: 'PO-1057 (Arrival Inward)', sub: 'Shimla Apple Orchards · 200 Crates · Scheduled today', icon: ReceiptTextIcon },
    { type: 'supplier', title: 'Shimla Apple Orchards', sub: 'Primary Apple Grower · ₹1,80,000 payable', icon: BuildingIcon },
    { type: 'supplier', title: 'Ratnagiri Mango Growers Co-op', sub: 'Alphonso Consignment · ₹95,000 payable', icon: BuildingIcon },
  ];

  const displayedItems = query.trim() === ''
    ? defaultItems
    : liveResults.length > 0
    ? liveResults
    : defaultItems.filter(
        (i) =>
          i.title.toLowerCase().includes(query.toLowerCase()) ||
          i.sub.toLowerCase().includes(query.toLowerCase())
      );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
          <SearchIcon className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type fruit SKU, customer name, mobile or PO#..."
            className="flex-1 text-sm bg-transparent border-none text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          {isSearching && (
            <span className="text-[10px] text-slate-400 font-medium">Searching...</span>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-50">
          {displayedItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching fruits, customers, or consignments found.
            </div>
          ) : (
            displayedItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    onSelectAction?.(item.title);
                    onClose();
                  }}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-slate-50 flex items-center gap-3 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-slate-200/70 flex items-center justify-center text-slate-600 flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate flex-1">
                    <div className="text-xs font-semibold text-slate-800 group-hover:text-slate-950">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {item.sub}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Modal Bottom Keyboard Shortcut Hints */}
        <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Search customers, fruit varieties and consignments</span>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] shadow-2xs font-mono">
              ESC
            </kbd>
            <span>to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
