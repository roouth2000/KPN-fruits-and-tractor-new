import React, { useState, useEffect } from 'react';
import {
  MessageCircleIcon,
  RupeeIcon,
  ChevronRightIcon,
} from '../../components/icons';
import { formatINR } from '../../utils/helpers';
import { dashboardApi, type PendingDuesData } from '../../services/dashboardApi';

interface PendingDuesSectionProps {
  onNavigateReport: (reportId: string) => void;
  onSendReminder: (customer: string, amount: number) => void;
  onPaySupplier: (supplier: string, amount: number) => void;
}

export const PendingDuesSection: React.FC<PendingDuesSectionProps> = ({
  onNavigateReport,
  onSendReminder,
  onPaySupplier,
}) => {
  const [data, setData] = useState<PendingDuesData | null>(null);

  useEffect(() => {
    let mounted = true;
    dashboardApi
      .getPendingDues()
      .then((res) => {
        if (mounted && res) {
          setData(res);
        }
      })
      .catch((err) => console.error('Failed to load pending dues:', err));
    return () => {
      mounted = false;
    };
  }, []);

  const pendingCustomerDues = data?.pendingCustomers && data.pendingCustomers.length > 0
    ? data.pendingCustomers.map((c) => ({
        customer: c.name,
        contact: c.phone,
        due: c.dueAmount,
        days: c.dueAmount > 50000 ? 35 : 14,
        status: c.dueAmount > 50000 ? 'overdue' : 'normal',
      }))
    : [];

  const totalCustomerDue = pendingCustomerDues.reduce((acc, c) => acc + c.due, 0);

  const pendingSupplierPayments = data?.pendingSuppliers && data.pendingSuppliers.length > 0
    ? data.pendingSuppliers.map((s) => ({
        supplier: s.name,
        mandi: s.city || 'Orchard Cooperative',
        due: s.dueAmount,
        dueDate: 'Weekly Mandi Settlement',
        terms: 'Net 15',
        status: s.dueAmount > 80000 ? 'urgent' : 'normal',
      }))
    : [];

  const totalSupplierDue = pendingSupplierPayments.reduce((acc, s) => acc + s.due, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5 font-sans">
      {/* 1. Pending Customer Payments */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Pending Customer Payments</h4>
              <p className="text-[10px] text-slate-400">Receivables requiring collection follow-ups</p>
            </div>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-mono">
              Total {formatINR(totalCustomerDue)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                  <th className="pb-2">Customer</th>
                  <th className="pb-2 text-right">Outstanding</th>
                  <th className="pb-2 text-center">Aging</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingCustomerDues.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                      All customer dues settled. No outstanding customer accounts.
                    </td>
                  </tr>
                ) : (
                  pendingCustomerDues.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5">
                        <div className="font-semibold text-slate-800">{item.customer}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.contact}</div>
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-amber-700">
                        {formatINR(item.due)}
                      </td>
                      <td className="py-2.5 text-center">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            item.status === 'overdue'
                              ? 'text-rose-700 bg-rose-50 border border-rose-200'
                              : 'text-amber-700 bg-amber-50 border border-amber-200'
                          }`}
                        >
                          {item.days}d open
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => onSendReminder(item.customer, item.due)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded transition-colors cursor-pointer"
                        >
                          <MessageCircleIcon className="w-3 h-3 text-emerald-600" />
                          <span>Remind</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <button
          onClick={() => onNavigateReport('report-customer-due')}
          className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition-colors w-full cursor-pointer group"
        >
          <span>Open Full Customer Ledger Aging</span>
          <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* 2. Pending Supplier Payments */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Supplier Pending Payments</h4>
              <p className="text-[10px] text-slate-400">Accounts payable to growers & farmer unions</p>
            </div>
            <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-mono">
              Total {formatINR(totalSupplierDue)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                  <th className="pb-2">Supplier / Grower</th>
                  <th className="pb-2 text-right">Payable</th>
                  <th className="pb-2 text-center">Terms</th>
                  <th className="pb-2 text-right">Disbursement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingSupplierPayments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                      No outstanding supplier payables pending.
                    </td>
                  </tr>
                ) : (
                  pendingSupplierPayments.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5">
                        <div className="font-semibold text-slate-800">{item.supplier}</div>
                        <div className="text-[10px] text-slate-400">{item.mandi} · {item.dueDate}</div>
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-rose-700">
                        {formatINR(item.due)}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {item.terms}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => onPaySupplier(item.supplier, item.due)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-slate-900 hover:bg-slate-800 px-2.5 py-1 rounded shadow-2xs transition-colors cursor-pointer"
                        >
                          <RupeeIcon className="w-3 h-3 text-emerald-400" />
                          <span>Settle</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <button
          onClick={() => onNavigateReport('report-supplier-due')}
          className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition-colors w-full cursor-pointer group"
        >
          <span>Open Full Supplier Due & Vouchers</span>
          <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
