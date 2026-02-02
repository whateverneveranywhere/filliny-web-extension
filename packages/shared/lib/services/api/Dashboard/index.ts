import { apiEndpoints } from '../../endpoints.js';
import { httpService } from '../../httpService.js';
import type { DTOOverview } from '../../types/dashboard.js';

const {
  auth: {
    dashboard: { overview },
  },
} = apiEndpoints;

export const getDashboardOverview = (): Promise<DTOOverview> => httpService.get(overview);
