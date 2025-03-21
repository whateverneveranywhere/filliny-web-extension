import { getConfig, handleAction, setupAuthTokenListener, WebappEnvs } from "@extension/shared";
import "webextension-polyfill";

// Add this near the top of the file, after imports
setupAuthTokenListener();

// Store the current environment in storage for consistent access across contexts
function storeEnvironmentInStorage() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const importMeta = (globalThis as any).import?.meta;
    const env = importMeta?.env?.VITE_WEBAPP_ENV;

    if (env && Object.values(WebappEnvs).includes(env as WebappEnvs)) {
      chrome.storage.local.set({ webapp_env: env }, () => {
        console.log(`Environment ${env} stored in extension storage`);
      });
    } else {
      // Default to DEV if no valid environment is specified
      chrome.storage.local.set({ webapp_env: WebappEnvs.DEV }, () => {
        console.log(`Default environment DEV stored in extension storage`);
      });
    }
  } catch (error) {
    console.error("Error storing environment:", error);
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
    const config = getConfig();
    console.log("[Background] Opening install URL:", `${config.baseURL}/auth/sign-in`);
    chrome.tabs.create({
      url: `${config.baseURL}/auth/sign-in`,
    });
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
