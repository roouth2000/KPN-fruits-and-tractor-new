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
  date: string;
  customer: string;
  itemsCount: number;
  paymentMethod: string;
  status: string;
  grossAmount: number;
  discount: number;
  netAmount: number;
  openingBalance: number;
  totalOutstanding: number;
  amountPaid: number;
  closingBalance: number;
  total: number;
  paid: number;
  due: number;
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
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 block">{row.invoiceNo}</span>
          <span className="text-[10px] text-slate-400 font-mono">{row.time}</span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-800 block">{row.customer}</span>
          <span className="text-[10px] text-slate-400">{row.paymentMethod}</span>
        </div>
      ),
    },
    {
      key: 'grossAmount',
      header: 'Gross Amount',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-slate-700">
          {formatINR(row.grossAmount ?? row.total)}
        </span>
      ),
    },
    {
      key: 'discount',
      header: 'Discount',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-rose-600">
          {row.discount > 0 ? `-${formatINR(row.discount)}` : '₹0.00'}
        </span>
      ),
    },
    {
      key: 'netAmount',
      header: 'Net Amount',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold text-slate-900">
          {formatINR(row.netAmount ?? row.total)}
        </span>
      ),
    },
    {
      key: 'openingBalance',
      header: 'Opening Bal',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-amber-700">
          {formatINR(row.openingBalance || 0)}
        </span>
      ),
    },
    {
      key: 'totalOutstanding',
      header: 'Total Outstanding',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold text-slate-900">
          {formatINR(row.totalOutstanding ?? ((row.openingBalance || 0) + (row.netAmount ?? row.total)))}
        </span>
      ),
    },
    {
      key: 'amountPaid',
      header: 'Amount Paid',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-semibold text-emerald-700">
          {(row.amountPaid ?? row.paid) > 0 ? `-${formatINR(row.amountPaid ?? row.paid)}` : '₹0.00'}
        </span>
      ),
    },
    {
      key: 'closingBalance',
      header: 'Closing Balance',
      align: 'right',
      render: (row) => {
        const bal = row.closingBalance != null ? row.closingBalance : row.due;
        return (
          <span className={`font-mono font-bold ${bal > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
            {formatINR(bal)}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            row.status === 'Completed' || (row.closingBalance != null ? row.closingBalance <= 0 : row.due <= 0)
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          {row.status}
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
