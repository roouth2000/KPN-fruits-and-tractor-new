import React from 'react';
import { ChevronRightIcon, MoreHorizontalIcon } from './icons';

export interface ActivityItem {
  id: string;
  title: string;
  operator: string;
  time: string;
  status: 'done' | 'progress' | 'review';
}

interface OperationsActivityProps {
  customActivities?: ActivityItem[];
}

export const OperationsActivity: React.FC<OperationsActivityProps> = ({ customActivities = [] }) => {
  const activities = customActivities.slice(0, 4);
  const totalActions = customActivities.length;
  const pendingCount = customActivities.filter((a) => a.status === 'progress' || a.status === 'review').length;
  const doneCount = customActivities.filter((a) => a.status === 'done').length;
  const inProgressCount = customActivities.filter((a) => a.status === 'progress').length;
  const reviewCount = customActivities.filter((a) => a.status === 'review').length;

  const getStatusColor = (status: 'done' | 'progress' | 'review') => {
    switch (status) {
      case 'done':
        return 'bg-emerald-500';
      case 'progress':
        return 'bg-sky-500';
      case 'review':
        return 'bg-amber-400';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-xs font-semibold text-slate-800">Warehouse & Dispatch Operations</h3>
            <p className="text-[11px] text-slate-400">Live Mandi terminal feed</p>
          </div>
          <button className="text-slate-400 hover:text-slate-600 transition-colors">
            <MoreHorizontalIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action metric + badge */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
            {totalActions} {totalActions === 1 ? 'action' : 'actions'}
          </span>
          {pendingCount > 0 ? (
            <span className="inline-flex items-center text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
              {pendingCount} pending dispatch
            </span>
          ) : (
            <span className="inline-flex items-center text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              All cleared
            </span>
          )}
        </div>

        {/* Segmented status line */}
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex mb-2">
          {totalActions > 0 ? (
            <>
              <div
                className="bg-emerald-400 h-full"
                style={{ width: `${(doneCount / totalActions) * 100}%` }}
                title={`Done ${doneCount}`}
              />
              <div
                className="bg-sky-400 h-full"
                style={{ width: `${(inProgressCount / totalActions) * 100}%` }}
                title={`In progress ${inProgressCount}`}
              />
              <div
                className="bg-amber-400 h-full"
                style={{ width: `${(reviewCount / totalActions) * 100}%` }}
                title={`Needs review ${reviewCount}`}
              />
            </>
          ) : (
            <div className="bg-slate-200 h-full w-full" />
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-4 pb-2 border-b border-slate-100">
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Done {doneCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            In progress {inProgressCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Needs review {reviewCount}
          </span>
        </div>

        {/* Activity feed list */}
        {activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 text-xs group">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${getStatusColor(item.status)}`}
                  />
                  <div className="truncate">
                    <div className="font-medium text-slate-800 truncate group-hover:text-slate-950 transition-colors">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {item.operator}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 flex-shrink-0 font-mono">
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400 italic">
            No operational activities logged today.
          </div>
        )}
      </div>

      {/* Footer Link */}
      <div className="pt-3 border-t border-slate-100 mt-3">
        <button className="w-full flex items-center justify-between text-[11px] font-medium text-slate-600 hover:text-slate-900 transition-colors group">
          <span>View all dispatch history</span>
          <ChevronRightIcon className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
