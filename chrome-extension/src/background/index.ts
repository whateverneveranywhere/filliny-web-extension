import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

console.log('background loaded');

// Allow users to toggle the panel by clicking the extension icon
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(error => console.error(error));

// Add click handler for extension icon
chrome.action.onClicked.addListener(async tab => {
  if (tab.windowId) {
    // This will toggle the panel
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
});
