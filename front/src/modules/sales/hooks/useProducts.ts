import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { salesApi } from '../services/salesApi';

export function useProductSearch(initialQuery = '') {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [debouncedTerm, setDebouncedTerm] = useState(initialQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 200);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const query = useQuery({
    queryKey: ['products', 'search', debouncedTerm],
    queryFn: () => salesApi.searchProducts(debouncedTerm),
    staleTime: 30000,
  });

  return {
    searchTerm,
    setSearchTerm,
    products: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}

export function useUnits() {
  return useQuery({
    queryKey: ['units'],
    queryFn: () => salesApi.getUnits(),
    staleTime: 60000,
  });
}

export function useTaxConfigs() {
  return useQuery({
    queryKey: ['tax-configs'],
    queryFn: () => salesApi.getTaxConfigs(),
    staleTime: 60000,
  });
}

