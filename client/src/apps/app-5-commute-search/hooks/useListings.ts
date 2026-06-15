import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { SearchFilters, ListingWithCommute } from '../lib/types';
import { searchListings } from '../lib/api';

interface UseListingsReturn {
  listings: ListingWithCommute[];
  total: number;
  pages: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  sourcesUnavailable: string[];
}

export function useListings(filters: SearchFilters): UseListingsReturn {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['listings', filters],
    queryFn: () => searchListings(filters),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled:
      filters.destination_lat !== null &&
      filters.destination_lng !== null &&
      filters.destination_label !== '',
  });

  return {
    listings: data?.listings ?? [],
    total: data?.total ?? 0,
    pages: data?.pages ?? 0,
    isLoading,
    isError,
    error: error as Error | null,
    sourcesUnavailable: data?.sources_unavailable ?? [],
  };
}
