import React, { useState, useEffect } from 'react';
import { ReportHeader } from './components/ReportHeader';
import { ReportKpis } from './components/ReportKpis';
import { ReportTable } from './components/ReportTable';
import type { ReportColumn, ReportKpi } from './types';
import { formatINR } from '../../utils/helpers';
import { reportApi } from '../../services/reportApi';

interface DamageRow {
  id: string;
  damageRef: string;
  date: string;
  fruit: string;
  damagedQty: string;
  reason: string;
  inspectedBy: string;
  estimatedLoss: number;
  disposition: string;
}

interface DamageReportPageProps {
  onBackToDashboard: () => void;
  onExport: () => void;
}

export const DamageReportPage: React.FC<DamageReportPageProps> = ({
  onBackToDashboard,
  onExport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRange, setSelectedRange] = useState('This Month');
  const [kpis, setKpis] = useState<ReportKpi[]>([]);
  const [rows, setRows] = useState<DamageRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    reportApi
      .getDamageReport()
      .then((res) => {
        if (mounted && res) {
          setKpis(res.kpis || []);
          setRows(res.rows || []);
        }
      })
      .catch((err) => console.error('Failed to load damage report:', err))
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = rows.filter(
    (d) =>
      d.damageRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.fruit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: ReportColumn<DamageRow>[] = [
    {
      key: 'damageRef',
      header: 'Damage Ref #',
      render: (row) => <span className="font-mono font-bold text-slate-900">{row.damageRef}</span>,
    },
    { key: 'date', header: 'Date' },
    {
      key: 'fruit',
      header: 'Fruit Consignment',
      render: (row) => <span className="font-semibold text-slate-800">{row.fruit}</span>,
    },
    {
      key: 'damagedQty',
      header: 'Damaged Quantity',
      render: (row) => <span className="font-mono text-slate-700">{row.damagedQty}</span>,
    },
    {
      key: 'reason',
      header: 'Damage Cause',
      render: (row) => <span className="text-xs text-slate-600">{row.reason}</span>,
    },
    {
      key: 'inspectedBy',
      header: 'Inspector',
      render: (row) => (
        <span className="text-xs font-medium text-slate-700">{row.inspectedBy}</span>
      ),
    },
    {
      key: 'estimatedLoss',
      header: 'Loss Cost',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold text-rose-600">
          {formatINR(row.estimatedLoss)}
        </span>
      ),
    },
    {
      key: 'disposition',
      header: 'Disposal Status',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
          {row.disposition}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Fruit Damage & Quality Audit Report"
        description="Physical grading defects, transport damage, and unloading inspections at APMC dock bays."
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
        onBackToDashboard={onBackToDashboard}
        onExport={onExport}
      />

      <ReportKpis kpis={kpis} />

      <ReportTable
        title="Dock Inspection & Damage Log"
        subtitle={
          isLoading
            ? 'Fetching live quality logs...'
            : `${filtered.length} damage inspections recorded`
        }
        columns={columns}
        data={filtered}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Filter damage records (Ref, Fruit, Reason)..."
      />
    </div>
  );
};
