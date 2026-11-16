import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CustomerSelector } from '../components/CustomerSelector';
import { BillingItemsTable } from '../components/BillingItemsTable';
import { PreviousDuePanel } from '../components/PreviousDuePanel';
import { PaymentPanel } from '../components/PaymentPanel';
import { BillingTotals } from '../components/BillingTotals';
import { InvoiceActions } from '../components/InvoiceActions';
import { InvoicePreview } from '../components/InvoicePreview';
import { HoldInvoiceModal } from '../components/HoldInvoiceModal';
import { salesApi } from '../services/salesApi';
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
  editingInvoice?: any | null;
  onClearEditingInvoice?: () => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
  onNavigateInvoices?: () => void;
}

export const BillingPage: React.FC<BillingPageProps> = ({
  editingInvoice,
  onClearEditingInvoice,
  onShowToast,
  onNavigateInvoices,
}) => {

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
  const [notes, setNotes] = useState<string>('');

  // UI Modal States
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPrinterSettingsOpen, setIsPrinterSettingsOpen] = useState(false);
  const [, setPrinterStatus] = useState<PrinterConnectionStatus>(printerService.getStatus());
  const lastPrintedInvoiceIdRef = useRef<number | string | null>(null);

  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const unsub = printerService.onStatusChange(setPrinterStatus);
    return unsub;
  }, []);

  // Preload editing invoice data when passed
  useEffect(() => {
    if (!editingInvoice) return;

    const rawItems = editingInvoice.items || [];
    const mapped: BillingItem[] = rawItems.map((it: any, idx: number) => {
      const conversion = parseFloat(String(it.conversionFactor || it.product?.conversionFactor || 1.0));
      const qty = parseFloat(String(it.quantity || 1));
      const rate = parseFloat(String(it.rate || 0));
      const disc = parseFloat(String(it.discount || 0));
      const taxR = parseFloat(String(it.taxRate || 0));
      const taxAmt = parseFloat(String(it.taxAmount || 0));
      const total = parseFloat(String(it.totalAmount || (qty * rate - disc + taxAmt)));

      return {
        id: `edit-${it.id || idx}-${Date.now()}`,
        productId: it.productId,
        productCode: it.product?.productCode || it.productCode || '',
        productName: it.productName || it.product?.name || `Product #${it.productId}`,
        variety: it.variety || it.product?.variety || '',
        grade: it.grade || it.product?.grade || 'A',
        batchNumber: it.batchNumber || undefined,
        unit: it.unit || it.product?.defaultUnit || 'BOX',
        baseUnit: it.baseUnit || it.product?.baseUnit || 'KG',
        conversionFactor: conversion,
        quantity: qty,
        baseQuantity: parseFloat(String(it.baseQuantity || qty * conversion)),
        rate,
        discount: disc,
        taxRate: taxR,
        taxAmount: taxAmt,
        totalAmount: total,
        trayQuantity: parseInt(String(it.trayQuantity || 0), 10),
        currentStock: parseFloat(String(it.product?.currentStock || it.currentStock || 0)),
      };
    });
    setItems(mapped);

    if (editingInvoice.customer) {
      setSelectedCustomer(editingInvoice.customer);
    } else if (editingInvoice.customerId) {
      setSelectedCustomer({
        id: editingInvoice.customerId,
        customerCode: editingInvoice.customer?.customerCode || '',
        name: editingInvoice.customerName || editingInvoice.customer?.name || 'Customer',
        phone: editingInvoice.customerPhone || editingInvoice.customer?.phone || '',
        customerType: editingInvoice.saleType === 'CASH' ? 'WALK_IN' : 'WHOLESALE',
        creditLimit: 50000,
        openingBalance: 0,
        currentDue: 0,
        outstandingTrays: 0,
        isActive: true,
      });
    } else {
      setSelectedCustomer(null);
    }

    setSaleType(editingInvoice.saleType || 'WHOLESALE');
    setInvoiceDate(
      editingInvoice.invoiceDate
        ? String(editingInvoice.invoiceDate).slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    );
    setInvoiceDiscount(parseFloat(String(editingInvoice.discount || 0)));
    setInvoiceTax(parseFloat(String(editingInvoice.tax || 0)));
    setNotes(editingInvoice.notes || '');

    if (Array.isArray(editingInvoice.payments) && editingInvoice.payments.length > 0) {
      setPayments(
        editingInvoice.payments.map((p: any) => ({
          method: (p.paymentMode || p.method || 'CASH').toUpperCase(),
          amount: parseFloat(String(p.amount || 0)),
          transactionRef: p.transactionRef || '',
        }))
      );
    } else if (parseFloat(String(editingInvoice.paidAmount || 0)) > 0) {
      setPayments([
        {
          method: 'CASH',
          amount: parseFloat(String(editingInvoice.paidAmount)),
          transactionRef: '',
        },
      ]);
    } else {
      setPayments([{ method: 'CASH', amount: 0, transactionRef: '' }]);
    }
  }, [editingInvoice]);

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
  const handleSelectProduct = (product: Product): string => {
    const defaultRate =
      saleType === 'RETAIL'
        ? parseFloat(String(product.retailRate))
        : parseFloat(String(product.wholesaleRate));

    const conversion = parseFloat(String(product.conversionFactor)) || 1.0;
    const existingIndex = items.findIndex((i) => i.productId === product.id);

    let targetId: string;
    if (existingIndex >= 0) {
      // Increase qty of existing line
      const updated = [...items];
      const existing = updated[existingIndex];
      targetId = existing.id;
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
      targetId = `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      const newItem: BillingItem = {
        id: targetId,
        productId: product.id,
        productCode: product.productCode,
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

    return targetId;
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
    setNotes('');
    if (editingInvoice) {
      onClearEditingInvoice?.();
    }
    refetchNextNumber();
  }, [editingInvoice, onClearEditingInvoice, refetchNextNumber]);

  // Save Invoice (Common Billing Transaction)
  const handleSaveInvoice = async (printAfterSave = false, isDraft = false) => {
    if (items.length === 0 && !isDraft) {
      alert('Please add at least one fruit item to the invoice (F3).');
      return;
    }

    try {
      const payload = {
        customerId: selectedCustomer?.id || null,
        invoiceDate,
        dueDate,
        saleType: selectedCustomer ? saleType : (saleType === 'WHOLESALE' ? 'CASH' : saleType),
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          rate: i.rate,
          unit: i.unit,
          discount: i.discount,
          taxRate: i.taxRate,
          trayQuantity: 0,
          grade: i.grade,
          batchNumber: i.batchNumber,
        })),
        invoiceDiscount,
        invoiceTax,
        payments: payments.filter((p) => p.amount > 0),
        trayIssued: 0,
        trayReturned: 0,
        notes,
        status: isDraft ? 'DRAFT' : 'CONFIRMED',
      };

      let result: any;
      if (editingInvoice) {
        setIsUpdating(true);
        result = await salesApi.updateInvoice(editingInvoice.id, payload);
        setIsUpdating(false);

        if (onShowToast) {
          onShowToast(
            'Invoice Updated Successfully',
            `${editingInvoice.invoiceNumber} · ₹${(Number(result.grandTotal) || 0).toLocaleString('en-IN')} updated on Billing Desk`,
            'success'
          );
        }
        if (onNavigateInvoices && !printAfterSave) {
          onNavigateInvoices();
        }
      } else {
        result = await createInvoice(payload);

        if (onShowToast) {
          onShowToast(
            isDraft ? 'Draft Saved' : 'Invoice Saved Successfully',
            `${result.invoiceNumber} · ₹${result.grandTotal.toLocaleString('en-IN')} (Paid: ₹${result.paid.toLocaleString('en-IN')}, Due: ₹${result.due.toLocaleString('en-IN')})`,
            'success'
          );
        }
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
      customerName: selectedCustomer?.name || 'Cash Customer',
      customerPhone: selectedCustomer?.phone,
      customerAddress: selectedCustomer?.address || undefined,
      saleType: selectedCustomer ? saleType : (saleType === 'WHOLESALE' ? 'CASH' : saleType),
      invoiceDate,
      dueDate,
      items,
      invoiceDiscount,
      invoiceTax,
      payments,
      trayIssued: 0,
      trayReturned: 0,
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
    setNotes(d.notes);
    removeHeldInvoice(held.id);

    if (onShowToast) {
      onShowToast('Invoice Restored', `Restored cart for ${held.customerName}.`, 'success');
    }
  };

  return (
    <div className="space-y-2 pb-6">
      <InvoiceActions
        invoiceNumber={editingInvoice ? editingInvoice.invoiceNumber : nextInvoiceNumber}
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
        isSaving={isCreating || isUpdating}
        isEditing={!!editingInvoice}
        onCancelEdit={() => {
          handleReset();
        }}
      />

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: Items Table with In-Table Fast Product Entry (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          <BillingItemsTable
            items={items}
            availableUnits={units}
            onUpdateItem={handleUpdateItem}
            onRemoveItem={handleRemoveItem}
            onSelectProduct={handleSelectProduct}
            saleType={saleType}
          />
        </div>

        {/* RIGHT COLUMN: Customer + Previous Due + Payments + Totals (5 cols on lg) */}
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
              disabled={isCreating || isUpdating}
              onClick={() => handleSaveInvoice(false, false)}
              className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>
                {editingInvoice
                  ? isUpdating
                    ? 'Updating Invoice...'
                    : 'Update Invoice'
                  : isCreating
                  ? 'Processing...'
                  : 'Confirm & Save Invoice'}
              </span>
              <kbd className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                F8
              </kbd>
            </button>

            <button
              type="button"
              disabled={isCreating || isUpdating}
              onClick={() => handleSaveInvoice(true, false)}
              className="py-3 px-5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>
                {editingInvoice
                  ? isUpdating
                    ? 'Updating...'
                    : 'Update & Print'
                  : 'Save & Print'}
              </span>
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
