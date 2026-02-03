import { apiEndpoints } from '../../endpoints.js';
import { httpService } from '../../httpService.js';
import type { DTOOverview } from '../../types/dashboard.js';

const { dashboard } = apiEndpoints;

export const getDashboardOverview = (): Promise<DTOOverview> => httpService.get(dashboard.overview);
