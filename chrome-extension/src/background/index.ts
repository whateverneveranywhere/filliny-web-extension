import { getConfig, handleAction, setupAuthTokenListener, WebappEnvs } from "@extension/shared";
import "webextension-polyfill";

// Add this near the top of the file, after imports
setupAuthTokenListener();

// Track extension pinning status
let isExtensionPinned = false;

// Check if extension is pinned by checking action visibility
function checkPinStatus() {
  if (chrome.action && chrome.action.getUserSettings) {
    chrome.action.getUserSettings(settings => {
      const newPinStatus = settings.isOnToolbar;
      // If pin status changed, dispatch event
      if (isExtensionPinned !== newPinStatus) {
        isExtensionPinned = newPinStatus;
        // Notify all tabs about the pin status change
        chrome.tabs.query({}, tabs => {
          tabs.forEach(tab => {
            if (tab.id) {
              chrome.scripting
                .executeScript({
                  target: { tabId: tab.id },
                  func: pinned => {
                    window.dispatchEvent(new CustomEvent("extensionPinned", { detail: { pinned } }));
                    console.log("[Injected Script] Dispatched extensionPinned event with status:", pinned);
                  },
                  args: [isExtensionPinned],
                })
                .catch(err => console.error("[Background] Failed to execute pin status script:", err));
            }
          });
        });
      }
    });
  }
}

// Check pin status periodically (every 2 seconds)
setInterval(checkPinStatus, 2000);

// Store the current environment in storage for consistent access across contexts
function storeEnvironmentInStorage() {
  try {
    // Get the environment from the same source as getConfig()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const importMeta = (globalThis as any).import?.meta;
    const viteEnv = importMeta?.env?.VITE_WEBAPP_ENV;

    // Use the same environment detection logic as in getConfig()
    let env: WebappEnvs;

    if (viteEnv && Object.values(WebappEnvs).includes(viteEnv as WebappEnvs)) {
      env = viteEnv as WebappEnvs;
      console.log(`Using environment from import.meta.env: ${env}`);
    } else if (typeof window !== "undefined") {
      // Check hostname (for local development)
      try {
        const hostname = window.location.hostname;
        if (hostname === "localhost" || hostname === "127.0.0.1") {
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
        console.error("Error storing environment:", chrome.runtime.lastError);
      } else {
        console.log(`Environment ${env} stored in extension storage`);

        // Also store in session storage for immediate access
        if (typeof sessionStorage !== "undefined") {
          try {
            sessionStorage.setItem("filliny_webapp_env", env);
          } catch (e) {
            console.error("Failed to store environment in sessionStorage:", e);
          }
        }
      }
    });
  } catch (error) {
    console.error("Error in storeEnvironmentInStorage:", error);

    // Fallback: use the dev environment if in development
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const processEnv = (globalThis as any).process?.env;
      const isDev = processEnv?.NODE_ENV === "development";

      chrome.storage.local.set({
        webapp_env: isDev ? WebappEnvs.DEV : WebappEnvs.PROD,
      });
    } catch {
      // Last-resort error handling - at this point we've done what we can
    }
  }
}

// Initialize environment storage
storeEnvironmentInStorage();

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle API requests separately from other actions
  if (request.type === "API_REQUEST") {
    handleApiRequest(request, sender, sendResponse);
    return true; // Keep the message channel open for async response
  }

  return handleAction(request, sender, sendResponse);
});

// Listen for external messages from the website
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log("[Background] External message received:", request, "from:", sender);

  // Handle extension detection request
  if (request.message === "areYouThere") {
    // If checkPinned is requested, check the pin status
    if (request.checkPinned && chrome.action && chrome.action.getUserSettings) {
      chrome.action.getUserSettings(settings => {
        isExtensionPinned = settings.isOnToolbar;
        sendResponse({ installed: true, pinned: isExtensionPinned });
      });
      return true; // Keep message channel open for async response
    } else {
      // Basic detection without pin status
      sendResponse({ installed: true, pinned: isExtensionPinned });
    }
    return true;
  }

  return false;
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === "install") {
    // Ensure environment is stored first
    storeEnvironmentInStorage();

    // Set the uninstall URL to redirect to feedback/contact page
    const configToUse = getConfig();
    const uninstallUrl = `${configToUse.baseURL}/contact?reason=uninstall`;
    chrome.runtime.setUninstallURL(uninstallUrl, () => {
      if (chrome.runtime.lastError) {
        console.error("[Background] Failed to set uninstall URL:", chrome.runtime.lastError);
      } else {
        console.log("[Background] Uninstall URL set successfully:", uninstallUrl);
      }
    });

    // Use a short timeout to ensure storage has time to be set
    setTimeout(() => {
      // Get environment config directly - our new getConfig is smart enough to handle everything
      const configToUse = getConfig();
      console.log("[Background] Using environment config:", configToUse.baseURL);

      const installUrl = `${configToUse.baseURL}/install-extension`;
      console.log("[Background] Installation URL:", installUrl);

      // Check if a tab with this URL already exists
      chrome.tabs.query({}, tabs => {
        const existingTab = tabs.find(tab => tab.url?.includes("/install-extension"));

        if (existingTab && existingTab.id) {
          // Tab exists, focus on it
          console.log("[Background] Found existing install tab, focusing it");
          chrome.tabs.update(existingTab.id, { active: true });
          chrome.windows.update(existingTab.windowId, { focused: true });

          // Notify the website in this tab that the extension is installed
          setTimeout(() => {
            if (existingTab.id) {
              chrome.tabs.sendMessage(existingTab.id, { type: "EXTENSION_INSTALLED" });

              // Execute script to dispatch the event directly in the page context
              chrome.scripting
                .executeScript({
                  target: { tabId: existingTab.id },
                  func: () => {
                    window.dispatchEvent(new CustomEvent("extensionInstalled"));
                    console.log("[Injected Script] Dispatched extensionInstalled event");
                  },
                })
                .catch(err => console.error("[Background] Failed to execute script:", err));
            }
          }, 500); // Give the page time to load
        } else {
          // No existing tab, create a new one
          console.log("[Background] Creating new install tab");
          chrome.tabs.create({ url: installUrl }, newTab => {
            // Wait for the tab to load, then notify it
            if (newTab.id) {
              chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                if (tabId === newTab.id && changeInfo.status === "complete") {
                  chrome.tabs.onUpdated.removeListener(listener);

                  // Execute script to dispatch the event
                  chrome.scripting
                    .executeScript({
                      target: { tabId: newTab.id },
                      func: () => {
                        window.dispatchEvent(new CustomEvent("extensionInstalled"));
                        console.log("[Injected Script] Dispatched extensionInstalled event");
                      },
                    })
                    .catch(err => console.error("[Background] Failed to execute script:", err));
                }
              });
            }
          });
        }
      });
    }, 100); // Small delay to ensure storage has time to be set
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
  type: "API_REQUEST";
  url: string;
  options: {
    method: string;
    body?: string;
    headers?: Record<string, string>;
    isStream?: boolean;
  };
}

// Separate function to handle API requests
const handleApiRequest = (
  message: APIRequestMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: { error?: string; data?: unknown; success?: boolean }) => void,
) => {
  const { url, options } = message;
  const tabId = sender.tab?.id;

  if (!tabId) {
    sendResponse({ error: "No valid tab ID found" });
    return;
  }

  // console.log('Background: Making API request to:', url);

  fetch(url, options)
    .then(async response => {
      // console.log('Background: API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        console.error("Background: API error:", errorData);
        sendResponse({
          error: typeof errorData === "object" ? errorData.message || JSON.stringify(errorData) : "Request failed",
        });
        return;
      }

      if (options.isStream) {
        // console.log('Background: Processing stream response');
        const reader = response.body?.getReader();
        if (!reader) {
          console.error("Background: No readable stream available");
          sendResponse({ error: "No readable stream available" });
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
                type: "STREAM_CHUNK",
                data: chunk,
              });
            }
          }
          // console.log('Background: Stream complete');
          // Signal end of stream
          chrome.tabs.sendMessage(tabId, {
            type: "STREAM_DONE",
          });
        } catch (error) {
          console.error("Background: Stream error:", error);
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
          chrome.tabs.sendMessage(tabId, {
            type: "STREAM_ERROR",
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
      console.error("Background: Fetch error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      sendResponse({ error: errorMessage });
    });
};
console.log("Background loaded");
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");
