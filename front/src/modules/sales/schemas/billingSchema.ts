import { z } from 'zod';

export const billingItemSchema = z.object({
  id: z.string(),
  productId: z.number().positive('Product selection is required'),
  productName: z.string().min(1, 'Product name is required'),
  variety: z.string(),
  grade: z.string(),
  batchNumber: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  baseUnit: z.string(),
  conversionFactor: z.number().positive(),
  quantity: z.number().positive('Quantity must be greater than zero'),
  baseQuantity: z.number(),
  rate: z.number().nonnegative('Rate cannot be negative'),
  discount: z.number().nonnegative('Discount cannot be negative'),
  taxRate: z.number().nonnegative(),
  taxAmount: z.number().nonnegative(),
  totalAmount: z.number().nonnegative(),
  trayQuantity: z.number().nonnegative(),
  currentStock: z.number(),
});

export const paymentEntrySchema = z.object({
  method: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE']),
  amount: z.number().positive('Payment amount must be greater than zero'),
  transactionRef: z.string().optional(),
});

export const billingFormSchema = z.object({
  customerId: z.number().nullable().refine((val) => val !== null && val > 0, {
    message: 'Please select a customer or Walk-in Cash Customer',
  }),
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  saleType: z.enum(['WHOLESALE', 'RETAIL', 'CASH', 'CREDIT']),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  items: z.array(billingItemSchema).refine((items) => items.length > 0, {
    message: 'Please add at least one product to the invoice',
  }),
  invoiceDiscount: z.number().nonnegative('Discount cannot be negative'),
  invoiceTax: z.number().nonnegative('Tax cannot be negative'),
  payments: z.array(paymentEntrySchema),
  trayIssued: z.number().int().nonnegative(),
  trayReturned: z.number().int().nonnegative(),
  notes: z.string().optional(),
  status: z.enum(['DRAFT', 'CONFIRMED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'RETURNED']),
});

export type BillingFormValues = z.infer<typeof billingFormSchema>;

