import { apiEndpoints } from '../../endpoints';
import type { AuthHealthCheck } from './types';
import { httpService } from '../../httpService';

const {
  healthCheck,
  // auth: { healthCheck },
} = apiEndpoints;

export const authHealthCheckService = (): Promise<AuthHealthCheck> => httpService.get(healthCheck);
