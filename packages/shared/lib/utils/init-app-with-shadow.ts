import { createRoot } from 'react-dom/client';
import type { ReactElement } from 'react';
import type { Root } from 'react-dom/client';

/**
 * Cleanup function type for removing the shadow DOM and React app
 */
type ShadowAppCleanup = () => void;

/**
 * Global registry for shadow app cleanups
 * Allows cleanup from anywhere in the extension
 */
const shadowAppRegistry = new Map<string, { root: Root; element: HTMLElement; cleanup: ShadowAppCleanup }>();

/**
 * Initialize a React app within a shadow DOM
 * Returns a cleanup function that can be called to remove the UI
 */
const initAppWithShadow = ({
  id,
  app,
  inlineCss,
}: {
  id: string;
  inlineCss: string;
  app: ReactElement;
}): ShadowAppCleanup => {
  // Check if already initialized - clean up first
  const existing = shadowAppRegistry.get(id);
  if (existing) {
    existing.cleanup();
  }

  const rootElement = document.createElement('div');
  rootElement.id = id;

  document.body.append(rootElement);

  const rootIntoShadow = document.createElement('div');
  rootIntoShadow.id = `shadow-root-${id}`;

  const shadowRoot = rootElement.attachShadow({ mode: 'open' });

  if (navigator.userAgent.includes('Firefox')) {
    /**
     * In the firefox environment, adoptedStyleSheets cannot be used due to the bug
     * @url https://bugzilla.mozilla.org/show_bug.cgi?id=1770592
     *
     * Injecting styles into the document, this may cause style conflicts with the host page
     */
    const styleElement = document.createElement('style');
    styleElement.innerHTML = inlineCss;
    shadowRoot.appendChild(styleElement);
  } else {
    /** Inject styles into shadow dom */
    const globalStyleSheet = new CSSStyleSheet();
    globalStyleSheet.replaceSync(inlineCss);
    shadowRoot.adoptedStyleSheets = [globalStyleSheet];
  }

  shadowRoot.appendChild(rootIntoShadow);
  const reactRoot = createRoot(rootIntoShadow);
  reactRoot.render(app);

  // Create cleanup function
  const cleanup: ShadowAppCleanup = () => {
    try {
      // Unmount React
      reactRoot.unmount();

      // Remove from DOM
      if (rootElement.parentNode) {
        rootElement.parentNode.removeChild(rootElement);
      }

      // Remove from registry
      shadowAppRegistry.delete(id);

      console.log(`[Filliny] Shadow app ${id} cleaned up successfully`);
    } catch (error) {
      console.error(`[Filliny] Error cleaning up shadow app ${id}:`, error);
    }
  };

  // Register for global access
  shadowAppRegistry.set(id, { root: reactRoot, element: rootElement, cleanup });

  return cleanup;
};

/**
 * Get cleanup function for a shadow app by ID
 */
const getShadowAppCleanup = (id: string): ShadowAppCleanup | undefined => shadowAppRegistry.get(id)?.cleanup;

/**
 * Check if a shadow app exists
 */
const hasShadowApp = (id: string): boolean => shadowAppRegistry.has(id);

/**
 * Clean up all shadow apps
 */
const cleanupAllShadowApps = (): void => {
  shadowAppRegistry.forEach(({ cleanup }) => {
    cleanup();
  });
};

export { initAppWithShadow, getShadowAppCleanup, hasShadowApp, cleanupAllShadowApps };
export type { ShadowAppCleanup };
