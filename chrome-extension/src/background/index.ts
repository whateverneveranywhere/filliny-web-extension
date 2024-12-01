import { getConfig, handleAction, setupAuthTokenListener } from '@extension/shared';
import 'webextension-polyfill';

// Add this near the top of the file, after imports
setupAuthTokenListener();

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  return handleAction(request, sender, sendResponse);
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    const config = getConfig();
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
