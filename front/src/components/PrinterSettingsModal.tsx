import React, { useState, useEffect, useCallback } from 'react';
import { qzTrayService } from '../services/qzTrayService';
import { settingApi } from '../services/settingApi';
import type { PrinterSettings, QZTrayStatus } from '../types/printer';
import {
  PrinterIcon,
  RefreshCwIcon,
  XIcon,
} from './icons';

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
  const [settings, setSettings] = useState<PrinterSettings>(qzTrayService.getSettings());
  const [qzStatus, setQzStatus] = useState<QZTrayStatus>(qzTrayService.getStatus());
  const [printers, setPrinters] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Subscribe to QZ Tray status changes
  useEffect(() => {
    const unsub = qzTrayService.onStatusChange((status) => {
      setQzStatus(status);
    });
    return unsub;
  }, []);

  // Scan printers on modal open
  const scanPrinters = useCallback(async () => {
    setIsScanning(true);
    try {
      const list = await qzTrayService.discoverPrinters();
      setPrinters(list);

      // If no printer selected yet, pick default
      if (!settings.printerName && list.length > 0) {
        const def = await qzTrayService.getDefaultPrinter();
        const chosen = def && list.includes(def) ? def : list[0];
        setSettings((prev) => ({ ...prev, printerName: chosen }));
      }
    } catch (err) {
      console.warn('Printer discovery error:', err);
    } finally {
      setIsScanning(false);
    }
  }, [settings.printerName]);

  useEffect(() => {
    if (isOpen) {
      const current = qzTrayService.getSettings();
      setSettings(current);
      scanPrinters();

      settingApi
        .getPublicSettings()
        .then((pub) => {
          if (!pub) return;
          setSettings((prev) => {
            const bizName = pub['mandi.businessName'] || prev.shopName || 'SR FRUITS';
            const monogram = pub['mandi.logoMonogram'] || prev.shopInitials || 'SR';
            const logoUrl = pub['mandi.logoUrl'] !== undefined ? pub['mandi.logoUrl'] : prev.logoUrl;
            const printLogo = pub['mandi.printLogo'] !== undefined ? Boolean(pub['mandi.printLogo']) : prev.printLogo;
            const bay = pub['mandi.yardBay'] || 'T/A-18,T/E-25,ANNA FRUITS MARKET';
            const city = pub['mandi.city'] || 'KOYAMBEDU, CHENNAI';
            const pin = pub['mandi.pincode'] || '600092';
            const phone = pub['mandi.phone'] || prev.shopPhone || '8778219770';

            const address = `${bay},\n${city}-${pin}`;
            return {
              ...prev,
              shopName: prev.shopName && prev.shopName !== 'KBN FRUITS AND TRADERS' ? prev.shopName : bizName,
              shopInitials: prev.shopInitials && prev.shopInitials !== 'KBN' ? prev.shopInitials : monogram,
              logoUrl: prev.logoUrl !== undefined ? prev.logoUrl : logoUrl,
              printLogo: prev.printLogo !== undefined ? prev.printLogo : printLogo,
              shopAddress: prev.shopAddress && !prev.shopAddress.includes('Vashi') ? prev.shopAddress : address,
              shopPhone: prev.shopPhone && prev.shopPhone !== '+91 98765 43210' ? prev.shopPhone : phone,
            };
          });
        })
        .catch((err) => {
          console.warn('Could not load public settings in printer modal:', err);
        });
    }
  }, [isOpen, scanPrinters]);

  if (!isOpen) return null;

  // Handle connecting to QZ Tray
  const handleConnectQz = async () => {
    setIsConnecting(true);
    try {
      const ok = await qzTrayService.connect();
      if (ok) {
        onShowToast?.('QZ Tray Connected', 'Successfully established WebSocket link to QZ Tray service.', 'success');
        scanPrinters();
      } else {
        onShowToast?.(
          'QZ Tray Offline',
          'Could not reach QZ Tray on localhost:8182. Ensure the QZ Tray desktop app is running.',
          'warning'
        );
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Run real test print
  const handleTestPrint = async () => {
    setIsTesting(true);
    try {
      const res = await qzTrayService.printTestReceipt(settings);
      if (res.method === 'QZ_TRAY') {
        onShowToast?.(
          'Test Ticket Printed',
          `Direct diagnostic receipt sent silently to "${res.printer}" (${settings.paperSize}).`,
          'success'
        );
      } else {
        onShowToast?.(
          'Browser Print Dialog Opened',
          'Test receipt rendered via Browser Print (QZ Tray offline or fallback mode).',
          'info'
        );
      }
    } catch (err: any) {
      onShowToast?.('Print Test Failed', err?.message || 'Error executing test print', 'warning');
    } finally {
      setIsTesting(false);
    }
  };

  // Save settings
  const handleSave = () => {
    qzTrayService.saveSettings(settings);
    onShowToast?.(
      'Printer Settings Saved',
      `Configured for ${settings.paperSize} layout (${settings.printMode === 'QZ_TRAY_SILENT' ? 'Direct Silent' : 'Browser Dialog'}).`,
      'success'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <PrinterIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                POS Thermal Printer &amp; QZ Tray Settings
              </h2>
              <p className="text-xs text-slate-500">
                Direct silent hardware printing, 80mm/58mm layouts, auto-cut &amp; cash drawer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* QZ Tray Connection Status Card */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              qzStatus === 'CONNECTED'
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/70 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                  qzStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <div>
                <div className="font-bold text-sm flex items-center gap-2">
                  <span>
                    {qzStatus === 'CONNECTED'
                      ? 'QZ Tray Service: Online & Connected'
                      : qzStatus === 'CONNECTING'
                      ? 'QZ Tray Service: Connecting...'
                      : 'QZ Tray Service: Offline / Not Detected'}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                      qzStatus === 'CONNECTED'
                        ? 'bg-emerald-200/80 text-emerald-900'
                        : 'bg-amber-200/80 text-amber-900'
                    }`}
                  >
                    {qzStatus === 'CONNECTED' ? 'Silent Print Active' : 'Fallback Mode'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  {qzStatus === 'CONNECTED'
                    ? 'Connected via local WebSocket on ws://localhost:8182. Receipts print silently without browser dialogs.'
                    : 'When QZ Tray desktop app is running, invoices print instantly with 1-click. If offline, standard browser print is used.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {qzStatus !== 'CONNECTED' ? (
                <button
                  type="button"
                  onClick={handleConnectQz}
                  disabled={isConnecting}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isConnecting ? 'Connecting...' : 'Connect QZ Tray'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => qzTrayService.disconnect()}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>

          {/* Printer Selection */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 flex items-center gap-1.5">
                <PrinterIcon className="w-4 h-4 text-indigo-600" />
                <span>Target Physical Printer</span>
              </label>

              <button
                type="button"
                onClick={scanPrinters}
                disabled={isScanning}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCwIcon className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Scanning Hardware...' : 'Scan / Refresh Printers'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={settings.printerName}
                onChange={(e) => setSettings({ ...settings, printerName: e.target.value })}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">-- Use Default System Printer --</option>
                {printers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={async () => {
                  const def = await qzTrayService.getDefaultPrinter();
                  if (def) {
                    setSettings({ ...settings, printerName: def });
                    onShowToast?.('Default Printer Selected', def, 'info');
                  }
                }}
                className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl font-semibold text-slate-700 transition-colors cursor-pointer flex-shrink-0"
              >
                Use OS Default
              </button>
            </div>
            {printers.length === 0 && (
              <p className="text-[11px] text-slate-500">
                No printers discovered yet. Start QZ Tray to automatically discover USB, Bluetooth, and network thermal printers.
              </p>
            )}
          </div>

          {/* Paper Size & Layout */}
          <div className="space-y-2">
            <label className="font-bold text-slate-900 block">Thermal Paper Width &amp; Layout</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 80mm */}
              <label
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  settings.paperSize === '80mm'
                    ? 'bg-indigo-50/60 border-indigo-400 ring-2 ring-indigo-500/20'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="paperSize"
                  value="80mm"
                  checked={settings.paperSize === '80mm'}
                  onChange={() => setSettings({ ...settings, paperSize: '80mm' })}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>80mm Thermal (Standard POS)</span>
                    <span className="text-[10px] px-1.5 rounded bg-indigo-100 text-indigo-700 font-bold">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    72mm printable width, full produce table columns (Item, Qty, Rate, Amount), clean supplier lot breakdown.
                  </p>
                </div>
              </label>

              {/* 58mm */}
              <label
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  settings.paperSize === '58mm'
                    ? 'bg-indigo-50/60 border-indigo-400 ring-2 ring-indigo-500/20'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="paperSize"
                  value="58mm"
                  checked={settings.paperSize === '58mm'}
                  onChange={() => setSettings({ ...settings, paperSize: '58mm' })}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-bold text-slate-900">58mm Thermal (Compact / Mobile)</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    48mm printable width, condensed 2-line layout for smaller receipt printers and dock terminals.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Print Mode */}
          <div className="space-y-2">
            <label className="font-bold text-slate-900 block">Printing Workflow Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  settings.printMode === 'QZ_TRAY_SILENT'
                    ? 'bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="printMode"
                  value="QZ_TRAY_SILENT"
                  checked={settings.printMode === 'QZ_TRAY_SILENT'}
                  onChange={() => setSettings({ ...settings, printMode: 'QZ_TRAY_SILENT' })}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-bold text-slate-900">Direct Silent Print (QZ Tray)</div>
                  <p className="text-[11px] text-slate-500">
                    Zero popups or print dialogs. Sends instantly to the thermal cutter for fast counter sales.
                  </p>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  settings.printMode === 'BROWSER_DIALOG'
                    ? 'bg-slate-100 border-slate-400'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="printMode"
                  value="BROWSER_DIALOG"
                  checked={settings.printMode === 'BROWSER_DIALOG'}
                  onChange={() => setSettings({ ...settings, printMode: 'BROWSER_DIALOG' })}
                  className="mt-0.5 text-slate-600 focus:ring-slate-500"
                />
                <div>
                  <div className="font-bold text-slate-900">Browser Native Dialog</div>
                  <p className="text-[11px] text-slate-500">
                    Always displays the browser's print preview screen before sending.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Hardware & Receipt Options */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <span className="font-bold text-slate-900 block">Hardware &amp; Receipt Options</span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoPrintOnSave}
                  onChange={(e) => setSettings({ ...settings, autoPrintOnSave: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="font-medium text-slate-800">Auto-print on "Save &amp; Print" (F9)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.cutPaper}
                  onChange={(e) => setSettings({ ...settings, cutPaper: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="font-medium text-slate-800">Auto-cut receipt paper (GS V)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.openCashDrawer}
                  onChange={(e) => setSettings({ ...settings, openCashDrawer: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="font-medium text-slate-800">Open RJ-11 Cash Drawer on Cash Sale</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.printSupplierBatchTrace}
                  onChange={(e) => setSettings({ ...settings, printSupplierBatchTrace: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="font-medium text-slate-800">Print Supplier &amp; Batch Trace (Rule 6)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.printQrCode}
                  onChange={(e) => setSettings({ ...settings, printQrCode: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="font-medium text-slate-800">Print UPI Payment / Barcode</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-700">Receipt Copies:</span>
                <select
                  value={settings.copies}
                  onChange={(e) => setSettings({ ...settings, copies: parseInt(e.target.value, 10) || 1 })}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800"
                >
                  <option value={1}>1 Copy (Customer)</option>
                  <option value={2}>2 Copies (Customer + Dock)</option>
                  <option value={3}>3 Copies (Customer + Dock + Accounts)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Shop Branding & Receipt Header/Footer */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Koyambedu Receipt Header &amp; Branding</span>
                <span className="text-[10px] text-slate-500 font-medium">Logo and Monogram are non-mandatory</span>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                <input
                  type="checkbox"
                  checked={settings.printLogo !== false}
                  onChange={(e) => setSettings({ ...settings, printLogo: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span className="text-xs font-bold text-slate-800">Print Logo on Receipt</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Monogram / Logo Code</label>
                <input
                  type="text"
                  maxLength={5}
                  value={settings.shopInitials || ''}
                  onChange={(e) => setSettings({ ...settings, shopInitials: e.target.value.toUpperCase() })}
                  placeholder="e.g. SR"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400">Large letters centered at top</span>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Shop / Firm Name</label>
                <input
                  type="text"
                  value={settings.shopName || ''}
                  onChange={(e) => setSettings({ ...settings, shopName: e.target.value.toUpperCase() })}
                  placeholder="e.g. SR FRUITS"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Optional Logo Image (Non-mandatory) */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200/90 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Logo Image <span className="text-slate-400 font-normal">(Optional / Non-Mandatory)</span>
                </label>
                {settings.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, logoUrl: '' })}
                    className="text-[10px] text-red-600 hover:underline font-semibold"
                  >
                    Remove Logo
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Image URL or upload file (leave blank if text only)"
                  value={settings.logoUrl || ''}
                  onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <label className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 cursor-pointer shadow-2xs flex-shrink-0">
                  Browse
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') {
                            setSettings({ ...settings, logoUrl: reader.result });
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
              {settings.logoUrl && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-slate-500 font-medium">Receipt Logo Preview:</span>
                  <img
                    src={settings.logoUrl}
                    alt="Logo preview"
                    className="h-7 max-w-[70px] object-contain border border-slate-200 bg-white p-0.5 rounded"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Address (Thermal Lines)</label>
                <textarea
                  rows={2}
                  value={settings.shopAddress || ''}
                  onChange={(e) => setSettings({ ...settings, shopAddress: e.target.value })}
                  placeholder="T/A-18,T/E-25,ANNA FRUITS MARKET,&#10;KOYAMBEDU,CHENNAI-600092"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Support Phone</label>
                  <input
                    type="text"
                    value={settings.shopPhone || ''}
                    onChange={(e) => setSettings({ ...settings, shopPhone: e.target.value })}
                    placeholder="8778219770"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Footer Tagline / Website</label>
                  <input
                    type="text"
                    value={settings.footerTagline || ''}
                    onChange={(e) => setSettings({ ...settings, footerTagline: e.target.value })}
                    placeholder="www.Websyncz.in-9092678008"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          {/* Test Print */}
          <button
            type="button"
            onClick={handleTestPrint}
            disabled={isTesting}
            className="px-4 py-2 bg-white border border-slate-200/90 hover:bg-slate-100 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <PrinterIcon className={`w-3.5 h-3.5 ${isTesting ? 'animate-bounce text-indigo-600' : 'text-slate-600'}`} />
            <span>{isTesting ? 'Sending Test Ticket...' : 'Run Test Print'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-sm transition-all cursor-pointer"
            >
              Save Printer Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
