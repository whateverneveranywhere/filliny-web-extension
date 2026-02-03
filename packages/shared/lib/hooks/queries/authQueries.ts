import { authHealthCheckService } from '../../services/api/Auth/index.js';
import { queryKeys } from '../queryKeys.js';
import { authStorage } from '@extension/storage';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch auth health check data
 *
 * @param enabled - Whether the query should be enabled (default: true)
 *                  Pass false when user is not authenticated to prevent 401 errors
 */
export const useAuthHealthCheckQuery = (enabled: boolean = true) =>
  useQuery({
    queryKey: queryKeys.auth.healthCheck(),
    queryFn: authHealthCheckService,
    // Only run query when enabled (user is authenticated)
    enabled,
    // Add caching configuration to prevent excessive health check requests
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false, // Don't retry on 401 - user likely isn't authenticated
    meta: {
      onError: () => {
        authStorage.deleteToken();
        console.error('Auth health check failed. Token deleted.');
      },
    },
  });
