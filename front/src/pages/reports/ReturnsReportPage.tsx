import React, { useState, useEffect } from 'react';
import { ReportHeader } from './components/ReportHeader';
import { ReportKpis } from './components/ReportKpis';
import { ReportTable } from './components/ReportTable';
import type { ReportColumn, ReportKpi } from './types';
import { formatINR } from '../../utils/helpers';
import { reportApi } from '../../services/reportApi';

interface ReturnRow {
  id: string;
  returnId: string;
  date: string;
  customer: string;
  fruit: string;
  quantity: string;
  reason: string;
  actionTaken: string;
  amount: number;
}

interface ReturnsReportPageProps {
  onBackToDashboard: () => void;
  onExport: () => void;
}

export const ReturnsReportPage: React.FC<ReturnsReportPageProps> = ({
  onBackToDashboard,
  onExport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRange, setSelectedRange] = useState('This Month');
  const [kpis, setKpis] = useState<ReportKpi[]>([]);
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    reportApi
      .getReturnsReport()
      .then((res) => {
        if (mounted && res) {
          setKpis(res.kpis || []);
          setRows(res.rows || []);
        }
      })
      .catch((err) => console.error('Failed to load returns report:', err))
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = rows.filter(
    (r) =>
      r.returnId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.fruit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: ReportColumn<ReturnRow>[] = [
    {
      key: 'returnId',
      header: 'RMA / Return #',
      render: (row) => <span className="font-mono font-bold text-slate-900">{row.returnId}</span>,
    },
    { key: 'date', header: 'Date' },
    {
      key: 'customer',
      header: 'Customer / Buyer',
      render: (row) => <span className="font-semibold text-slate-800">{row.customer}</span>,
    },
    {
      key: 'fruit',
      header: 'Fruit Consignment',
      render: (row) => <span className="text-slate-700">{row.fruit}</span>,
    },
    {
      key: 'quantity',
      header: 'Returned Qty',
      render: (row) => <span className="font-mono text-slate-700">{row.quantity}</span>,
    },
    {
      key: 'reason',
      header: 'Return Reason',
      render: (row) => <span className="text-xs text-slate-600">{row.reason}</span>,
    },
    {
      key: 'actionTaken',
      header: 'Ledger Resolution',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          {row.actionTaken}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Credit Value',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold text-indigo-700">
          {formatINR(row.amount)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Sales Returns & RMA Management"
        description="Buyer return requests, quality rejections, and customer ledger credit notes issued."
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
        onBackToDashboard={onBackToDashboard}
        onExport={onExport}
      />

      <ReportKpis kpis={kpis} />

      <ReportTable
        title="Customer Return Slips & Rejections"
        subtitle={
          isLoading
            ? 'Fetching live customer return vouchers...'
            : `${filtered.length} customer return vouchers on record`
        }
        columns={columns}
        data={filtered}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Filter return vouchers (RMA, Customer, Fruit)..."
      />
    </div>
  );
};
