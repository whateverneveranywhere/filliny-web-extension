import { authHealthCheckService } from '../../services/api/Auth/index.js';
import { authStorage } from '@extension/storage';
import { useQuery } from '@tanstack/react-query';

export const useAuthHealthCheckQuery = () =>
  useQuery({
    queryKey: ['healthCheck'],
    queryFn: authHealthCheckService,
    // Add caching configuration to prevent excessive health check requests
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    meta: {
      onError: () => {
        authStorage.deleteToken();
        console.error('Auth health check failed. Token deleted.');
      },
    },
  });
