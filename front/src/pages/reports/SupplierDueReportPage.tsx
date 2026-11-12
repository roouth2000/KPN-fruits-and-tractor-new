import React, { useState, useEffect } from 'react';
import { ReportHeader } from './components/ReportHeader';
import { ReportKpis } from './components/ReportKpis';
import { ReportTable } from './components/ReportTable';
import type { ReportColumn, ReportKpi } from './types';
import { formatINR } from '../../utils/helpers';
import { reportApi } from '../../services/reportApi';

interface SupplierDueRow {
  id: string;
  code: string;
  name: string;
  phone: string;
  city: string;
  dueAmount: number;
  outstandingTrays: number;
  paymentTerms: string;
  aging: string;
  status: string;
}

interface SupplierDueReportPageProps {
  onBackToDashboard: () => void;
  onExport: () => void;
  onSchedulePayment?: (supplier: string) => void;
}

export const SupplierDueReportPage: React.FC<SupplierDueReportPageProps> = ({
  onBackToDashboard,
  onExport,
  onSchedulePayment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRange, setSelectedRange] = useState('All Payables');
  const [kpis, setKpis] = useState<ReportKpi[]>([]);
  const [rows, setRows] = useState<SupplierDueRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    reportApi
      .getSupplierDueReport()
      .then((res) => {
        if (mounted && res) {
          setKpis(res.kpis || []);
          setRows(res.rows || []);
        }
      })
      .catch((err) => console.error('Failed to load supplier dues:', err))
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = rows.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: ReportColumn<SupplierDueRow>[] = [
    {
      key: 'code',
      header: 'Supplier Code',
      render: (row) => <span className="font-mono font-bold text-slate-900">{row.code}</span>,
    },
    {
      key: 'name',
      header: 'Grower / Supplier Name',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.name}</div>
          <div className="text-[11px] text-slate-400">
            {row.phone} · {row.city}
          </div>
        </div>
      ),
    },
    {
      key: 'paymentTerms',
      header: 'Settlement Terms',
      render: (row) => <span className="text-xs text-slate-600">{row.paymentTerms}</span>,
    },
    {
      key: 'outstandingTrays',
      header: 'Grower Crates in Mandi',
      align: 'center',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-amber-700">
          {row.outstandingTrays} Trays
        </span>
      ),
    },
    {
      key: 'dueAmount',
      header: 'Payable Balance',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold text-slate-900">
          {formatINR(row.dueAmount)}
        </span>
      ),
    },
    {
      key: 'aging',
      header: 'Due Aging',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
          {row.aging}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Payment Status',
      render: (row) => {
        const isSettled = row.status === 'Settled';
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
              isSettled
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {row.status}
          </span>
        );
      },
    },
    {
      key: 'id',
      header: 'Disbursement',
      align: 'right',
      render: (row) => (
        <button
          onClick={() => onSchedulePayment?.(row.name)}
          className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
        >
          Pay Vendor
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Supplier & Grower Payables"
        description="Weekly Mandi disbursement schedules, orchard consignments, and crate returns to farm transport."
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
        onBackToDashboard={onBackToDashboard}
        onExport={onExport}
      />

      <ReportKpis kpis={kpis} />

      <ReportTable
        title="Supplier Accounts Payable Roster"
        subtitle={
          isLoading
            ? 'Fetching live supplier ledger records...'
            : `${filtered.length} suppliers and grower cooperatives registered`
        }
        columns={columns}
        data={filtered}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Filter suppliers by name or city..."
      />
    </div>
  );
};
