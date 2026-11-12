import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '../services/salesApi';
import type { Customer } from '../types/billing';

export function useCustomerSearch(initialQuery = '') {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [debouncedTerm, setDebouncedTerm] = useState(initialQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const query = useQuery({
    queryKey: ['customers', 'search', debouncedTerm],
    queryFn: () => salesApi.searchCustomers(debouncedTerm),
    staleTime: 30000,
  });

  return {
    searchTerm,
    setSearchTerm,
    customers: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}

export function useCustomerBalance(customerId: number | null) {
  return useQuery({
    queryKey: ['customers', customerId, 'balance'],
    queryFn: () => (customerId ? salesApi.getCustomerBalance(customerId) : null),
    enabled: !!customerId,
    staleTime: 10000,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newCust: Partial<Customer>) => salesApi.createCustomer(newCust),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

