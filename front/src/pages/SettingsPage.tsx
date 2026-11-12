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
  RotateCcwIcon,
  XIcon,
} from '../components/icons';
import { qzTrayService } from '../services/qzTrayService';
import { settingApi } from '../services/settingApi';
import type { PrinterSettings, QZTrayStatus, PaperSize, PrintMode } from '../types/printer';

interface SettingsPageProps {
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
  onNavigateRoles?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onShowToast, onNavigateRoles }) => {
  const [activeTab, setActiveTab] = useState<'mandi' | 'billing' | 'apmc' | 'inventory'>('mandi');

  // Loading & Action States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

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

  // Load Settings from Database via Setting API
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    settingApi
      .getAllSettings()
      .then((res) => {
        if (!isMounted || !res || !res.grouped) return;
        const { mandi, billing, apmc, inventory, printer } = res.grouped;

        if (mandi && Object.keys(mandi).length > 0) {
          setMandiSettings((prev) => ({
            ...prev,
            businessName: mandi.businessName !== undefined ? String(mandi.businessName) : prev.businessName,
            licenseNo: mandi.licenseNo !== undefined ? String(mandi.licenseNo) : prev.licenseNo,
            yardBay: mandi.yardBay !== undefined ? String(mandi.yardBay) : prev.yardBay,
            city: mandi.city !== undefined ? String(mandi.city) : prev.city,
            state: mandi.state !== undefined ? String(mandi.state) : prev.state,
            pincode: mandi.pincode !== undefined ? String(mandi.pincode) : prev.pincode,
            phone: mandi.phone !== undefined ? String(mandi.phone) : prev.phone,
            email: mandi.email !== undefined ? String(mandi.email) : prev.email,
            gstin: mandi.gstin !== undefined ? String(mandi.gstin) : prev.gstin,
          }));
        }

        if (billing && Object.keys(billing).length > 0) {
          setBillingSettings((prev) => ({
            ...prev,
            invoicePrefix: billing.invoicePrefix !== undefined ? String(billing.invoicePrefix) : prev.invoicePrefix,
            printLayout: billing.printLayout !== undefined ? String(billing.printLayout) : prev.printLayout,
            autoPrintOnConfirm: billing.autoPrintOnConfirm !== undefined ? Boolean(billing.autoPrintOnConfirm) : prev.autoPrintOnConfirm,
            roundOffCash: billing.roundOffCash !== undefined ? Boolean(billing.roundOffCash) : prev.roundOffCash,
            defaultPaymentMethod: billing.defaultPaymentMethod !== undefined ? String(billing.defaultPaymentMethod) : prev.defaultPaymentMethod,
            creditGraceDays: billing.creditGraceDays !== undefined ? String(billing.creditGraceDays) : prev.creditGraceDays,
            notesFooter: billing.notesFooter !== undefined ? String(billing.notesFooter) : prev.notesFooter,
          }));
        }

        if (apmc && Object.keys(apmc).length > 0) {
          setApmcSettings((prev) => ({
            ...prev,
            marketCessRate: apmc.marketCessRate !== undefined ? String(apmc.marketCessRate) : prev.marketCessRate,
            hamaliPerCrate: apmc.hamaliPerCrate !== undefined ? String(apmc.hamaliPerCrate) : prev.hamaliPerCrate,
            weighingChargePerBatch: apmc.weighingChargePerBatch !== undefined ? String(apmc.weighingChargePerBatch) : prev.weighingChargePerBatch,
            enableGst: apmc.enableGst !== undefined ? Boolean(apmc.enableGst) : prev.enableGst,
            defaultGstRate: apmc.defaultGstRate !== undefined ? String(apmc.defaultGstRate) : prev.defaultGstRate,
          }));
        }

        if (inventory && Object.keys(inventory).length > 0) {
          setInventorySettings((prev) => ({
            ...prev,
            lowStockThreshold: inventory.lowStockThreshold !== undefined ? String(inventory.lowStockThreshold) : prev.lowStockThreshold,
            traySecurityDeposit: inventory.traySecurityDeposit !== undefined ? String(inventory.traySecurityDeposit) : prev.traySecurityDeposit,
            allowNegativeStock: inventory.allowNegativeStock !== undefined ? Boolean(inventory.allowNegativeStock) : prev.allowNegativeStock,
            autoAlertExpiry: inventory.autoAlertExpiry !== undefined ? Boolean(inventory.autoAlertExpiry) : prev.autoAlertExpiry,
          }));
        }

        if (printer && Object.keys(printer).length > 0) {
          const currentSettings = qzTrayService.getSettings();
          const loadedPrinter: PrinterSettings = {
            ...currentSettings,
            printerName: printer.printerName || currentSettings.printerName,
            paperSize: (printer.paperSize as PaperSize) || currentSettings.paperSize,
            printMode: (printer.printMode as PrintMode) || currentSettings.printMode,
            cutPaper: printer.cutPaper !== undefined ? Boolean(printer.cutPaper) : currentSettings.cutPaper,
            openCashDrawer: printer.openCashDrawer !== undefined ? Boolean(printer.openCashDrawer) : currentSettings.openCashDrawer,
            footerMessage: printer.footerMessage || currentSettings.footerMessage,
          };
          setPrinterSettings(loadedPrinter);
          qzTrayService.saveSettings(loadedPrinter);
        }
      })
      .catch((err) => {
        console.error('Failed to load settings from DB:', err);
        onShowToast?.('Settings Notice', 'Loaded local configurations from terminal cache.', 'info');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [onShowToast]);

  // Subscribe to QZ Tray events & discover local thermal printers
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

  // Save all settings to MySQL database
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await settingApi.updateAllSettings({
        mandi: mandiSettings,
        billing: billingSettings,
        apmc: apmcSettings,
        inventory: inventorySettings,
        printer: printerSettings,
      });

      // Synchronize thermal printer preferences with local client storage
      qzTrayService.saveSettings(printerSettings);

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 4000);
      onShowToast?.(
        'Settings Saved',
        `All system parameters saved to database table "settings" and synced with POS terminal.`,
        'success'
      );
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      const msg = err.response?.data?.message || err.message || 'Error saving settings';
      onShowToast?.('Save Failed', msg, 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset current active tab settings to factory defaults
  const handleResetCurrentTab = async () => {
    setIsResetting(true);
    try {
      const categoryMap: Record<string, string> = {
        mandi: 'MANDI',
        billing: 'BILLING',
        apmc: 'APMC',
        inventory: 'INVENTORY',
      };
      const cat = categoryMap[activeTab] || 'MANDI';
      await settingApi.resetCategory(cat);

      // Refresh data from DB
      const res = await settingApi.getAllSettings();
      if (res && res.grouped) {
        const { mandi, billing, apmc, inventory } = res.grouped;
        if (cat === 'MANDI' && mandi) {
          setMandiSettings((prev) => ({
            ...prev,
            businessName: mandi.businessName !== undefined ? String(mandi.businessName) : prev.businessName,
            licenseNo: mandi.licenseNo !== undefined ? String(mandi.licenseNo) : prev.licenseNo,
            yardBay: mandi.yardBay !== undefined ? String(mandi.yardBay) : prev.yardBay,
            city: mandi.city !== undefined ? String(mandi.city) : prev.city,
            state: mandi.state !== undefined ? String(mandi.state) : prev.state,
            pincode: mandi.pincode !== undefined ? String(mandi.pincode) : prev.pincode,
            phone: mandi.phone !== undefined ? String(mandi.phone) : prev.phone,
            email: mandi.email !== undefined ? String(mandi.email) : prev.email,
            gstin: mandi.gstin !== undefined ? String(mandi.gstin) : prev.gstin,
          }));
        }
        if (cat === 'BILLING' && billing) {
          setBillingSettings((prev) => ({
            ...prev,
            invoicePrefix: billing.invoicePrefix !== undefined ? String(billing.invoicePrefix) : prev.invoicePrefix,
            printLayout: billing.printLayout !== undefined ? String(billing.printLayout) : prev.printLayout,
            autoPrintOnConfirm: billing.autoPrintOnConfirm !== undefined ? Boolean(billing.autoPrintOnConfirm) : prev.autoPrintOnConfirm,
            roundOffCash: billing.roundOffCash !== undefined ? Boolean(billing.roundOffCash) : prev.roundOffCash,
            defaultPaymentMethod: billing.defaultPaymentMethod !== undefined ? String(billing.defaultPaymentMethod) : prev.defaultPaymentMethod,
            creditGraceDays: billing.creditGraceDays !== undefined ? String(billing.creditGraceDays) : prev.creditGraceDays,
            notesFooter: billing.notesFooter !== undefined ? String(billing.notesFooter) : prev.notesFooter,
          }));
        }
        if (cat === 'APMC' && apmc) {
          setApmcSettings((prev) => ({
            ...prev,
            marketCessRate: apmc.marketCessRate !== undefined ? String(apmc.marketCessRate) : prev.marketCessRate,
            hamaliPerCrate: apmc.hamaliPerCrate !== undefined ? String(apmc.hamaliPerCrate) : prev.hamaliPerCrate,
            weighingChargePerBatch: apmc.weighingChargePerBatch !== undefined ? String(apmc.weighingChargePerBatch) : prev.weighingChargePerBatch,
            enableGst: apmc.enableGst !== undefined ? Boolean(apmc.enableGst) : prev.enableGst,
            defaultGstRate: apmc.defaultGstRate !== undefined ? String(apmc.defaultGstRate) : prev.defaultGstRate,
          }));
        }
        if (cat === 'INVENTORY' && inventory) {
          setInventorySettings((prev) => ({
            ...prev,
            lowStockThreshold: inventory.lowStockThreshold !== undefined ? String(inventory.lowStockThreshold) : prev.lowStockThreshold,
            traySecurityDeposit: inventory.traySecurityDeposit !== undefined ? String(inventory.traySecurityDeposit) : prev.traySecurityDeposit,
            allowNegativeStock: inventory.allowNegativeStock !== undefined ? Boolean(inventory.allowNegativeStock) : prev.allowNegativeStock,
            autoAlertExpiry: inventory.autoAlertExpiry !== undefined ? Boolean(inventory.autoAlertExpiry) : prev.autoAlertExpiry,
          }));
        }
      }

      setShowResetConfirm(false);
      onShowToast?.(
        'Reset Completed',
        `${cat} parameters have been restored to standard factory settings.`,
        'info'
      );
    } catch (err: any) {
      onShowToast?.('Reset Failed', err?.message || 'Error resetting settings', 'warning');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure APMC mandi parameters, POS billing formats, thermal printers, and operational rules in database table <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">settings</code>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
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
            type="button"
            onClick={() => setShowResetConfirm(true)}
            disabled={isLoading || isSaving || isResetting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title="Reset current tab to standard defaults"
          >
            <RotateCcwIcon className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isLoading || isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving to Database...</span>
              </>
            ) : (
              <>
                <SaveIcon className="w-3.5 h-3.5" />
                <span>Save All Settings</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
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
          <span>Configuration saved successfully into database table "settings" and synchronized across terminals.</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-slate-400 space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Loading system settings from database table <code className="font-mono">settings</code>...</p>
        </div>
      ) : (
        <>
          {/* Tab 1: Mandi & Business Details */}
          {activeTab === 'mandi' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">APMC Mandi Yard &amp; Business Profile</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    These details are printed on all tax invoices, delivery slips, and customer vouchers.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                  CATEGORY: MANDI
                </span>
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={mandiSettings.state}
                    onChange={(e) => setMandiSettings({ ...mandiSettings, state: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={mandiSettings.pincode}
                    onChange={(e) => setMandiSettings({ ...mandiSettings, pincode: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* Card Action Footer */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Database Sync Active · Table <code className="font-mono">settings</code></span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    disabled={isSaving || isResetting}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RotateCcwIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reset Tab Defaults</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave()}
                    disabled={isSaving}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <SaveIcon className="w-3.5 h-3.5" />
                        <span>Save Mandi Changes</span>
                      </>
                    )}
                  </button>
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
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={handleTestPrintSettings}
                    disabled={isTestingPrint}
                    className="px-3.5 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                  >
                    <PrinterIcon className={`w-3.5 h-3.5 ${isTestingPrint ? 'animate-bounce' : ''}`} />
                    <span>{isTestingPrint ? 'Printing Test...' : 'Run Test Print'}</span>
                  </button>
                </div>
              </div>

              {/* QZ Tray Connection Status Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${qzStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">QZ Tray Hardware Service</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${qzStatus === 'CONNECTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {qzStatus === 'CONNECTED' ? 'Connected (v2.x)' : qzStatus === 'CONNECTING' ? 'Connecting...' : 'Offline / Standalone Fallback'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {qzStatus === 'CONNECTED'
                        ? 'Direct silent ESC/POS communication enabled on localhost:8182'
                        : 'Using browser print dialog fallback. Install QZ Tray for silent POS printing.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleScanPrinters}
                    disabled={isScanningPrinters}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs disabled:opacity-50"
                  >
                    <RefreshCwIcon className={`w-3 h-3 ${isScanningPrinters ? 'animate-spin' : ''}`} />
                    <span>Scan Printers</span>
                  </button>
                </div>
              </div>

              {/* Thermal Printer Hardware Section */}
              <div className="border border-indigo-100 bg-indigo-50/30 rounded-xl p-4 space-y-4">
                <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                  <PrinterIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Hardware Printer Selection &amp; Roll Width</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target Thermal Printer
                    </label>
                    {printersList.length > 0 ? (
                      <select
                        value={printerSettings.printerName}
                        onChange={(e) => setPrinterSettings({ ...printerSettings, printerName: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      >
                        <option value="">Default System Printer</option>
                        {printersList.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={printerSettings.printerName}
                        onChange={(e) => setPrinterSettings({ ...printerSettings, printerName: e.target.value })}
                        placeholder="e.g. POS-80C or EPSON TM-T82"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    )}
                    <p className="text-[11px] text-slate-400 mt-1">Leave empty to use OS default printer</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Paper Roll Width (Thermal Receipt Layout)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPrinterSettings({ ...printerSettings, paperSize: '80mm' })}
                        className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                          printerSettings.paperSize === '80mm'
                            ? 'border-indigo-600 bg-indigo-600 text-white font-bold shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium'
                        }`}
                      >
                        <div className="text-xs">80mm Wide</div>
                        <div className={`text-[10px] ${printerSettings.paperSize === '80mm' ? 'text-indigo-100' : 'text-slate-400'}`}>Standard POS Roll</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPrinterSettings({ ...printerSettings, paperSize: '58mm' })}
                        className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                          printerSettings.paperSize === '58mm'
                            ? 'border-indigo-600 bg-indigo-600 text-white font-bold shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium'
                        }`}
                      >
                        <div className="text-xs">58mm Compact</div>
                        <div className={`text-[10px] ${printerSettings.paperSize === '58mm' ? 'text-indigo-100' : 'text-slate-400'}`}>Small Counter Roll</div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-indigo-100/70">
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={printerSettings.cutPaper}
                      onChange={(e) => setPrinterSettings({ ...printerSettings, cutPaper: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">Auto-Cut Paper</span>
                      <span className="text-[10px] text-slate-400">Send GS V command</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={printerSettings.openCashDrawer}
                      onChange={(e) => setPrinterSettings({ ...printerSettings, openCashDrawer: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">Open Cash Drawer</span>
                      <span className="text-[10px] text-slate-400">Kick drawer pin (ESC p)</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={billingSettings.autoPrintOnConfirm}
                      onChange={(e) => setBillingSettings({ ...billingSettings, autoPrintOnConfirm: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">Silent Print on F9</span>
                      <span className="text-[10px] text-slate-400">Instant bill creation</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* General Billing Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Invoice Series Prefix
                  </label>
                  <input
                    type="text"
                    value={billingSettings.invoicePrefix}
                    onChange={(e) => setBillingSettings({ ...billingSettings, invoicePrefix: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">e.g. INV-2026- will yield INV-2026-000001</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Payment Method in POS
                  </label>
                  <select
                    value={billingSettings.defaultPaymentMethod}
                    onChange={(e) => setBillingSettings({ ...billingSettings, defaultPaymentMethod: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="CASH">Cash Counter (Default)</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="BANK_TRANSFER">Bank NEFT/RTGS</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Retail Credit Grace Period (Days)
                  </label>
                  <input
                    type="number"
                    value={billingSettings.creditGraceDays}
                    onChange={(e) => setBillingSettings({ ...billingSettings, creditGraceDays: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Days before buyer ledger flags overdue alert</p>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={billingSettings.roundOffCash}
                      onChange={(e) => setBillingSettings({ ...billingSettings, roundOffCash: e.target.checked })}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="text-xs font-medium text-slate-700">
                      Round off cash payments to nearest Rupee (Standard Mandi Practice)
                    </span>
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Printed Invoice Footer Disclaimer / Policy
                  </label>
                  <textarea
                    rows={2}
                    value={billingSettings.notesFooter}
                    onChange={(e) => setBillingSettings({ ...billingSettings, notesFooter: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* Card Action Footer */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Database Sync Active · Table <code className="font-mono">settings</code></span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    disabled={isSaving || isResetting}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RotateCcwIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reset Tab Defaults</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave()}
                    disabled={isSaving}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <SaveIcon className="w-3.5 h-3.5" />
                        <span>Save Billing &amp; Printer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: APMC Cess & Hamali */}
          {activeTab === 'apmc' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">APMC Mandi Committee Fees &amp; Labour Rates</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Standard statutory market cess and terminal handling charges applied during wholesale settlements.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                  CATEGORY: APMC
                </span>
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

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={apmcSettings.enableGst}
                      onChange={(e) => setApmcSettings({ ...apmcSettings, enableGst: e.target.checked })}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="text-xs font-medium text-slate-700">
                      Enable GST calculation (Fresh unprocessed fruits are normally 0% NIL GST)
                    </span>
                  </label>
                </div>
              </div>

              {/* Card Action Footer */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Database Sync Active · Table <code className="font-mono">settings</code></span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    disabled={isSaving || isResetting}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RotateCcwIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reset Tab Defaults</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave()}
                    disabled={isSaving}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <SaveIcon className="w-3.5 h-3.5" />
                        <span>Save APMC Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Stock & Trays Policy */}
          {activeTab === 'inventory' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Inventory Safeguards &amp; Plastic Tray Policy</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Rules governing physical fruit stock deductions, reorder triggers, and plastic crate accounting.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                  CATEGORY: INVENTORY
                </span>
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
                      Highlight fruits in cold storage that exceed standard shelf life (Ripening / Rotting prevention)
                    </span>
                  </label>
                </div>
              </div>

              {/* Card Action Footer */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Database Sync Active · Table <code className="font-mono">settings</code></span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    disabled={isSaving || isResetting}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RotateCcwIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reset Tab Defaults</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave()}
                    disabled={isSaving}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <SaveIcon className="w-3.5 h-3.5" />
                        <span>Save Inventory Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <RotateCcwIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reset {activeTab.toUpperCase()} Settings?</h3>
                  <p className="text-xs text-slate-400">Restore factory defaults for this configuration tab</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                This will reset all <strong>{activeTab.toUpperCase()}</strong> configurations in database table <code className="font-mono">settings</code> back to standard factory settings.
              </p>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={handleResetCurrentTab}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isResetting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Resetting...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcwIcon className="w-3.5 h-3.5 text-white" />
                      <span>Confirm Reset</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
