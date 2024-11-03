import { apiEndpoints } from '../../endpoints';
import { httpService } from '../../httpService';
import type { DTOOverview } from '../../types/dashboard';

const {
  auth: {
    dashboard: { overview },
  },
} = apiEndpoints;

export const getDashboardOverview = (): Promise<DTOOverview> => httpService.get(overview);
