import { getDashboardOverview } from '../../services/api/Dashboard/index.js';
import { queryKeys } from '../queryKeys.js';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch dashboard overview data
 *
 * @param enabled - Whether the query should be enabled (default: false)
 *                  Pass true only when user is authenticated to prevent 401 errors
 */
export const useDashboardOverview = (enabled: boolean = false) =>
  useQuery({
    queryKey: queryKeys.dashboard.overview(),
    queryFn: getDashboardOverview,
    // Only run query when enabled (user is authenticated)
    enabled,
    staleTime: 15 * 1000, // 15 seconds - extension needs fresh data
    refetchOnWindowFocus: true, // Refetch when user returns to extension
    retry: false, // Don't retry on 401 - user likely isn't authenticated
    meta: {
      errorMessage: 'Failed to fetch dashboard overview',
    },
  });
