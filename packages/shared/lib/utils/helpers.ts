import { BackgroundActions } from './types.js';
import { isValidUrl } from '../services/schemas/index.js';
import { WebappEnvs } from '../types/enums.js';
import { authStorage, positionStorage, profileStorage } from '@extension/storage';
import type { ErrorResponse, GetAuthTokenResponse, Request, ExcludeValuesFromBaseArrayType } from './types.js';
import type { DTOProfileFillingForm } from '@extension/storage';

// Re-export isValidUrl from schemas so it's accessible via utils
export { isValidUrl };

const getFaviconUrl = (url: string) => `https://www.google.com/s2/favicons?sz=64&domain_url=${url}`;

const cleanUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (error) {
    console.error('Invalid URL:', error);
    return '';
  }
};

const formatToK = (number: number): string => {
  if (number >= 1000) {
    const thousands = number / 1000;
    return thousands % 1 === 0 ? `${thousands.toFixed(0)}k` : `${thousands.toFixed(1)}k`;
  }
  return number.toString();
};

const getMatchingWebsite = (websites: DTOProfileFillingForm['fillingWebsites'], currentUrl: string) => {
  if (!isValidUrl(currentUrl)) {
    return null;
  }

  const currentUrlObj = new URL(currentUrl);

  const match =
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
    }) || null;

  return match;
};

// Interface for config entries
interface ConfigEntry {
  cookieName: string;
  baseURL: string;
  webappEnv: WebappEnvs;
}

/**
 * Extended global interface for environment caching and runtime environment access
 * These are defined separately to avoid polluting the global namespace with 'any' types
 */
interface ExtendedGlobalThis {
  __CACHED_ENV_CONFIG__?: ConfigEntry;
  process?: {
    env?: {
      NODE_ENV?: string;
      CLI_CEB_DEV?: string;
      VITE_WEBAPP_ENV?: string;
    };
  };
  import?: {
    meta?: {
      env?: {
        VITE_WEBAPP_ENV?: string;
      };
    };
  };
}

/**
 * Vite environment interface for build-time variable replacement
 */
interface ViteImportMeta {
  env?: {
    VITE_WEBAPP_ENV?: WebappEnvs;
  };
}

// Typed config object
const config: Record<WebappEnvs, ConfigEntry> = {
  dev: {
    cookieName: 'authjs.session-token',
    baseURL: 'http://localhost:5173',
    webappEnv: WebappEnvs.DEV,
  },
  preview: {
    cookieName: '__Secure-authjs.session-token',
    baseURL: 'https://dev.filliny-app.pages.dev',
    webappEnv: WebappEnvs.PREVIEW,
  },
  prod: {
    cookieName: '__Secure-authjs.session-token',
    baseURL: 'https://filliny.io',
    webappEnv: WebappEnvs.PROD,
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

// Define a constant with the build-time environment that will be embedded in the built code
// This value is replaced at build time by Vite with the actual environment
//
// IMPORTANT: In Vite, import.meta.env.VITE_* variables are statically replaced during build
// and the replacement happens before TypeScript compilation.
const VITE_WEBAPP_ENV = (import.meta as ViteImportMeta).env?.VITE_WEBAPP_ENV;
console.log('Build-time VITE_WEBAPP_ENV:', VITE_WEBAPP_ENV);

const getConfig = (): ConfigEntry => {
  // Get cached environment from memory to avoid repeated calculations
  const extendedGlobal = globalThis as unknown as ExtendedGlobalThis;
  if (extendedGlobal.__CACHED_ENV_CONFIG__) {
    console.log('Using cached config:', extendedGlobal.__CACHED_ENV_CONFIG__.baseURL);
    return extendedGlobal.__CACHED_ENV_CONFIG__;
  }

  console.log('getConfig called - determining environment');

  try {
    // First, try to use the build-time environment variable from Vite
    // This will be statically replaced during build, so we need to check if it exists
    if (VITE_WEBAPP_ENV && Object.values(WebappEnvs).includes(VITE_WEBAPP_ENV)) {
      console.log('Using build-time environment:', VITE_WEBAPP_ENV);
      const envConfig = config[VITE_WEBAPP_ENV];
      extendedGlobal.__CACHED_ENV_CONFIG__ = envConfig;
      return envConfig;
    }

    // Try to get from extension storage if available
    if (typeof chrome !== 'undefined' && chrome.storage) {
      // Check if we have a cached value from sessionStorage
      if (typeof sessionStorage !== 'undefined') {
        const cachedEnv = sessionStorage.getItem('filliny_webapp_env');
        if (cachedEnv && Object.values(WebappEnvs).includes(cachedEnv as WebappEnvs)) {
          console.log('Using environment from sessionStorage:', cachedEnv);
          const envConfig = config[cachedEnv as WebappEnvs];
          extendedGlobal.__CACHED_ENV_CONFIG__ = envConfig;
          return envConfig;
        }
      }

      // For async settings, still set sessionStorage for next time
      // but don't halt execution waiting for results
      chrome.storage.local.get('webapp_env', result => {
        if (result.webapp_env && Object.values(WebappEnvs).includes(result.webapp_env as WebappEnvs)) {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('filliny_webapp_env', result.webapp_env);
            console.log('Updated sessionStorage with environment from chrome.storage:', result.webapp_env);
          }
        }
      });
    }

    // Access process.env for any other environment checks
    const processEnv = extendedGlobal.process?.env;

    // Try Vite's import.meta.env (works in development)
    const importMeta = extendedGlobal.import?.meta;
    const viteEnv = importMeta?.env?.VITE_WEBAPP_ENV;
    if (viteEnv && Object.values(WebappEnvs).includes(viteEnv as WebappEnvs)) {
      console.log('Using environment from import.meta.env:', viteEnv);
      const envConfig = config[viteEnv as WebappEnvs];
      extendedGlobal.__CACHED_ENV_CONFIG__ = envConfig;
      return envConfig;
    }

    // Development indicators - this section should only run if no explicit env is set

    // Check if CLI_CEB_DEV flag is set to true
    if (processEnv?.CLI_CEB_DEV === 'true') {
      console.log('Using DEV environment because CLI_CEB_DEV is true');
      const envConfig = config[WebappEnvs.DEV];
      extendedGlobal.__CACHED_ENV_CONFIG__ = envConfig;
      return envConfig;
    }

    // Check hostname (for local development)
    if (typeof window !== 'undefined') {
      try {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          console.log('Using DEV environment based on hostname:', hostname);
          const envConfig = config[WebappEnvs.DEV];
          extendedGlobal.__CACHED_ENV_CONFIG__ = envConfig;
          return envConfig;
        }
      } catch {
        // Ignore window errors
      }
    }

    // Check NODE_ENV
    if (processEnv?.NODE_ENV === 'development') {
      console.log("Using DEV environment because NODE_ENV is 'development'");
      const envConfig = config[WebappEnvs.DEV];
      extendedGlobal.__CACHED_ENV_CONFIG__ = envConfig;
      return envConfig;
    }

    // Last resort - assume production for non-development environments
    // This ensures production is used when no other indicators are present
    if (processEnv?.NODE_ENV !== 'development' && processEnv?.CLI_CEB_DEV !== 'true') {
      console.log('Using PROD environment (no development indicators present)');
      const envConfig = config[WebappEnvs.PROD];
      extendedGlobal.__CACHED_ENV_CONFIG__ = envConfig;
      return envConfig;
    }
  } catch (error) {
    console.error('Error determining environment:', error);
  }

  // Default to DEV as last resort
  console.log('Defaulting to DEV environment');
  const defaultConfig = config[WebappEnvs.DEV];
  extendedGlobal.__CACHED_ENV_CONFIG__ = defaultConfig;
  return defaultConfig;
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

const handleAction = (
  request: Request,
  _sender: chrome.runtime.MessageSender,
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

const getCurrentVistingUrl = (): Promise<string> =>
  new Promise((resolve, reject) => {
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

// Add a new function to listen for cookie changes
const setupAuthTokenListener = () => {
  const envConfig = getConfig();

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

const clearUserStorage = () => {
  authStorage.deleteToken();
  positionStorage.resetPosition();
  profileStorage.resetDefaultProfile();
};

const excludeValuesFromBaseArray = <B extends string[], E extends (string | number)[]>(baseArray: B, excludeArray: E) =>
  baseArray.filter(value => !excludeArray.includes(value)) as ExcludeValuesFromBaseArrayType<B, E>;

const sleep = async (time: number) => new Promise(r => setTimeout(r, time));

// All exports at end of file
export {
  getFaviconUrl,
  cleanUrl,
  formatToK,
  getMatchingWebsite,
  getConfig,
  handleAction,
  getCurrentVistingUrl,
  setupAuthTokenListener,
  clearUserStorage,
  excludeValuesFromBaseArray,
  sleep,
};
