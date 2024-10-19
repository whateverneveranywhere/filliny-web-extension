import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';
import { handleAction } from '../helpers';
import type { Request } from '@src/types/actions';

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

console.log('background loaded');

// Add the message listener and delegate action handling
chrome.runtime.onMessage.addListener((request: Request, _sender, sendResponse) => {
  return handleAction(request, sendResponse);
});
