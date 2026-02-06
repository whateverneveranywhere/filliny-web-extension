import { authHealthCheckService } from '../../services/api/Auth/index.js';
import { queryKeys } from '../queryKeys.js';
import { authStorage } from '@extension/storage';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch auth health check data
 *
 * @param enabled - Whether the query should be enabled (default: false)
 *                  Only set to true when user is confirmed authenticated to prevent 401 errors
 */
export const useAuthHealthCheckQuery = (enabled: boolean = false) =>
  useQuery({
    queryKey: queryKeys.auth.healthCheck(),
    queryFn: authHealthCheckService,
    // Only run query when enabled (user is authenticated)
    enabled,
    // Add caching configuration to prevent excessive health check requests
    staleTime: 30 * 1000, // 30 seconds - extension needs reasonably fresh data
    gcTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true, // Refetch when user returns to extension
    refetchOnMount: true,
    retry: false, // Don't retry on 401 - user likely isn't authenticated
    meta: {
      onError: () => {
        authStorage.deleteToken();
        console.error('Auth health check failed. Token deleted.');
      },
    },
  });
