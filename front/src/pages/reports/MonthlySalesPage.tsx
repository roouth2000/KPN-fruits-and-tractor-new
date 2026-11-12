import React, { useState, useEffect } from 'react';
import { ReportHeader } from './components/ReportHeader';
import { ReportKpis } from './components/ReportKpis';
import { ReportTable } from './components/ReportTable';
import type { ReportColumn, ReportKpi } from './types';
import { formatINR } from '../../utils/helpers';
import { reportApi } from '../../services/reportApi';

interface MonthlySaleRow {
  id: string;
  month: string;
  date: string;
  invoicesCount: number;
  cratesSold: number;
  grossSales: number;
  netSales: number;
  growth: string;
  collectionRate: string;
}

interface MonthlySalesPageProps {
  onBackToDashboard: () => void;
  onExport: () => void;
}

export const MonthlySalesPage: React.FC<MonthlySalesPageProps> = ({
  onBackToDashboard,
  onExport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRange, setSelectedRange] = useState('This Month');
  const [kpis, setKpis] = useState<ReportKpi[]>([]);
  const [rows, setRows] = useState<MonthlySaleRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    reportApi
      .getMonthlySales()
      .then((res) => {
        if (mounted && res) {
          setKpis(res.kpis || []);
          setRows(res.rows || []);
        }
      })
      .catch((err) => console.error('Failed to load monthly sales:', err))
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredData = rows.filter((r) =>
    r.date.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: ReportColumn<MonthlySaleRow>[] = [
    {
      key: 'date',
      header: 'Trading Date',
      render: (row) => <span className="font-semibold text-slate-800">{row.date}</span>,
    },
    {
      key: 'invoicesCount',
      header: 'Bills Issued',
      align: 'center',
      render: (row) => <span className="font-mono">{row.invoicesCount}</span>,
    },
    {
      key: 'cratesSold',
      header: 'Crates Sold',
      align: 'center',
      render: (row) => <span className="font-mono font-medium">{row.cratesSold} BOX</span>,
    },
    {
      key: 'grossSales',
      header: 'Gross Turnover',
      align: 'right',
      render: (row) => <span className="font-mono font-bold text-slate-900">{formatINR(row.grossSales)}</span>,
    },
    {
      key: 'collectionRate',
      header: 'Collection Rate',
      align: 'center',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {row.collectionRate}
        </span>
      ),
    },
    {
      key: 'growth',
      header: 'Performance Trend',
      align: 'right',
      render: (row) => (
        <span className="text-[11px] font-bold text-emerald-600">
          {row.growth}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Monthly Sales Report"
        subtitle="Monthly sales volume trends, volume velocity, bill counts, and collections"
        onBack={onBackToDashboard}
        onExport={onExport}
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
      />

      <ReportKpis kpis={kpis} />

      <ReportTable
        title="Daily Performance Breakdown"
        count={filteredData.length}
        columns={columns}
        data={filteredData}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Filter by date (e.g. 2026-11)..."
        emptyMessage={isLoading ? 'Loading monthly sales data from server...' : 'No sales records found for this period.'}
      />
    </div>
  );
};
