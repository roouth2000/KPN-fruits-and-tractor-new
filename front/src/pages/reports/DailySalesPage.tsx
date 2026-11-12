import React, { useState, useEffect } from 'react';
import { ReportHeader } from './components/ReportHeader';
import { ReportKpis } from './components/ReportKpis';
import { ReportTable } from './components/ReportTable';
import type { ReportColumn, ReportKpi } from './types';
import { formatINR } from '../../utils/helpers';
import { reportApi } from '../../services/reportApi';

interface DailySaleItem {
  id: string;
  invoiceNo: string;
  time: string;
  customer: string;
  itemsCount: number;
  paymentMethod: string;
  status: string;
  total: number;
}

interface DailySalesPageProps {
  onBackToDashboard: () => void;
  onExport: () => void;
}

export const DailySalesPage: React.FC<DailySalesPageProps> = ({
  onBackToDashboard,
  onExport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRange, setSelectedRange] = useState('Today');
  const [kpis, setKpis] = useState<ReportKpi[]>([]);
  const [sales, setSales] = useState<DailySaleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    reportApi
      .getDailySales()
      .then((res) => {
        if (mounted && res) {
          setKpis(res.kpis || []);
          setSales(res.rows || []);
        }
      })
      .catch((err) => console.error('Failed to load daily sales:', err))
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredSales = sales.filter(
    (s) =>
      s.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: ReportColumn<DailySaleItem>[] = [
    {
      key: 'invoiceNo',
      header: 'Invoice #',
      render: (row) => <span className="font-mono font-bold text-slate-900">{row.invoiceNo}</span>,
    },
    { key: 'time', header: 'Time' },
    {
      key: 'customer',
      header: 'Customer',
      render: (row) => <span className="font-semibold text-slate-800">{row.customer}</span>,
    },
    {
      key: 'itemsCount',
      header: 'Line Items',
      align: 'center',
      render: (row) => <span className="font-mono">{row.itemsCount}</span>,
    },
    {
      key: 'paymentMethod',
      header: 'Payment Method',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
          {row.paymentMethod}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            row.status === 'Completed'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Invoice Total',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold text-slate-900">
          {formatINR(row.total)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Daily Sales Report"
        subtitle="Live sales invoices, payment allocations, cash/credit split, and cashier desk totals"
        onBack={onBackToDashboard}
        onExport={onExport}
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
      />

      <ReportKpis kpis={kpis} />

      <ReportTable
        title="Daily Invoices List"
        count={filteredSales.length}
        columns={columns}
        data={filteredSales}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by invoice # or customer..."
        emptyMessage={isLoading ? 'Loading daily sales invoices from server...' : 'No sales records found for today.'}
      />
    </div>
  );
};
