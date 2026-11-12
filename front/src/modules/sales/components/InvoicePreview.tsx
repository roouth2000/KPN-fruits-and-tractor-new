import React, { useState, useEffect } from 'react';
import { DownloadIcon, XIcon, FileTextIcon, ShieldCheckIcon, SaveIcon, PrinterIcon, SettingsIcon } from '../../../components/icons';
import { salesApi } from '../services/salesApi';
import { useAuth } from '../../../context/AuthContext';
import { qzTrayService } from '../../../services/qzTrayService';
import { PrinterSettingsModal } from '../../../components/PrinterSettingsModal';
import type { PaperSize, QZTrayStatus } from '../../../types/printer';

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
  const [qzStatus, setQzStatus] = useState<QZTrayStatus>(qzTrayService.getStatus());
  const [paperSize, setPaperSize] = useState<PaperSize>(qzTrayService.getSettings().paperSize);

  useEffect(() => {
    const unsub = qzTrayService.onStatusChange(setQzStatus);
    return unsub;
  }, []);

  if (!isOpen || !invoiceData) return null;

  const inv = invoiceData.invoice || invoiceData;
  const items = inv.items || [];
  const payments = inv.payments || [];

  const canEditInvoice = hasPermission('sales.edit');
  const canCancelInvoice = hasPermission('sales.cancel');

  // Direct silent QZ Tray printing
  const handleDirectPrint = async () => {
    setIsPrintingDirect(true);
    try {
      const res = await qzTrayService.printInvoice(inv, { paperSize });
      if (res.method === 'QZ_TRAY') {
        setToastMsg(`Receipt sent silently to "${res.printer}" (${paperSize})`);
      } else {
        setToastMsg('QZ Tray offline: opened via Browser Print Dialog');
      }
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: any) {
      setToastMsg(`Print error: ${err?.message || err}`);
      setTimeout(() => setToastMsg(null), 4000);
    } finally {
      setIsPrintingDirect(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    if (inv.id) {
      window.open(salesApi.getInvoicePdfUrl(inv.id), '_blank');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Top Dialog Action Bar */}
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <FileTextIcon className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Invoice Preview · {inv.invoiceNumber}
            </h3>
            {canEditInvoice ? (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Admin Edit Active
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Salesperson View Only
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Admin-only Invoice Edit Button */}
            {canEditInvoice && !isEditing && (
              <button
                type="button"
                onClick={handleStartEdit}
                className="px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                title="Edit invoice notes and discounts (Admin Only)"
              >
                <ShieldCheckIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Edit Invoice</span>
              </button>
            )}

            {/* Admin-only Invoice Void / Cancel Button */}
            {canCancelInvoice && inv.status !== 'CANCELLED' && (
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm(`Are you sure you want to cancel invoice #${inv.invoiceNumber}? Stock and customer dues will be atomically reversed.`)) {
                    await salesApi.cancelInvoice(inv.id, 'Admin cancellation');
                    onInvoiceUpdated?.();
                    onClose();
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
                title="Cancel invoice & reverse stock/ledger (Admin only)"
              >
                Cancel Bill
              </button>
            )}

            {/* 80mm / 58mm Paper Toggle */}
            <div className="hidden sm:flex items-center bg-slate-200/80 p-0.5 rounded-lg text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setPaperSize('80mm')}
                className={`px-2 py-1 rounded transition-colors ${
                  paperSize === '80mm' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                80mm
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('58mm')}
                className={`px-2 py-1 rounded transition-colors ${
                  paperSize === '58mm' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                58mm
              </button>
            </div>

            {/* Direct Silent QZ Tray Print */}
            <button
              type="button"
              onClick={handleDirectPrint}
              disabled={isPrintingDirect}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title={
                qzStatus === 'CONNECTED'
                  ? 'Send silent thermal print job via QZ Tray'
                  : 'QZ Tray not connected, will open browser print'
              }
            >
              <PrinterIcon className={`w-3.5 h-3.5 ${isPrintingDirect ? 'animate-bounce' : ''}`} />
              <span>{isPrintingDirect ? 'Printing...' : 'Direct Print'}</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  qzStatus === 'CONNECTED' ? 'bg-emerald-300' : 'bg-amber-300'
                }`}
              />
            </button>

            {/* Printer Settings Quick Launcher */}
            <button
              type="button"
              onClick={() => setIsPrinterSettingsOpen(true)}
              className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              title="Configure QZ Tray & Thermal Printers"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold hidden md:flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <DownloadIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow-sm cursor-pointer hidden sm:block"
              title="Open standard browser print dialog"
            >
              Browser Print
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printer Settings Modal */}
        <PrinterSettingsModal
          isOpen={isPrinterSettingsOpen}
          onClose={() => setIsPrinterSettingsOpen(false)}
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
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Bill Discount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={editDiscount}
                  onChange={(e) => setEditDiscount(Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Payment Terms</label>
                <input
                  type="text"
                  value={editTerms}
                  onChange={(e) => setEditTerms(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Internal Notes</label>
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
        <div className="p-8 overflow-y-auto flex-1 font-sans text-slate-800 print:p-0">
          {/* Header */}
          <div className="flex justify-between items-start pb-6 border-b border-slate-200">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                KBN FRUITS AND TRADERS
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Wholesale & Cold Chain Storage · APMC Fruit Market, Bay #12, Vashi, Navi Mumbai
              </p>
              <p className="text-xs text-slate-500">
                Phone: +91 98200 12345 · GSTIN: 27AABCF1234F1Z5
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
              <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Billed To:</span>
              <div className="font-bold text-slate-900 text-sm mt-0.5">
                {inv.customerName || (inv.customer ? inv.customer.name : 'Cash Customer')}
              </div>
              {inv.customerPhone && (
                <div className="text-slate-500 mt-0.5">Mobile: {inv.customerPhone}</div>
              )}
              {inv.customer?.address && (
                <div className="text-slate-500">{inv.customer.address}</div>
              )}
            </div>

            <div className="text-right">
              <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Payment Details:</span>
              <div className="mt-0.5">
                Status: <span className="font-bold text-emerald-700 uppercase">{inv.status}</span>
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
          <div className="py-4 border-b border-slate-200">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase">
                  <th className="py-2">#</th>
                  <th className="py-2">Fruit Item</th>
                  <th className="py-2">Variety / Grade</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Unit</th>
                  <th className="py-2 text-right">Rate (₹)</th>
                  <th className="py-2 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item: any, idx: number) => (
                  <tr key={item.id || idx}>
                    <td className="py-2 text-slate-400 align-top">{idx + 1}</td>
                    <td className="py-2 align-top">
                      <div className="font-semibold text-slate-900">{item.productName || 'Fruit'}</div>
                      {/* Rule 6: Supplier & Batch trace per item sold */}
                      {item.batchAllocations && item.batchAllocations.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {item.batchAllocations.map((alloc: any, aIdx: number) => (
                            <div
                              key={alloc.id || aIdx}
                              className="text-[10px] font-mono flex flex-wrap items-center gap-1.5 bg-indigo-50/50 border border-indigo-100 rounded px-1.5 py-0.5 text-indigo-900"
                            >
                              <span className="font-bold text-indigo-700">
                                {alloc.supplier ? alloc.supplier.name : 'Supplier Lot'}:
                              </span>
                              <span className="font-semibold">{alloc.quantity} {alloc.unit}</span>
                              <span className="text-indigo-400">
                                ({alloc.batch ? alloc.batch.batchNumber : `Batch #${alloc.batchId}`})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-2 text-slate-600 align-top">{item.variety || '—'} · {item.grade || 'A'}</td>
                    <td className="py-2 text-right font-mono font-medium align-top">{Number(item.quantity).toLocaleString()}</td>
                    <td className="py-2 text-right text-slate-500 align-top">{item.unit || 'BOX'}</td>
                    <td className="py-2 text-right font-mono align-top">₹{Number(item.rate).toLocaleString('en-IN')}</td>
                    <td className="py-2 text-right font-mono font-bold text-slate-900 align-top">
                      ₹{Number(item.totalAmount || (Number(item.quantity) * Number(item.rate))).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Financial Breakdown */}
          <div className="pt-4 flex justify-between items-start text-xs">
            <div className="w-1/2 space-y-2">
              {payments.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block">
                    Payment Vouchers:
                  </span>
                  {payments.map((p: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-[11px] text-slate-600">
                      <span>{p.paymentMode} ({p.paymentNumber})</span>
                      <span className="font-mono font-semibold">₹{Number(p.amount).toLocaleString('en-IN')}</span>
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

            <div className="w-1/2 max-w-xs space-y-1.5 text-right pl-6">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-medium">₹{Number(inv.subtotal).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Discount:</span>
                <span className="font-mono font-medium">- ₹{Number(inv.discount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax:</span>
                <span className="font-mono font-medium">+ ₹{Number(inv.tax || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-100 pt-1">
                <span>Current Sale Total:</span>
                <span className="font-mono">₹{Number(inv.grandTotal).toLocaleString('en-IN')}</span>
              </div>
              {Number(inv.previousDueSnapshot) > 0 && (
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>Previous Ledger Due:</span>
                  <span className="font-mono">+ ₹{Number(inv.previousDueSnapshot).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-slate-900 border-t-2 border-slate-300 pt-1.5 text-sm">
                <span>Total Payable:</span>
                <span className="font-mono">₹{Number(inv.totalPayableSnapshot || inv.grandTotal).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Payment Received:</span>
                <span className="font-mono">- ₹{Number(inv.paidAmount).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-extrabold text-rose-600 border-t border-slate-200 pt-1 text-sm">
                <span>Balance Due:</span>
                <span className="font-mono">₹{Number(inv.balanceDue).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
