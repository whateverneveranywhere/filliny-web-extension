import { apiEndpoints } from '../../endpoints.js';
import { httpService } from '../../httpService.js';
import { AuthHealthCheckSchema } from '../../schemas/index.js';
import type { AuthHealthCheckResponse } from '../../schemas/index.js';

const { healthCheck } = apiEndpoints;

export const authHealthCheckService = (): Promise<AuthHealthCheckResponse> =>
  httpService.get(healthCheck, { schema: AuthHealthCheckSchema });
