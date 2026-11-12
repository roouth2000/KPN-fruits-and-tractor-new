import React, { useState, useEffect } from 'react';
import { ReportHeader } from './components/ReportHeader';
import { ReportKpis } from './components/ReportKpis';
import { ReportTable } from './components/ReportTable';
import type { ReportColumn, ReportKpi } from './types';
import { formatINR } from '../../utils/helpers';
import { reportApi } from '../../services/reportApi';

interface TrayRow {
  id: string;
  partnerType: string;
  name: string;
  phone: string;
  traysIssued: number;
  traysReturned: number;
  netOutstanding: number;
  depositHeld: number;
  status: string;
}

interface TrayReportPageProps {
  onBackToDashboard: () => void;
  onExport: () => void;
  onLogReturn?: (batchId: string) => void;
}

export const TrayReportPage: React.FC<TrayReportPageProps> = ({
  onBackToDashboard,
  onExport,
  onLogReturn,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRange, setSelectedRange] = useState('All Trays');
  const [kpis, setKpis] = useState<ReportKpi[]>([]);
  const [rows, setRows] = useState<TrayRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    reportApi
      .getTrayReport()
      .then((res) => {
        if (mounted && res) {
          setKpis(res.kpis || []);
          setRows(res.rows || []);
        }
      })
      .catch((err) => console.error('Failed to load tray report:', err))
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = rows.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.partnerType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: ReportColumn<TrayRow>[] = [
    {
      key: 'partnerType',
      header: 'Partner Type',
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
            row.partnerType === 'Customer'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          {row.partnerType}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Entity Name & Contact',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.name}</div>
          <div className="text-[11px] text-slate-400">{row.phone}</div>
        </div>
      ),
    },
    {
      key: 'traysIssued',
      header: 'Trays Issued',
      align: 'center',
      render: (row) => <span className="font-mono text-slate-700">{row.traysIssued}</span>,
    },
    {
      key: 'traysReturned',
      header: 'Trays Returned',
      align: 'center',
      render: (row) => <span className="font-mono text-slate-500">{row.traysReturned}</span>,
    },
    {
      key: 'netOutstanding',
      header: 'Net Crates Balance',
      align: 'center',
      render: (row) => (
        <span
          className={`font-mono font-bold ${
            row.netOutstanding > 0 ? 'text-amber-700' : 'text-slate-600'
          }`}
        >
          {row.netOutstanding > 0 ? `+${row.netOutstanding}` : row.netOutstanding} Crates
        </span>
      ),
    },
    {
      key: 'depositHeld',
      header: 'Deposit Balance',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-slate-700">
          {formatINR(row.depositHeld)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Audit Status',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
          {row.status}
        </span>
      ),
    },
    {
      key: 'id',
      header: 'Return Crates',
      align: 'right',
      render: (row) => (
        <button
          onClick={() => onLogReturn?.(row.id)}
          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors"
        >
          Log Return
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Plastic Crate & Tray Asset Tracking"
        description="Monitor circulation of wholesale fruit crates between orchard haulers, APMC dock, and retail buyer vehicles."
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
        onBackToDashboard={onBackToDashboard}
        onExport={onExport}
      />

      <ReportKpis kpis={kpis} />

      <ReportTable
        title="Tray Custody & Circulation Ledger"
        subtitle={
          isLoading
            ? 'Fetching live tray balances...'
            : `${filtered.length} entities holding crates in circulation`
        }
        columns={columns}
        data={filtered}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Filter by entity name or partner type..."
      />
    </div>
  );
};
