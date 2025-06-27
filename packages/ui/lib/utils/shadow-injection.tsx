/**
 * @deprecated This shadow injection manager is deprecated.
 * Use the unified shadow DOM manager from `./unified-shadow-dom.tsx` instead.
 * This file is kept for backward compatibility and will be removed in a future version.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

// CSS animations and styles for shadow DOM components
const SHADOW_DOM_STYLES = `
  /* Base styles for shadow DOM content */
  * {
    box-sizing: border-box;
  }

  /* CSS animations */
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes fadeIn {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  @keyframes slideDown {
    0% { 
      opacity: 0; 
      transform: translateY(-10px); 
    }
    100% { 
      opacity: 1; 
      transform: translateY(0); 
    }
  }

  @keyframes pulse {
    0%, 100% { 
      opacity: 1; 
      transform: scale(1); 
    }
    50% { 
      opacity: 0.8; 
      transform: scale(1.05); 
    }
  }

  /* Utility classes */
  .filliny-button {
    animation: fadeIn 0.3s ease-in-out;
  }

  .filliny-button:hover {
    animation: pulse 0.3s ease-in-out;
  }

  .filliny-spinner {
    animation: spin 1s linear infinite;
  }

  .filliny-fade-in {
    animation: fadeIn 0.3s ease-in-out;
  }

  .filliny-slide-down {
    animation: slideDown 0.3s ease-in-out;
  }

  /* Container styles */
  .filliny-container {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: 999999;
    contain: layout style paint;
  }

  .filliny-container * {
    pointer-events: auto;
  }

  /* Error boundary styles */
  .filliny-error-boundary {
    background: #fee2e2;
    border: 1px solid #fecaca;
    border-radius: 4px;
    padding: 8px;
    font-size: 12px;
    color: #991b1b;
  }
`;

// Shadow DOM injection manager
export class ShadowInjectionManager {
  private static instance: ShadowInjectionManager;
  private shadowRoot: ShadowRoot | null = null;
  private portalContainers: Map<string, HTMLElement> = new Map();
  private reactRoots: Map<string, Root> = new Map();

  static getInstance(): ShadowInjectionManager {
    if (!ShadowInjectionManager.instance) {
      ShadowInjectionManager.instance = new ShadowInjectionManager();
    }
    return ShadowInjectionManager.instance;
  }

  // Initialize shadow DOM with comprehensive styles
  init(): ShadowRoot | null {
    try {
      if (this.shadowRoot) {
        return this.shadowRoot;
      }

      // Find existing shadow container or create new one
      let shadowContainer = document.querySelector("#chrome-extension-filliny-all") as HTMLElement;

      if (!shadowContainer) {
        shadowContainer = document.createElement("div");
        shadowContainer.id = "chrome-extension-filliny";
        shadowContainer.style.cssText = `
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 0 !important;
          height: 0 !important;
          pointer-events: none !important;
          z-index: 999999 !important;
          overflow: visible !important;
        `;
        document.documentElement.appendChild(shadowContainer);
      }

      // Create shadow root
      this.shadowRoot = shadowContainer.attachShadow({ mode: "open" });

      // Inject base styles
      this.injectStyles();

      console.log("✅ Shadow DOM initialized successfully");
      return this.shadowRoot;
    } catch (error) {
      console.error("❌ Failed to initialize shadow DOM:", error);
      return null;
    }
  }

  // Inject CSS styles into shadow DOM
  private injectStyles(): void {
    if (!this.shadowRoot) return;

    const styleElement = document.createElement("style");
    styleElement.textContent = SHADOW_DOM_STYLES;
    this.shadowRoot.appendChild(styleElement);
  }

  // Get or create a portal container for specific content
  getPortalContainer(containerId: string): HTMLElement {
    if (!this.shadowRoot) {
      this.init();
      if (!this.shadowRoot) {
        throw new Error("Failed to initialize shadow DOM");
      }
    }

    let container = this.portalContainers.get(containerId);

    if (!container) {
      container = document.createElement("div");
      container.className = "filliny-container";
      container.setAttribute("data-container-id", containerId);
      this.shadowRoot!.appendChild(container);
      this.portalContainers.set(containerId, container);
    }

    return container;
  }

  // Safely inject React component into shadow DOM
  injectComponent(containerId: string, component: React.ReactNode): void {
    try {
      const container = this.getPortalContainer(containerId);

      // Clean up existing root if it exists
      const existingRoot = this.reactRoots.get(containerId);
      if (existingRoot) {
        existingRoot.unmount();
      }

      // Create new React root and render component
      const root = createRoot(container);
      root.render(<ErrorBoundary>{component}</ErrorBoundary>);

      this.reactRoots.set(containerId, root);
    } catch (error) {
      console.error(`❌ Failed to inject component into ${containerId}:`, error);
    }
  }

  // Clean up a specific container
  cleanupContainer(containerId: string): void {
    try {
      // Unmount React root
      const root = this.reactRoots.get(containerId);
      if (root) {
        root.unmount();
        this.reactRoots.delete(containerId);
      }

      // Remove container element
      const container = this.portalContainers.get(containerId);
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
      this.portalContainers.delete(containerId);
    } catch (error) {
      console.error(`❌ Failed to cleanup container ${containerId}:`, error);
    }
  }

  // Clean up all containers and shadow DOM
  cleanup(): void {
    try {
      // Cleanup all React roots
      this.reactRoots.forEach((root, containerId) => {
        try {
          root.unmount();
        } catch (error) {
          console.debug(`Error unmounting root ${containerId}:`, error);
        }
      });
      this.reactRoots.clear();

      // Clear containers
      this.portalContainers.clear();

      // Remove shadow DOM
      const shadowContainer = document.querySelector("#chrome-extension-filliny-all");
      if (shadowContainer && shadowContainer.parentNode) {
        shadowContainer.parentNode.removeChild(shadowContainer);
      }

      this.shadowRoot = null;
      console.log("✅ Shadow DOM cleanup completed");
    } catch (error) {
      console.error("❌ Error during shadow DOM cleanup:", error);
    }
  }

  // Get shadow root
  getShadowRoot(): ShadowRoot | null {
    if (!this.shadowRoot) {
      this.init();
    }
    return this.shadowRoot;
  }
}

// Error boundary component for safer rendering
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Filliny component error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="filliny-error-boundary">
          <div>Filliny component error occurred</div>
          {process.env.NODE_ENV === "development" && (
            <details style={{ marginTop: "4px", fontSize: "10px" }}>
              <summary>Error details</summary>
              <pre>{this.state.error?.stack}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Singleton instance
export const shadowInjectionManager = ShadowInjectionManager.getInstance();

// Convenience functions
export const initShadowDOM = () => shadowInjectionManager.init();
export const getShadowRoot = () => shadowInjectionManager.getShadowRoot();
export const getPortalContainer = (containerId: string) => shadowInjectionManager.getPortalContainer(containerId);
export const injectIntoShadow = (containerId: string, component: React.ReactNode) =>
  shadowInjectionManager.injectComponent(containerId, component);
export const cleanupShadowInjection = (containerId?: string) => {
  if (containerId) {
    shadowInjectionManager.cleanupContainer(containerId);
  } else {
    shadowInjectionManager.cleanup();
  }
};

// Wait for hydration to complete before DOM modifications
export const waitForHydrationSafe = async (): Promise<void> =>
  new Promise(resolve => {
    // Check if we're in a React environment
    const isReactApp = document.querySelector('[data-reactroot], [id*="react"], [id*="root"], [class*="app"]');

    if (!isReactApp) {
      resolve();
      return;
    }

    // Wait for hydration indicators
    let checks = 0;
    const maxChecks = 20;
    const checkInterval = 200;

    const checkHydration = () => {
      checks++;

      const readyStateComplete = document.readyState === "complete";
      const noHydrationErrors = !document.querySelector("[data-react-error]");
      const hasReactElements = document.querySelectorAll("[data-reactroot] *").length > 0;

      if ((readyStateComplete && noHydrationErrors && hasReactElements) || checks >= maxChecks) {
        // Additional safety delay
        setTimeout(resolve, 500);
      } else {
        setTimeout(checkHydration, checkInterval);
      }
    };

    setTimeout(checkHydration, 1000);
  });
