import { getDashboardOverview } from '../../services/api/Dashboard/index.js';
import { queryKeys } from '../queryKeys.js';
import { useQuery } from '@tanstack/react-query';

export const useDashboardOverview = () =>
  useQuery({
    queryKey: queryKeys.dashboard.overview(),
    queryFn: getDashboardOverview,
    staleTime: 5 * 60 * 1000, // 5 minutes - dashboard data can be cached for a bit
    refetchOnWindowFocus: false, // Prevent unnecessary refetches in extension context
    meta: {
      errorMessage: 'Failed to fetch dashboard overview',
    },
  });
