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
  // Do NOT set `all: initial` inline — it overrides the `:host` CSS rule's font-family
  // because inline styles have higher specificity than `:host`.
  // The `:host { all: initial; font-family: 'Inter', …; }` rule in global.css
  // handles both the style reset and font enforcement correctly.
  rootElement.style.cssText =
    'display: block; position: relative; z-index: 2147483647; contain: style; font-size: 16px; line-height: 1.5;';

  document.body.append(rootElement);

  // Inject Inter font <link> into document.head if not already present.
  // CSSStyleSheet.replaceSync() silently drops @import rules, so the
  // @import url('…Inter…') in global.css never actually loads the font.
  // Fonts are global (not scoped by shadow DOM), so loading once in <head> is enough.
  const fontLinkId = 'filliny-inter-font';
  if (!document.getElementById(fontLinkId)) {
    const fontLink = document.createElement('link');
    fontLink.id = fontLinkId;
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(fontLink);
  }

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
