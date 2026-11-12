import React from 'react';
import { LayersIcon } from '../../../components/icons';

interface TrayPanelProps {
  trayIssued: number;
  trayReturned: number;
  onChangeIssued: (qty: number) => void;
  onChangeReturned: (qty: number) => void;
  customerOutstandingTrays?: number;
}

export const TrayPanel: React.FC<TrayPanelProps> = ({
  trayIssued,
  trayReturned,
  onChangeIssued,
  onChangeReturned,
  customerOutstandingTrays = 0,
}) => {
  const netTrays = (customerOutstandingTrays + trayIssued) - trayReturned;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <LayersIcon className="w-3.5 h-3.5 text-slate-500" />
          <span>Tray & Crate Accounting</span>
        </label>
        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-full">
          Customer Balance: {customerOutstandingTrays} Trays
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block text-slate-500 text-[11px] font-medium mb-1">
            Trays Issued (Outgoing)
          </label>
          <input
            type="number"
            min="0"
            value={trayIssued || 0}
            onChange={(e) => onChangeIssued(parseInt(e.target.value, 10) || 0)}
            className="w-full text-center font-bold bg-slate-50 border border-slate-200 rounded-lg py-1.5 text-slate-900 focus:outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <label className="block text-slate-500 text-[11px] font-medium mb-1">
            Trays Returned (Dock In)
          </label>
          <input
            type="number"
            min="0"
            value={trayReturned || 0}
            onChange={(e) => onChangeReturned(parseInt(e.target.value, 10) || 0)}
            className="w-full text-center font-bold bg-slate-50 border border-slate-200 rounded-lg py-1.5 text-slate-900 focus:outline-none focus:border-slate-900"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
        <span className="text-slate-500">Projected Outstanding Trays:</span>
        <span className="font-extrabold text-amber-700 font-mono text-xs">
          {netTrays} Trays
        </span>
      </div>
    </div>
  );
};

