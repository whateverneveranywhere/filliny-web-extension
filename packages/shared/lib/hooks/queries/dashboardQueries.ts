import { useQuery } from '@tanstack/react-query';
import { getDashboardOverview } from '../../services/api/Dashboard';

export const useDashboardOverview = () =>
  useQuery({
    queryKey: ['overview'],
    queryFn: getDashboardOverview,
  });
