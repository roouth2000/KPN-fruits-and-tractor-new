export type SaleType = 'WHOLESALE' | 'RETAIL' | 'CASH' | 'CREDIT';
export type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'RETURNED';
export type PaymentMode = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';

export interface Customer {
  id: number;
  customerCode: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  gstin?: string | null;
  customerType: 'REGULAR' | 'WHOLESALE' | 'WALK_IN';
  creditLimit: number | string;
  openingBalance: number | string;
  currentDue: number | string;
  outstandingTrays: number;
  isActive: boolean;
  notes?: string | null;
}

export interface CustomerBalanceInfo {
  customerId: number;
  customerCode: string;
  name: string;
  phone: string;
  address?: string | null;
  city?: string | null;
  customerType: 'REGULAR' | 'WHOLESALE' | 'WALK_IN';
  creditLimit: number;
  previousDue: number;
  availableCredit: number;
  outstandingTrays: number;
}

export interface Product {
  id: number;
  productCode: string;
  barcode?: string | null;
  name: string;
  variety: string;
  grade: string;
  batchNumber?: string | null;
  defaultUnit: string;
  baseUnit: string;
  conversionFactor: number | string;
  wholesaleRate: number | string;
  retailRate: number | string;
  purchaseRate: number | string;
  currentStock: number | string;
  minStockLevel: number | string;
  isTrayRequired: boolean;
  trayType?: string | null;
  isActive: boolean;
}

export interface Unit {
  id: number;
  code: string;
  name: string;
  symbol: string;
  isBaseUnit: boolean;
  conversionFactor: number | string;
}

export interface TaxConfig {
  id: number;
  name: string;
  ratePercentage: number | string;
  isInclusive: boolean;
  isExempt: boolean;
  isActive: boolean;
}

export interface Supplier {
  id: number;
  supplierCode: string;
  name: string;
  phone: string;
  email?: string | null;
  city?: string | null;
  address?: string | null;
  currentDue?: number | string;
  isActive?: boolean;
}

export interface Batch {
  id: number;
  batchNumber: string;
  productId: number;
  supplierId: number | null;
  supplier?: {
    id: number;
    name: string;
    supplierCode: string;
    city?: string | null;
  };
  purchaseDate: string;
  initialQuantity: number;
  currentQuantity: number;
  unit: string;
  purchaseRate: number;
  status: 'ACTIVE' | 'DEPLETED' | 'EXPIRED';
  notes?: string | null;
}

export interface InvoiceItemBatch {
  id: number;
  invoiceId: number;
  invoiceItemId: number;
  batchId: number;
  productId: number;
  supplierId: number | null;
  supplier?: {
    id: number;
    name: string;
    supplierCode: string;
    city?: string | null;
  };
  batch?: {
    id: number;
    batchNumber: string;
    purchaseDate: string;
    purchaseRate: number;
    unit: string;
  };
  quantity: number;
  unit: string;
  purchaseRate: number;
  saleRate: number;
  allocatedDate: string;
}

export interface BillingItem {
  id: string; // client temporary row id
  productId: number;
  productName: string;
  variety: string;
  grade: string;
  batchNumber?: string;
  unit: string;
  baseUnit: string;
  conversionFactor: number;
  quantity: number;
  baseQuantity: number;
  rate: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  trayQuantity: number;
  currentStock: number;
}

export interface PaymentEntry {
  method: PaymentMode;
  amount: number;
  transactionRef?: string;
}

export interface BillingFormData {
  customerId: number | null;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  saleType: SaleType;
  invoiceDate: string;
  dueDate: string;
  items: BillingItem[];
  invoiceDiscount: number;
  invoiceTax: number;
  payments: PaymentEntry[];
  trayIssued: number;
  trayReturned: number;
  notes: string;
  status: InvoiceStatus;
}

export interface HeldInvoice {
  id: string;
  timestamp: string;
  customerName: string;
  itemCount: number;
  totalAmount: number;
  data: BillingFormData;
}

export interface CreateInvoiceResponse {
  success: boolean;
  invoiceId: number;
  invoiceNumber: string;
  grandTotal: number;
  subtotal: number;
  discount: number;
  tax: number;
  previousDue: number;
  totalPayable: number;
  paid: number;
  due: number;
  status: InvoiceStatus;
  customerName: string;
  invoice: any;
}

