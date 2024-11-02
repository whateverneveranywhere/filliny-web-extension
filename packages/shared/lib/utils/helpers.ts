import type { DTOProfileFillingForm } from '@extension/storage';
import type { ErrorResponse, GetAuthTokenResponse, Request } from './shared-types';
import { BackgroundActions, WebappEnvs } from './shared-types';

export const getFaviconUrl = (url: string) => {
  return `https://www.google.com/s2/favicons?sz=64&domain_url=${url}`;
};

export const cleanUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (error) {
    console.error('Invalid URL:', error);
    return '';
  }
};

export const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
};

export const getMatchingWebsite = (websites: DTOProfileFillingForm['fillingWebsites'], currentUrl: string) => {
  if (!isValidUrl(currentUrl)) {
    return null;
  }

  const currentUrlObj = new URL(currentUrl);

  return (
    websites.find(({ websiteUrl, isRootLoad }) => {
      if (!isValidUrl(websiteUrl)) {
        return false;
      }

      const websiteUrlObj = new URL(websiteUrl);

      if (isRootLoad) {
        // Check if subdomain or main domain matches
        return websiteUrlObj.hostname === currentUrlObj.hostname;
      } else {
        // Check if the paths match (excluding query parameters)
        return websiteUrlObj.origin === currentUrlObj.origin && websiteUrlObj.pathname === currentUrlObj.pathname;
      }
    }) || null
  );
};

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
  const getFromConfig = { url: envConfig.baseURL, name: envConfig.cookieName };

  chrome.cookies.get(getFromConfig, cookie => {
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
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: GetAuthTokenResponse | ErrorResponse) => void,
): boolean => {
  const envConfig = getConfig();

  if (request.action === BackgroundActions.GET_AUTH_TOKEN) {
    handleGetAuthToken(envConfig, sendResponse);
    return true; // Keep the message channel open for sendResponse
  }

  sendResponse({ error: { error: 'Invalid action' } });
  return false;
};

export const getCurrentVistingUrl = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      const activeTab = tabs[0];
      if (activeTab) {
        resolve(activeTab.url || '');
      } else {
        reject('No active tab found');
      }
    });
  });
};
