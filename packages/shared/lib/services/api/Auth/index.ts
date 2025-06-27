import { apiEndpoints } from "../../endpoints.js";
import { httpService } from "../../httpService.js";
import type { AuthHealthCheck } from "../../types/auth.js";

const {
  healthCheck,
  // auth: { healthCheck },
} = apiEndpoints;

export const authHealthCheckService = (): Promise<AuthHealthCheck> => httpService.get(healthCheck);
