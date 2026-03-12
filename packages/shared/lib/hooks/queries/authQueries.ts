import { authHealthCheckService } from '../../services/api/Auth/index.js';
import { queryKeys } from '../queryKeys.js';
import { authStorage } from '@extension/storage';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch auth health check data.
 *
 * Serves as the single startup check for the extension:
 * - 200 → API up + authenticated
 * - 401 → API up + not authenticated (httpService auto-clears token)
 * - Network error → API down
 *
 * Retries on network errors but not on 401s (auth failures).
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
    // Global default is false — correct for extension side panels where focus
    // events fire excessively and cause cascading refetch loops
    refetchOnMount: true,
    // Retry network errors (API down) but not auth errors (401)
    retry: (failureCount, error) => {
      // Don't retry auth errors - httpService already clears the token
      if (error?.name === 'ApiUnauthorizedError') return false;
      // Retry network/server errors up to 2 times
      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
    meta: {
      onError: () => {
        authStorage.deleteToken();
        // Also clear bearer_token to prevent stale token from being reused
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          chrome.storage.local.remove('bearer_token');
        }
        console.error('Auth health check failed. Token deleted.');
      },
    },
  });
