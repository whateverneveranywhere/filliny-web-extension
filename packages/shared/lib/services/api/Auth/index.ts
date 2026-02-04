import { apiEndpoints } from '../../endpoints.js';
import { httpService } from '../../httpService.js';
import type { PublicHealthCheckResponse } from '../../schemas/index.js';
import type { AuthHealthCheck } from '../../types/auth.js';

const {
  healthCheck,
  publicHealth,
  // auth: { healthCheck },
} = apiEndpoints;

export const authHealthCheckService = (): Promise<AuthHealthCheck> => httpService.get(healthCheck);

/**
 * Public API health check - does not require authentication
 * Used to verify if the API server is reachable before attempting other requests
 */
export const publicHealthCheckService = (): Promise<PublicHealthCheckResponse> => httpService.get(publicHealth);
