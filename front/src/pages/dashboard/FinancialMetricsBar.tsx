import React, { useState, useEffect } from 'react';
import {
  TrendingUpIcon,
  ReceiptTextIcon,
  RupeeIcon,
  TrendingDownIcon,
  SparklesIcon,
} from '../../components/icons';
import { formatINR } from '../../utils/helpers';
import { dashboardApi, type FinancialMetricItem } from '../../services/dashboardApi';

interface FinancialMetricsBarProps {
  onNavigateReport?: (reportId: string) => void;
}

export const FinancialMetricsBar: React.FC<FinancialMetricsBarProps> = ({ onNavigateReport }) => {
  const [showExpenseBreakdown, setShowExpenseBreakdown] = useState(false);
  const [metricsData, setMetricsData] = useState<FinancialMetricItem[]>([]);

  useEffect(() => {
    let mounted = true;
    dashboardApi
      .getFinancialMetrics()
      .then((data) => {
        if (mounted && data && data.length > 0) {
          setMetricsData(data);
        }
      })
      .catch((err) => console.error('Failed to load financial metrics:', err));
    return () => {
      mounted = false;
    };
  }, []);

  const defaultMetrics = [
    {
      id: 'report-daily-sales',
      label: "Today's Sales",
      amount: 0,
      sub: "0 bills · Mandi Desk",
      change: "0%",
      type: "neutral" as const,
    },
    {
      id: 'report-purchase',
      label: "Today's Purchase",
      amount: 0,
      sub: "Direct farm consignments",
      change: "Procured",
      type: "neutral" as const,
    },
    {
      id: 'report-daily-sales',
      label: "Today's Collection",
      amount: 0,
      sub: "Cash + Digital settlements",
      change: "0%",
      type: "neutral" as const,
    },
    {
      id: 'expenses',
      label: "Today's Expenses",
      amount: 0,
      sub: "Freight, labor & cold store",
      change: "0 items",
      type: "neutral" as const,
    },
    {
      id: 'report-profit',
      label: "Today's Profit",
      amount: 0,
      sub: "Trading margin after expenses",
      change: "0.0%",
      type: "neutral" as const,
    },
  ];

  const currentMetrics = metricsData.length > 0 ? metricsData : defaultMetrics;

  const getMetricConfig = (label: string) => {
    if (label.includes('Sales')) {
      return { icon: TrendingUpIcon, accentColor: 'bg-emerald-500', lightBg: 'bg-emerald-50', textColor: 'text-emerald-700' };
    }
    if (label.includes('Purchase')) {
      return { icon: ReceiptTextIcon, accentColor: 'bg-sky-500', lightBg: 'bg-sky-50', textColor: 'text-sky-700' };
    }
    if (label.includes('Collection')) {
      return { icon: RupeeIcon, accentColor: 'bg-teal-500', lightBg: 'bg-teal-50', textColor: 'text-teal-700' };
    }
    if (label.includes('Expense')) {
      return { icon: TrendingDownIcon, accentColor: 'bg-rose-500', lightBg: 'bg-rose-50', textColor: 'text-rose-700' };
    }
    return { icon: SparklesIcon, accentColor: 'bg-indigo-500', lightBg: 'bg-indigo-50', textColor: 'text-indigo-700' };
  };

  return (
    <div className="space-y-3 mb-5 font-sans">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Today's Core Financial Pulse
        </h3>
        <span className="text-[11px] text-slate-400">APMC Bay #12 Terminal Data</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {currentMetrics.map((m, idx) => {
          const cfg = getMetricConfig(m.label);
          const Icon = cfg.icon;

          return (
            <div
              key={idx}
              onClick={() => {
                if (m.id === 'expenses') {
                  setShowExpenseBreakdown((prev) => !prev);
                } else if (onNavigateReport) {
                  onNavigateReport(m.id);
                }
              }}
              className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs hover:shadow-md transition-all cursor-pointer group hover:border-slate-300 relative overflow-hidden"
            >
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${cfg.accentColor}`} />

              <div className="flex items-start justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                  {m.label}
                </span>
                <div className={`p-1.5 rounded-md ${cfg.lightBg} ${cfg.textColor} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="text-lg font-bold text-slate-900 font-mono tracking-tight mb-1">
                {formatINR(m.amount)}
              </div>

              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400 truncate max-w-[110px]">{m.sub}</span>
                <span
                  className={`font-semibold px-1 py-0.5 rounded ${
                    m.type === 'positive'
                      ? 'text-emerald-700 bg-emerald-50'
                      : m.type === 'negative'
                      ? 'text-rose-700 bg-rose-50'
                      : 'text-slate-600 bg-slate-100'
                  }`}
                >
                  {m.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {showExpenseBreakdown && (
        <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-rose-200/60">
            <span className="text-xs font-bold text-rose-900">Today's Operating Expense Ledger</span>
            <button
              onClick={() => setShowExpenseBreakdown(false)}
              className="text-xs text-rose-600 hover:text-rose-900 font-bold"
            >
              ✕ Close
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className="bg-white/80 p-2 rounded-lg border border-rose-100">
              <div className="text-[10px] text-slate-500">Inward Freight</div>
              <div className="font-bold text-slate-800 font-mono">₹6,800</div>
            </div>
            <div className="bg-white/80 p-2 rounded-lg border border-rose-100">
              <div className="text-[10px] text-slate-500">Dock Labor (Hamali)</div>
              <div className="font-bold text-slate-800 font-mono">₹3,400</div>
            </div>
            <div className="bg-white/80 p-2 rounded-lg border border-rose-100">
              <div className="text-[10px] text-slate-500">Cold Chamber Electricity</div>
              <div className="font-bold text-slate-800 font-mono">₹2,100</div>
            </div>
            <div className="bg-white/80 p-2 rounded-lg border border-rose-100">
              <div className="text-[10px] text-slate-500">Plastic Crate Wash</div>
              <div className="font-bold text-slate-800 font-mono">₹1,200</div>
            </div>
            <div className="bg-white/80 p-2 rounded-lg border border-rose-100">
              <div className="text-[10px] text-slate-500">Mandi Market Cess</div>
              <div className="font-bold text-slate-800 font-mono">₹1,000</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
