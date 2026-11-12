import React, { useState, useEffect } from 'react';
import {
  BuildingIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  SaveIcon,
  LayersIcon,
  CheckSquareIcon,
  RotateCcwIcon,
  XIcon,
} from '../components/icons';
import { printerService } from '../services/printer/printerService';
import { PrinterSettings as ThermalPrinterConfig } from '../components/printer/PrinterSettings';
import { settingApi } from '../services/settingApi';
import type { PrinterSettings, PaperSize } from '../services/printer/printerTypes';

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
    businessName: 'KBN FRUITS',
    logoMonogram: 'KBN',
    logoUrl: '',
    printLogo: true,
    licenseNo: 'APMC/KOY/2026/8941',
    yardBay: 'T/A-18,T/E-25,ANNA FRUITS MARKET',
    city: 'KOYAMBEDU, CHENNAI',
    state: 'Tamil Nadu',
    pincode: '600092',
    phone: '8778219770',
    email: 'terminal.koyambedu@finovore.com',
    gstin: '',
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

  // Web Serial & Thermal Printer Settings
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(printerService.getSettings());

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
            logoMonogram: mandi.logoMonogram !== undefined ? String(mandi.logoMonogram) : prev.logoMonogram,
            logoUrl: mandi.logoUrl !== undefined ? String(mandi.logoUrl) : prev.logoUrl,
            printLogo: mandi.printLogo !== undefined ? Boolean(mandi.printLogo) : prev.printLogo,
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
          const currentSettings = printerService.getSettings();
          const loadedPrinter: PrinterSettings = {
            ...currentSettings,
            paperSize: (printer.paperSize as PaperSize) || currentSettings.paperSize,
            cutPaper: printer.cutPaper !== undefined ? Boolean(printer.cutPaper) : currentSettings.cutPaper,
            openCashDrawer: printer.openCashDrawer !== undefined ? Boolean(printer.openCashDrawer) : currentSettings.openCashDrawer,
            footerMessage: printer.footerMessage || currentSettings.footerMessage,
          };
          setPrinterSettings(loadedPrinter);
          printerService.saveSettings(loadedPrinter);
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

  // Save all settings to MySQL database
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const updatedPrinter: PrinterSettings = {
        ...printerSettings,
        shopName: mandiSettings.businessName,
        shopInitials: mandiSettings.logoMonogram || 'SR',
        logoUrl: mandiSettings.logoUrl || '',
        printLogo: mandiSettings.printLogo !== false,
        shopAddress: `${mandiSettings.yardBay},\n${mandiSettings.city}-${mandiSettings.pincode}`,
        shopPhone: mandiSettings.phone,
      };

      await settingApi.updateAllSettings({
        mandi: mandiSettings,
        billing: billingSettings,
        apmc: apmcSettings,
        inventory: inventorySettings,
        printer: updatedPrinter,
      });

      // Synchronize thermal printer preferences with local client storage
      setPrinterSettings(updatedPrinter);
      printerService.saveSettings(updatedPrinter);

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
                {/* Logo & Monogram Header (Non-Mandatory) */}
                <div className="sm:col-span-2 p-4 rounded-xl border border-slate-200/90 bg-slate-50/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">Receipt Logo &amp; Monogram Header</h3>
                      <p className="text-[11px] text-slate-500">
                        Configured for thermal receipts &amp; invoices. <span className="text-emerald-700 font-semibold">(Non-mandatory: receipt prints cleanly if empty or disabled)</span>
                      </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      <input
                        type="checkbox"
                        checked={mandiSettings.printLogo !== false}
                        onChange={(e) => setMandiSettings({ ...mandiSettings, printLogo: e.target.checked })}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                      />
                      <span className="text-xs font-bold text-slate-800">Print Logo on Receipt</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Logo Monogram / Short Code
                      </label>
                      <input
                        type="text"
                        maxLength={5}
                        placeholder="e.g. SR"
                        value={mandiSettings.logoMonogram || ''}
                        onChange={(e) => setMandiSettings({ ...mandiSettings, logoMonogram: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-1.5 text-xs font-black uppercase rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-[10px] text-slate-400">Large letters centered at top (e.g. "SR")</span>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Logo Image <span className="text-slate-400 font-normal">(Optional / Non-Mandatory)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Image URL or choose file (leave blank for text-only)"
                          value={mandiSettings.logoUrl || ''}
                          onChange={(e) => setMandiSettings({ ...mandiSettings, logoUrl: e.target.value })}
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-[11px]"
                        />
                        <label className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 cursor-pointer shadow-2xs flex-shrink-0">
                          Upload File
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
                                    setMandiSettings({ ...mandiSettings, logoUrl: reader.result });
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        {mandiSettings.logoUrl && (
                          <button
                            type="button"
                            onClick={() => setMandiSettings({ ...mandiSettings, logoUrl: '' })}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                            title="Remove logo image"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {mandiSettings.logoUrl && (
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-600">
                          <span className="font-semibold">Logo Preview:</span>
                          <img
                            src={mandiSettings.logoUrl}
                            alt="Logo preview"
                            className="h-8 max-w-[80px] object-contain border border-slate-200 bg-white p-0.5 rounded"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

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
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900">POS Thermal Printer &amp; Billing Preferences</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct browser-native printing via Web Serial API (Zero background software / No QZ Tray required).
                </p>
              </div>

              {/* Thermal Printer Hardware Section */}
              <ThermalPrinterConfig onShowToast={onShowToast} />

              {/* General Billing Configuration */}
              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3">
                  Billing &amp; Invoice Ledger Rules
                </h3>
              </div>
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
