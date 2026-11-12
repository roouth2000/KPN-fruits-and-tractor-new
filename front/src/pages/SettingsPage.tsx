import React, { useState, useEffect } from 'react';
import {
  BuildingIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  SaveIcon,
  LayersIcon,
  CheckSquareIcon,
  PrinterIcon,
  RefreshCwIcon,
} from '../components/icons';
import { qzTrayService } from '../services/qzTrayService';
import type { PrinterSettings, QZTrayStatus } from '../types/printer';

interface SettingsPageProps {
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
  onNavigateRoles?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onShowToast, onNavigateRoles }) => {
  const [activeTab, setActiveTab] = useState<'mandi' | 'billing' | 'apmc' | 'inventory'>('mandi');

  // Mandi & Business Details State
  const [mandiSettings, setMandiSettings] = useState({
    businessName: 'Finovore Fresh Produce Mandi',
    licenseNo: 'APMC/MUM/2026/8941',
    yardBay: 'APMC Market-1, Bay #12, Vashi, Navi Mumbai',
    city: 'Navi Mumbai',
    state: 'Maharashtra',
    pincode: '400703',
    phone: '+91 98765 43210',
    email: 'terminal.vashi@finovore.com',
    gstin: '27AABCF1234F1Z5',
  });

  // Billing & Printing Preferences
  const [billingSettings, setBillingSettings] = useState({
    invoicePrefix: 'INV-2026-',
    printLayout: 'THERMAL_80MM', // 'THERMAL_80MM' | 'A4_STANDARD'
    autoPrintOnConfirm: true,
    roundOffCash: true,
    defaultPaymentMethod: 'CASH',
    creditGraceDays: '15',
    notesFooter: 'Goods once sold cannot be returned after mandi gate dispatch.',
  });

  // APMC Market Fees & Taxes
  const [apmcSettings, setApmcSettings] = useState({
    marketCessRate: '1.05',
    hamaliPerCrate: '5.00',
    weighingChargePerBatch: '10.00',
    enableGst: false,
    defaultGstRate: '0.00',
  });

  // Inventory & Crates Settings
  const [inventorySettings, setInventorySettings] = useState({
    lowStockThreshold: '25',
    traySecurityDeposit: '50',
    allowNegativeStock: false,
    autoAlertExpiry: true,
  });

  // QZ Tray & Thermal Printer Settings
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(qzTrayService.getSettings());
  const [printersList, setPrintersList] = useState<string[]>([]);
  const [isScanningPrinters, setIsScanningPrinters] = useState(false);
  const [qzStatus, setQzStatus] = useState<QZTrayStatus>(qzTrayService.getStatus());
  const [isTestingPrint, setIsTestingPrint] = useState(false);

  useEffect(() => {
    const unsub = qzTrayService.onStatusChange(setQzStatus);
    qzTrayService.discoverPrinters().then(setPrintersList).catch(() => {});
    return unsub;
  }, []);

  const handleScanPrinters = async () => {
    setIsScanningPrinters(true);
    try {
      const list = await qzTrayService.discoverPrinters();
      setPrintersList(list);
      if (!printerSettings.printerName && list.length > 0) {
        setPrinterSettings((prev) => ({ ...prev, printerName: list[0] }));
      }
    } finally {
      setIsScanningPrinters(false);
    }
  };

  const handleTestPrintSettings = async () => {
    setIsTestingPrint(true);
    try {
      const res = await qzTrayService.printTestReceipt(printerSettings);
      if (res.method === 'QZ_TRAY') {
        onShowToast?.('Test Ticket Printed', `Direct silent print sent to "${res.printer}".`, 'success');
      } else {
        onShowToast?.('Browser Print Opened', 'Test receipt opened in Browser Print Dialog.', 'info');
      }
    } catch (err: any) {
      onShowToast?.('Print Failed', err?.message || 'Error executing test print', 'warning');
    } finally {
      setIsTestingPrint(false);
    }
  };

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    qzTrayService.saveSettings(printerSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    onShowToast?.(
      'Settings Updated',
      `Mandi operational parameters & ${printerSettings.paperSize} printer preferences saved successfully.`,
      'success'
    );
  };

  return (
    <div className="space-y-6 font-sans max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure APMC mandi parameters, POS billing formats, thermal printers, and operational rules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onNavigateRoles && (
            <button
              onClick={onNavigateRoles}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            >
              <ShieldCheckIcon className="w-3.5 h-3.5" />
              <span>Roles &amp; Permissions</span>
            </button>
          )}

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <SaveIcon className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('mandi')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'mandi'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BuildingIcon className="w-3.5 h-3.5" />
          <span>Mandi &amp; Business Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('billing')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'billing'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ReceiptTextIcon className="w-3.5 h-3.5" />
          <span>Billing &amp; Thermal Printing</span>
        </button>

        <button
          onClick={() => setActiveTab('apmc')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'apmc'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BuildingIcon className="w-3.5 h-3.5" />
          <span>APMC Cess &amp; Hamali</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'inventory'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <LayersIcon className="w-3.5 h-3.5" />
          <span>Stock &amp; Trays Policy</span>
        </button>
      </div>

      {isSaved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <CheckSquareIcon className="w-4 h-4 text-emerald-600" />
          <span>Configuration saved successfully and synced with Mandi Billing terminal.</span>
        </div>
      )}

      {/* Tab 1: Mandi & Business Details */}
      {activeTab === 'mandi' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">APMC Mandi Yard &amp; Business Profile</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              These details are printed on all tax invoices, delivery slips, and customer vouchers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Wholesale Produce Business Name
              </label>
              <input
                type="text"
                value={mandiSettings.businessName}
                onChange={(e) => setMandiSettings({ ...mandiSettings, businessName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                APMC Yard License / Registration No.
              </label>
              <input
                type="text"
                value={mandiSettings.licenseNo}
                onChange={(e) => setMandiSettings({ ...mandiSettings, licenseNo: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mandi Market Bay &amp; Stall Address
              </label>
              <input
                type="text"
                value={mandiSettings.yardBay}
                onChange={(e) => setMandiSettings({ ...mandiSettings, yardBay: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Phone / WhatsApp
              </label>
              <input
                type="text"
                value={mandiSettings.phone}
                onChange={(e) => setMandiSettings({ ...mandiSettings, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Support Email
              </label>
              <input
                type="email"
                value={mandiSettings.email}
                onChange={(e) => setMandiSettings({ ...mandiSettings, email: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GSTIN (Optional)
              </label>
              <input
                type="text"
                value={mandiSettings.gstin}
                onChange={(e) => setMandiSettings({ ...mandiSettings, gstin: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                City / Market Zone
              </label>
              <input
                type="text"
                value={mandiSettings.city}
                onChange={(e) => setMandiSettings({ ...mandiSettings, city: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Billing & Thermal Printing */}
      {activeTab === 'billing' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">POS Billing &amp; Thermal Printer Preferences</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Control direct QZ Tray printing, thermal 80mm/58mm layouts, auto-cut, and hardware options.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTestPrintSettings}
              disabled={isTestingPrint}
              className="px-3.5 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs self-start sm:self-auto disabled:opacity-50"
            >
              <PrinterIcon className={`w-3.5 h-3.5 ${isTestingPrint ? 'animate-bounce' : ''}`} />
              <span>{isTestingPrint ? 'Printing Test...' : 'Run Test Print'}</span>
            </button>
          </div>

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
                <div className="font-bold text-xs flex items-center gap-2">
                  <span>
                    {qzStatus === 'CONNECTED'
                      ? 'QZ Tray Service: Online & Connected'
                      : 'QZ Tray Service: Offline / Not Detected'}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                      qzStatus === 'CONNECTED'
                        ? 'bg-emerald-200/80 text-emerald-900'
                        : 'bg-amber-200/80 text-amber-900'
                    }`}
                  >
                    {qzStatus === 'CONNECTED' ? 'Silent Print Active' : 'Browser Fallback'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {qzStatus === 'CONNECTED'
                    ? 'Connected on ws://localhost:8182. Receipts print silently without browser print dialogs.'
                    : 'Start the QZ Tray desktop app for 1-click silent thermal printing. If offline, browser print is used.'}
                </p>
              </div>
            </div>

            {qzStatus !== 'CONNECTED' && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await qzTrayService.connect();
                  if (ok) {
                    onShowToast?.('QZ Tray Connected', 'WebSocket link established.', 'success');
                    handleScanPrinters();
                  } else {
                    onShowToast?.('QZ Tray Offline', 'Ensure QZ Tray desktop app is running on localhost.', 'warning');
                  }
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-colors cursor-pointer flex-shrink-0"
              >
                Connect QZ Tray
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice Number Prefix
              </label>
              <input
                type="text"
                value={billingSettings.invoicePrefix}
                onChange={(e) => setBillingSettings({ ...billingSettings, invoicePrefix: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
              <p className="text-[11px] text-slate-400 mt-1">Example: INV-2026-000042</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Target Physical Printer
                </label>
                <button
                  type="button"
                  onClick={handleScanPrinters}
                  disabled={isScanningPrinters}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCwIcon className={`w-3 h-3 ${isScanningPrinters ? 'animate-spin' : ''}`} />
                  <span>{isScanningPrinters ? 'Scanning...' : 'Refresh'}</span>
                </button>
              </div>
              <select
                value={printerSettings.printerName}
                onChange={(e) => setPrinterSettings({ ...printerSettings, printerName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium bg-white"
              >
                <option value="">-- Use Default System Printer --</option>
                {printersList.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Paper Size */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Thermal Paper Width &amp; Layout
              </label>
              <select
                value={printerSettings.paperSize}
                onChange={(e) => setPrinterSettings({ ...printerSettings, paperSize: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium bg-white"
              >
                <option value="80mm">80mm Thermal (Standard POS - 72mm printable)</option>
                <option value="58mm">58mm Thermal (Compact / Handheld - 48mm printable)</option>
              </select>
            </div>

            {/* Print Mode */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Printing Communication Mode
              </label>
              <select
                value={printerSettings.printMode}
                onChange={(e) => setPrinterSettings({ ...printerSettings, printMode: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium bg-white"
              >
                <option value="QZ_TRAY_SILENT">Direct Silent Print via QZ Tray (No Dialogs)</option>
                <option value="BROWSER_DIALOG">Standard Browser Print Dialog</option>
              </select>
            </div>

            <div className="sm:col-span-2 space-y-2.5 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-900 block">Hardware Automation Controls</span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printerSettings.autoPrintOnSave}
                    onChange={(e) => setPrinterSettings({ ...printerSettings, autoPrintOnSave: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    Auto-print immediately when bill is saved (F9)
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printerSettings.cutPaper}
                    onChange={(e) => setPrinterSettings({ ...printerSettings, cutPaper: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    Send paper cut command (GS V) after receipt
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printerSettings.openCashDrawer}
                    onChange={(e) => setPrinterSettings({ ...printerSettings, openCashDrawer: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    Open RJ-11 Cash Drawer on cash sales
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printerSettings.printSupplierBatchTrace}
                    onChange={(e) => setPrinterSettings({ ...printerSettings, printSupplierBatchTrace: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    Print Supplier &amp; Batch Trace on receipt (Rule 6)
                  </span>
                </label>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Receipt Footer Message
              </label>
              <textarea
                rows={2}
                value={printerSettings.footerMessage}
                onChange={(e) => setPrinterSettings({ ...printerSettings, footerMessage: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: APMC Cess & Hamali */}
      {activeTab === 'apmc' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">APMC Mandi Committee Fees &amp; Labour Rates</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Standard statutory market cess and terminal handling charges applied during wholesale settlements.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                APMC Market Cess (% of wholesale turnover)
              </label>
              <input
                type="number"
                step="0.01"
                value={apmcSettings.marketCessRate}
                onChange={(e) => setApmcSettings({ ...apmcSettings, marketCessRate: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
              <p className="text-[11px] text-slate-400 mt-1">Maharashtra APMC standard: 1.05%</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hamali (Unloading &amp; Stacking Charge per Crate)
              </label>
              <input
                type="number"
                step="0.50"
                value={apmcSettings.hamaliPerCrate}
                onChange={(e) => setApmcSettings({ ...apmcSettings, hamaliPerCrate: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
              <p className="text-[11px] text-slate-400 mt-1">Standard rate: ₹5.00 per crate</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                APMC Electronic Weighbridge Fee (per vehicle batch)
              </label>
              <input
                type="number"
                step="1.00"
                value={apmcSettings.weighingChargePerBatch}
                onChange={(e) => setApmcSettings({ ...apmcSettings, weighingChargePerBatch: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Stock & Trays Policy */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Inventory Safeguards &amp; Plastic Tray Policy</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rules governing physical fruit stock deductions, reorder triggers, and plastic crate accounting.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Low Stock Warning Threshold (Crates/Boxes)
              </label>
              <input
                type="number"
                value={inventorySettings.lowStockThreshold}
                onChange={(e) => setInventorySettings({ ...inventorySettings, lowStockThreshold: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Plastic Crate Security Deposit (₹ per unit)
              </label>
              <input
                type="number"
                value={inventorySettings.traySecurityDeposit}
                onChange={(e) => setInventorySettings({ ...inventorySettings, traySecurityDeposit: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="sm:col-span-2 space-y-3 pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inventorySettings.allowNegativeStock}
                  onChange={(e) => setInventorySettings({ ...inventorySettings, allowNegativeStock: e.target.checked })}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span className="text-xs font-medium text-slate-700">
                  Allow negative stock billing (Strictly requires Admin override authorization)
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inventorySettings.autoAlertExpiry}
                  onChange={(e) => setInventorySettings({ ...inventorySettings, autoAlertExpiry: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-xs font-medium text-slate-700">
                  Highlight fruits in cold storage that exceed standard shelf life (Rotting prevention)
                </span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
