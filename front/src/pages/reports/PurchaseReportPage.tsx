import React, { useState, useEffect } from 'react';
import { ReportHeader } from './components/ReportHeader';
import { ReportKpis } from './components/ReportKpis';
import { ReportTable } from './components/ReportTable';
import type { ReportColumn, ReportKpi } from './types';
import { formatINR } from '../../utils/helpers';
import { reportApi } from '../../services/reportApi';

interface PurchaseRow {
  id: string;
  poNumber: string;
  date: string;
  supplier: string;
  fruitItem: string;
  quantity: string;
  rate: number;
  totalAmount: number;
  status: string;
}

interface PurchaseReportPageProps {
  onBackToDashboard: () => void;
  onExport: () => void;
}

export const PurchaseReportPage: React.FC<PurchaseReportPageProps> = ({
  onBackToDashboard,
  onExport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRange, setSelectedRange] = useState('This Month');
  const [kpis, setKpis] = useState<ReportKpi[]>([]);
  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    reportApi
      .getPurchaseReport()
      .then((res) => {
        if (mounted && res) {
          setKpis(res.kpis || []);
          setRows(res.rows || []);
        }
      })
      .catch((err) => console.error('Failed to load purchase report:', err))
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = rows.filter(
    (p) =>
      p.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.fruitItem.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: ReportColumn<PurchaseRow>[] = [
    {
      key: 'poNumber',
      header: 'Consignment / PO #',
      render: (row) => <span className="font-mono font-bold text-slate-900">{row.poNumber}</span>,
    },
    { key: 'date', header: 'Inward Date' },
    {
      key: 'supplier',
      header: 'Supplier / Grower',
      render: (row) => <span className="font-semibold text-slate-800">{row.supplier}</span>,
    },
    {
      key: 'fruitItem',
      header: 'Fruit Produce',
      render: (row) => <span className="text-slate-700">{row.fruitItem}</span>,
    },
    {
      key: 'quantity',
      header: 'Inward Quantity',
      align: 'center',
      render: (row) => <span className="font-mono font-semibold">{row.quantity}</span>,
    },
    {
      key: 'rate',
      header: 'Rate / Unit',
      align: 'right',
      render: (row) => <span className="font-mono">{formatINR(row.rate)}</span>,
    },
    {
      key: 'totalAmount',
      header: 'Total Cost',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold text-slate-900">
          {formatINR(row.totalAmount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'QC Inspection',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {row.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Purchase Inward Report"
        subtitle="Inward fruit procurements, grower contracts, wholesale lot costs, and dock receipts"
        onBack={onBackToDashboard}
        onExport={onExport}
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
      />

      <ReportKpis kpis={kpis} />

      <ReportTable
        title="Inbound Procurements Log"
        count={filtered.length}
        columns={columns}
        data={filtered}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Filter by PO #, supplier or fruit item..."
        emptyMessage={isLoading ? 'Loading inward purchase consignments from server...' : 'No purchase records found.'}
      />
    </div>
  );
};
