import React, { useState, useEffect } from 'react';
import {
  DownloadIcon,
  XIcon,
  FileTextIcon,
  ShieldCheckIcon,
  SaveIcon,
  PrinterIcon,
} from '../../../components/icons';
import { salesApi } from '../services/salesApi';
import { useAuth } from '../../../context/AuthContext';
import { printerService } from '../../../services/printer/printerService';
import type { PrinterConnectionStatus, PrinterSettings } from '../../../services/printer/printerTypes';
import kbnLogo from '../../../assets/kbn-logo.jpeg';

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
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<PrinterConnectionStatus>(printerService.getStatus());
  const [settings, setSettings] = useState<PrinterSettings>(printerService.getSettings());

  useEffect(() => {
    const unsub = printerService.onStatusChange(setPrinterStatus);
    printerService.attemptSilentReconnect();
    return unsub;
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSettings(printerService.getSettings());
    }
  }, [isOpen]);

  if (!isOpen || !invoiceData) return null;

  const inv = invoiceData.invoice || invoiceData;
  const items = inv.items || [];
  const payments = inv.payments || [];

  // Calculations for thermal receipt roll layout
  const rawSaleType = String(inv.saleType || '').toUpperCase();
  const grandTotal = Number(inv.grandTotal || 0);
  const subtotal = Number(inv.subtotal || grandTotal || 0);
  const paidAmount = Number(inv.paidAmount || 0);
  const balanceDue = Number(inv.balanceDue || 0);
  const previousDue = Number(inv.previousDueSnapshot || inv.previousDue || 0);
  const totalPayable = previousDue > 0 ? previousDue + grandTotal : grandTotal;
  const totalQty = items.reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0);

  let billType = 'CREDITBILL';
  if (rawSaleType === 'CASH' || (balanceDue <= 0 && paidAmount >= grandTotal && grandTotal > 0)) {
    billType = 'CASHBILL';
  } else if (rawSaleType === 'CREDIT') {
    billType = 'CREDITBILL';
  }

  const cashierName =
    inv.createdBy?.name ||
    inv.createdBy?.username ||
    inv.cashier ||
    'Super Administrator';

  const invTime = inv.createdAt
    ? new Date(inv.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '05:00 PM';

  const effectiveShopName =
    !settings.shopName || settings.shopName.includes('SR FRUITS') || settings.shopName === 'SR'
      ? 'KBN FRUITS'
      : settings.shopName;
  const effectiveInitials =
    !settings.shopInitials || settings.shopInitials === 'SR' ? 'KBN' : settings.shopInitials;

  const canEditInvoice = hasPermission('sales.edit');
  const canCancelInvoice = hasPermission('sales.cancel');

  // Direct browser-native thermal printing
  const handleDirectPrint = async () => {
    setIsPrintingDirect(true);
    try {
      if (!printerService.isConnected()) {
        const reconnected = await printerService.reconnectPrinter();
        if (!reconnected && !printerService.isConnected()) {
          try {
            await printerService.connectPrinter();
          } catch (connectErr: any) {
            setToastMsg(connectErr?.message || 'Printer connection cancelled');
            setTimeout(() => setToastMsg(null), 4000);
            return;
          }
        }
      }

      const res = await printerService.printInvoice(inv, { paperSize: '80mm' });
      if (res.success) {
        setToastMsg(res.message || 'Receipt printed successfully');
      } else {
        setToastMsg(res.error || 'Print failed. Check printer connection.');
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
      setIsDownloadingPdf(true);
      try {
        await salesApi.downloadInvoicePdf(inv.id, inv.invoiceNumber);
        setToastMsg('Thermal receipt PDF downloaded');
        setTimeout(() => setToastMsg(null), 3000);
      } catch {
        // Fallback to token-authorized URL
        window.open(salesApi.getInvoicePdfUrl(inv.id), '_blank');
      } finally {
        setIsDownloadingPdf(false);
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
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
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
            {/* Device Online / Offline Status Badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold select-none border ${
                printerStatus === 'CONNECTED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
              title={printerStatus === 'CONNECTED' ? 'Thermal Printer: Online' : 'Thermal Printer: Offline'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  printerStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <span>{printerStatus === 'CONNECTED' ? 'Online' : 'Offline'}</span>
            </div>

            {/* Print Button (Thermal ESC/POS) */}
            <button
              type="button"
              onClick={handleDirectPrint}
              disabled={isPrintingDirect}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Print receipt to thermal printer"
            >
              <PrinterIcon className={`w-3.5 h-3.5 ${isPrintingDirect ? 'animate-bounce' : ''}`} />
              <span>{isPrintingDirect ? 'Printing...' : 'Print'}</span>
            </button>

            {/* Thermal Receipt PDF Download */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors disabled:opacity-50"
              title="Download thermal printer receipt PDF"
            >
              <DownloadIcon className={`w-3.5 h-3.5 text-slate-500 ${isDownloadingPdf ? 'animate-bounce' : ''}`} />
              <span>{isDownloadingPdf ? 'Downloading...' : 'PDF'}</span>
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

        {/* Thermal Receipt Paper Roll Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-200/60 flex justify-center items-start print:p-0">
          <div className="bg-white text-slate-900 font-mono shadow-2xl border border-slate-300 rounded-t-sm p-4 sm:p-5 transition-all duration-150 select-text w-[360px] text-xs">
            {/* KBN Logo Print Header */}
            {settings.printLogo !== false && (
              <div className="flex flex-col items-center justify-center mb-1.5">
                <img
                  src={kbnLogo}
                  alt="KBN Fruits"
                  className="w-16 h-16 object-contain rounded-md filter contrast-125 mx-auto"
                />
              </div>
            )}
            {effectiveInitials && (
              <div className="text-center font-black text-xs tracking-widest uppercase mb-0.5 text-slate-700">
                [{effectiveInitials}]
              </div>
            )}
            <div className="text-center font-extrabold text-sm uppercase tracking-wide">
              {effectiveShopName}
            </div>
            <div className="text-center text-[10px] text-slate-600 leading-tight mt-1 whitespace-pre-line">
              {settings.shopAddress || 'T/A-18,T/E-25,ANNA FRUITS MARKET, KOYAMBEDU, CHENNAI-600092'}
            </div>
            <div className="text-center text-[10px] text-slate-600 mt-0.5">
              Phone: {settings.shopPhone || '8778219770'}
              {settings.shopGst ? ` · GSTIN: ${settings.shopGst}` : ''}
            </div>

            {/* Divider */}
            <div className="border-b border-dashed border-slate-400 my-2" />

            {/* Bill Type */}
            <div className="text-center font-bold text-xs uppercase tracking-wider">
              *** {billType} ***
            </div>

            {/* Divider */}
            <div className="border-b border-dashed border-slate-400 my-2" />

            {/* Customer Details */}
            <div className="space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-right truncate max-w-[200px]">
                  {inv.customerName || (inv.customer ? inv.customer.name : 'Cash Customer')}
                </span>
              </div>
              {inv.customerPhone && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Mobile:</span>
                  <span className="font-medium">{inv.customerPhone}</span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-b border-dashed border-slate-400 my-2" />

            {/* Bill Metadata */}
            <div className="space-y-0.5 text-[10px] text-slate-600">
              <div className="flex justify-between">
                <span>Bill No: <strong className="text-slate-900">{inv.invoiceNumber}</strong></span>
                <span>Date: {inv.invoiceDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier: {cashierName}</span>
                <span>Time: {invTime}</span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-b border-dashed border-slate-400 my-2" />

            {/* Table Header */}
            <div className="flex justify-between text-[11px] font-bold pb-1 uppercase border-b border-dashed border-slate-400">
              <span className="flex-1">Description</span>
              <span className="w-9 text-right">Qty</span>
              <span className="w-13 text-right">Rate</span>
              <span className="w-16 text-right">Amount</span>
            </div>

            {/* Items */}
            <div className="divide-y divide-dashed divide-slate-200 py-1 space-y-1">
              {items.map((item: any, idx: number) => {
                const qty = Number(item.quantity || 0);
                const rate = Number(item.rate || 0);
                const amt = Number(item.totalAmount || qty * rate);
                return (
                  <div key={item.id || idx} className="pt-1 text-[11px]">
                    <div className="font-semibold uppercase text-slate-900 leading-tight">
                      {item.productName || item.product?.name || 'Produce'}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-700 mt-0.5">
                      <span className="text-slate-400">{item.variety || item.unit || 'BOX'}</span>
                      <span className="w-9 text-right font-medium">{qty}</span>
                      <span className="w-13 text-right font-medium">{rate.toFixed(2)}</span>
                      <span className="w-16 text-right font-bold text-slate-900">{amt.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Divider */}
            <div className="border-b border-dashed border-slate-400 my-2" />

            {/* Financial Summary */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-600">Gross Amount :</span>
                <span className="font-mono">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Net Amount :</span>
                <span className="font-mono font-bold">₹{grandTotal.toFixed(2)}</span>
              </div>

              {previousDue > 0 && (
                <>
                  <div className="flex justify-between text-rose-700 font-medium">
                    <span>Opening Balance :</span>
                    <span className="font-mono">+ ₹{previousDue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total Amt :</span>
                    <span className="font-mono">₹{totalPayable.toFixed(2)}</span>
                  </div>
                </>
              )}

              {payments.length > 0 ? (
                payments.map((p: any, idx: number) => (
                  <div key={`pay-${idx}`} className="flex justify-between text-emerald-700 font-medium">
                    <span>{p.paymentMode || 'Payment'} Paid :</span>
                    <span className="font-mono">- ₹{Number(p.amount || 0).toFixed(2)}</span>
                  </div>
                ))
              ) : paidAmount > 0 ? (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Paid Amount :</span>
                  <span className="font-mono">- ₹{paidAmount.toFixed(2)}</span>
                </div>
              ) : null}

              <div className="flex justify-between font-extrabold text-xs sm:text-sm border-t border-dashed border-slate-400 pt-1 text-slate-900">
                <span>Closing Balance :</span>
                <span className="font-mono">₹{balanceDue.toFixed(2)}</span>
              </div>
            </div>

            {/* Items count & Qty count */}
            <div className="border-b border-dashed border-slate-400 my-2" />
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>No.Of.Items : <strong>{items.length}</strong></span>
              <span>Total Qty : <strong>{totalQty}</strong></span>
            </div>

            {/* Footer */}
            <div className="border-b border-dashed border-slate-400 my-2" />
            <div className="text-center text-[10px] text-slate-500 space-y-0.5 pt-1">
              <p className="font-bold tracking-wider">*** THANK YOU VISIT AGAIN ***</p>
              <p>{settings.footerTerms || 'Goods once sold cannot be taken back'}</p>
              <p className="text-[9px] text-slate-400 font-mono">TVS RP-3200 · Direct ESC/POS</p>
            </div>

            {/* Serrated paper tear effect at bottom */}
            <div className="mt-4 pt-1 border-b-4 border-dashed border-slate-300" />
          </div>
        </div>
      </div>
    </div>
  );
};
