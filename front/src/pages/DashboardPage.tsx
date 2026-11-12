import React, { useState } from 'react';
import { TodaySummaryCards } from './dashboard/TodaySummaryCards';
import { FinancialMetricsBar } from './dashboard/FinancialMetricsBar';
import { FruitHealthSection } from './dashboard/FruitHealthSection';
import { TopPerformersSection } from './dashboard/TopPerformersSection';
import { PendingDuesSection } from './dashboard/PendingDuesSection';
import { UnitsChart } from '../components/UnitsChart';
import { BinOccupancy } from '../components/BinOccupancy';
import { OperationsActivity } from '../components/OperationsActivity';
import type { ActivityItem } from '../components/OperationsActivity';
import { LayersIcon, BarChart3Icon } from '../components/icons';

interface DashboardPageProps {
  customActivities: ActivityItem[];
  onNavigateReport: (reportId: string) => void;
  onOpenNewOrder: () => void;
  onSendReminder: (customer: string, amount: number) => void;
  onPaySupplier: (supplier: string, amount: number) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  customActivities,
  onNavigateReport,
  onOpenNewOrder,
  onSendReminder,
  onPaySupplier,
}) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'warehouse'>('daily');

  return (
    <div className="space-y-6">
      {/* Top Section View Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'daily'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3Icon className="w-3.5 h-3.5" />
            <span>Today's Fruit Trading & Summary</span>
          </button>
          <button
            onClick={() => setActiveTab('warehouse')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'warehouse'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayersIcon className="w-3.5 h-3.5" />
            <span>Cold Storage & Bin Honeycomb</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Mandi Terminal: APMC Bay #12 (Live)</span>
        </div>
      </div>

      {activeTab === 'daily' ? (
        <>
          {/* 1. The 2 exact 4-row Summary Cards requested */}
          <TodaySummaryCards onNavigateReport={onNavigateReport} />

          {/* 2. Today's Key Financials (Sales, Purchase, Collection, Expenses, Profit) */}
          <FinancialMetricsBar onNavigateReport={onNavigateReport} />

          {/* 3. Fruit Inventory Health: Damaged, Returned, and Low Stock Fruits */}
          <FruitHealthSection
            onNavigateReport={onNavigateReport}
            onOpenReorderModal={onOpenNewOrder}
          />

          {/* 4. Top Selling Fruits & Top Customers */}
          <TopPerformersSection onNavigateReport={onNavigateReport} />

          {/* 5. Pending Customer Dues & Supplier Payables */}
          <PendingDuesSection
            onNavigateReport={onNavigateReport}
            onSendReminder={onSendReminder}
            onPaySupplier={onPaySupplier}
          />
        </>
      ) : (
        /* Cold Storage & Deep Analytics View */
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8">
              <UnitsChart />
            </div>
            <div className="lg:col-span-4">
              <BinOccupancy />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-12">
              <OperationsActivity customActivities={customActivities} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
