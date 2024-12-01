import { authStorage, positionStorage, profileStrorage, type DTOProfileFillingForm } from '@extension/storage';
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
  if (!url) return false;

  // Handle relative URLs by prepending the current origin
  if (url.startsWith('/')) {
    url = window.location.origin + url;
  }

  try {
    new URL(url);
    return true;
  } catch (_) {
    try {
      // Try adding https:// if no protocol is specified
      new URL(`https://${url}`);
      return true;
    } catch (_) {
      return false;
    }
  }
};

export const formatToK = (number: number): string => {
  if (number >= 1000) {
    const thousands = number / 1000;
    return thousands % 1 === 0 ? `${thousands.toFixed(0)}k` : `${thousands.toFixed(1)}k`;
  }
  return number.toString();
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
    baseURL: 'https://dev.filliny-app.pages.dev',
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

export const getConfig = (webappEnv?: WebappEnvs): ConfigEntry => {
  // Get env from import.meta.env or fallback to LOCAL
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const importMeta = (globalThis as any).import?.meta;
  const env = (importMeta?.env?.VITE_WEBAPP_ENV as WebappEnvs) || WebappEnvs.LOCAL;
  return config[webappEnv || env];
};

const handleAuthTokenChanged = (
  envConfig: ReturnType<typeof getConfig>,
  sendResponse: (response: GetAuthTokenResponse) => void,
) => {
  // Get auth token from cookie
  chrome.cookies.get(
    {
      url: envConfig.baseURL,
      name: envConfig.cookieName,
    },
    cookie => {
      const token = cookie ? cookie.value : null;

      // Send response back
      sendResponse({
        success: { token },
      });
    },
  );
  return true; // Keep message channel open for async response
};

export const handleAction = (
  request: Request,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: GetAuthTokenResponse | ErrorResponse) => void,
): boolean => {
  const envConfig = getConfig();

  switch (request.action) {
    case BackgroundActions.GET_AUTH_TOKEN:
      handleGetAuthToken(envConfig, sendResponse);
      return true;

    case BackgroundActions.AUTH_TOKEN_CHANGED:
      handleAuthTokenChanged(envConfig, sendResponse);
      return true;

    default:
      sendResponse({ error: { error: 'Invalid action' } });
      return false;
  }
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

// Add a new function to listen for cookie changes
export const setupAuthTokenListener = (webappEnv?: WebappEnvs) => {
  const envConfig = getConfig(webappEnv);

  // Listen for changes to the specific cookie
  chrome.cookies.onChanged.addListener(changeInfo => {
    const { cookie } = changeInfo;

    if (cookie.domain === new URL(envConfig.baseURL).hostname && cookie.name === envConfig.cookieName) {
      // Handle the cookie change
      handleGetAuthToken(envConfig, response => {
        // Broadcast the change to all extension contexts
        chrome.runtime.sendMessage({
          action: BackgroundActions.AUTH_TOKEN_CHANGED,
          payload: response,
        });
      });
    }
  });
};

export const clearUserStorage = () => {
  authStorage.deleteToken();
  positionStorage.resetPosition();
  profileStrorage.resetDefaultProfile();
};
