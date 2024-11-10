import { useQuery } from '@tanstack/react-query';
import { authHealthCheckService } from '../../services';
import { authStorage } from '@extension/storage';
import { useEffect } from 'react';

export const useAuthHealthCheckQuery = () => {
  const queryResult = useQuery({
    queryKey: ['healthCheck'],
    queryFn: authHealthCheckService,
  });

  // Handle error by deleting the token if there is an error
  useEffect(() => {
    if (queryResult.isError) {
      authStorage.deleteToken();
      console.error('Auth health check failed. Token deleted.');
    }
  }, [queryResult.isError]);

  return queryResult;
};
