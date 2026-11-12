import React, { useState } from 'react';
import {
  BuildingIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  SaveIcon,
  LayersIcon,
  CheckSquareIcon,
} from '../components/icons';

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

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    onShowToast?.(
      'Settings Updated',
      'Mandi operational parameters and billing preferences saved successfully.',
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
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">POS Billing &amp; Thermal Printing Preferences</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Control invoice number formatting, thermal 80mm slip layouts, and automated receipt printing.
            </p>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Print Output Format
              </label>
              <select
                value={billingSettings.printLayout}
                onChange={(e) => setBillingSettings({ ...billingSettings, printLayout: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium bg-white"
              >
                <option value="THERMAL_80MM">Thermal 80mm POS Slip (Fast Mandi Receipt)</option>
                <option value="A4_STANDARD">Standard A4 Tax Invoice (Full Details &amp; GST)</option>
              </select>
            </div>

            <div className="sm:col-span-2 space-y-3 pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={billingSettings.autoPrintOnConfirm}
                  onChange={(e) => setBillingSettings({ ...billingSettings, autoPrintOnConfirm: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-xs font-medium text-slate-700">
                  Automatically prompt print preview dialog when an invoice is confirmed
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={billingSettings.roundOffCash}
                  onChange={(e) => setBillingSettings({ ...billingSettings, roundOffCash: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-xs font-medium text-slate-700">
                  Enable automatic rupee rounding on cash settlements
                </span>
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice Footer Terms &amp; Conditions
              </label>
              <textarea
                rows={2}
                value={billingSettings.notesFooter}
                onChange={(e) => setBillingSettings({ ...billingSettings, notesFooter: e.target.value })}
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
