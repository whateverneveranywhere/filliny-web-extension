import initClient from '../initializers/init-client.js';

// Declare the global __HMR_ID variable that's injected at build time
declare const __HMR_ID: string;

(() => {
  const reload = () => {
    chrome.runtime.reload();
  };

  initClient({
    id: __HMR_ID,
    onUpdate: reload,
  });
})();
