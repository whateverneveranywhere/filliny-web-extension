import React from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

// Error boundary component for safer rendering
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; containerId: string },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; containerId: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Filliny component error in ${this.props.containerId}:`, error, errorInfo);
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

export interface ShadowContainerConfig {
  containerId: string;
  zIndex?: number;
  isolate?: boolean;
}

export interface ComponentInjectionConfig extends ShadowContainerConfig {
  component: React.ReactNode;
  onError?: (error: Error) => void;
}

export interface ShadowDOMInitConfig {
  css?: string;
  shadowHostId?: string;
}

/**
 * Unified Shadow DOM Manager - Single source of truth for all shadow DOM operations
 */
export class UnifiedShadowDOMManager {
  private static instance: UnifiedShadowDOMManager;
  private shadowRoot: ShadowRoot | null = null;
  private shadowHost: HTMLElement | null = null;
  private containers: Map<string, HTMLElement> = new Map();
  private reactRoots: Map<string, Root> = new Map();
  private isInitialized = false;
  private injectedCss: string | null = null;

  static getInstance(): UnifiedShadowDOMManager {
    if (!UnifiedShadowDOMManager.instance) {
      UnifiedShadowDOMManager.instance = new UnifiedShadowDOMManager();
    }
    return UnifiedShadowDOMManager.instance;
  }

  /**
   * Initialize the shadow DOM with proper isolation and CSS
   */
  async initialize(config: ShadowDOMInitConfig = {}): Promise<ShadowRoot | null> {
    if (this.isInitialized && this.shadowRoot) {
      return this.shadowRoot;
    }

    try {
      const { css, shadowHostId = "chrome-extension-filliny-all" } = config;

      // Find or create the shadow host
      this.shadowHost = document.querySelector(`#${shadowHostId}`) as HTMLElement;

      if (!this.shadowHost) {
        this.shadowHost = document.createElement("div");
        this.shadowHost.id = shadowHostId;
        this.shadowHost.style.cssText = `
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 0 !important;
          height: 0 !important;
          pointer-events: none !important;
          z-index: 999999 !important;
          overflow: visible !important;
          contain: none !important;
        `;
        document.documentElement.appendChild(this.shadowHost);
      }

      // Create or get existing shadow root
      if (!this.shadowHost.shadowRoot) {
        this.shadowRoot = this.shadowHost.attachShadow({ mode: "open" });
      } else {
        this.shadowRoot = this.shadowHost.shadowRoot;
      }

      // Store CSS for injection
      if (css) {
        this.injectedCss = css;
      }

      // Add a class to the shadow host to help with CSS targeting
      this.shadowHost.classList.add("filliny-shadow-host");

      // Inject styles
      await this.injectStyles();

      this.isInitialized = true;
      console.log("✅ Unified Shadow DOM initialized successfully");

      return this.shadowRoot;
    } catch (error) {
      console.error("❌ Failed to initialize unified shadow DOM:", error);
      return null;
    }
  }

  /**
   * Inject CSS styles into shadow DOM using the same pattern as initAppWithShadow
   */
  private async injectStyles(): Promise<void> {
    if (!this.shadowRoot || !this.injectedCss) return;

    // Remove existing styles to avoid duplicates
    const existingStyles = this.shadowRoot.querySelectorAll("style[data-filliny-styles]");
    existingStyles.forEach(style => style.remove());

    // Clear existing adopted stylesheets
    if (this.shadowRoot.adoptedStyleSheets) {
      this.shadowRoot.adoptedStyleSheets = [];
    }

    // Use the same CSS injection pattern as initAppWithShadow
    if (navigator.userAgent.includes("Firefox")) {
      /**
       * In the firefox environment, adoptedStyleSheets cannot be used due to the bug
       * @url https://bugzilla.mozilla.org/show_bug.cgi?id=1770592
       */
      const styleElement = document.createElement("style");
      styleElement.setAttribute("data-filliny-styles", "true");
      styleElement.innerHTML = this.injectedCss;
      this.shadowRoot.appendChild(styleElement);
    } else {
      /** Inject styles into shadow dom */
      const globalStyleSheet = new CSSStyleSheet();
      globalStyleSheet.replaceSync(this.injectedCss);
      this.shadowRoot.adoptedStyleSheets = [globalStyleSheet];
    }
  }

  /**
   * Update CSS styles dynamically
   */
  async updateStyles(css: string): Promise<void> {
    this.injectedCss = css;
    await this.injectStyles();
  }

  /**
   * Get or create a container for specific content
   */
  getContainer(config: ShadowContainerConfig): HTMLElement {
    if (!this.shadowRoot) {
      throw new Error("Shadow DOM not initialized. Call initialize() first.");
    }

    let container = this.containers.get(config.containerId);

    if (!container) {
      container = document.createElement("div");
      container.className = "filliny-container";
      container.setAttribute("data-container-id", config.containerId);

      if (config.zIndex) {
        container.style.zIndex = config.zIndex.toString();
      }

      if (config.isolate) {
        container.style.isolation = "isolate";
      }

      this.shadowRoot.appendChild(container);
      this.containers.set(config.containerId, container);
    }

    return container;
  }

  /**
   * Inject React component into shadow DOM with proper error handling
   */
  async injectComponent(config: ComponentInjectionConfig): Promise<void> {
    try {
      await this.initialize();

      const container = this.getContainer(config);

      // Clean up existing root if it exists
      const existingRoot = this.reactRoots.get(config.containerId);
      if (existingRoot) {
        existingRoot.unmount();
      }

      // Create new React root and render component
      const root = createRoot(container);
      root.render(<ErrorBoundary containerId={config.containerId}>{config.component}</ErrorBoundary>);

      this.reactRoots.set(config.containerId, root);

      console.log(`✅ Component injected into container: ${config.containerId}`);
    } catch (error) {
      console.error(`❌ Failed to inject component into ${config.containerId}:`, error);
      if (config.onError) {
        config.onError(error as Error);
      }
    }
  }

  /**
   * Clean up a specific container
   */
  cleanupContainer(containerId: string): void {
    try {
      // Unmount React root
      const root = this.reactRoots.get(containerId);
      if (root) {
        root.unmount();
        this.reactRoots.delete(containerId);
      }

      // Remove container element
      const container = this.containers.get(containerId);
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
      this.containers.delete(containerId);

      console.log(`✅ Container cleaned up: ${containerId}`);
    } catch (error) {
      console.error(`❌ Failed to cleanup container ${containerId}:`, error);
    }
  }

  /**
   * Clean up all containers and shadow DOM
   */
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
      this.containers.clear();

      // Remove shadow host
      if (this.shadowHost && this.shadowHost.parentNode) {
        this.shadowHost.parentNode.removeChild(this.shadowHost);
      }

      this.shadowRoot = null;
      this.shadowHost = null;
      this.isInitialized = false;

      console.log("✅ Unified Shadow DOM cleanup completed");
    } catch (error) {
      console.error("❌ Error during shadow DOM cleanup:", error);
    }
  }

  /**
   * Get the shadow root instance
   */
  getShadowRoot(): ShadowRoot | null {
    return this.shadowRoot;
  }

  /**
   * Check if shadow DOM is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.shadowRoot !== null;
  }

  /**
   * Wait for shadow DOM to be ready
   */
  async waitForReady(timeout = 5000): Promise<boolean> {
    if (this.isReady()) {
      return true;
    }

    return new Promise(resolve => {
      const startTime = Date.now();
      const checkReady = () => {
        if (this.isReady()) {
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          resolve(false);
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }
}

// Singleton instance
export const unifiedShadowDOM = UnifiedShadowDOMManager.getInstance();

// Convenience functions for common operations
export const initializeShadowDOM = (config?: ShadowDOMInitConfig) => unifiedShadowDOM.initialize(config);
export const getShadowRoot = () => unifiedShadowDOM.getShadowRoot();
export const getContainer = (config: ShadowContainerConfig) => unifiedShadowDOM.getContainer(config);
export const injectComponent = (config: ComponentInjectionConfig) => unifiedShadowDOM.injectComponent(config);
export const cleanupContainer = (containerId: string) => unifiedShadowDOM.cleanupContainer(containerId);
export const cleanupShadowDOM = () => unifiedShadowDOM.cleanup();
export const isShadowDOMReady = () => unifiedShadowDOM.isReady();
export const waitForShadowDOM = (timeout?: number) => unifiedShadowDOM.waitForReady(timeout);
export const updateShadowDOMStyles = (css: string) => unifiedShadowDOM.updateStyles(css);
