import { getConfig, handleAction, setupAuthTokenListener, WebappEnvs, MessageType } from '@extension/shared';
import 'webextension-polyfill';

// Add this near the top of the file, after imports
setupAuthTokenListener();

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
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
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

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle API requests separately from other actions
  if (request.type === MessageType.API_REQUEST) {
    handleApiRequest(request, sender, sendResponse);
    return true; // Keep the message channel open for async response
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

          // Broadcast to all extension contexts
          chrome.runtime.sendMessage({
            type: MessageType.SET_BEARER_TOKEN,
            token: request.token,
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
    chrome.storage.local.remove('bearer_token', () => {
      console.log('[Background] Bearer token cleared');
      sendResponse({ success: true });

      // Broadcast to all extension contexts
      chrome.runtime.sendMessage({
        type: MessageType.CLEAR_BEARER_TOKEN,
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
const handleApiRequest = (
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

  fetch(url, options)
    .then(async response => {
      // console.log('Background: API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        console.error('Background: API error:', errorData);
        sendResponse({
          error: typeof errorData === 'object' ? errorData.message || JSON.stringify(errorData) : 'Request failed',
        });
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
        } catch (error) {
          console.error('Background: Stream error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          chrome.tabs.sendMessage(tabId, {
            type: MessageType.STREAM_ERROR,
            error: errorMessage,
          });
          sendResponse({ error: errorMessage });
          return;
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
