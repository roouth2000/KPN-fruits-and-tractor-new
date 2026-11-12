import React from 'react';
import { PrinterSettings } from './printer/PrinterSettings';
import { PrinterIcon, XIcon } from './icons';

interface PrinterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const PrinterSettingsModal: React.FC<PrinterSettingsModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <PrinterIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white tracking-tight">
                Thermal Printer Configuration
              </h2>
              <p className="text-xs text-indigo-200/80">
                Direct browser-native printing via Web Serial API (Zero background software required)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[calc(85vh-70px)] overflow-y-auto space-y-4">
          <PrinterSettings
            onSaved={onClose}
            onShowToast={onShowToast}
          />
        </div>
      </div>
    </div>
  );
};
