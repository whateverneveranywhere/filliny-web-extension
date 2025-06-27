import { BackgroundActions, WebappEnvs } from "./types.js";
import { authStorage, positionStorage, profileStrorage } from "@extension/storage";
import type { ErrorResponse, GetAuthTokenResponse, Request, ExcludeValuesFromBaseArrayType } from "./types.js";
import type { DTOProfileFillingForm } from "@extension/storage";

export const getFaviconUrl = (url: string) => `https://www.google.com/s2/favicons?sz=64&domain_url=${url}`;

export const cleanUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (error) {
    console.error("Invalid URL:", error);
    return "";
  }
};

export const isValidUrl = (url: string) => {
  if (!url) return false;

  // Handle relative URLs by prepending the current origin
  if (url.startsWith("/")) {
    url = window.location.origin + url;
  }

  try {
    new URL(url);
    return true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    try {
      // Try adding https:// if no protocol is specified
      new URL(`https://${url}`);
      return true;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
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

export const getMatchingWebsite = (websites: DTOProfileFillingForm["fillingWebsites"], currentUrl: string) => {
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

// Typed config object
const config: Record<WebappEnvs, ConfigEntry> = {
  dev: {
    cookieName: "authjs.session-token",
    baseURL: "http://localhost:3000",
    webappEnv: WebappEnvs.DEV,
  },
  preview: {
    cookieName: "__Secure-authjs.session-token",
    baseURL: "https://dev.filliny-app.pages.dev",
    webappEnv: WebappEnvs.PREVIEW,
  },
  prod: {
    cookieName: "__Secure-authjs.session-token",
    baseURL: "https://filliny.io",
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
//
// Use a special comment to trick the linter without affecting the replacement
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VITE_WEBAPP_ENV = (import.meta as any).env?.VITE_WEBAPP_ENV as WebappEnvs;
console.log("Build-time VITE_WEBAPP_ENV:", VITE_WEBAPP_ENV);

export const getConfig = (): ConfigEntry => {
  // Get cached environment from memory to avoid repeated calculations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalThis_any = globalThis as any;
  if (globalThis_any.__CACHED_ENV_CONFIG__) {
    console.log("Using cached config:", globalThis_any.__CACHED_ENV_CONFIG__.baseURL);
    return globalThis_any.__CACHED_ENV_CONFIG__;
  }

  console.log("getConfig called - determining environment");

  try {
    // First, try to use the build-time environment variable from Vite
    // This will be statically replaced during build, so we need to check if it exists
    if (VITE_WEBAPP_ENV && Object.values(WebappEnvs).includes(VITE_WEBAPP_ENV)) {
      console.log("Using build-time environment:", VITE_WEBAPP_ENV);
      const envConfig = config[VITE_WEBAPP_ENV];
      globalThis_any.__CACHED_ENV_CONFIG__ = envConfig;
      return envConfig;
    }

    // Try to get from extension storage if available
    if (typeof chrome !== "undefined" && chrome.storage) {
      // Check if we have a cached value from sessionStorage
      if (typeof sessionStorage !== "undefined") {
        const cachedEnv = sessionStorage.getItem("filliny_webapp_env");
        if (cachedEnv && Object.values(WebappEnvs).includes(cachedEnv as WebappEnvs)) {
          console.log("Using environment from sessionStorage:", cachedEnv);
          const envConfig = config[cachedEnv as WebappEnvs];
          globalThis_any.__CACHED_ENV_CONFIG__ = envConfig;
          return envConfig;
        }
      }

      // For async settings, still set sessionStorage for next time
      // but don't halt execution waiting for results
      chrome.storage.local.get("webapp_env", result => {
        if (result.webapp_env && Object.values(WebappEnvs).includes(result.webapp_env as WebappEnvs)) {
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem("filliny_webapp_env", result.webapp_env);
            console.log("Updated sessionStorage with environment from chrome.storage:", result.webapp_env);
          }
        }
      });
    }

    // Access process.env for any other environment checks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processEnv = (globalThis as any).process?.env;

    // Try Vite's import.meta.env (works in development)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const importMeta = (globalThis as any).import?.meta;
    const viteEnv = importMeta?.env?.VITE_WEBAPP_ENV;
    if (viteEnv && Object.values(WebappEnvs).includes(viteEnv as WebappEnvs)) {
      console.log("Using environment from import.meta.env:", viteEnv);
      const envConfig = config[viteEnv as WebappEnvs];
      globalThis_any.__CACHED_ENV_CONFIG__ = envConfig;
      return envConfig;
    }

    // Development indicators - this section should only run if no explicit env is set

    // Check if CLI_CEB_DEV flag is set to true
    if (processEnv?.CLI_CEB_DEV === "true") {
      console.log("Using DEV environment because CLI_CEB_DEV is true");
      const envConfig = config[WebappEnvs.DEV];
      globalThis_any.__CACHED_ENV_CONFIG__ = envConfig;
      return envConfig;
    }

    // Check hostname (for local development)
    if (typeof window !== "undefined") {
      try {
        const hostname = window.location.hostname;
        if (hostname === "localhost" || hostname === "127.0.0.1") {
          console.log("Using DEV environment based on hostname:", hostname);
          const envConfig = config[WebappEnvs.DEV];
          globalThis_any.__CACHED_ENV_CONFIG__ = envConfig;
          return envConfig;
        }
      } catch {
        // Ignore window errors
      }
    }

    // Check NODE_ENV
    if (processEnv?.NODE_ENV === "development") {
      console.log("Using DEV environment because NODE_ENV is 'development'");
      const envConfig = config[WebappEnvs.DEV];
      globalThis_any.__CACHED_ENV_CONFIG__ = envConfig;
      return envConfig;
    }

    // Last resort - assume production for non-development environments
    // This ensures production is used when no other indicators are present
    if (processEnv?.NODE_ENV !== "development" && processEnv?.CLI_CEB_DEV !== "true") {
      console.log("Using PROD environment (no development indicators present)");
      const envConfig = config[WebappEnvs.PROD];
      globalThis_any.__CACHED_ENV_CONFIG__ = envConfig;
      return envConfig;
    }
  } catch (error) {
    console.error("Error determining environment:", error);
  }

  // Default to DEV as last resort
  console.log("Defaulting to DEV environment");
  const defaultConfig = config[WebappEnvs.DEV];
  globalThis_any.__CACHED_ENV_CONFIG__ = defaultConfig;
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
      sendResponse({ error: { error: "Invalid action" } });
      return false;
  }
};

export const getCurrentVistingUrl = (): Promise<string> =>
  new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      const activeTab = tabs[0];
      if (activeTab) {
        resolve(activeTab.url || "");
      } else {
        reject("No active tab found");
      }
    });
  });

// Add a new function to listen for cookie changes
export const setupAuthTokenListener = () => {
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

export const clearUserStorage = () => {
  authStorage.deleteToken();
  positionStorage.resetPosition();
  profileStrorage.resetDefaultProfile();
};

export const excludeValuesFromBaseArray = <B extends string[], E extends (string | number)[]>(
  baseArray: B,
  excludeArray: E,
) => baseArray.filter(value => !excludeArray.includes(value)) as ExcludeValuesFromBaseArrayType<B, E>;

export const sleep = async (time: number) => new Promise(r => setTimeout(r, time));
