import React, { useState, useEffect } from 'react';
import { ReportHeader } from './components/ReportHeader';
import { ReportKpis } from './components/ReportKpis';
import { ReportTable } from './components/ReportTable';
import type { ReportColumn, ReportKpi } from './types';
import { formatINR } from '../../utils/helpers';
import { reportApi } from '../../services/reportApi';

interface ProfitRow {
  id: string;
  fruit: string;
  quantitySold: string;
  revenue: number;
  costOfGoods: number;
  grossProfit: number;
  margin: string;
  roi: string;
}

interface ProfitReportPageProps {
  onBackToDashboard: () => void;
  onExport: () => void;
}

export const ProfitReportPage: React.FC<ProfitReportPageProps> = ({
  onBackToDashboard,
  onExport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRange, setSelectedRange] = useState('This Month');
  const [kpis, setKpis] = useState<ReportKpi[]>([]);
  const [rows, setRows] = useState<ProfitRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    reportApi
      .getProfitReport()
      .then((res) => {
        if (mounted && res) {
          setKpis(res.kpis || []);
          setRows(res.rows || []);
        }
      })
      .catch((err) => console.error('Failed to load profit report:', err))
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = rows.filter((p) =>
    p.fruit.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: ReportColumn<ProfitRow>[] = [
    {
      key: 'fruit',
      header: 'Fruit Variety / SKU',
      render: (row) => (
        <span className="font-semibold text-slate-800">{row.fruit}</span>
      ),
    },
    {
      key: 'quantitySold',
      header: 'Quantity Sold',
      render: (row) => (
        <span className="font-mono text-slate-700">{row.quantitySold}</span>
      ),
    },
    {
      key: 'revenue',
      header: 'Revenue',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-medium text-slate-900">{formatINR(row.revenue)}</span>
      ),
    },
    {
      key: 'costOfGoods',
      header: 'COGS (Farm Cost)',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-slate-500">{formatINR(row.costOfGoods)}</span>
      ),
    },
    {
      key: 'grossProfit',
      header: 'Gross Profit',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold text-emerald-700">
          {formatINR(row.grossProfit)}
        </span>
      ),
    },
    {
      key: 'margin',
      header: 'Profit Margin',
      align: 'right',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {row.margin}
        </span>
      ),
    },
    {
      key: 'roi',
      header: 'Return on Cost',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-700">
          {row.roi}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Fruit Profit & Margin Analysis"
        description="Consolidated Mandi trading margins calculated from delivered invoices vs farm acquisition COGS."
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
        onBackToDashboard={onBackToDashboard}
        onExport={onExport}
      />

      <ReportKpis kpis={kpis} />

      <ReportTable
        title="Profit Breakdown by Fruit Consignment"
        subtitle={
          isLoading
            ? 'Fetching live margin data from database...'
            : `${filtered.length} fruit lines traded in selected period`
        }
        columns={columns}
        data={filtered}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Filter fruit varieties (Apple, Mango, Kiwi)..."
      />
    </div>
  );
};
