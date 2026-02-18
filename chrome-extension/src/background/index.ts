import {
  getConfig,
  handleAction,
  setupAuthTokenListener,
  syncAuthTokenFromCookie,
  WebappEnvs,
  MessageType,
  unwrapApiEnvelope,
  parseApiError,
  AuthHealthCheckSchema,
} from '@extension/shared';
import 'webextension-polyfill';

// Add this near the top of the file, after imports
setupAuthTokenListener();
// Sync auth token from cookie to storage on startup
syncAuthTokenFromCookie();

// Track extension pinning status
let isExtensionPinned = false;

// Check if extension is pinned by checking action visibility
const checkPinStatus = () => {
  if (chrome.action && chrome.action.getUserSettings) {
    chrome.action.getUserSettings(settings => {
      const newPinStatus = settings.isOnToolbar;
      // If pin status changed, dispatch event
      if (isExtensionPinned !== newPinStatus) {
        isExtensionPinned = newPinStatus;
        notifyTabsAboutPinStatus();
      }
    });
  }
};

// Function to notify all tabs about the current pin status
const notifyTabsAboutPinStatus = () => {
  chrome.tabs.query({}, tabs => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.scripting
          .executeScript({
            target: { tabId: tab.id },
            func: pinned => {
              window.dispatchEvent(new CustomEvent('extensionPinned', { detail: { pinned } }));
            },
            args: [isExtensionPinned],
          })
          .catch(err => console.error('[Background] Failed to execute pin status script:', err));
      }
    });
  });
};

// Check pin status initially
checkPinStatus();

// Check pin status whenever an external message checks it
// This removes the need for periodic polling with setInterval

// Also check pin status when browser window gets focus
// This is a common time when users might have changed the extension's pin status
chrome.windows.onFocusChanged.addListener(windowId => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    checkPinStatus();
  }
});

/**
 * Extended global interface for environment access in background script
 */
interface ExtendedGlobalThis {
  import?: {
    meta?: {
      env?: {
        VITE_WEBAPP_ENV?: string;
      };
    };
  };
  process?: {
    env?: {
      NODE_ENV?: string;
    };
  };
}

// Store the current environment in storage for consistent access across contexts
const storeEnvironmentInStorage = () => {
  try {
    // Get the environment from the same source as getConfig()
    const extendedGlobal = globalThis as unknown as ExtendedGlobalThis;
    const importMeta = extendedGlobal.import?.meta;
    const viteEnv = importMeta?.env?.VITE_WEBAPP_ENV;

    // Use the same environment detection logic as in getConfig()
    let env: WebappEnvs;

    if (viteEnv && Object.values(WebappEnvs).includes(viteEnv as WebappEnvs)) {
      env = viteEnv as WebappEnvs;
    } else if (typeof window !== 'undefined') {
      // Check hostname (for local development)
      try {
        const hostname = window.location.hostname;
        if (hostname === 'localhost') {
          env = WebappEnvs.DEV;
        } else {
          // Default to prod for non-dev environments
          env = WebappEnvs.PROD;
        }
      } catch {
        // Default to prod if can't determine
        env = WebappEnvs.PROD;
      }
    } else {
      // Default to prod as safest option
      env = WebappEnvs.PROD;
    }

    // Store the environment in extension storage
    chrome.storage.local.set({ webapp_env: env }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error storing environment:', chrome.runtime.lastError);
      } else {
        // Also store in session storage for immediate access
        if (typeof sessionStorage !== 'undefined') {
          try {
            sessionStorage.setItem('filliny_webapp_env', env);
          } catch (e) {
            console.error('Failed to store environment in sessionStorage:', e);
          }
        }
      }
    });
  } catch (error) {
    console.error('Error in storeEnvironmentInStorage:', error);

    // Fallback: use the dev environment if in development
    try {
      const extendedGlobal = globalThis as unknown as ExtendedGlobalThis;
      const processEnv = extendedGlobal.process?.env;
      const isDev = processEnv?.NODE_ENV === 'development';

      chrome.storage.local.set({
        webapp_env: isDev ? WebappEnvs.DEV : WebappEnvs.PROD,
      });
    } catch {
      // Last-resort error handling - at this point we've done what we can
    }
  }
};

// Initialize environment storage
storeEnvironmentInStorage();

// Function to notify all tabs about profile updates
const notifyAllTabsAboutProfileUpdate = async () => {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: MessageType.PROFILE_UPDATED }).catch(() => {
          // Content script might not be listening, ignore the error
        });
      }
    }
  } catch (error) {
    console.error('[Background] Failed to notify tabs about profile update:', error);
  }
};

// --- Quota status cache ---
interface QuotaStatus {
  canFillForms: boolean;
  freeFormsRemaining: number;
  isPro: boolean;
  tokensRemaining: number;
}

let quotaCache: { data: QuotaStatus; timestamp: number } | null = null;
const QUOTA_CACHE_TTL = 30000; // 30 seconds

const fetchQuotaStatus = async (): Promise<QuotaStatus> => {
  // Return cached result if still fresh
  if (quotaCache && Date.now() - quotaCache.timestamp < QUOTA_CACHE_TTL) {
    return quotaCache.data;
  }

  const configToUse = getConfig();

  // Get auth token: try bearer token first, fall back to session cookie
  let authToken = '';
  const tokenResult = await chrome.storage.local.get('bearer_token');
  if (tokenResult.bearer_token) {
    authToken = tokenResult.bearer_token;
  } else {
    // Fall back to session cookie (same approach as handleGetAuthToken)
    const cookie = await chrome.cookies.get({
      url: configToUse.baseURL,
      name: configToUse.cookieName,
    });
    if (cookie?.value) {
      authToken = cookie.value;
    }
  }

  if (!authToken) {
    return { canFillForms: false, freeFormsRemaining: 0, isPro: false, tokensRemaining: 0 };
  }

  const url = `${configToUse.apiURL}/auth-health`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  const response = await fetch(url, { headers, credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }

  const json: unknown = await response.json();
  const unwrapped = unwrapApiEnvelope(json);
  const parseResult = AuthHealthCheckSchema.safeParse(unwrapped);

  if (!parseResult.success) {
    console.warn('[Background] Auth health response validation failed:', parseResult.error.errors);
    // Permissive default: allow filling on validation failure
    return { canFillForms: true, freeFormsRemaining: 0, isPro: false, tokensRemaining: 0 };
  }

  const { limitations } = parseResult.data;
  const tokensRemaining = limitations.tokensRemaining;
  const freeFormsRemaining = limitations.freeFormsRemaining;
  const isPro = limitations.isProSubscriber;
  const canFillForms = isPro ? tokensRemaining > 0 : freeFormsRemaining > 0;

  const status: QuotaStatus = { canFillForms, freeFormsRemaining, isPro, tokensRemaining };
  quotaCache = { data: status, timestamp: Date.now() };
  return status;
};

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle API requests separately from other actions
  if (request.type === MessageType.API_REQUEST) {
    handleApiRequest(request, sender, sendResponse);
    return true; // Keep the message channel open for async response
  }

  // Handle profile update notifications
  if (request.type === MessageType.PROFILE_UPDATED) {
    notifyAllTabsAboutProfileUpdate();
    sendResponse({ success: true });
    return true;
  }

  // Handle quota status check
  if (request.type === MessageType.GET_QUOTA_STATUS) {
    fetchQuotaStatus()
      .then(status => sendResponse({ success: true, ...status }))
      .catch(error => {
        console.error('[Background] Quota check failed:', error);
        // Return a permissive default so buttons aren't disabled on network errors
        sendResponse({ success: false, canFillForms: true, freeFormsRemaining: 0, isPro: false, tokensRemaining: 0 });
      });
    return true; // Keep the message channel open for async response
  }

  // Invalidate quota cache when usage refreshes
  if (request.type === MessageType.REFRESH_USAGE) {
    quotaCache = null;
  }

  return handleAction(request, sender, sendResponse);
});

// Listen for external messages from the website
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  // Handle extension detection request
  if (request.message === 'areYouThere') {
    // Always check pin status when detected, to keep it updated
    if (chrome.action && chrome.action.getUserSettings) {
      chrome.action.getUserSettings(settings => {
        isExtensionPinned = settings.isOnToolbar;
        sendResponse({ installed: true, pinned: isExtensionPinned });

        // If pin status has changed, notify all tabs
        checkPinStatus();
      });
      return true; // Keep message channel open for async response
    } else {
      // Basic detection without pin status
      sendResponse({ installed: true, pinned: isExtensionPinned });
    }
    return true;
  }

  // Handle bearer token set from web app (after sign-in)
  if (request.type === MessageType.SET_BEARER_TOKEN && request.token) {
    // Verify the sender is from a trusted origin
    const configToUse = getConfig();
    const trustedOrigins = [
      configToUse.baseURL,
      'https://filliny.io',
      'https://filliny.com',
      'https://www.filliny.io',
      'https://www.filliny.com',
      'https://preview.filliny.io',
      'https://preview.filliny.com',
      'http://localhost:5173',
      'http://localhost:5174',
    ];

    const senderOrigin = sender.origin || sender.url?.split('/').slice(0, 3).join('/');
    if (senderOrigin && trustedOrigins.some(origin => senderOrigin.startsWith(origin.replace(/\/$/, '')))) {
      // Store the token in extension storage
      chrome.storage.local.set({ bearer_token: request.token }, () => {
        if (chrome.runtime.lastError) {
          console.error('[Background] Failed to store bearer token:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('[Background] Bearer token stored successfully');
          sendResponse({ success: true });

          // Invalidate quota cache so next check fetches fresh data
          quotaCache = null;

          // Broadcast to extension pages (popup, side panel)
          chrome.runtime.sendMessage({
            type: MessageType.SET_BEARER_TOKEN,
            token: request.token,
          });

          // Also broadcast to all content scripts (runtime.sendMessage
          // does NOT reach content scripts)
          chrome.tabs.query({}, tabs => {
            for (const tab of tabs) {
              if (tab.id) {
                chrome.tabs.sendMessage(tab.id, { type: MessageType.SET_BEARER_TOKEN }).catch(() => {});
              }
            }
          });
        }
      });
      return true; // Keep message channel open for async response
    } else {
      console.warn('[Background] Rejected bearer token from untrusted origin:', senderOrigin);
      sendResponse({ success: false, error: 'Untrusted origin' });
      return true;
    }
  }

  // Handle bearer token clear (logout from web app)
  if (request.type === MessageType.CLEAR_BEARER_TOKEN) {
    // Invalidate quota cache immediately on logout
    quotaCache = null;

    chrome.storage.local.remove('bearer_token', () => {
      console.log('[Background] Bearer token cleared');
      sendResponse({ success: true });

      // Broadcast to extension pages (popup, side panel)
      chrome.runtime.sendMessage({
        type: MessageType.CLEAR_BEARER_TOKEN,
      });

      // Also broadcast to all content scripts
      chrome.tabs.query({}, tabs => {
        for (const tab of tabs) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: MessageType.CLEAR_BEARER_TOKEN }).catch(() => {});
          }
        }
      });
    });
    return true;
  }

  // Handle get bearer token request
  if (request.type === MessageType.GET_BEARER_TOKEN) {
    chrome.storage.local.get('bearer_token', result => {
      sendResponse({ token: result.bearer_token || null });
    });
    return true;
  }

  // Handle open side panel request from webapp
  if (request.type === MessageType.OPEN_SIDE_PANEL || request.message === 'openSidePanel') {
    // Get the sender's tab to open the side panel in the correct window
    const senderTab = sender.tab;
    if (senderTab?.windowId) {
      chrome.sidePanel
        .open({ windowId: senderTab.windowId })
        .then(() => {
          console.log('[Background] Side panel opened successfully');
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error('[Background] Failed to open side panel:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep message channel open for async response
    } else {
      // Fallback: try to open in the current focused window
      chrome.windows.getCurrent({ populate: false }, window => {
        if (window?.id) {
          chrome.sidePanel
            .open({ windowId: window.id })
            .then(() => {
              sendResponse({ success: true });
            })
            .catch(error => {
              console.error('[Background] Failed to open side panel:', error);
              sendResponse({ success: false, error: error.message });
            });
        } else {
          sendResponse({ success: false, error: 'No window available' });
        }
      });
      return true;
    }
  }

  return false;
});

// Open the installation URL in a new tab or focus existing one
const handleInstallationRedirect = () => {
  const configToUse = getConfig();
  const installUrl = `${configToUse.baseURL}/install-extension`;

  // Promise-based version of chrome.tabs.query
  return new Promise<void>(resolve => {
    chrome.tabs.query({}, tabs => {
      const existingTab = tabs.find(tab => tab.url?.includes('/install-extension'));

      if (existingTab && existingTab.id) {
        // Tab exists, focus on it
        chrome.tabs.update(existingTab.id, { active: true });
        chrome.windows.update(existingTab.windowId, { focused: true });

        // Notify the website when the tab is ready
        const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
          if (tabId === existingTab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            notifyTabAboutExtensionInstallation(existingTab.id);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
      } else {
        // No existing tab, create a new one
        chrome.tabs.create({ url: installUrl }, newTab => {
          // Wait for the tab to load, then notify it
          if (newTab.id) {
            const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
              if (tabId === newTab.id && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                notifyTabAboutExtensionInstallation(newTab.id);
                resolve();
              }
            };
            chrome.tabs.onUpdated.addListener(listener);
          } else {
            resolve(); // Resolve anyway if tab creation failed
          }
        });
      }
    });
  });
};

// Function to notify a tab about extension installation
const notifyTabAboutExtensionInstallation = (tabId: number) => {
  chrome.tabs.sendMessage(tabId, { type: MessageType.EXTENSION_INSTALLED });

  // Execute script to dispatch the event directly in the page context
  chrome.scripting
    .executeScript({
      target: { tabId },
      func: () => {
        window.dispatchEvent(new CustomEvent('extensionInstalled'));
      },
    })
    .catch(err => console.error('[Background] Failed to execute script:', err));
};

// Handle extension installation
chrome.runtime.onInstalled.addListener(async details => {
  if (details.reason === 'install') {
    // Ensure environment is stored
    storeEnvironmentInStorage();

    // Set the uninstall URL to redirect to feedback/contact page
    const configToUse = getConfig();
    const uninstallUrl = `${configToUse.baseURL}/contact?reason=uninstall`;

    try {
      await new Promise<void>((resolve, reject) => {
        chrome.runtime.setUninstallURL(uninstallUrl, () => {
          if (chrome.runtime.lastError) {
            console.error('[Background] Failed to set uninstall URL:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });

      // Handle installation redirect after environment is stored
      chrome.storage.local.get(['webapp_env'], async () => {
        await handleInstallationRedirect();
      });
    } catch (error) {
      console.error('[Background] Error during installation setup:', error);
    }
  }
});

// Set up side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(error => console.error(error));

// Handle extension icon clicks
chrome.action.onClicked.addListener(async tab => {
  if (tab.windowId) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// Define the message type
interface APIRequestMessage {
  type: typeof MessageType.API_REQUEST;
  url: string;
  options: {
    method: string;
    body?: string;
    headers?: Record<string, string>;
    isStream?: boolean;
  };
}

// Define the API response data type - recursive structure for JSON data
type JSONValue = string | number | boolean | null | JSONObject | JSONValue[];
interface JSONObject {
  [key: string]: JSONValue;
}

// Define the API response type
interface APIRequestResponse {
  error?: string;
  data?: JSONObject | null;
  success?: boolean;
}

// Separate function to handle API requests
const handleApiRequest = async (
  message: APIRequestMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: APIRequestResponse) => void,
) => {
  const { url, options } = message;
  const tabId = sender.tab?.id;

  if (!tabId) {
    sendResponse({ error: 'No valid tab ID found' });
    return;
  }

  // console.log('Background: Making API request to:', url);

  // Remove Cookie header as it's forbidden in fetch - rely on Authorization header
  // Also ensure credentials are included for cookie-based auth
  const headers = { ...options.headers };
  delete headers['Cookie']; // Forbidden header in service workers

  // Safety net: if no Authorization header was provided, try to add one
  if (!headers['Authorization']) {
    const tokenResult = await chrome.storage.local.get('bearer_token');
    let authToken = tokenResult.bearer_token || '';
    if (!authToken) {
      const envConfig = getConfig();
      const cookie = await chrome.cookies.get({
        url: envConfig.baseURL,
        name: envConfig.cookieName,
      });
      if (cookie?.value) authToken = cookie.value;
    }
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
  }

  fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Include cookies for same-origin requests
  })
    .then(async response => {
      // console.log('Background: API response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Request failed';
        try {
          const errorJson: unknown = await response.json();
          const structured = parseApiError(errorJson);
          if (structured) {
            errorMessage = structured.message;
          } else if (errorJson && typeof errorJson === 'object' && errorJson !== null && 'message' in errorJson) {
            errorMessage = String((errorJson as Record<string, unknown>).message);
          }
        } catch {
          errorMessage = response.statusText || 'Request failed';
        }
        console.error('Background: API error:', errorMessage);
        sendResponse({ error: errorMessage });
        return;
      }

      if (options.isStream) {
        // console.log('Background: Processing stream response');
        const reader = response.body?.getReader();
        if (!reader) {
          console.error('Background: No readable stream available');
          sendResponse({ error: 'No readable stream available' });
          return;
        }

        // Send chunks back to content script
        try {
          let isDone = false;
          while (!isDone) {
            const { done, value } = await reader.read();
            isDone = done;

            if (!done && value) {
              // Convert Uint8Array to string
              const chunk = new TextDecoder().decode(value);
              // console.log('Background: Sending chunk:', chunk.substring(0, 100) + '...');
              chrome.tabs.sendMessage(tabId, {
                type: MessageType.STREAM_CHUNK,
                data: chunk,
              });
            }
          }
          // console.log('Background: Stream complete');
          // Signal end of stream
          chrome.tabs.sendMessage(tabId, {
            type: MessageType.STREAM_DONE,
          });

          // Invalidate quota cache directly since the background's own
          // onMessage listener won't receive its own runtime.sendMessage()
          quotaCache = null;

          // Broadcast usage refresh to extension pages (side panel, popup)
          chrome.runtime
            .sendMessage({
              type: MessageType.REFRESH_USAGE,
            })
            .catch(() => {
              // Side panel might not be open, ignore the error
            });

          // Also notify the content script in the sender tab (runtime.sendMessage
          // does NOT reach content scripts — chrome.tabs.sendMessage is required)
          if (tabId) {
            chrome.tabs.sendMessage(tabId, { type: MessageType.REFRESH_USAGE }).catch(() => {
              // Content script might not be listening, ignore
            });
          }
        } catch (error) {
          console.error('Background: Stream error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          chrome.tabs.sendMessage(tabId, {
            type: MessageType.STREAM_ERROR,
            error: errorMessage,
          });
          sendResponse({ error: errorMessage });
          return;
        } finally {
          // Explicitly release the reader lock to prevent resource leaks
          try {
            reader.releaseLock();
          } catch {
            // Reader may already be released, ignore
          }
        }
        sendResponse({ success: true }); // Acknowledge the request
      } else {
        const data = await response.json();
        // console.log('Background: Regular response data:', data);
        sendResponse({ data });
      }
    })
    .catch(error => {
      console.error('Background: Fetch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      sendResponse({ error: errorMessage });
    });
};
