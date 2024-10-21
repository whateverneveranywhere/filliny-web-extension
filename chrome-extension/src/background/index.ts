import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';
import { handleAction } from '@extension/shared';

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

console.log('background loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  return handleAction(request, sender, sendResponse);
});
