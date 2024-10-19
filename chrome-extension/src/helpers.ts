import { WebappEnvs } from '@extension/shared';
import { BackgroundActions, type ErrorResponse, type GetAuthTokenResponse, type Request } from './types/actions';

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

const handleGetAuthToken = (
  envConfig: { baseURL: string; cookieName: string },
  sendResponse: (response: GetAuthTokenResponse) => void,
) => {
  chrome.cookies.get({ url: envConfig.baseURL, name: envConfig.cookieName }, cookie => {
    sendResponse({
      success: { token: cookie ? cookie.value : null },
    });
  });
};

export const getConfig = (webappEnv: WebappEnvs = WebappEnvs.LOCAL): ConfigEntry => {
  return config[webappEnv];
};

export const handleAction = (
  request: Request,
  sendResponse: (response: GetAuthTokenResponse | ErrorResponse) => void,
): boolean => {
  const envConfig = getConfig();

  switch (request.action) {
    case BackgroundActions.GET_AUTH_TOKEN:
      handleGetAuthToken(envConfig, sendResponse);
      return true; // Keep the message channel open for sendResponse

    default:
      sendResponse({ error: { error: 'Invalid action' } }); // Error follows ErrorResponse structure
      return false;
  }
};
