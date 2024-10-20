import { useQuery } from '@tanstack/react-query';
import { authHealthCheckService } from '../../services';

export const useAuthHealthCheckQuery = () =>
  useQuery({
    queryKey: ['healthCheck'],
    queryFn: authHealthCheckService,
  });
