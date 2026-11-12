import React, { useState, useEffect } from 'react';
import {
  DownloadIcon,
  XIcon,
  FileTextIcon,
  ShieldCheckIcon,
  SaveIcon,
  PrinterIcon,
  SettingsIcon,
} from '../../../components/icons';
import { salesApi } from '../services/salesApi';
import { useAuth } from '../../../context/AuthContext';
import { printerService } from '../../../services/printer/printerService';
import { PrinterSettingsModal } from '../../../components/PrinterSettingsModal';
import type { PaperSize, PrinterConnectionStatus, PrinterSettings } from '../../../services/printer/printerTypes';

interface InvoicePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: any;
  onInvoiceUpdated?: () => void;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  isOpen,
  onClose,
  invoiceData,
  onInvoiceUpdated,
}) => {
  const { hasPermission } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [editTerms, setEditTerms] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isPrintingDirect, setIsPrintingDirect] = useState(false);
  const [isPrinterSettingsOpen, setIsPrinterSettingsOpen] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<PrinterConnectionStatus>(printerService.getStatus());
  const [paperSize, setPaperSize] = useState<PaperSize>(printerService.getSettings().paperSize);
  const [settings, setSettings] = useState<PrinterSettings>(printerService.getSettings());

  useEffect(() => {
    const unsub = printerService.onStatusChange(setPrinterStatus);
    return unsub;
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSettings(printerService.getSettings());
      setPaperSize(printerService.getSettings().paperSize);
    }
  }, [isOpen]);

  if (!isOpen || !invoiceData) return null;

  const inv = invoiceData.invoice || invoiceData;
  const items = inv.items || [];
  const payments = inv.payments || [];

  const canEditInvoice = hasPermission('sales.edit');
  const canCancelInvoice = hasPermission('sales.cancel');

  // Direct browser-native thermal printing
  const handleDirectPrint = async () => {
    setIsPrintingDirect(true);
    try {
      const res = await printerService.printInvoice(inv, { paperSize });
      if (res.success) {
        setToastMsg(res.message || `Receipt printed successfully (${paperSize})`);
      } else {
        setToastMsg(res.error || 'Print failed. Check printer connection.');
        if (!printerService.isConnected()) {
          setIsPrinterSettingsOpen(true);
        }
      }
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: any) {
      setToastMsg(`Print error: ${err?.message || err}`);
      setTimeout(() => setToastMsg(null), 4000);
    } finally {
      setIsPrintingDirect(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (inv.id) {
      try {
        await salesApi.downloadInvoicePdf(inv.id, inv.invoiceNumber);
      } catch {
        // Fallback to token-authorized URL
        window.open(salesApi.getInvoicePdfUrl(inv.id), '_blank');
      }
    }
  };

  const handleStartEdit = () => {
    setEditNotes(inv.notes || '');
    setEditDiscount(Number(inv.discount) || 0);
    setEditTerms(inv.paymentTerms || 'Standard APMC 15 days');
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await salesApi.updateInvoice(inv.id, {
        notes: editNotes,
        invoiceDiscount: editDiscount,
        paymentTerms: editTerms,
      });
      setToastMsg('Invoice updated successfully');
      setTimeout(() => setToastMsg(null), 3000);
      setIsEditing(false);
      onInvoiceUpdated?.();
    } catch (err: any) {
      alert(err.message || 'Failed to edit invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Top Dialog Action Bar */}
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 no-print">
          {/* Left: Invoice Title & Status */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
              <FileTextIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm tracking-tight truncate">
                  Invoice #{inv.invoiceNumber}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                    inv.status === 'PAID'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : inv.status === 'PARTIALLY_PAID'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : inv.status === 'CANCELLED'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {inv.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {inv.saleType || 'TAX INVOICE'} · Date: {inv.invoiceDate}
              </p>
            </div>
          </div>

          {/* Right: Actions Bar */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* 80mm / 58mm Paper Toggle */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setPaperSize('80mm')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  paperSize === '80mm'
                    ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                80mm
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('58mm')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  paperSize === '58mm'
                    ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                58mm
              </button>
            </div>

            {/* Direct Silent Thermal Print */}
            <button
              type="button"
              onClick={handleDirectPrint}
              disabled={isPrintingDirect}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Send silent thermal print job directly to thermal printer"
            >
              <PrinterIcon className={`w-3.5 h-3.5 ${isPrintingDirect ? 'animate-bounce' : ''}`} />
              <span>{isPrintingDirect ? 'Printing...' : 'Direct Print'}</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  printerStatus === 'CONNECTED' ? 'bg-emerald-300 animate-pulse' : 'bg-amber-300'
                }`}
              />
            </button>

            {/* Printer Settings Quick Launcher */}
            <button
              type="button"
              onClick={() => setIsPrinterSettingsOpen(true)}
              className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-200/80 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              title="Configure POS Thermal Printer (Web Serial / USB)"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>

            {/* Official PDF Download */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              title="Download official PDF invoice"
            >
              <DownloadIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>PDF</span>
            </button>

            {/* Admin-only Invoice Edit Button */}
            {canEditInvoice && !isEditing && (
              <button
                type="button"
                onClick={handleStartEdit}
                className="px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold hidden sm:flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                title="Edit invoice notes and discounts (Admin Only)"
              >
                <ShieldCheckIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Edit</span>
              </button>
            )}

            {/* Admin-only Invoice Void / Cancel Button */}
            {canCancelInvoice && inv.status !== 'CANCELLED' && (
              <button
                type="button"
                onClick={async () => {
                  if (
                    window.confirm(
                      `Are you sure you want to cancel invoice #${inv.invoiceNumber}? Stock and customer dues will be atomically reversed.`
                    )
                  ) {
                    await salesApi.cancelInvoice(inv.id, 'Admin cancellation');
                    onInvoiceUpdated?.();
                    onClose();
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
                title="Cancel invoice & reverse stock/ledger (Admin only)"
              >
                Cancel
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/80 cursor-pointer transition-colors ml-1"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printer Settings Modal */}
        <PrinterSettingsModal
          isOpen={isPrinterSettingsOpen}
          onClose={() => {
            setIsPrinterSettingsOpen(false);
            setSettings(printerService.getSettings());
          }}
          onShowToast={(t, m) => setToastMsg(`${t}: ${m}`)}
        />

        {toastMsg && (
          <div className="bg-emerald-50 text-emerald-800 px-4 py-2 text-xs font-semibold border-b border-emerald-200 flex items-center justify-between">
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Admin Edit Panel (if toggled) */}
        {isEditing && (
          <div className="p-4 bg-blue-50/60 border-b border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <ShieldCheckIcon className="w-4 h-4 text-blue-600" />
                <span>Admin Invoice Modification Gate</span>
              </span>
              <button
                onClick={() => setIsEditing(false)}
                className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                  Bill Discount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editDiscount}
                  onChange={(e) => setEditDiscount(Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={editTerms}
                  onChange={(e) => setEditTerms(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                  Internal Notes
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. APMC special concession"
                  className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white"
                />
              </div>

              <div className="sm:col-span-3 flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <SaveIcon className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Saving...' : 'Apply Admin Revision'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Printable Invoice Sheet */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 font-sans text-slate-800 print:p-0 bg-slate-50/40">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-xs max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start pb-5 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  {settings.shopInitials && (
                    <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 font-black text-xs uppercase tracking-wide">
                      {settings.shopInitials}
                    </span>
                  )}
                  <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                    {settings.shopName || 'KBN FRUITS'}
                  </h1>
                </div>
                <p className="text-xs text-slate-500 mt-1 whitespace-pre-line leading-relaxed">
                  {settings.shopAddress || 'T/A-18,T/E-25,ANNA FRUITS MARKET, KOYAMBEDU, CHENNAI-600092'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Phone: {settings.shopPhone || '8778219770'}
                  {settings.shopGst ? ` · GSTIN: ${settings.shopGst}` : ''}
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 rounded font-bold text-xs uppercase tracking-wider">
                  {inv.saleType || 'TAX INVOICE'}
                </span>
                <div className="font-mono font-extrabold text-base text-slate-900 mt-1">
                  {inv.invoiceNumber}
                </div>
                <div className="text-xs text-slate-500">
                  Date: {inv.invoiceDate}
                </div>
              </div>
            </div>

            {/* Customer & Bill Details */}
            <div className="grid grid-cols-2 gap-8 py-4 border-b border-slate-200 text-xs">
              <div>
                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">
                  Billed To:
                </span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">
                  {inv.customerName || (inv.customer ? inv.customer.name : 'Cash Customer')}
                </div>
                {inv.customerPhone && (
                  <div className="text-slate-500 mt-0.5 font-medium">Mobile: {inv.customerPhone}</div>
                )}
                {inv.customer?.address && (
                  <div className="text-slate-500">{inv.customer.address}</div>
                )}
              </div>

              <div className="text-right">
                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">
                  Payment Details:
                </span>
                <div className="mt-0.5">
                  Status:{' '}
                  <span className="font-bold text-emerald-700 uppercase">{inv.status}</span>
                </div>
                <div className="text-slate-500 mt-0.5">
                  Due Date: {inv.dueDate || inv.invoiceDate}
                </div>
                {inv.notes && (
                  <div className="text-slate-500 italic mt-0.5">Note: {inv.notes}</div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="py-2 border-b border-slate-200">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase">
                    <th className="py-2.5">#</th>
                    <th className="py-2.5">Fruit Item</th>
                    <th className="py-2.5">Variety / Grade</th>
                    <th className="py-2.5 text-right">Qty</th>
                    <th className="py-2.5 text-right">Unit</th>
                    <th className="py-2.5 text-right">Rate (₹)</th>
                    <th className="py-2.5 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item: any, idx: number) => (
                    <tr key={item.id || idx}>
                      <td className="py-2.5 text-slate-400 align-top">{idx + 1}</td>
                      <td className="py-2.5 align-top">
                        <div className="font-semibold text-slate-900">
                          {item.productName || 'Fruit'}
                        </div>
                      </td>
                      <td className="py-2.5 text-slate-600 align-top">
                        {item.variety || '—'} · {item.grade || 'A'}
                      </td>
                      <td className="py-2.5 text-right font-mono font-medium align-top">
                        {Number(item.quantity).toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right text-slate-500 align-top">
                        {item.unit || 'BOX'}
                      </td>
                      <td className="py-2.5 text-right font-mono align-top">
                        ₹{Number(item.rate).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-slate-900 align-top">
                        ₹
                        {Number(
                          item.totalAmount || Number(item.quantity) * Number(item.rate)
                        ).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals & Financial Breakdown */}
            <div className="pt-2 flex flex-col sm:flex-row justify-between items-start gap-4 text-xs">
              <div className="w-full sm:w-1/2 space-y-2">
                {payments.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block">
                      Payment Vouchers:
                    </span>
                    {payments.map((p: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-[11px] text-slate-600">
                        <span>
                          {p.paymentMode} ({p.paymentNumber})
                        </span>
                        <span className="font-mono font-semibold">
                          ₹{Number(p.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {inv.trayIssued > 0 && (
                  <div className="text-[11px] text-slate-500">
                    Crates Issued: <strong className="text-slate-800">{inv.trayIssued} trays</strong>
                  </div>
                )}
              </div>

              <div className="w-full sm:w-1/2 max-w-xs space-y-1.5 text-right ml-auto">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-medium">
                    ₹{Number(inv.subtotal).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Discount:</span>
                  <span className="font-mono font-medium">
                    - ₹{Number(inv.discount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax:</span>
                  <span className="font-mono font-medium">
                    + ₹{Number(inv.tax || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-100 pt-1">
                  <span>Current Sale Total:</span>
                  <span className="font-mono">
                    ₹{Number(inv.grandTotal).toLocaleString('en-IN')}
                  </span>
                </div>
                {Number(inv.previousDueSnapshot) > 0 && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>Previous Ledger Due:</span>
                    <span className="font-mono">
                      + ₹{Number(inv.previousDueSnapshot).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-slate-900 border-t-2 border-slate-300 pt-1.5 text-sm">
                  <span>Total Payable:</span>
                  <span className="font-mono">
                    ₹
                    {Number(inv.totalPayableSnapshot || inv.grandTotal).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Payment Received:</span>
                  <span className="font-mono">
                    - ₹{Number(inv.paidAmount).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between font-extrabold text-rose-600 border-t border-slate-200 pt-1 text-sm">
                  <span>Balance Due:</span>
                  <span className="font-mono">
                    ₹{Number(inv.balanceDue).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
