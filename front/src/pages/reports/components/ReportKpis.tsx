import React from 'react';
import type { ReportKpi } from '../types';

interface ReportKpisProps {
  kpis: ReportKpi[];
}

export const ReportKpis: React.FC<ReportKpisProps> = ({ kpis }) => {
  const gridCols =
    kpis.length === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : kpis.length === 3
      ? 'grid-cols-1 sm:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div className={`grid gap-4 mb-5 ${gridCols}`}>
      {kpis.map((kpi, idx) => (
        <div
          key={idx}
          className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium text-slate-500">{kpi.label}</span>
          </div>

          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
              {kpi.value}
            </span>
            {kpi.change && (
              <span
                className={`inline-flex items-center text-[11px] font-semibold px-1.5 py-0.2 rounded ${
                  kpi.changeType === 'positive'
                    ? 'text-emerald-700 bg-emerald-50'
                    : kpi.changeType === 'negative'
                    ? 'text-rose-700 bg-rose-50'
                    : 'text-slate-600 bg-slate-100'
                }`}
              >
                {kpi.change}
              </span>
            )}
          </div>

          {kpi.subtext && (
            <div className="text-[11px] text-slate-400 mt-0.5">
              {kpi.subtext}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
