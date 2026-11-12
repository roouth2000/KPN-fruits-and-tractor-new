import React, { useState } from 'react';
import { useThermalPrinter } from '../../hooks/useThermalPrinter';
import { PrinterConnection } from './PrinterConnection';
import type { PrinterSettings as IPrinterSettings, SerialBaudRate, PrinterTransport } from '../../services/printer/printerTypes';

interface PrinterSettingsProps {
  onSaved?: () => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const PrinterSettings: React.FC<PrinterSettingsProps> = ({
  onSaved,
  onShowToast,
}) => {
  const {
    status,
    device,
    settings,
    supportReport,
    connect,
    disconnect,
    reconnect,
    saveSettings,
    printTestReceipt,
  } = useThermalPrinter();

  const [form, setForm] = useState<IPrinterSettings>(settings);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = () => {
    saveSettings(form);
    onShowToast?.(
      'Settings Saved',
      `Thermal printer configuration updated for ${form.paperSize} (${form.transport}).`,
      'success'
    );
    onSaved?.();
  };

  const handleRunTest = async () => {
    setIsTesting(true);
    try {
      const res = await printTestReceipt(form);
      if (res.success) {
        onShowToast?.(
          'Test Print Sent',
          res.message || 'Test receipt printed successfully.',
          'success'
        );
      } else {
        onShowToast?.(
          'Test Print Failed',
          res.error || 'Failed to print test receipt.',
          'warning'
        );
      }
    } catch (err: any) {
      onShowToast?.('Test Print Error', err?.message || 'Error executing test print', 'warning');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Hardware Connection & Port Management */}
      <PrinterConnection
        status={status}
        device={device}
        supportReport={supportReport}
        baudRate={form.baudRate}
        transport={form.transport}
        onConnect={connect}
        onDisconnect={disconnect}
        onReconnect={reconnect}
        onBaudRateChange={(baudRate: SerialBaudRate) => setForm({ ...form, baudRate })}
        onTransportChange={(transport: PrinterTransport) => setForm({ ...form, transport })}
      />

      {/* 2. Thermal Paper Width & Column Layout */}
      <div>
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
          Thermal Paper Width &amp; Layout
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label
            className={`border rounded-xl p-3.5 cursor-pointer flex flex-col justify-between transition-all ${
              form.paperSize === '80mm'
                ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900">
                80mm Thermal (Standard POS)
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                Recommended
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              48 characters per line. Full produce table columns (Description, Qty, Rate, Amount) and totals.
            </p>
            <input
              type="radio"
              name="paperSize"
              value="80mm"
              checked={form.paperSize === '80mm'}
              onChange={() => setForm({ ...form, paperSize: '80mm' })}
              className="sr-only"
            />
          </label>

          <label
            className={`border rounded-xl p-3.5 cursor-pointer flex flex-col justify-between transition-all ${
              form.paperSize === '58mm'
                ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900">
                58mm Thermal (Compact / Mobile)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              32 characters per line. Condensed 2-line layout for dock printers and pocket terminals.
            </p>
            <input
              type="radio"
              name="paperSize"
              value="58mm"
              checked={form.paperSize === '58mm'}
              onChange={() => setForm({ ...form, paperSize: '58mm' })}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      {/* 3. Hardware & Workflow Toggles */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
          Hardware &amp; Receipt Options
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.autoPrintOnSave}
              onChange={(e) => setForm({ ...form, autoPrintOnSave: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <span className="font-medium text-slate-800">Auto-print on "Save &amp; Print" (F9)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.cutPaper}
              onChange={(e) => setForm({ ...form, cutPaper: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <span className="font-medium text-slate-800">Auto-cut receipt paper (ESC/POS)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.openCashDrawer}
              onChange={(e) => setForm({ ...form, openCashDrawer: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <span className="font-medium text-slate-800">Open RJ-11 Cash Drawer on Cash Sale</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.printQrCode}
              onChange={(e) => setForm({ ...form, printQrCode: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <span className="font-medium text-slate-800">Print UPI Payment QR Code</span>
          </label>

          <div className="flex items-center gap-2 sm:col-span-2 pt-1 border-t border-slate-200">
            <span className="font-medium text-slate-700">Receipt Copies:</span>
            <select
              value={form.copies}
              onChange={(e) => setForm({ ...form, copies: parseInt(e.target.value, 10) || 1 })}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 font-bold text-slate-800 text-xs"
            >
              <option value={1}>1 Copy (Customer Receipt)</option>
              <option value={2}>2 Copies (Customer + Loading Dock)</option>
              <option value={3}>3 Copies (Customer + Dock + Accounts)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Koyambedu Receipt Header & Mandi Branding */}
      <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold text-slate-900 block text-xs">
              Koyambedu Receipt Header &amp; Branding
            </span>
            <span className="text-[10.5px] text-slate-500 font-medium">
              Logo and Monogram are completely non-mandatory
            </span>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
            <input
              type="checkbox"
              checked={form.printLogo !== false}
              onChange={(e) => setForm({ ...form, printLogo: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
            />
            <span className="text-xs font-bold text-slate-800">Print Logo / Monogram</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Monogram Code
            </label>
            <input
              type="text"
              maxLength={5}
              value={form.shopInitials || ''}
              onChange={(e) => setForm({ ...form, shopInitials: e.target.value.toUpperCase() })}
              placeholder="e.g. SR"
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-[10px] text-slate-400">Large letters centered at top</span>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Shop / Firm Name
            </label>
            <input
              type="text"
              value={form.shopName || ''}
              onChange={(e) => setForm({ ...form, shopName: e.target.value.toUpperCase() })}
              placeholder="e.g. SR FRUITS"
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Address (Receipt Header Lines)
            </label>
            <textarea
              rows={2}
              value={form.shopAddress || ''}
              onChange={(e) => setForm({ ...form, shopAddress: e.target.value })}
              placeholder="T/A-18,T/E-25,ANNA FRUITS MARKET,&#10;KOYAMBEDU,CHENNAI-600092"
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Contact Phone / Mobile
            </label>
            <input
              type="text"
              value={form.shopPhone || ''}
              onChange={(e) => setForm({ ...form, shopPhone: e.target.value })}
              placeholder="e.g. 8778219770"
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <label className="block text-[11px] font-semibold text-slate-700 mt-2 mb-1">
              GSTIN (Optional)
            </label>
            <input
              type="text"
              value={form.shopGst || ''}
              onChange={(e) => setForm({ ...form, shopGst: e.target.value.toUpperCase() })}
              placeholder="Leave blank if unregistered"
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-200/60">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Footer Note
            </label>
            <input
              type="text"
              value={form.footerTerms || ''}
              onChange={(e) => setForm({ ...form, footerTerms: e.target.value })}
              placeholder="No Return,No Exchange"
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Footer Tagline / Software Credit
            </label>
            <input
              type="text"
              value={form.footerTagline || ''}
              onChange={(e) => setForm({ ...form, footerTagline: e.target.value })}
              placeholder="www.Websyncz.in-9092678008"
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 5. Bottom Action Bar: Test Print & Save */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
        <button
          type="button"
          onClick={handleRunTest}
          disabled={isTesting}
          className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          {isTesting ? 'Sending Test...' : 'Run Test Print'}
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs cursor-pointer transition-colors"
        >
          Save Printer Settings
        </button>
      </div>
    </div>
  );
};
