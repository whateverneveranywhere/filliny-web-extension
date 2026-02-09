import { apiEndpoints } from '../../endpoints.js';
import { httpService } from '../../httpService.js';
import type { AuthHealthCheckResponse, PublicHealthCheckResponse } from '../../schemas/index.js';

const {
  healthCheck,
  publicHealth,
  // auth: { healthCheck },
} = apiEndpoints;

export const authHealthCheckService = (): Promise<AuthHealthCheckResponse> => httpService.get(healthCheck);

/**
 * Public API health check - does not require authentication
 * Used to verify if the API server is reachable before attempting other requests
 */
export const publicHealthCheckService = (): Promise<PublicHealthCheckResponse> => httpService.get(publicHealth);
