import { useAuthHealthCheckQuery } from './authQueries';

export const usePlanLimits = () => {
  const { data: healthCheck } = useAuthHealthCheckQuery();

  const currentPlan = healthCheck?.limitations?.plan?.planName || 'Free';
  const maxWebsites = healthCheck?.limitations?.maxWebsitesPerProfile || 0;

  const hasReachedLimit = (websitesCount: number) => websitesCount >= maxWebsites;

  return {
    currentPlan,
    maxWebsites,
    hasReachedLimit,
    isLoading: healthCheck === undefined,
  };
};
