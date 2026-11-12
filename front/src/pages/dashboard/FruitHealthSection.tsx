import React, { useState, useEffect } from 'react';
import {
  AlertTriangleIcon,
  RotateCcwIcon,
  PackageIcon,
  PlusIcon,
  ChevronRightIcon,
} from '../../components/icons';
import { formatINR } from '../../utils/helpers';
import { dashboardApi, type FruitHealthData } from '../../services/dashboardApi';

interface FruitHealthSectionProps {
  onNavigateReport: (reportId: string) => void;
  onOpenReorderModal?: () => void;
}

export const FruitHealthSection: React.FC<FruitHealthSectionProps> = ({
  onNavigateReport,
  onOpenReorderModal,
}) => {
  const [healthData, setHealthData] = useState<FruitHealthData | null>(null);

  useEffect(() => {
    let mounted = true;
    dashboardApi
      .getFruitHealth()
      .then((data) => {
        if (mounted && data) {
          setHealthData(data);
        }
      })
      .catch((err) => console.error('Failed to load fruit health data:', err));
    return () => {
      mounted = false;
    };
  }, []);

  const damagedItems = healthData?.damagedFruits && healthData.damagedFruits.length > 0
    ? healthData.damagedFruits.map((d) => ({
        name: d.name,
        qty: d.quantity,
        loss: d.lossAmount,
        cause: d.reason,
      }))
    : [];

  const totalDamagedLoss = damagedItems.reduce((acc, curr) => acc + curr.loss, 0);

  const returnedItems = healthData?.returnedFruits && healthData.returnedFruits.length > 0
    ? healthData.returnedFruits.map((r) => ({
        customer: r.customer,
        crates: r.quantity,
        val: r.refundAmount,
        reason: r.reason,
        status: 'Restocked',
      }))
    : [];

  const totalReturnedValue = returnedItems.reduce((acc, curr) => acc + curr.val, 0);

  const lowStockFruits = healthData?.lowStockFruits && healthData.lowStockFruits.length > 0
    ? healthData.lowStockFruits.map((ls) => ({
        name: ls.name,
        current: ls.currentStock,
        min: ls.minStock,
        urgency: ls.status.toLowerCase().includes('critical') ? 'critical' : 'low',
      }))
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5 font-sans">
      {/* 1. Damaged Fruits Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangleIcon className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Damaged Fruits</h4>
                <p className="text-[10px] text-slate-400">Recorded sorting & transit loss</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-mono">
              Live Mandi
            </span>
          </div>

          <div className="flex items-baseline gap-2 my-2">
            <span className="text-xl font-bold text-rose-700 font-mono tracking-tight">
              {formatINR(totalDamagedLoss)}
            </span>
            <span className="text-[11px] text-slate-500">
              ({damagedItems.length} incident batches)
            </span>
          </div>

          <div className="space-y-2 mt-3">
            {damagedItems.length === 0 ? (
              <div className="py-5 text-center text-xs text-slate-400 font-medium">
                No fruit damage recorded today. All lots intact.
              </div>
            ) : (
              damagedItems.slice(0, 4).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0"
                >
                  <div className="truncate pr-2">
                    <div className="font-semibold text-slate-800 truncate">{item.name}</div>
                    <div className="text-[10px] text-slate-400">{item.cause}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-mono text-slate-700 font-medium">{item.qty}</span>
                    <div className="text-[10px] font-bold text-rose-600 font-mono">
                      {formatINR(item.loss)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          onClick={() => onNavigateReport('report-damage')}
          className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition-colors w-full cursor-pointer group"
        >
          <span>View Detailed Damage Log</span>
          <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* 2. Returned Fruits Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
                <RotateCcwIcon className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Returned Fruits (RMA)</h4>
                <p className="text-[10px] text-slate-400">Customer rejected or exchange</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-mono">
              Restocked
            </span>
          </div>

          <div className="flex items-baseline gap-2 my-2">
            <span className="text-xl font-bold text-amber-700 font-mono tracking-tight">
              {formatINR(totalReturnedValue)}
            </span>
            <span className="text-[11px] text-slate-500">
              ({returnedItems.length} customer returns)
            </span>
          </div>

          <div className="space-y-2 mt-3">
            {returnedItems.length === 0 ? (
              <div className="py-5 text-center text-xs text-slate-400 font-medium">
                No customer returns logged today.
              </div>
            ) : (
              returnedItems.slice(0, 4).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0"
                >
                  <div className="truncate pr-2">
                    <div className="font-semibold text-slate-800 truncate">{item.customer}</div>
                    <div className="text-[10px] text-slate-400">{item.reason}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-mono text-slate-700 font-medium">{item.crates}</span>
                    <div className="text-[10px] font-bold text-emerald-600 font-mono">
                      {formatINR(item.val)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          onClick={() => onNavigateReport('report-returns')}
          className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition-colors w-full cursor-pointer group"
        >
          <span>View Customer Returns Log</span>
          <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* 3. Low Stock Fruits Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
                <PackageIcon className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Low Stock Fruits</h4>
                <p className="text-[10px] text-slate-400">Reorder threshold breached</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-mono">
              Action Req.
            </span>
          </div>

          <div className="flex items-center justify-between my-2">
            <div className="text-xl font-bold text-slate-900 font-mono tracking-tight">
              {lowStockFruits.length} Varieties Low
            </div>
            {onOpenReorderModal && (
              <button
                onClick={onOpenReorderModal}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-md shadow-2xs transition-colors cursor-pointer"
              >
                <PlusIcon className="w-3 h-3" />
                <span>+ Reorder</span>
              </button>
            )}
          </div>

          <div className="space-y-2 mt-3">
            {lowStockFruits.length === 0 ? (
              <div className="py-5 text-center text-xs text-slate-400 font-medium">
                All fruit inventory levels are optimal.
              </div>
            ) : (
              lowStockFruits.slice(0, 4).map((fruit, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0"
                >
                  <div className="truncate pr-2">
                    <div className="font-semibold text-slate-800 truncate">{fruit.name}</div>
                    <div className="text-[10px] text-slate-400">
                      Min safety level: {fruit.min}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                        fruit.urgency === 'critical'
                          ? 'text-rose-700 bg-rose-50 border border-rose-200'
                          : 'text-amber-700 bg-amber-50 border border-amber-200'
                      }`}
                    >
                      {fruit.current}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          onClick={() => onNavigateReport('report-stock')}
          className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition-colors w-full cursor-pointer group"
        >
          <span>Open Full Stock & Inventory</span>
          <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
