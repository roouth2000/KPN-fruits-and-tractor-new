import React, { useState, useEffect } from 'react';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  ReceiptTextIcon,
  PackageIcon,
  UsersIcon,
  BuildingIcon,
  LayersIcon,
  RupeeIcon,
} from '../../components/icons';
import { formatINR } from '../../utils/helpers';
import { dashboardApi, type TodaySummaryData } from '../../services/dashboardApi';

interface TodaySummaryCardsProps {
  onNavigateReport?: (reportId: string) => void;
}

export const TodaySummaryCards: React.FC<TodaySummaryCardsProps> = ({ onNavigateReport }) => {
  const [data, setData] = useState<TodaySummaryData | null>(null);

  useEffect(() => {
    let mounted = true;
    dashboardApi
      .getSummary()
      .then((res) => {
        if (mounted && res) {
          setData(res);
        }
      })
      .catch((err) => console.error('Failed to load dashboard summary:', err));
    return () => {
      mounted = false;
    };
  }, []);

  const s = data?.todaySummary || {
    sales: 0,
    collection: 0,
    due: 0,
    purchase: 0,
    invoicesCount: 0,
  };

  const a = data?.assetSummary || {
    stockValue: 0,
    customerDue: 0,
    supplierDue: 0,
    trayWithCustomers: 0,
  };

  const collectionPercent = s.sales > 0 ? Math.round((s.collection / s.sales) * 100) : 0;
  const duePercent = Math.max(0, 100 - collectionPercent);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5 font-sans">
      {/* CARD 1: Today's Summary */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between">
        <div className="p-5 pb-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <RupeeIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Today Summary</h3>
              <p className="text-[11px] text-slate-400">Live transaction & trading turnover</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Market
          </span>
        </div>

        <div className="p-5 divide-y divide-slate-100 space-y-3">
          {/* Row 1: Today's Sales */}
          <div
            onClick={() => onNavigateReport?.('report-daily-sales')}
            className="flex items-center justify-between pt-1 cursor-pointer hover:bg-slate-50/80 -mx-2 px-2 py-1.5 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <TrendingUpIcon className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">Today's Sales</div>
                <div className="text-[10px] text-slate-400">{s.invoicesCount} invoices · Live Mandi</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold text-slate-900 font-mono tracking-tight">
                {formatINR(s.sales)}
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold">+14.2% vs y'day</span>
            </div>
          </div>

          {/* Row 2: Today's Collection */}
          <div
            onClick={() => onNavigateReport?.('report-daily-sales')}
            className="flex items-center justify-between pt-3 cursor-pointer hover:bg-slate-50/80 -mx-2 px-2 py-1.5 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <RupeeIcon className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">Today's Collection</div>
                <div className="text-[10px] text-slate-400">Cash, UPI & Bank settlements</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold text-emerald-700 font-mono tracking-tight">
                {formatINR(s.collection)}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">{collectionPercent}% realization</span>
            </div>
          </div>

          {/* Row 3: Today's Due */}
          <div
            onClick={() => onNavigateReport?.('report-customer-due')}
            className="flex items-center justify-between pt-3 cursor-pointer hover:bg-slate-50/80 -mx-2 px-2 py-1.5 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <TrendingDownIcon className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">Today's Due</div>
                <div className="text-[10px] text-slate-400">Credit sales extended today</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold text-amber-700 font-mono tracking-tight">
                {formatINR(s.due)}
              </div>
              <span className="text-[10px] text-amber-700 font-medium">{duePercent}% on credit</span>
            </div>
          </div>

          {/* Row 4: Today's Purchase */}
          <div
            onClick={() => onNavigateReport?.('report-purchase')}
            className="flex items-center justify-between pt-3 cursor-pointer hover:bg-slate-50/80 -mx-2 px-2 py-1.5 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <ReceiptTextIcon className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">Today's Purchase</div>
                <div className="text-[10px] text-slate-400">Fresh truck arrival (Mandi & Farm)</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold text-slate-900 font-mono tracking-tight">
                {formatINR(s.purchase)}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Inward procurements</span>
            </div>
          </div>
        </div>

        {/* Bottom subtle progress ratio */}
        <div className="px-5 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Collected vs Credit Today</span>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-emerald-700">{collectionPercent}% Collected</span>
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-amber-700">{duePercent}% Due</span>
          </div>
        </div>
      </div>

      {/* CARD 2: Position & Working Capital */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between">
        <div className="p-5 pb-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <PackageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Stock & Due Position</h3>
              <p className="text-[11px] text-slate-400">Inventory assets & outstanding credit</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200/60 px-2 py-0.5 rounded-full">
            Terminal Ledger
          </span>
        </div>

        <div className="p-5 divide-y divide-slate-100 space-y-3">
          {/* Row 1: Stock Value */}
          <div
            onClick={() => onNavigateReport?.('report-stock')}
            className="flex items-center justify-between pt-1 cursor-pointer hover:bg-slate-50/80 -mx-2 px-2 py-1.5 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <PackageIcon className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">Stock Value</div>
                <div className="text-[10px] text-slate-400">In cold storage & grading racks</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold text-slate-900 font-mono tracking-tight">
                {formatINR(a.stockValue)}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Live Mandi Valuation</span>
            </div>
          </div>

          {/* Row 2: Customer Due */}
          <div
            onClick={() => onNavigateReport?.('report-customer-due')}
            className="flex items-center justify-between pt-3 cursor-pointer hover:bg-slate-50/80 -mx-2 px-2 py-1.5 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <UsersIcon className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">Customer Due</div>
                <div className="text-[10px] text-slate-400">Total customer receivables</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold text-amber-700 font-mono tracking-tight">
                {formatINR(a.customerDue)}
              </div>
              <span className="text-[10px] text-amber-700 font-medium">Active customer credit</span>
            </div>
          </div>

          {/* Row 3: Supplier Due */}
          <div
            onClick={() => onNavigateReport?.('report-supplier-due')}
            className="flex items-center justify-between pt-3 cursor-pointer hover:bg-slate-50/80 -mx-2 px-2 py-1.5 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
                <BuildingIcon className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">Supplier Due</div>
                <div className="text-[10px] text-slate-400">Payable to growers & commission agents</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold text-rose-700 font-mono tracking-tight">
                {formatINR(a.supplierDue)}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Net APMC 15-30 days</span>
            </div>
          </div>

          {/* Row 4: Tray With Customers */}
          <div
            onClick={() => onNavigateReport?.('report-tray')}
            className="flex items-center justify-between pt-3 cursor-pointer hover:bg-slate-50/80 -mx-2 px-2 py-1.5 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <LayersIcon className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">Tray With Customers</div>
                <div className="text-[10px] text-slate-400">Plastic crates currently in rotation</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold text-indigo-700 font-mono tracking-tight">
                {a.trayWithCustomers} Trays
              </div>
              <span className="text-[10px] text-indigo-600 font-medium font-mono">
                {formatINR(a.trayWithCustomers * 100)} deposit buffer
              </span>
            </div>
          </div>
        </div>

        {/* Bottom subtle asset status */}
        <div className="px-5 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Net Liquidity Ratio</span>
          <span className="font-semibold text-slate-800">1.82x Working Capital</span>
        </div>
      </div>
    </div>
  );
};
