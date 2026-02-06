import { BackgroundActions } from './types.js';
import { isValidUrl } from '../services/schemas/index.js';
import { WebappEnvs, WebappEnvsSchema } from '../types/enums.js';
import { authStorage, positionStorage, profileStorage } from '@extension/storage';
import { z } from 'zod';
import type { ErrorResponse, GetAuthTokenResponse, Request, ExcludeValuesFromBaseArrayType } from './types.js';
import type { DTOProfileFillingForm } from '@extension/storage';

// Note: isValidUrl is exported from services/schemas/index.ts
// Do NOT re-export here to avoid duplicate exports

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

// ============================================================================
// Config Schemas
// ============================================================================

/**
 * Schema for config entries
 */
const ConfigEntrySchema = z.object({
  cookieName: z.string(),
  /** Web app URL for redirects and links - also where Better Auth sets cookies */
  baseURL: z.string(),
  /** API URL for making requests - always goes through the webapp proxy */
  apiURL: z.string(),
  webappEnv: WebappEnvsSchema,
});
type ConfigEntry = z.infer<typeof ConfigEntrySchema>;

/**
 * Schema for process environment
 */
const ProcessEnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  CLI_CEB_DEV: z.string().optional(),
  VITE_WEBAPP_ENV: z.string().optional(),
});

/**
 * Schema for Vite import.meta.env
 */
const ViteMetaEnvSchema = z.object({
  VITE_WEBAPP_ENV: z.string().optional(),
});

/**
 * Schema for extended global object
 * Note: Uses partial objects since these may or may not exist at runtime
 */
const _ExtendedGlobalThisSchema = z.object({
  __CACHED_ENV_CONFIG__: ConfigEntrySchema.optional(),
  process: z
    .object({
      env: ProcessEnvSchema.optional(),
    })
    .optional(),
  import: z
    .object({
      meta: z
        .object({
          env: ViteMetaEnvSchema.optional(),
        })
        .optional(),
    })
    .optional(),
});
type ExtendedGlobalThis = z.infer<typeof _ExtendedGlobalThisSchema>;

/**
 * Schema for Vite import.meta interface for build-time variable replacement
 */
const _ViteImportMetaSchema = z.object({
  env: z
    .object({
      VITE_WEBAPP_ENV: WebappEnvsSchema.optional(),
    })
    .optional(),
});
type ViteImportMeta = z.infer<typeof _ViteImportMetaSchema>;

// Typed config object
// Cookie names must match Better Auth's cookiePrefix in main app (cookiePrefix: 'filliny')
// Better Auth uses underscores in cookie names: {prefix}.session_token
// Dev uses non-secure cookies, preview/prod use __Secure- prefix
//
// IMPORTANT: Better Auth sets cookies on the FRONTEND domain (baseURL).
// All API requests go through the webapp proxy - the extension never talks to the backend directly.
const config: Record<WebappEnvs, ConfigEntry> = {
  dev: {
    cookieName: 'filliny.session_token',
    baseURL: 'http://localhost:5173',
    apiURL: 'http://localhost:5173/api/v1',
    webappEnv: WebappEnvs.DEV,
  },
  preview: {
    cookieName: '__Secure-filliny.session_token',
    baseURL: 'https://preview.filliny.io',
    apiURL: 'https://preview.filliny.io/api/v1',
    webappEnv: WebappEnvs.PREVIEW,
  },
  prod: {
    cookieName: '__Secure-filliny.session_token',
    baseURL: 'https://filliny.io',
    apiURL: 'https://filliny.io/api/v1',
    webappEnv: WebappEnvs.PROD,
  },
};

const handleGetAuthToken = (
  envConfig: { baseURL: string; cookieName: string },
  sendResponse: (response: GetAuthTokenResponse) => void,
) => {
  // Better Auth sets cookies on the FRONTEND domain (baseURL).
  const cookieConfig = { url: envConfig.baseURL, name: envConfig.cookieName };

  console.log('[Auth] Looking for cookie:', `name="${cookieConfig.name}" url="${cookieConfig.url}"`);

  chrome.cookies.get(cookieConfig, cookie => {
    if (cookie) {
      console.log(
        '[Auth] Cookie found:',
        `name="${cookie.name}", domain="${cookie.domain}", secure=${cookie.secure}, httpOnly=${cookie.httpOnly}`,
        `value="${cookie.value.substring(0, 30)}..."`,
      );
      sendResponse({
        success: { token: cookie.value },
      });
    } else {
      console.warn('[Auth] Cookie NOT found for:', `name="${cookieConfig.name}" at "${cookieConfig.url}"`);
      sendResponse({
        success: { token: null },
      });
    }
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
        if (hostname === 'localhost') {
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
  handleGetAuthToken(envConfig, sendResponse);
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

// Listen for cookie changes on the webapp domain (where Better Auth sets cookies)
const setupAuthTokenListener = () => {
  const envConfig = getConfig();
  const baseHostname = new URL(envConfig.baseURL).hostname;

  console.log(
    '[Auth] Setting up cookie listener for:',
    `hostname="${baseHostname}" cookieName="${envConfig.cookieName}"`,
  );

  // Listen for changes to the specific cookie
  // Cookie domain may include leading dot for cross-subdomain cookies (e.g., '.filliny.io')
  chrome.cookies.onChanged.addListener(changeInfo => {
    const { cookie } = changeInfo;
    const cookieDomain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;

    // Match cookie if domain matches baseURL (or subdomain cookies)
    const domainMatches =
      cookieDomain === baseHostname ||
      baseHostname.endsWith(cookieDomain) ||
      cookie.domain === `.${baseHostname.split('.').slice(-2).join('.')}`;

    if (domainMatches && cookie.name === envConfig.cookieName) {
      console.log(
        '[Auth] Cookie changed:',
        `name="${cookie.name}" domain="${cookie.domain}" action="${changeInfo.removed ? 'removed' : 'set'}"`,
      );

      // Broadcast the change to all extension contexts so UI can update
      handleGetAuthToken(envConfig, response => {
        try {
          chrome.runtime.sendMessage(
            {
              action: BackgroundActions.AUTH_TOKEN_CHANGED,
              payload: response,
            },
            () => {
              if (chrome.runtime.lastError) {
                console.warn('[Auth] Failed to broadcast token change:', chrome.runtime.lastError.message);
              } else {
                console.log('[Auth] Token change broadcasted successfully');
              }
            },
          );
        } catch (error) {
          console.error(
            '[Auth] Error broadcasting token change:',
            error instanceof Error ? error.message : 'Unknown error',
          );
        }
      });
    }
  });
};

// Check auth state from cookie on startup (no storage needed)
const syncAuthTokenFromCookie = () => {
  const envConfig = getConfig();

  handleGetAuthToken(envConfig, response => {
    const token = response.success?.token;
    if (token) {
      console.log('[Auth] Session cookie found on startup');
    } else {
      console.warn(
        '[Auth] No session cookie found on startup for:',
        `name="${envConfig.cookieName}" at "${envConfig.baseURL}"`,
      );
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
  syncAuthTokenFromCookie,
  clearUserStorage,
  excludeValuesFromBaseArray,
  sleep,
};
