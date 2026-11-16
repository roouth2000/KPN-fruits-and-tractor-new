import React, { useState, useEffect } from 'react';
import {
  BuildingIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  SaveIcon,
  CheckSquareIcon,
  RotateCcwIcon,
  XIcon,
  EditIcon,
  PrinterIcon,
} from '../components/icons';
import kbnLogo from '../assets/kbn-logo.jpeg';
import { printerService } from '../services/printer/printerService';
import { PrinterSettings as ThermalPrinterConfig } from '../components/printer/PrinterSettings';
import { settingApi } from '../services/settingApi';
import type { PrinterSettings, PaperSize } from '../services/printer/printerTypes';

interface SettingsPageProps {
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
  onNavigateRoles?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onShowToast, onNavigateRoles }) => {
  const [activeTab, setActiveTab] = useState<'mandi' | 'billing'>('mandi');

  // Loading & Action States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isEditBillingOpen, setIsEditBillingOpen] = useState(false);

  // Mandi & Business Details State
  const [mandiSettings, setMandiSettings] = useState({
    businessName: 'SR FRUITS',
    logoMonogram: 'KBN',
    logoUrl: '',
    printLogo: true,
    licenseNo: 'APMC/KOY/2026/8941',
    yardBay: 'T/B 43 ANNA FRUITS MARKET',
    city: 'KOYAMBEDU, CHENNAI',
    state: 'Tamil Nadu',
    pincode: '600092',
    phone: '6383842405',
    email: 'terminal.vashi@finovore.com',
    gstin: '27AABCF1234F1Z5',
  });

  // Working copy for edit modal
  const [tempMandiSettings, setTempMandiSettings] = useState({ ...mandiSettings });

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

  // Working copy for edit bill settings modal
  const [tempBillingSettings, setTempBillingSettings] = useState({ ...billingSettings });

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

  // Compress and resize logo image to optimized thermal-printer dimensions (< 25 KB)
  const handleLogoFileUpload = (file: File, isTemp = false) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result;
      if (typeof rawDataUrl !== 'string') return;

      const img = new Image();
      img.onload = () => {
        try {
          const maxDimension = 320; // optimal crisp resolution for thermal receipt printing
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            if (isTemp) {
              setTempMandiSettings((prev) => ({ ...prev, logoUrl: rawDataUrl }));
            } else {
              setMandiSettings((prev) => ({ ...prev, logoUrl: rawDataUrl }));
            }
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to lightweight JPEG (~10KB - 20KB)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          if (isTemp) {
            setTempMandiSettings((prev) => ({ ...prev, logoUrl: compressedDataUrl }));
          } else {
            setMandiSettings((prev) => ({ ...prev, logoUrl: compressedDataUrl }));
          }
        } catch {
          if (isTemp) {
            setTempMandiSettings((prev) => ({ ...prev, logoUrl: rawDataUrl }));
          } else {
            setMandiSettings((prev) => ({ ...prev, logoUrl: rawDataUrl }));
          }
        }
      };
      img.onerror = () => {
        if (isTemp) {
          setTempMandiSettings((prev) => ({ ...prev, logoUrl: rawDataUrl }));
        } else {
          setMandiSettings((prev) => ({ ...prev, logoUrl: rawDataUrl }));
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Save all settings to MySQL database
  const handleSave = async (
    e?: React.FormEvent,
    customMandi?: typeof mandiSettings,
    customBilling?: typeof billingSettings
  ) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsSaving(true);
    const mandiToSave = customMandi || mandiSettings;
    const billingToSave = customBilling || billingSettings;
    try {
      const updatedPrinter: PrinterSettings = {
        ...printerSettings,
        shopName: mandiToSave.businessName,
        shopInitials: mandiToSave.logoMonogram || 'KBN',
        logoUrl: mandiToSave.logoUrl || '',
        printLogo: mandiToSave.printLogo !== false,
        shopAddress: `${mandiToSave.yardBay},\n${mandiToSave.city}-${mandiToSave.pincode}`,
        shopPhone: mandiToSave.phone,
      };

      await settingApi.updateAllSettings({
        mandi: mandiToSave,
        billing: billingToSave,
        apmc: apmcSettings,
        inventory: inventorySettings,
        printer: updatedPrinter,
      });

      if (customMandi) {
        setMandiSettings(customMandi);
      }
      if (customBilling) {
        setBillingSettings(customBilling);
      }
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
          <span>Business Profile</span>
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
          <span>Bill Settings</span>
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
              {/* Card Header */}
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Business Profile</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    These details are printed on all tax invoices, delivery slips, and customer vouchers.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTempMandiSettings({ ...mandiSettings });
                      setIsEditProfileOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <EditIcon className="w-3.5 h-3.5 text-white" />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>

              {/* Receipt Logo & Monogram Header sub-card */}
              <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border border-slate-200 bg-white p-1 flex items-center justify-center overflow-hidden shadow-2xs flex-shrink-0">
                  <img
                    src={mandiSettings.logoUrl || kbnLogo}
                    alt={mandiSettings.businessName}
                    className="w-full h-full object-contain rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = kbnLogo;
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="text-xs font-bold text-slate-900">Receipt Logo</h3>
                    <span className="text-emerald-700 font-semibold text-[11px]">
                      (Non-mandatory: receipt prints cleanly if empty or disabled)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configured for thermal receipts &amp; invoices.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-[11px]">Logo:</span>
                      <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                        {mandiSettings.logoMonogram || 'KBN'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-[11px]">Logo Image:</span>
                      <span className="text-slate-700 text-[11px] font-medium">
                        {mandiSettings.logoUrl ? 'Uploaded (custom_logo.png)' : 'Uploaded (KBN_logo.jpg)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-[11px]">Print Logo on Receipt:</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                          mandiSettings.printLogo !== false
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            mandiSettings.printLogo !== false ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span>{mandiSettings.printLogo !== false ? 'Enabled' : 'Disabled'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Read/View Mode: Key-Value Table / Rows (Divided by lines, exactly like screenshot) */}
              <div className="border border-slate-200/80 rounded-xl divide-y divide-slate-100 bg-white overflow-hidden shadow-2xs">
                <div className="py-3 px-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <span className="text-xs font-semibold text-slate-500">
                    Wholesale Produce Business Name
                  </span>
                  <span className="text-xs font-bold text-slate-900 tracking-tight">
                    {mandiSettings.businessName || 'SR FRUITS'}
                  </span>
                </div>

                <div className="py-3 px-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <span className="text-xs font-semibold text-slate-500">
                    APMC Yard License / Registration No.
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-900 tracking-tight">
                    {mandiSettings.licenseNo || 'APMC/KOY/2026/8941'}
                  </span>
                </div>

                <div className="py-3 px-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <span className="text-xs font-semibold text-slate-500">
                    Mandi Market Bay &amp; Stall Address
                  </span>
                  <span className="text-xs font-bold text-slate-900 tracking-tight text-right max-w-md">
                    {mandiSettings.yardBay || 'T/B 43 ANNA FRUITS MARKET'}
                  </span>
                </div>

                <div className="py-3 px-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <span className="text-xs font-semibold text-slate-500">
                    Contact Phone / WhatsApp
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-900 tracking-tight">
                    {mandiSettings.phone || '6383842405'}
                  </span>
                </div>

                <div className="py-3 px-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <span className="text-xs font-semibold text-slate-500">
                    Support Email
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-900 tracking-tight">
                    {mandiSettings.email || 'terminal.vashi@finovore.com'}
                  </span>
                </div>

                <div className="py-3 px-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <span className="text-xs font-semibold text-slate-500">
                    GSTIN (Optional)
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-900 tracking-tight">
                    {mandiSettings.gstin || '27AABCF1234F1Z5'}
                  </span>
                </div>

                <div className="py-3 px-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <span className="text-xs font-semibold text-slate-500">
                    City / Market Zone
                  </span>
                  <span className="text-xs font-bold text-slate-900 tracking-tight">
                    {mandiSettings.city || 'KOYAMBEDU, CHENNAI'}
                  </span>
                </div>

                <div className="py-3 px-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <span className="text-xs font-semibold text-slate-500">
                    State
                  </span>
                  <span className="text-xs font-bold text-slate-900 tracking-tight">
                    {mandiSettings.state || 'Tamil Nadu'}
                  </span>
                </div>

                <div className="py-3 px-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <span className="text-xs font-semibold text-slate-500">
                    Pincode
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-900 tracking-tight">
                    {mandiSettings.pincode || '600092'}
                  </span>
                </div>
              </div>

              {/* Card Action Footer */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-3">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    disabled={isSaving || isResetting}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RotateCcwIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reset</span>
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
                        <SaveIcon className="w-3.5 h-3.5 text-white" />
                        <span>Save</span>
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
              {/* Card Header */}
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">POS Thermal Printer &amp; Bill Settings</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Direct browser-native printing via Web Serial API, invoice numbering, and credit policy rules.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200 uppercase">
                    CATEGORY: BILLING
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTempBillingSettings({ ...billingSettings });
                      setIsEditBillingOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <EditIcon className="w-3.5 h-3.5 text-white" />
                    <span>Edit Bill Settings</span>
                  </button>
                </div>
              </div>

              {/* Receipt Engine & Hardware Status sub-card (identical to Business Profile logo sub-card style) */}
              <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border border-slate-200 bg-emerald-50 text-emerald-700 p-1 flex items-center justify-center overflow-hidden shadow-2xs flex-shrink-0">
                  <PrinterIcon className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="text-xs font-bold text-slate-900">Direct Thermal Receipt Engine</h3>
                    <span className="text-emerald-700 font-semibold text-[11px]">
                      (Web Serial &amp; ESC/POS Raw Native)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hardware auto-detection for 80mm &amp; 58mm thermal rolls. Zero background drivers or QZ Tray required.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-[11px]">Print Paper:</span>
                      <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                        {printerSettings.paperSize || '80mm'} (48 chars)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-[11px]">Transport:</span>
                      <span className="text-slate-700 text-[11px] font-medium font-mono">
                        {printerSettings.transport || 'WEB_SERIAL'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-[11px]">Auto-Print:</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                          billingSettings.autoPrintOnConfirm
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            billingSettings.autoPrintOnConfirm ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span>{billingSettings.autoPrintOnConfirm ? 'Enabled' : 'Disabled'}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-[11px]">Cash Round-off:</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                          billingSettings.roundOffCash
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            billingSettings.roundOffCash ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span>{billingSettings.roundOffCash ? 'Active' : 'Off'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Read/View Mode: Key-Value Table / Rows (Divided by lines, exactly like Business Profile) */}
              <div className="border border-slate-200/80 rounded-xl divide-y divide-slate-100 bg-white overflow-hidden shadow-2xs">
                <div className="py-3 px-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <span className="text-xs font-semibold text-slate-500">
                    Invoice Series Prefix
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-900 tracking-tight">
                    {billingSettings.invoicePrefix || 'INV-2026-'}
                  </span>
                </div>

                <div className="py-3 px-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <span className="text-xs font-semibold text-slate-500">
                    Default Payment Method in POS
                  </span>
                  <span className="text-xs font-bold text-slate-900 tracking-tight">
                    {billingSettings.defaultPaymentMethod === 'CASH'
                      ? 'Cash Counter (Default CASH)'
                      : billingSettings.defaultPaymentMethod === 'UPI'
                      ? 'UPI / QR Code Scan'
                      : billingSettings.defaultPaymentMethod === 'BANK_TRANSFER'
                      ? 'Bank Transfer / RTGS / NEFT'
                      : 'Cheque Payment'}
                  </span>
                </div>

                <div className="py-3 px-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <span className="text-xs font-semibold text-slate-500">
                    Thermal Receipt Print Layout
                  </span>
                  <span className="text-xs font-bold text-slate-900 tracking-tight">
                    {billingSettings.printLayout === 'THERMAL_80MM'
                      ? '80mm Thermal Receipt (APMC Wholesale Format)'
                      : 'A4 Standard Invoice Format'}
                  </span>
                </div>

                <div className="py-3 px-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <span className="text-xs font-semibold text-slate-500">
                    Automatic Print on Bill Confirm
                  </span>
                  <span className="text-xs font-bold text-slate-900 tracking-tight">
                    {billingSettings.autoPrintOnConfirm
                      ? 'Enabled (Auto-triggers thermal receipt upon invoice creation)'
                      : 'Disabled (Manual print on demand)'}
                  </span>
                </div>

                <div className="py-3 px-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <span className="text-xs font-semibold text-slate-500">
                    Retail Credit Grace Period
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-900 tracking-tight">
                    {billingSettings.creditGraceDays || 15} Days
                  </span>
                </div>

                <div className="py-3 px-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <span className="text-xs font-semibold text-slate-500">
                    Cash Payment Rounding
                  </span>
                  <span className="text-xs font-bold text-slate-900 tracking-tight">
                    {billingSettings.roundOffCash
                      ? 'Round off cash payments to nearest Rupee (Standard Mandi Practice)'
                      : 'Exact Paise (No rounding)'}
                  </span>
                </div>

                <div className="py-3 px-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <span className="text-xs font-semibold text-slate-500">
                    Printed Invoice Footer Disclaimer / Policy
                  </span>
                  <span className="text-xs font-medium text-slate-800 text-right max-w-md">
                    {billingSettings.notesFooter || 'Goods once sold cannot be returned after mandi gate dispatch.'}
                  </span>
                </div>
              </div>

              {/* Thermal Printer Hardware Connection Section */}
              <div className="pt-2">
                <ThermalPrinterConfig onShowToast={onShowToast} />
              </div>

              {/* Card Action Footer */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    Database Sync Active · Table <code className="font-mono">settings</code>
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    disabled={isSaving || isResetting}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
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
                        <SaveIcon className="w-3.5 h-3.5 text-white" />
                        <span>Save</span>
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

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <BuildingIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit APMC Mandi Yard &amp; Business Profile</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update business name, contact information, yard registration, and receipt logo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave(undefined, tempMandiSettings);
                setIsEditProfileOpen(false);
              }}
              className="flex-1 overflow-y-auto p-6 space-y-5"
            >
              {/* Receipt Logo & Monogram Section */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Receipt Logo &amp; Monogram Header</h4>
                    <p className="text-[11px] text-slate-500">
                      Configured for thermal receipts &amp; invoices. <span className="text-emerald-700 font-semibold">(Non-mandatory)</span>
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    <input
                      type="checkbox"
                      checked={tempMandiSettings.printLogo !== false}
                      onChange={(e) =>
                        setTempMandiSettings({ ...tempMandiSettings, printLogo: e.target.checked })
                      }
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
                      value={tempMandiSettings.logoMonogram || ''}
                      onChange={(e) =>
                        setTempMandiSettings({
                          ...tempMandiSettings,
                          logoMonogram: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full px-3 py-1.5 text-xs font-black uppercase rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400">Centered letters (e.g. "KBN" or "SR")</span>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Logo Image <span className="text-slate-400 font-normal">(Optional File)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 cursor-pointer shadow-2xs flex-shrink-0">
                        Upload Logo Image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleLogoFileUpload(file, true);
                            }
                          }}
                        />
                      </label>
                      {tempMandiSettings.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setTempMandiSettings({ ...tempMandiSettings, logoUrl: '' })}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="Remove uploaded logo"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      )}
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-[11px] text-slate-500">Preview:</span>
                        <div className="w-8 h-8 rounded-full border border-slate-200 bg-white p-0.5 overflow-hidden flex items-center justify-center">
                          <img
                            src={tempMandiSettings.logoUrl || kbnLogo}
                            alt="Logo"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Wholesale Produce Business Name
                  </label>
                  <input
                    type="text"
                    required
                    value={tempMandiSettings.businessName}
                    onChange={(e) =>
                      setTempMandiSettings({ ...tempMandiSettings, businessName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    APMC Yard License / Registration No.
                  </label>
                  <input
                    type="text"
                    value={tempMandiSettings.licenseNo}
                    onChange={(e) =>
                      setTempMandiSettings({ ...tempMandiSettings, licenseNo: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mandi Market Bay &amp; Stall Address
                  </label>
                  <input
                    type="text"
                    value={tempMandiSettings.yardBay}
                    onChange={(e) =>
                      setTempMandiSettings({ ...tempMandiSettings, yardBay: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    required
                    value={tempMandiSettings.phone}
                    onChange={(e) =>
                      setTempMandiSettings({ ...tempMandiSettings, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Support Email
                  </label>
                  <input
                    type="email"
                    value={tempMandiSettings.email}
                    onChange={(e) =>
                      setTempMandiSettings({ ...tempMandiSettings, email: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    value={tempMandiSettings.gstin}
                    onChange={(e) =>
                      setTempMandiSettings({ ...tempMandiSettings, gstin: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City / Market Zone
                  </label>
                  <input
                    type="text"
                    value={tempMandiSettings.city}
                    onChange={(e) =>
                      setTempMandiSettings({ ...tempMandiSettings, city: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={tempMandiSettings.state}
                    onChange={(e) =>
                      setTempMandiSettings({ ...tempMandiSettings, state: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={tempMandiSettings.pincode}
                    onChange={(e) =>
                      setTempMandiSettings({ ...tempMandiSettings, pincode: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-medium"
                  />
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <SaveIcon className="w-3.5 h-3.5 text-white" />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Bill Settings Modal */}
      {isEditBillingOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ReceiptTextIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit POS &amp; Bill Settings</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update invoice series prefix, payment defaults, grace period, and printed policies
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditBillingOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave(undefined, undefined, tempBillingSettings);
                setIsEditBillingOpen(false);
              }}
              className="flex-1 overflow-y-auto p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Invoice Series Prefix
                </label>
                <input
                  type="text"
                  required
                  value={tempBillingSettings.invoicePrefix}
                  onChange={(e) =>
                    setTempBillingSettings({ ...tempBillingSettings, invoicePrefix: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                />
                <p className="text-[11px] text-slate-400 mt-1">e.g. INV-2026- will yield INV-2026-000001</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Payment Method in POS
                </label>
                <select
                  value={tempBillingSettings.defaultPaymentMethod}
                  onChange={(e) =>
                    setTempBillingSettings({
                      ...tempBillingSettings,
                      defaultPaymentMethod: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="CASH">Cash Counter (Default CASH)</option>
                  <option value="UPI">UPI / QR Code Scan</option>
                  <option value="BANK_TRANSFER">Bank Transfer / RTGS / NEFT</option>
                  <option value="CHEQUE">Cheque Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Thermal Print Slip Layout
                </label>
                <select
                  value={tempBillingSettings.printLayout}
                  onChange={(e) =>
                    setTempBillingSettings({
                      ...tempBillingSettings,
                      printLayout: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="THERMAL_80MM">80mm Thermal Receipt (APMC Wholesale Format)</option>
                  <option value="A4_STANDARD">A4 Standard Full Sheet Invoice</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Retail Credit Grace Period (Days)
                </label>
                <input
                  type="number"
                  min={0}
                  value={tempBillingSettings.creditGraceDays}
                  onChange={(e) =>
                    setTempBillingSettings({
                      ...tempBillingSettings,
                      creditGraceDays: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
                <p className="text-[11px] text-slate-400 mt-1">Days before buyer ledger flags overdue alert</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempBillingSettings.autoPrintOnConfirm}
                    onChange={(e) =>
                      setTempBillingSettings({
                        ...tempBillingSettings,
                        autoPrintOnConfirm: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Automatically print thermal receipt when bill is confirmed
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempBillingSettings.roundOffCash}
                    onChange={(e) =>
                      setTempBillingSettings({
                        ...tempBillingSettings,
                        roundOffCash: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Round off cash payments to nearest Rupee (Standard Mandi Practice)
                  </span>
                </label>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Printed Invoice Footer Disclaimer / Policy
                </label>
                <textarea
                  rows={2}
                  value={tempBillingSettings.notesFooter}
                  onChange={(e) =>
                    setTempBillingSettings({
                      ...tempBillingSettings,
                      notesFooter: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditBillingOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Bill Settings...</span>
                    </>
                  ) : (
                    <>
                      <SaveIcon className="w-3.5 h-3.5 text-white" />
                      <span>Save Bill Settings</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
