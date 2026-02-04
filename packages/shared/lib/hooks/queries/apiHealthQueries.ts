import { publicHealthCheckService } from '../../services/api/Auth/index.js';
import { queryKeys } from '../queryKeys.js';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to check if the API server is reachable
 *
 * This is a PUBLIC health check that does NOT require authentication.
 * Use this to verify API availability before attempting authenticated requests.
 *
 * When the API is down:
 * - isError will be true
 * - error will contain the network error details
 * - The app should show a blocking error state
 */
export const useApiHealthCheck = () =>
  useQuery({
    queryKey: queryKeys.system.apiHealth(),
    queryFn: publicHealthCheckService,
    // Retry a few times before showing error
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
    // Cache for 2 minutes - don't spam health checks
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    // Don't refetch on focus - only when explicitly needed
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    meta: {
      errorMessage: 'Unable to connect to servers',
    },
  });
