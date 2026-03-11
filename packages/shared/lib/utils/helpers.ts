import { GlobalWithImportMetaSchema, GlobalWithProcessEnvSchema } from './runtime-type-guards.js';
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
 * Config entry Zod schema for each environment
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
 * Read the cached env config from globalThis with runtime validation.
 * Reads the property via bracket notation, then validates with Zod safeParse.
 * Avoids parsing globalThis itself (which has circular references).
 */
const getCachedConfig = (): ConfigEntry | undefined => {
  const cached = (globalThis as Record<string, unknown>)['__CACHED_ENV_CONFIG__'];
  if (!cached) return undefined;
  const result = ConfigEntrySchema.safeParse(cached);
  return result.success ? result.data : undefined;
};

/**
 * Write a config entry to the globalThis cache.
 * Uses bracket notation to avoid needing ambient type declarations.
 */
const setCachedConfig = (entry: ConfigEntry): void => {
  (globalThis as Record<string, unknown>)['__CACHED_ENV_CONFIG__'] = entry;
};

/**
 * Vite import.meta type for build-time variable replacement.
 * Vite statically replaces import.meta.env.VITE_* before TypeScript compilation.
 */
interface ViteImportMeta {
  env?: {
    VITE_WEBAPP_ENV?: string;
  };
}

/**
 * Read Vite build-time environment from import.meta.
 * import.meta is a language-level construct that cannot be validated with Zod,
 * so we use a typed accessor function to centralize the narrowing.
 */
const getViteBuildEnv = (): string | undefined => (import.meta as ViteImportMeta).env?.VITE_WEBAPP_ENV;

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

/**
 * Extract the raw session token from a Better Auth cookie value.
 *
 * Better Auth signed cookies have the format: `token.signature` (URL-encoded).
 * The bearer plugin accepts EITHER:
 *   (A) A raw token (no dot) — it signs server-side, always self-consistent.
 *   (B) A full signed cookie — but this path has encoding fragility between
 *       signCookieValue (standard base64 via btoa) and the bearer plugin's
 *       verification (base64urlnopad via @better-auth/utils).
 *
 * Sending only the raw token (Path A) is the most reliable approach:
 * the bearer plugin signs it itself, so signing + verification always match.
 */
const extractRawToken = (cookieValue: string): string => {
  // URL-decode first in case the value is percent-encoded (e.g. %3D for =)
  let decoded: string;
  try {
    decoded = cookieValue.includes('%') ? decodeURIComponent(cookieValue) : cookieValue;
  } catch {
    decoded = cookieValue;
  }
  // Extract the token part before the dot (the raw session token stored in DB)
  const dotIndex = decoded.indexOf('.');
  return dotIndex > 0 ? decoded.substring(0, dotIndex) : decoded;
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
      // Extract only the raw session token (before the dot/signature).
      // The bearer plugin will re-sign it server-side (Path A).
      const rawToken = extractRawToken(cookie.value);
      console.log(
        '[Auth] Cookie found:',
        `name="${cookie.name}", domain="${cookie.domain}", secure=${cookie.secure}, httpOnly=${cookie.httpOnly}`,
        `rawToken="${rawToken.substring(0, 20)}..."`,
      );
      sendResponse({
        success: { token: rawToken },
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
const VITE_WEBAPP_ENV = getViteBuildEnv();
console.log('Build-time VITE_WEBAPP_ENV:', VITE_WEBAPP_ENV);

/**
 * Parse a string as a validated WebappEnvs value.
 * Returns the parsed enum value or undefined if invalid.
 */
const parseWebappEnv = (value: string | undefined): WebappEnvs | undefined => {
  if (!value) return undefined;
  const result = WebappEnvsSchema.safeParse(value);
  return result.success ? result.data : undefined;
};

/**
 * Cache and return a config entry for the given environment.
 */
const cacheAndReturn = (env: WebappEnvs): ConfigEntry => {
  const envConfig = config[env];
  setCachedConfig(envConfig);
  return envConfig;
};

const getConfig = (): ConfigEntry => {
  // Get cached environment from memory to avoid repeated calculations
  const cached = getCachedConfig();
  if (cached) {
    console.log('Using cached config:', cached.baseURL);
    return cached;
  }

  console.log('getConfig called - determining environment');

  try {
    // First, try to use the build-time environment variable from Vite
    // This will be statically replaced during build, so we need to check if it exists
    const buildEnv = parseWebappEnv(VITE_WEBAPP_ENV);
    if (buildEnv) {
      console.log('Using build-time environment:', buildEnv);
      return cacheAndReturn(buildEnv);
    }

    // Try to get from extension storage if available
    if (typeof chrome !== 'undefined' && chrome.storage) {
      // Check if we have a cached value from sessionStorage
      if (typeof sessionStorage !== 'undefined') {
        const cachedEnv = sessionStorage.getItem('filliny_webapp_env');
        const parsedCachedEnv = parseWebappEnv(cachedEnv ?? undefined);
        if (parsedCachedEnv) {
          console.log('Using environment from sessionStorage:', parsedCachedEnv);
          return cacheAndReturn(parsedCachedEnv);
        }
      }

      // For async settings, still set sessionStorage for next time
      // but don't halt execution waiting for results
      chrome.storage.local.get('webapp_env', result => {
        const storageEnv = parseWebappEnv(result.webapp_env);
        if (storageEnv) {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('filliny_webapp_env', result.webapp_env);
            console.log('Updated sessionStorage with environment from chrome.storage:', result.webapp_env);
          }
        }
      });
    }

    // Access process.env for any other environment checks
    // Use bracket notation + Zod to avoid parsing circular globalThis
    const processObj = (globalThis as Record<string, unknown>)['process'];
    const processResult = GlobalWithProcessEnvSchema.safeParse({ process: processObj });
    const processEnv = processResult.success ? processResult.data.process?.env : undefined;

    // Try Vite's import.meta.env (works in development via globalThis fallback)
    // Use bracket notation + Zod to avoid parsing circular globalThis
    const importObj = (globalThis as Record<string, unknown>)['import'];
    const importParseResult = GlobalWithImportMetaSchema.safeParse({ import: importObj });
    const viteEnv = importParseResult.success
      ? parseWebappEnv(importParseResult.data.import?.meta?.env?.VITE_WEBAPP_ENV)
      : undefined;
    if (viteEnv) {
      console.log('Using environment from import.meta.env:', viteEnv);
      return cacheAndReturn(viteEnv);
    }

    // Development indicators - this section should only run if no explicit env is set

    // Check if CLI_CEB_DEV flag is set to true
    if (processEnv?.CLI_CEB_DEV === 'true') {
      console.log('Using DEV environment because CLI_CEB_DEV is true');
      return cacheAndReturn(WebappEnvs.DEV);
    }

    // Check hostname (for local development)
    if (typeof window !== 'undefined') {
      try {
        const hostname = window.location.hostname;
        if (hostname === 'localhost') {
          console.log('Using DEV environment based on hostname:', hostname);
          return cacheAndReturn(WebappEnvs.DEV);
        }
      } catch {
        // Ignore window errors
      }
    }

    // Check NODE_ENV
    if (processEnv?.NODE_ENV === 'development') {
      console.log("Using DEV environment because NODE_ENV is 'development'");
      return cacheAndReturn(WebappEnvs.DEV);
    }

    // Last resort - assume production for non-development environments
    // This ensures production is used when no other indicators are present
    if (processEnv?.NODE_ENV !== 'development' && processEnv?.CLI_CEB_DEV !== 'true') {
      console.log('Using PROD environment (no development indicators present)');
      return cacheAndReturn(WebappEnvs.PROD);
    }
  } catch (error) {
    console.error('Error determining environment:', error);
  }

  // Default to PROD as last resort
  console.log('Defaulting to PROD environment');
  return cacheAndReturn(WebappEnvs.PROD);
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

      // Sync bearer_token storage with the new cookie value
      // This prevents getWithFallback() from returning a stale bearer_token
      handleGetAuthToken(envConfig, response => {
        const token = response.success?.token;
        if (token) {
          chrome.storage.local.set({ bearer_token: token }, () => {
            console.log('[Auth] bearer_token storage synced with new cookie');
          });
        } else {
          chrome.storage.local.remove('bearer_token', () => {
            console.log('[Auth] bearer_token storage cleared (cookie removed)');
          });
        }

        // Broadcast the change to all extension contexts so UI can update
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

// Check auth state from cookie on startup and persist to storage
const syncAuthTokenFromCookie = () => {
  const envConfig = getConfig();

  // Always sync cookie to bearer_token storage on startup
  // A stale bearer_token would cause 401s since getWithFallback() prefers it
  handleGetAuthToken(envConfig, response => {
    const token = response.success?.token;
    if (token) {
      // Persist cookie token as bearer_token for consistent access
      chrome.storage.local.set({ bearer_token: token }, () => {
        console.log('[Auth] Synced session cookie to bearer_token storage');
      });
    } else {
      // Clear stale bearer_token if cookie is gone
      chrome.storage.local.remove('bearer_token', () => {
        console.warn(
          '[Auth] No session cookie found on startup, cleared bearer_token. Cookie:',
          `name="${envConfig.cookieName}" at "${envConfig.baseURL}"`,
        );
      });
    }
  });
};

const clearUserStorage = () => {
  authStorage.deleteToken();
  positionStorage.resetPosition();
  profileStorage.resetDefaultProfile();
};

const excludeValuesFromBaseArray = <B extends string[], E extends (string | number)[]>(
  baseArray: B,
  excludeArray: E,
): ExcludeValuesFromBaseArrayType<B, E> => {
  const filtered: string[] = baseArray.filter(value => !excludeArray.includes(value));
  // The filter guarantees only values NOT in excludeArray remain,
  // which matches the Exclude<TupleToUnion<B>, TupleToUnion<E>>[] type.
  // This return type is verified by the function signature.
  return filtered as ExcludeValuesFromBaseArrayType<B, E>;
};

const sleep = async (time: number) => new Promise(r => setTimeout(r, time));

/**
 * Check if a URL is a development/localhost URL that should not be auto-added to profiles.
 * Matches localhost, 127.0.0.1, 0.0.0.0, and common local development patterns.
 */
const isDevUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Match common local development hostnames
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '[::1]' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.test') ||
      hostname.endsWith('.example')
    ) {
      return true;
    }

    // Match private IP ranges (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    if (/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

// All exports at end of file
export {
  getFaviconUrl,
  cleanUrl,
  formatToK,
  isDevUrl,
  getMatchingWebsite,
  getConfig,
  parseWebappEnv,
  handleAction,
  getCurrentVistingUrl,
  setupAuthTokenListener,
  syncAuthTokenFromCookie,
  clearUserStorage,
  excludeValuesFromBaseArray,
  extractRawToken,
  sleep,
};
export type { ConfigEntry };
