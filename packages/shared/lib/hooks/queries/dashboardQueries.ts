import { getDashboardOverview } from '../../services/api/Dashboard/index.js';
import { queryKeys } from '../queryKeys.js';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch dashboard overview data
 *
 * @param enabled - Whether the query should be enabled (default: true)
 *                  Pass false when user is not authenticated to prevent 401 errors
 */
export const useDashboardOverview = (enabled: boolean = true) =>
  useQuery({
    queryKey: queryKeys.dashboard.overview(),
    queryFn: getDashboardOverview,
    // Only run query when enabled (user is authenticated)
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - dashboard data can be cached for a bit
    refetchOnWindowFocus: false, // Prevent unnecessary refetches in extension context
    retry: false, // Don't retry on 401 - user likely isn't authenticated
    meta: {
      errorMessage: 'Failed to fetch dashboard overview',
    },
  });
