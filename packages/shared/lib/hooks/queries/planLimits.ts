import { useAuthHealthCheckQuery } from './authQueries.js';
import type { AuthHealthCheck } from '../../services/types/auth.js';

export const usePlanLimits = () => {
  const { data: healthCheck } = useAuthHealthCheckQuery();

  const currentPlan = (healthCheck as AuthHealthCheck)?.limitations?.plan?.planName || 'Free';
  const maxWebsites = (healthCheck as AuthHealthCheck)?.limitations?.maxWebsitesPerProfile || 0;

  const hasReachedLimit = (websitesCount: number) => websitesCount >= maxWebsites;

  return {
    currentPlan,
    maxWebsites,
    hasReachedLimit,
    isLoading: healthCheck === undefined,
  };
};
