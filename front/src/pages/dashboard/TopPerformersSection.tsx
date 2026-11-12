import React, { useState, useEffect } from 'react';
import { UsersIcon, ChevronRightIcon } from '../../components/icons';
import { formatINR } from '../../utils/helpers';
import { dashboardApi, type TopPerformersData } from '../../services/dashboardApi';

interface TopPerformersSectionProps {
  onNavigateReport: (reportId: string) => void;
}

export const TopPerformersSection: React.FC<TopPerformersSectionProps> = ({ onNavigateReport }) => {
  const [data, setData] = useState<TopPerformersData | null>(null);

  useEffect(() => {
    let mounted = true;
    dashboardApi
      .getTopPerformers()
      .then((res) => {
        if (mounted && res) {
          setData(res);
        }
      })
      .catch((err) => console.error('Failed to load top performers:', err));
    return () => {
      mounted = false;
    };
  }, []);

  const topSellingFruits = data?.topFruits && data.topFruits.length > 0
    ? data.topFruits.map((f) => ({
        name: f.name,
        origin: 'APMC Vashi Inward',
        crates: f.cratesSold,
        revenue: f.revenue,
        margin: '28%',
        share: Math.min(40, f.cratesSold),
      }))
    : [];

  const topCustomers = data?.topCustomers && data.topCustomers.length > 0
    ? data.topCustomers.map((c) => ({
        name: c.name,
        type: 'Wholesale Buyer',
        todayBuy: c.totalValue,
        balanceDue: 0,
        traysHeld: 24,
        phone: 'Registered Buyer',
      }))
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5 font-sans">
      {/* 1. Top Selling Fruits */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Top Selling Fruits</h4>
              <p className="text-[10px] text-slate-400">By volume sold & turnover contribution</p>
            </div>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-mono">
              Live Mandi
            </span>
          </div>

          <div className="space-y-3.5 divide-y divide-slate-100">
            {topSellingFruits.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 font-medium">
                No fruit sales recorded yet today.
              </div>
            ) : (
              topSellingFruits.map((fruit, idx) => (
                <div key={idx} className="pt-2 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="font-semibold text-slate-800 text-xs">{fruit.name}</span>
                      <span className="text-[10px] text-slate-400 block">{fruit.origin} · {fruit.crates} BOX sold</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-900 text-xs">{formatINR(fruit.revenue)}</span>
                      <span className="text-[10px] text-emerald-700 font-semibold block">{fruit.margin} margin</span>
                    </div>
                  </div>

                  {/* Relative sales progress bar */}
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-slate-900 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(15, fruit.share * 2.5))}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          onClick={() => onNavigateReport('report-daily-sales')}
          className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition-colors w-full cursor-pointer group"
        >
          <span>View Detailed Sales by Variety</span>
          <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* 2. Top Customers */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <UsersIcon className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Top Mandi Customers</h4>
                <p className="text-[10px] text-slate-400">Highest gross purchase volume</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full font-mono">
              Key Accounts
            </span>
          </div>

          <div className="space-y-2.5 divide-y divide-slate-100">
            {topCustomers.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 font-medium">
                No customer purchases recorded yet today.
              </div>
            ) : (
              topCustomers.map((cust, idx) => (
                <div key={idx} className="pt-2 flex items-center justify-between text-xs">
                  <div className="truncate pr-2">
                    <div className="font-semibold text-slate-800 text-xs truncate">{cust.name}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2">
                      <span>{cust.type}</span>
                      <span>·</span>
                      <span className="font-mono">{cust.traysHeld} Trays in hand</span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="font-mono font-bold text-slate-900 text-xs">
                      {formatINR(cust.todayBuy)}
                    </div>
                    <div className="text-[10px] font-medium font-mono text-slate-500">
                      {cust.balanceDue > 0 ? (
                        <span className="text-amber-700 font-bold">Due {formatINR(cust.balanceDue)}</span>
                      ) : (
                        <span className="text-emerald-700 font-bold">Cleared</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          onClick={() => onNavigateReport('report-customer-due')}
          className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition-colors w-full cursor-pointer group"
        >
          <span>View All Customer Accounts & Ledgers</span>
          <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
