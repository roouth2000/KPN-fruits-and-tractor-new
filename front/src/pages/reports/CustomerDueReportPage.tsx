import React, { useState, useEffect } from 'react';
import { ReportHeader } from './components/ReportHeader';
import { ReportKpis } from './components/ReportKpis';
import { ReportTable } from './components/ReportTable';
import type { ReportColumn, ReportKpi } from './types';
import { formatINR } from '../../utils/helpers';
import { reportApi } from '../../services/reportApi';

interface CustomerDueRow {
  id: string;
  code: string;
  name: string;
  phone: string;
  city: string;
  creditLimit: number;
  currentDue: number;
  utilization: string;
  outstandingTrays: number;
  aging: string;
  status: string;
}

interface CustomerDueReportPageProps {
  onBackToDashboard: () => void;
  onExport: () => void;
  onSendReminder?: (customer: string) => void;
}

export const CustomerDueReportPage: React.FC<CustomerDueReportPageProps> = ({
  onBackToDashboard,
  onExport,
  onSendReminder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRange, setSelectedRange] = useState('All Customers');
  const [kpis, setKpis] = useState<ReportKpi[]>([]);
  const [rows, setRows] = useState<CustomerDueRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    reportApi
      .getCustomerDueReport()
      .then((res) => {
        if (mounted && res) {
          setKpis(res.kpis || []);
          setRows(res.rows || []);
        }
      })
      .catch((err) => console.error('Failed to load customer dues:', err))
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = rows.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: ReportColumn<CustomerDueRow>[] = [
    {
      key: 'code',
      header: 'Customer ID',
      render: (row) => <span className="font-mono font-bold text-slate-900">{row.code}</span>,
    },
    {
      key: 'name',
      header: 'Customer & Contact',
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
      key: 'creditLimit',
      header: 'Credit Limit',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-slate-600">{formatINR(row.creditLimit)}</span>
      ),
    },
    {
      key: 'currentDue',
      header: 'Outstanding Due',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold text-rose-700">
          {formatINR(row.currentDue)}
        </span>
      ),
    },
    {
      key: 'utilization',
      header: 'Limit Used',
      align: 'center',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-700">
          {row.utilization}
        </span>
      ),
    },
    {
      key: 'outstandingTrays',
      header: 'Crates with Cust',
      align: 'center',
      render: (row) => (
        <span className="font-mono font-medium text-amber-700">
          {row.outstandingTrays} Trays
        </span>
      ),
    },
    {
      key: 'aging',
      header: 'Aging Bracket',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
          {row.aging}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Credit Health',
      render: (row) => {
        const isExceeded = row.status.includes('Exceeded');
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
              isExceeded
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {row.status}
          </span>
        );
      },
    },
    {
      key: 'id',
      header: 'Action',
      align: 'right',
      render: (row) => (
        <button
          onClick={() => onSendReminder?.(row.name)}
          className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
        >
          Send WhatsApp
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Customer Receivables & Outstanding Dues"
        description="Comprehensive mandi credit exposure, aging analysis, and collection reminders for registered buyers."
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
        onBackToDashboard={onBackToDashboard}
        onExport={onExport}
      />

      <ReportKpis kpis={kpis} />

      <ReportTable
        title="Active Customer Credit Ledgers"
        subtitle={
          isLoading
            ? 'Fetching live customer due records...'
            : `${filtered.length} customers with outstanding balance`
        }
        columns={columns}
        data={filtered}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Filter customers by name, phone or APMC code..."
      />
    </div>
  );
};
