import React from 'react';
import type { PrinterConnectionStatus, PaperSize } from '../../services/printer/printerTypes';

interface PrinterStatusProps {
  status: PrinterConnectionStatus;
  paperSize?: PaperSize;
  deviceName?: string;
  onOpenSettings?: () => void;
  onQuickConnect?: () => void;
}

export const PrinterStatus: React.FC<PrinterStatusProps> = ({
  status,
  paperSize = '80mm',
  deviceName,
  onOpenSettings,
  onQuickConnect,
}) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'CONNECTED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CONNECTING':
        return 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse';
      case 'PRINTING':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse';
      case 'PRINT_FAILED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'DISCONNECTED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'NOT_CONNECTED':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getDotStyle = () => {
    switch (status) {
      case 'CONNECTED':
        return 'bg-emerald-500 shadow-xs shadow-emerald-500/50';
      case 'CONNECTING':
        return 'bg-blue-500 animate-ping';
      case 'PRINTING':
        return 'bg-indigo-500 animate-pulse';
      case 'PRINT_FAILED':
        return 'bg-rose-500';
      case 'DISCONNECTED':
        return 'bg-amber-500';
      case 'NOT_CONNECTED':
      default:
        return 'bg-slate-400';
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'CONNECTED':
        return deviceName ? `Printer Connected (${paperSize})` : `POS Thermal Online (${paperSize})`;
      case 'CONNECTING':
        return 'Connecting Printer...';
      case 'PRINTING':
        return 'Printing Receipt...';
      case 'PRINT_FAILED':
        return 'Print Failed';
      case 'DISCONNECTED':
        return 'Printer Disconnected';
      case 'NOT_CONNECTED':
      default:
        return 'Printer Not Connected';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={status === 'CONNECTED' ? onOpenSettings : (onQuickConnect || onOpenSettings)}
        className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${getBadgeStyle()}`}
        title={deviceName || 'Click to manage printer settings or connect device'}
      >
        <span className={`w-2 h-2 rounded-full ${getDotStyle()}`} />
        <span className="truncate max-w-[200px]">{getLabel()}</span>
      </button>
    </div>
  );
};

