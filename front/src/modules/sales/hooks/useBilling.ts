import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '../services/salesApi';
import type { HeldInvoice, BillingFormData } from '../types/billing';

const HELD_INVOICES_KEY = 'finovore_held_invoices';

export function useBilling() {
  const queryClient = useQueryClient();
  const [heldInvoices, setHeldInvoices] = useState<HeldInvoice[]>(() => {
    try {
      const stored = localStorage.getItem(HELD_INVOICES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveHeldInvoices = (list: HeldInvoice[]) => {
    setHeldInvoices(list);
    localStorage.setItem(HELD_INVOICES_KEY, JSON.stringify(list));
  };

  const holdInvoice = (formData: BillingFormData) => {
    const newHeld: HeldInvoice = {
      id: `hold-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerName: formData.customerName || 'Walk-in Customer',
      itemCount: formData.items.length,
      totalAmount: formData.items.reduce((sum, item) => sum + item.totalAmount, 0),
      data: formData,
    };
    saveHeldInvoices([newHeld, ...heldInvoices]);
    return newHeld;
  };

  const removeHeldInvoice = (id: string) => {
    const updated = heldInvoices.filter((h) => h.id !== id);
    saveHeldInvoices(updated);
  };

  const nextInvoiceQuery = useQuery({
    queryKey: ['sales', 'next-invoice-number'],
    queryFn: () => salesApi.getNextInvoiceNumber(),
    staleTime: 5000,
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (payload: any) => salesApi.createInvoice(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const collectDueMutation = useMutation({
    mutationFn: (payload: any) => salesApi.collectPreviousDue(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });

  const cancelInvoiceMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number | string; reason: string }) =>
      salesApi.cancelInvoice(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  return {
    nextInvoiceNumber: nextInvoiceQuery.data || 'INV-2026-000001',
    refetchNextNumber: nextInvoiceQuery.refetch,
    createInvoice: createInvoiceMutation.mutateAsync,
    isCreating: createInvoiceMutation.isPending,
    collectDue: collectDueMutation.mutateAsync,
    isCollecting: collectDueMutation.isPending,
    cancelInvoice: cancelInvoiceMutation.mutateAsync,
    isCancelling: cancelInvoiceMutation.isPending,
    heldInvoices,
    holdInvoice,
    removeHeldInvoice,
  };
}
