import React, { useState, useEffect } from 'react';
import { ReportHeader } from './components/ReportHeader';
import { ReportKpis } from './components/ReportKpis';
import { ReportTable } from './components/ReportTable';
import type { ReportColumn, ReportKpi } from './types';
import { formatINR } from '../../utils/helpers';
import { reportApi } from '../../services/reportApi';

interface LossRow {
  id: string;
  lossId: string;
  date: string;
  fruit: string;
  quantity: string;
  category: string;
  cause: string;
  lossAmount: number;
}

interface LossReportPageProps {
  onBackToDashboard: () => void;
  onExport: () => void;
}

export const LossReportPage: React.FC<LossReportPageProps> = ({
  onBackToDashboard,
  onExport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRange, setSelectedRange] = useState('This Month');
  const [kpis, setKpis] = useState<ReportKpi[]>([]);
  const [rows, setRows] = useState<LossRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    reportApi
      .getLossReport()
      .then((res) => {
        if (mounted && res) {
          setKpis(res.kpis || []);
          setRows(res.rows || []);
        }
      })
      .catch((err) => console.error('Failed to load loss report:', err))
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = rows.filter(
    (l) =>
      l.lossId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.fruit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.cause.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: ReportColumn<LossRow>[] = [
    {
      key: 'lossId',
      header: 'Incident / Ref #',
      render: (row) => <span className="font-mono font-bold text-slate-900">{row.lossId}</span>,
    },
    { key: 'date', header: 'Date' },
    {
      key: 'fruit',
      header: 'Fruit / Consignment',
      render: (row) => <span className="font-semibold text-slate-800">{row.fruit}</span>,
    },
    {
      key: 'quantity',
      header: 'Units Lost',
      render: (row) => <span className="font-mono text-slate-700">{row.quantity}</span>,
    },
    {
      key: 'category',
      header: 'Loss Classification',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          {row.category}
        </span>
      ),
    },
    {
      key: 'cause',
      header: 'Root Cause & Notes',
      render: (row) => <span className="text-xs text-slate-600">{row.cause}</span>,
    },
    {
      key: 'lossAmount',
      header: 'Loss Valuation',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold text-rose-600">
          {formatINR(row.lossAmount)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Produce Loss & Spoilage Report"
        description="Write-offs from temperature variations, transit bruising, and sorting rejects recorded in stock audit."
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
        onBackToDashboard={onBackToDashboard}
        onExport={onExport}
      />

      <ReportKpis kpis={kpis} />

      <ReportTable
        title="Recorded Spoilage & Wastage Log"
        subtitle={
          isLoading
            ? 'Fetching live loss audit records...'
            : `${filtered.length} loss entries recorded this billing period`
        }
        columns={columns}
        data={filtered}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Filter loss entries (Ref, Fruit, Cause)..."
      />
    </div>
  );
};
