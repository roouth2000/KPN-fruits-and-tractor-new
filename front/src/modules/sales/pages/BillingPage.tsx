import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CustomerSelector } from '../components/CustomerSelector';
import { ProductSearch } from '../components/ProductSearch';
import { BillingItemsTable } from '../components/BillingItemsTable';
import { PreviousDuePanel } from '../components/PreviousDuePanel';
import { PaymentPanel } from '../components/PaymentPanel';
import { TrayPanel } from '../components/TrayPanel';
import { BillingTotals } from '../components/BillingTotals';
import { InvoiceActions } from '../components/InvoiceActions';
import { InvoicePreview } from '../components/InvoicePreview';
import { HoldInvoiceModal } from '../components/HoldInvoiceModal';
import { printerService } from '../../../services/printer/printerService';
import { PrinterSettingsModal } from '../../../components/PrinterSettingsModal';
import type { PrinterConnectionStatus } from '../../../services/printer/printerTypes';

import { useBilling } from '../hooks/useBilling';
import { useCustomerBalance } from '../hooks/useCustomers';
import { useUnits } from '../hooks/useProducts';

import type {
  Customer,
  Product,
  BillingItem,
  PaymentEntry,
  SaleType,
  BillingFormData,
  HeldInvoice,
} from '../types/billing';

interface BillingPageProps {
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
  onNavigateInvoices?: () => void;
}

export const BillingPage: React.FC<BillingPageProps> = ({ onShowToast }) => {

  // Billing Engine Hook
  const {
    nextInvoiceNumber,
    refetchNextNumber,
    createInvoice,
    isCreating,
    collectDue,
    heldInvoices,
    holdInvoice,
    removeHeldInvoice,
  } = useBilling();

  const { data: units = [] } = useUnits();

  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [saleType, setSaleType] = useState<SaleType>('WHOLESALE');
  const [invoiceDate, setInvoiceDate] = useState<string>('2026-11-09');
  const [dueDate] = useState<string>('2026-11-09');
  const [items, setItems] = useState<BillingItem[]>([]);
  const [invoiceDiscount, setInvoiceDiscount] = useState<number>(0);
  const [invoiceTax, setInvoiceTax] = useState<number>(0);
  const [payments, setPayments] = useState<PaymentEntry[]>([
    { method: 'CASH', amount: 0, transactionRef: '' },
  ]);
  const [trayIssued, setTrayIssued] = useState<number>(0);
  const [trayReturned, setTrayReturned] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  // UI Modal States
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPrinterSettingsOpen, setIsPrinterSettingsOpen] = useState(false);
  const [, setPrinterStatus] = useState<PrinterConnectionStatus>(printerService.getStatus());
  const lastPrintedInvoiceIdRef = useRef<number | string | null>(null);

  useEffect(() => {
    const unsub = printerService.onStatusChange(setPrinterStatus);
    return unsub;
  }, []);

  // Real-time Ledger balance for selected customer
  const { data: customerBalance, refetch: refetchCustomerBalance } = useCustomerBalance(
    selectedCustomer?.id || null
  );

  const previousDue = selectedCustomer?.customerType === 'WALK_IN'
    ? 0
    : customerBalance
    ? customerBalance.previousDue
    : parseFloat(String(selectedCustomer?.currentDue || 0));

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  const itemDiscounts = items.reduce((sum, item) => sum + (item.discount || 0), 0);
  const itemTaxes = items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
  const currentSaleTotal = Math.max(0, subtotal - (itemDiscounts + invoiceDiscount) + (itemTaxes + invoiceTax));
  const totalPayable = previousDue + currentSaleTotal;
  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(String(p.amount)) || 0), 0);

  // Add Product to Invoice
  const handleSelectProduct = (product: Product) => {
    const defaultRate =
      saleType === 'RETAIL'
        ? parseFloat(String(product.retailRate))
        : parseFloat(String(product.wholesaleRate));

    const conversion = parseFloat(String(product.conversionFactor)) || 1.0;
    const existingIndex = items.findIndex((i) => i.productId === product.id);

    if (existingIndex >= 0) {
      // Increase qty of existing line
      const updated = [...items];
      const existing = updated[existingIndex];
      const newQty = existing.quantity + 1;
      const baseQty = Math.round(newQty * conversion * 1000) / 1000;
      const raw = newQty * existing.rate;
      const taxAmt = Math.round(((raw - existing.discount) * (existing.taxRate / 100)) * 100) / 100;

      updated[existingIndex] = {
        ...existing,
        quantity: newQty,
        baseQuantity: baseQty,
        taxAmount: taxAmt,
        totalAmount: Math.round((raw - existing.discount + taxAmt) * 100) / 100,
        trayQuantity: Math.ceil(newQty),
      };
      setItems(updated);
    } else {
      // New line item
      const qty = 1;
      const baseQty = Math.round(qty * conversion * 1000) / 1000;
      const raw = qty * defaultRate;
      const taxRate = 0;
      const taxAmt = 0;
      const totalAmount = raw;

      const newItem: BillingItem = {
        id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: product.id,
        productName: product.name,
        variety: product.variety,
        grade: product.grade || 'A',
        batchNumber: product.batchNumber || undefined,
        unit: product.defaultUnit || 'BOX',
        baseUnit: product.baseUnit || 'KG',
        conversionFactor: conversion,
        quantity: qty,
        baseQuantity: baseQty,
        rate: defaultRate,
        discount: 0,
        taxRate,
        taxAmount: taxAmt,
        totalAmount,
        trayQuantity: product.isTrayRequired ? 1 : 0,
        currentStock: parseFloat(String(product.currentStock)) || 0,
      };

      setItems([...items, newItem]);
    }

    if (onShowToast) {
      onShowToast('Product Added', `${product.name} (${product.variety}) added to invoice.`, 'info');
    }
  };

  const handleUpdateItem = (id: string, updates: Partial<BillingItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleReset = useCallback(() => {
    setSelectedCustomer(null);
    setItems([]);
    setInvoiceDiscount(0);
    setInvoiceTax(0);
    setPayments([{ method: 'CASH', amount: 0, transactionRef: '' }]);
    setTrayIssued(0);
    setTrayReturned(0);
    setNotes('');
    refetchNextNumber();
  }, [refetchNextNumber]);

  // Save Invoice (Common Billing Transaction)
  const handleSaveInvoice = async (printAfterSave = false, isDraft = false) => {
    if (!selectedCustomer) {
      alert('Please select a customer or Cash Customer (F2).');
      return;
    }

    if (items.length === 0 && !isDraft) {
      alert('Please add at least one fruit item to the invoice (F3).');
      return;
    }

    try {
      const payload = {
        customerId: selectedCustomer.id,
        invoiceDate,
        dueDate,
        saleType,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          rate: i.rate,
          unit: i.unit,
          discount: i.discount,
          taxRate: i.taxRate,
          trayQuantity: i.trayQuantity,
          grade: i.grade,
          batchNumber: i.batchNumber,
        })),
        invoiceDiscount,
        invoiceTax,
        payments: payments.filter((p) => p.amount > 0),
        trayIssued: trayIssued > 0 ? trayIssued : items.reduce((s, i) => s + (i.trayQuantity || 0), 0),
        trayReturned,
        notes,
        status: isDraft ? 'DRAFT' : 'CONFIRMED',
      };

      const result = await createInvoice(payload);

      if (onShowToast) {
        onShowToast(
          isDraft ? 'Draft Saved' : 'Invoice Saved Successfully',
          `${result.invoiceNumber} · ₹${result.grandTotal.toLocaleString('en-IN')} (Paid: ₹${result.paid.toLocaleString('en-IN')}, Due: ₹${result.due.toLocaleString('en-IN')})`,
          'success'
        );
      }

      setPreviewInvoice(result);

      if (printAfterSave) {
        const pSettings = printerService.getSettings();
        if (pSettings.autoPrintOnSave && printerService.isConnected()) {
          // Prevent accidental duplicate prints
          const invoiceKey = (result as any).id || result.invoiceNumber;
          if (lastPrintedInvoiceIdRef.current !== invoiceKey) {
            lastPrintedInvoiceIdRef.current = invoiceKey;
            printerService
              .printInvoice(result)
              .then((printRes) => {
                if (printRes.success) {
                  onShowToast?.(
                    'Receipt Printed via Web Serial',
                    `Direct print completed for "${printRes.printerName}" (${pSettings.paperSize} layout).`,
                    'success'
                  );
                } else {
                  onShowToast?.('Print Notification', printRes.error || 'Failed to print receipt', 'warning');
                  setIsPreviewOpen(true);
                }
              })
              .catch((printErr) => {
                console.warn('Direct thermal print error, opening preview modal:', printErr);
                setIsPreviewOpen(true);
              });
          }
        } else {
          setIsPreviewOpen(true);
        }
      }

      handleReset();
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Invoice could not be saved';
      alert(`Error: ${message}`);
    }
  };

  // Hold current invoice
  const handleHold = () => {
    if (items.length === 0) {
      alert('Cannot hold an empty invoice.');
      return;
    }

    const currentFormData: BillingFormData = {
      customerId: selectedCustomer?.id || null,
      customerName: selectedCustomer?.name || 'Walk-in Customer',
      customerPhone: selectedCustomer?.phone,
      customerAddress: selectedCustomer?.address || undefined,
      saleType,
      invoiceDate,
      dueDate,
      items,
      invoiceDiscount,
      invoiceTax,
      payments,
      trayIssued,
      trayReturned,
      notes,
      status: 'CONFIRMED',
    };

    const held = holdInvoice(currentFormData);
    if (onShowToast) {
      onShowToast('Invoice Held', `Held cart for ${held.customerName} (${held.itemCount} items).`, 'info');
    }
    handleReset();
  };

  // Restore held invoice
  const handleRestoreHeld = (held: HeldInvoice) => {
    const d = held.data;
    if (d.customerId) {
      setSelectedCustomer({
        id: d.customerId,
        customerCode: '',
        name: d.customerName,
        phone: d.customerPhone || '',
        customerType: d.saleType === 'CASH' ? 'WALK_IN' : 'WHOLESALE',
        creditLimit: 50000,
        openingBalance: 0,
        currentDue: 0,
        outstandingTrays: 0,
        isActive: true,
      });
    }
    setSaleType(d.saleType);
    setInvoiceDate(d.invoiceDate);
    setItems(d.items);
    setInvoiceDiscount(d.invoiceDiscount);
    setInvoiceTax(d.invoiceTax);
    setPayments(d.payments);
    setTrayIssued(d.trayIssued);
    setTrayReturned(d.trayReturned);
    setNotes(d.notes);
    removeHeldInvoice(held.id);

    if (onShowToast) {
      onShowToast('Invoice Restored', `Restored cart for ${held.customerName}.`, 'success');
    }
  };

  return (
    <div className="space-y-2 pb-6">
      <InvoiceActions
        invoiceNumber={nextInvoiceNumber}
        invoiceDate={invoiceDate}
        saleType={saleType}
        onChangeSaleType={setSaleType}
        onChangeDate={setInvoiceDate}
        onSaveDraft={() => handleSaveInvoice(false, true)}
        onHoldInvoice={handleHold}
        onOpenHeldModal={() => setIsHeldModalOpen(true)}
        heldCount={heldInvoices.length}
        onSaveInvoice={() => handleSaveInvoice(false, false)}
        onSaveAndPrint={() => handleSaveInvoice(true, false)}
        onResetInvoice={handleReset}
        isSaving={isCreating}
      />

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: Product Entry + Items Table (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Fast Product Entry Bar (F3) */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
              <span>Fast Fruit Entry (Barcode / SKU / Name)</span>
              <span className="text-[10px] text-slate-400 font-normal">
                Press <kbd className="font-mono bg-slate-100 border border-slate-200 px-1 rounded">F3</kbd> to search, <kbd className="font-mono bg-slate-100 border border-slate-200 px-1 rounded">↑↓</kbd> to select, <kbd className="font-mono bg-slate-100 border border-slate-200 px-1 rounded">Enter</kbd> to add
              </span>
            </div>
            <ProductSearch onSelectProduct={handleSelectProduct} />
          </div>

          {/* Billing Items Table */}
          <BillingItemsTable
            items={items}
            availableUnits={units}
            onUpdateItem={handleUpdateItem}
            onRemoveItem={handleRemoveItem}
          />
        </div>

        {/* RIGHT COLUMN: Customer + Previous Due + Payments + Totals + Trays (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Customer Selection (F2) */}
          <CustomerSelector
            selectedCustomerId={selectedCustomer?.id || null}
            onSelectCustomer={(cust) => {
              setSelectedCustomer(cust);
              if (cust?.customerType === 'WALK_IN') {
                setSaleType('CASH');
              } else if (cust?.customerType === 'WHOLESALE') {
                setSaleType('WHOLESALE');
              }
            }}
            onOpenDueCollection={async (_cust) => {
              // Open standalone due collection dialog
            }}
          />

          {/* Standalone Previous Due Panel (Scenario 54) */}
          <PreviousDuePanel
            customer={selectedCustomer}
            previousDue={previousDue}
            onCollectDue={async (payload) => {
              const res = await collectDue(payload);
              refetchCustomerBalance();
              if (onShowToast) {
                onShowToast(
                  'Payment Collected',
                  `Receipt #${res.paymentNumber}: ₹${res.paidAmount.toLocaleString('en-IN')} collected. Remaining due: ₹${res.remainingDue.toLocaleString('en-IN')}`,
                  'success'
                );
              }
              return res;
            }}
          />

          {/* Payment Breakdown Panel (F4) */}
          <PaymentPanel
            totalPayable={totalPayable}
            payments={payments}
            onChangePayments={setPayments}
          />

          {/* Tray Accounting Panel */}
          <TrayPanel
            trayIssued={trayIssued}
            trayReturned={trayReturned}
            onChangeIssued={setTrayIssued}
            onChangeReturned={setTrayReturned}
            customerOutstandingTrays={customerBalance?.outstandingTrays || selectedCustomer?.outstandingTrays || 0}
          />

          {/* Financial Totals */}
          <BillingTotals
            subtotal={subtotal}
            invoiceDiscount={invoiceDiscount}
            itemDiscounts={itemDiscounts}
            invoiceTax={invoiceTax}
            itemTaxes={itemTaxes}
            previousDue={previousDue}
            totalPaid={totalPaid}
            onChangeInvoiceDiscount={setInvoiceDiscount}
            onChangeInvoiceTax={setInvoiceTax}
          />

          {/* Bottom Primary Save Button */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={isCreating}
              onClick={() => handleSaveInvoice(false, false)}
              className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{isCreating ? 'Processing...' : 'Confirm & Save Invoice'}</span>
              <kbd className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                F8
              </kbd>
            </button>

            <button
              type="button"
              disabled={isCreating}
              onClick={() => handleSaveInvoice(true, false)}
              className="py-3 px-5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>Save & Print</span>
              <kbd className="text-[10px] bg-emerald-700 text-emerald-100 px-1.5 py-0.5 rounded font-mono">
                F9
              </kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Held Invoices Modal */}
      <HoldInvoiceModal
        isOpen={isHeldModalOpen}
        onClose={() => setIsHeldModalOpen(false)}
        heldInvoices={heldInvoices}
        onRestore={handleRestoreHeld}
        onDelete={removeHeldInvoice}
      />

      {/* Invoice Print & PDF Preview Modal */}
      <InvoicePreview
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        invoiceData={previewInvoice}
        onInvoiceUpdated={() => {
          refetchNextNumber();
          if (onShowToast) onShowToast('Invoice Updated', 'Admin revisions were successfully saved to database.', 'success');
        }}
      />

      {/* POS Thermal Printer Settings Modal */}
      <PrinterSettingsModal
        isOpen={isPrinterSettingsOpen}
        onClose={() => setIsPrinterSettingsOpen(false)}
        onShowToast={onShowToast}
      />
    </div>
  );
};

export default BillingPage;
