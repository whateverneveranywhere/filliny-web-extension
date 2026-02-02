import initClient from '../initializers/init-client.js';

// Declare the global __HMR_ID variable that's injected at build time
declare const __HMR_ID: string;

(() => {
  let pendingReload = false;

  initClient({
    id: __HMR_ID,
    onUpdate: () => {
      // disable reload when tab is hidden
      if (document.hidden) {
        pendingReload = true;
        return;
      }
      reload();
    },
  });

  // reload
  const reload = (): void => {
    pendingReload = false;
    window.location.reload();
  };

  // reload when tab is visible
  const reloadWhenTabIsVisible = (): void => {
    if (!document.hidden && pendingReload) {
      reload();
    }
  };

  document.addEventListener('visibilitychange', reloadWhenTabIsVisible);
})();
