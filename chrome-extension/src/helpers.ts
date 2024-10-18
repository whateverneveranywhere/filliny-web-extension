import { WebappEnvs } from '@extension/shared';

// Interface for config entries
interface ConfigEntry {
  cookieName: string;
  baseURL: string;
}

// Typed config object
const config: Record<WebappEnvs, ConfigEntry> = {
  local: {
    cookieName: 'authjs.session-token',
    baseURL: 'http://localhost:3000',
  },
  dev: {
    cookieName: '__Secure-authjs.session-token',
    baseURL: 'https://dev.filliny.io',
  },
  prod: {
    cookieName: '__Secure-authjs.session-token',
    baseURL: 'https://prod.filliny.io',
  },
};

// Function to get config based on environment
export const getConfig = (webappEnv: WebappEnvs = WebappEnvs.LOCAL): ConfigEntry => {
  return config[webappEnv];
};
