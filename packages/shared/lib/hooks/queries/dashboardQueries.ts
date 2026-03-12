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
    gcTime: 60 * 1000, // 1 minute - don't retain stale usage data
    // Global default is false — correct for extension side panels where focus
    // events fire excessively and cause cascading refetch loops
    retry: false, // Don't retry on 401 - user likely isn't authenticated
    meta: {
      errorMessage: 'Failed to fetch dashboard overview',
    },
  });
