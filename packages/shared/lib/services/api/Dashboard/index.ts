import { apiEndpoints } from '../../endpoints.js';
import { httpService } from '../../httpService.js';
import { DTOOverviewSchema } from '../../schemas/index.js';
import type { DTOOverviewResponse } from '../../schemas/index.js';

const { dashboard } = apiEndpoints;

export const getDashboardOverview = (): Promise<DTOOverviewResponse> =>
  httpService.get(dashboard.overview, { schema: DTOOverviewSchema });
