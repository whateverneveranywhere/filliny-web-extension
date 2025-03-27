import { getConfig, handleAction, setupAuthTokenListener, WebappEnvs } from "@extension/shared";
import "webextension-polyfill";

// Add this near the top of the file, after imports
setupAuthTokenListener();

// Store the current environment in storage for consistent access across contexts
function storeEnvironmentInStorage() {
  try {
    // Determine environment from various sources
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const importMeta = (globalThis as any).import?.meta;
    const viteEnv = importMeta?.env?.VITE_WEBAPP_ENV;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processEnv = (globalThis as any).process?.env;
    const nodeEnv = processEnv?.VITE_WEBAPP_ENV;

    // Use vite env first, then node env, or default to PROD for safety in production builds
    let env: WebappEnvs;

    if (viteEnv && Object.values(WebappEnvs).includes(viteEnv as WebappEnvs)) {
      env = viteEnv as WebappEnvs;
      console.log(`Using environment from import.meta.env: ${env}`);
    } else if (nodeEnv && Object.values(WebappEnvs).includes(nodeEnv as WebappEnvs)) {
      env = nodeEnv as WebappEnvs;
      console.log(`Using environment from process.env: ${env}`);
    } else {
      // In a production build where environment variables might not be available,
      // default to PROD for safety
      env = WebappEnvs.PROD;
      console.log(`No environment detected, defaulting to PROD environment for safety`);
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

    // Fallback: attempt to store PROD as default in case of errors
    try {
      chrome.storage.local.set({ webapp_env: WebappEnvs.PROD });
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

// Handle extension installation
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === "install") {
    // Ensure environment is stored first
    storeEnvironmentInStorage();

    // Use a short timeout to ensure storage has time to be set
    setTimeout(() => {
      // Get environment config directly - our new getConfig is smart enough to handle everything
      const configToUse = getConfig();
      console.log("[Background] Using environment config:", configToUse.baseURL);

      console.log("[Background] Opening install URL:", `${configToUse.baseURL}/auth/sign-in`);
      chrome.tabs.create({
        url: `${configToUse.baseURL}/auth/sign-in`,
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
