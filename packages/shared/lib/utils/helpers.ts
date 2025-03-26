import { authStorage, positionStorage, profileStrorage, type DTOProfileFillingForm } from "@extension/storage";
import type { ErrorResponse, GetAuthTokenResponse, Request } from "./shared-types.js";
import { BackgroundActions, WebappEnvs } from "./shared-types.js";

export const getFaviconUrl = (url: string) => {
  return `https://www.google.com/s2/favicons?sz=64&domain_url=${url}`;
};

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
  dev: {
    cookieName: "authjs.session-token",
    baseURL: "http://localhost:3000",
  },
  preview: {
    cookieName: "__Secure-authjs.session-token",
    baseURL: "https://dev.filliny-app.pages.dev",
  },
  prod: {
    cookieName: "__Secure-authjs.session-token",
    baseURL: "https://filliny.io",
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
  // First, try passed environment parameter
  if (webappEnv && Object.values(WebappEnvs).includes(webappEnv)) {
    console.log("Using explicitly passed environment:", webappEnv);
    return config[webappEnv];
  }

  try {
    // First try to get from extension storage if available
    if (typeof chrome !== "undefined" && chrome.storage) {
      // Check if we have a cached value from a previous storage retrieval
      if (typeof sessionStorage !== "undefined") {
        const cachedEnv = sessionStorage.getItem("filliny_webapp_env");
        if (cachedEnv && Object.values(WebappEnvs).includes(cachedEnv as WebappEnvs)) {
          console.log("Using environment from sessionStorage:", cachedEnv);
          return config[cachedEnv as WebappEnvs];
        }
      }

      // Try to get from chrome.storage.local, and set an async cache
      // For immediate use we'll continue with other checks
      chrome.storage.local.get("webapp_env", result => {
        if (result.webapp_env && Object.values(WebappEnvs).includes(result.webapp_env as WebappEnvs)) {
          // Store for future use in this context
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem("filliny_webapp_env", result.webapp_env);
            console.log("Updated sessionStorage with environment from chrome.storage:", result.webapp_env);
          }
        }
      });
    }

    // Next, try to get from import.meta.env (for Vite contexts)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const importMeta = (globalThis as any).import?.meta;
    const viteEnv = importMeta?.env?.VITE_WEBAPP_ENV;

    if (viteEnv && Object.values(WebappEnvs).includes(viteEnv as WebappEnvs)) {
      console.log("Using environment from import.meta.env:", viteEnv);
      return config[viteEnv as WebappEnvs];
    }

    // Check if process.env is available (for Node.js environments)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processEnv = (globalThis as any).process?.env;
    if (processEnv?.VITE_WEBAPP_ENV && Object.values(WebappEnvs).includes(processEnv.VITE_WEBAPP_ENV as WebappEnvs)) {
      console.log("Using environment from process.env:", processEnv.VITE_WEBAPP_ENV);
      return config[processEnv.VITE_WEBAPP_ENV as WebappEnvs];
    }

    // Check if we're in development mode based on CLI flags
    if (processEnv?.CLI_CEB_DEV === "true") {
      console.log("Using DEV environment because CLI_CEB_DEV is true");
      return config[WebappEnvs.DEV];
    }

    // Check if we're running in a development environment (localhost)
    // This is now lower priority since we want to respect the stored environment
    if (typeof window !== "undefined") {
      try {
        const hostname = window.location.hostname;
        if (hostname === "localhost" || hostname === "127.0.0.1") {
          console.log("Using DEV environment based on hostname:", hostname);
          return config[WebappEnvs.DEV];
        }
      } catch {
        // Ignore errors with window
      }
    }

    // Check for development NODE_ENV
    if (processEnv?.NODE_ENV === "development") {
      console.log("Using DEV environment because NODE_ENV is 'development'");
      return config[WebappEnvs.DEV];
    }
  } catch (error) {
    console.error("Error determining environment:", error);
  }

  // Default to DEV for local development and testing
  console.log("Defaulting to DEV environment");
  return config[WebappEnvs.DEV];
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

export const getCurrentVistingUrl = (): Promise<string> => {
  return new Promise((resolve, reject) => {
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
