import { apiEndpoints } from '../../endpoints.js';
import type { AuthHealthCheck } from '../../types/auth.js';
import { httpService } from '../../httpService.js';

const {
  healthCheck,
  // auth: { healthCheck },
} = apiEndpoints;

export const authHealthCheckService = (): Promise<AuthHealthCheck> => httpService.get(healthCheck);
