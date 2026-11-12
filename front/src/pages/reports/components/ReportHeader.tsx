import React from 'react';
import { DownloadIcon, PrinterIcon, SearchIcon, CalendarIcon } from '../../../components/icons';

export interface ReportHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  selectedRange?: string;
  onRangeChange?: (range: string) => void;
  rangeOptions?: string[];
  onExport?: () => void;
  onPrint?: () => void;
  onBackToDashboard?: () => void;
  onBack?: () => void;
  children?: React.ReactNode;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  title,
  subtitle,
  description,
  searchTerm,
  onSearchChange,
  selectedRange = 'This Month',
  onRangeChange,
  rangeOptions = ['Today', 'Yesterday', 'Last 7 Days', 'This Month', 'Last Month', 'Custom'],
  onExport,
  onPrint,
  children,
}) => {
  const descText = subtitle || description || '';

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs mb-5">
      {/* Title & Filter Controls Bar (Breadcrumbs removed) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight font-sans">
            {title}
          </h2>
          {descText && <p className="text-xs text-slate-500 mt-0.5">{descText}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {children}

          {/* Search box if enabled */}
          {onSearchChange !== undefined && (
            <div className="relative w-48 sm:w-56">
              <SearchIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Filter results..."
                className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
              />
            </div>
          )}

          {/* Date range picker */}
          {onRangeChange && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
              <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedRange}
                onChange={(e) => onRangeChange(e.target.value)}
                className="bg-transparent border-none text-slate-700 font-medium focus:outline-none cursor-pointer pr-1"
              >
                {rangeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Print Action */}
          {onPrint && (
            <button
              onClick={onPrint}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <PrinterIcon className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Print</span>
            </button>
          )}

          {/* Export CSV Action */}
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs active:scale-95 cursor-pointer"
            >
              <DownloadIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
