import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';
import { BackgroundActons } from '@extension/shared';
import { getConfig } from '../helpers';

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

console.log('background loaded');

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  const envConfig = getConfig();

  if (request.action === BackgroundActons.GET_AUTH_TOKEN) {
    chrome.cookies.get({ url: envConfig.baseURL, name: envConfig.cookieName }, cookie => {
      if (cookie) {
        sendResponse({ token: cookie.value });
      } else {
        sendResponse({ token: null });
      }
    });
    return true; // Keep the message channel open for sendResponse
  } else {
    sendResponse({ error: 'Invalid action' });
    return false; // Indicate that the message was handled but no action was taken
  }
});
