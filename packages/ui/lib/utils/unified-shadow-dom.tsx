import React from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

// Comprehensive CSS styles for shadow DOM components including Tailwind
const UNIFIED_SHADOW_STYLES = `
  /* Import Tailwind CSS - this should be the actual built CSS */
  @import url('chrome-extension://[EXTENSION_ID]/assets/tailwind.css');

  /* Reset and base styles */
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* CSS animations */
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes fadeIn {
    0% { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
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

  /* Tailwind CSS classes - Filliny prefixed for shadow DOM isolation */
  .filliny-fixed { position: fixed !important; }
  .filliny-absolute { position: absolute !important; }
  .filliny-relative { position: relative !important; }
  .filliny-inline-flex { display: inline-flex !important; }
  .filliny-flex { display: flex !important; }
  .filliny-items-center { align-items: center !important; }
  .filliny-justify-center { justify-content: center !important; }
  .filliny-justify-start { justify-content: flex-start !important; }
  .filliny-gap-2 { gap: 0.5rem !important; }
  .filliny-w-full { width: 100% !important; }
  .filliny-w-48 { width: 12rem !important; }
  .filliny-w-7 { width: 1.75rem !important; }
  .filliny-w-3 { width: 0.75rem !important; }
  .filliny-h-7 { height: 1.75rem !important; }
  .filliny-h-3 { height: 0.75rem !important; }
  .filliny-h-8 { height: 2rem !important; }
  .filliny-p-3 { padding: 0.75rem !important; }
  .filliny-pt-0 { padding-top: 0 !important; }
  .filliny-pb-2 { padding-bottom: 0.5rem !important; }
  .filliny-mr-2 { margin-right: 0.5rem !important; }
  .filliny-rounded-full { border-radius: 9999px !important; }
  .filliny-rounded-md { border-radius: 0.375rem !important; }
  .filliny-shadow-lg { box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important; }
  .filliny-border { border-width: 1px !important; }
  .filliny-border-input { border-color: hsl(214.3 31.8% 91.4%) !important; }
  .filliny-bg-primary { background-color: hsl(222.2 84% 4.9%) !important; }
  .filliny-bg-background { background-color: hsl(0 0% 100%) !important; }
  .filliny-bg-accent { background-color: hsl(210 40% 96%) !important; }
  .filliny-bg-secondary { background-color: hsl(210 40% 96%) !important; }
  .filliny-text-primary-foreground { color: hsl(210 40% 98%) !important; }
  .filliny-text-accent-foreground { color: hsl(222.2 84% 4.9%) !important; }
  .filliny-text-secondary-foreground { color: hsl(222.2 84% 4.9%) !important; }
  .filliny-text-sm { font-size: 0.875rem !important; line-height: 1.25rem !important; }
  .filliny-font-medium { font-weight: 500 !important; }
  .filliny-transition-all { transition: all 0.2s ease !important; }
  .filliny-duration-200 { transition-duration: 200ms !important; }
  .filliny-opacity-95 { opacity: 0.95 !important; }
  .filliny-opacity-100 { opacity: 1 !important; }
  .filliny-opacity-70 { opacity: 0.7 !important; }
  .filliny-scale-110 { transform: scale(1.1) !important; }
  .filliny-space-y-1 > * + * { margin-top: 0.25rem !important; }
  .filliny-pointer-events-auto { pointer-events: auto !important; }
  .filliny-z-\\[10000000\\] { z-index: 10000000 !important; }
  .filliny-animate-spin { animation: spin 1s linear infinite !important; }
  
  /* Hover states */
  .filliny-hover\\:filliny-scale-110:hover { transform: scale(1.1) !important; }
  .filliny-hover\\:filliny-opacity-100:hover { opacity: 1 !important; }
  .filliny-hover\\:filliny-bg-primary\\/90:hover { background-color: hsl(222.2 84% 4.9% / 0.9) !important; }
  .filliny-hover\\:filliny-bg-accent:hover { background-color: hsl(210 40% 96%) !important; }
  .filliny-hover\\:filliny-text-accent-foreground:hover { color: hsl(222.2 84% 4.9%) !important; }

  /* Disabled states */
  .filliny-disabled\\:filliny-pointer-events-none:disabled { pointer-events: none !important; }
  .filliny-disabled\\:filliny-opacity-50:disabled { opacity: 0.5 !important; }

  /* Focus states */
  .focus-visible\\:filliny-outline-none:focus-visible { outline: none !important; }
  .focus-visible\\:filliny-ring-2:focus-visible { box-shadow: 0 0 0 2px hsl(222.2 84% 4.9%) !important; }

  /* Button variants */
  .filliny-btn-default {
    background-color: hsl(222.2 84% 4.9%) !important;
    color: hsl(210 40% 98%) !important;
    border: none !important;
    cursor: pointer !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 0.375rem !important;
    font-size: 0.875rem !important;
    font-weight: 500 !important;
    transition: all 0.2s ease !important;
    outline: none !important;
  }

  .filliny-btn-default:hover:not(:disabled) {
    background-color: hsl(222.2 84% 4.9% / 0.9) !important;
  }

  .filliny-btn-default:disabled {
    pointer-events: none !important;
    opacity: 0.5 !important;
  }

  .filliny-btn-ghost {
    background-color: transparent !important;
    color: hsl(222.2 84% 4.9%) !important;
    border: none !important;
    cursor: pointer !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 0.375rem !important;
    font-size: 0.875rem !important;
    font-weight: 500 !important;
    transition: all 0.2s ease !important;
    outline: none !important;
  }

  .filliny-btn-ghost:hover:not(:disabled) {
    background-color: hsl(210 40% 96%) !important;
    color: hsl(222.2 84% 4.9%) !important;
  }

  .filliny-btn-ghost:disabled {
    pointer-events: none !important;
    opacity: 0.5 !important;
  }

  .filliny-btn-sm {
    height: 2rem !important;
    padding: 0 0.75rem !important;
  }

  .filliny-btn-icon {
    height: 2.5rem !important;
    width: 2.5rem !important;
    padding: 0 !important;
  }

  /* Card components */
  .filliny-card {
    border-radius: 0.5rem !important;
    border: 1px solid hsl(214.3 31.8% 91.4%) !important;
    background-color: hsl(0 0% 100%) !important;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1) !important;
    color: hsl(222.2 84% 4.9%) !important;
  }

  .filliny-card-header {
    display: flex !important;
    flex-direction: column !important;
    space-y: 0.375rem !important;
    padding: 1.5rem !important;
  }

  .filliny-card-title {
    font-size: 1.125rem !important;
    font-weight: 600 !important;
    line-height: 1 !important;
    letter-spacing: -0.025em !important;
  }

  .filliny-card-content {
    padding: 1.5rem !important;
    padding-top: 0 !important;
  }

  /* Legacy compatibility styles - minimal custom styles */
  .filliny-container {
    position: fixed;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: 999999;
    contain: layout style paint;
  }

  .filliny-container * {
    pointer-events: auto;
  }

  /* Animation utilities */
  .filliny-fadeIn {
    animation: fadeIn 0.3s ease-in-out;
  }

  .filliny-slideDown {
    animation: slideDown 0.3s ease-in-out;
  }

  /* Essential utilities */
  .filliny-sr-only {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
  }
`;

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

  static getInstance(): UnifiedShadowDOMManager {
    if (!UnifiedShadowDOMManager.instance) {
      UnifiedShadowDOMManager.instance = new UnifiedShadowDOMManager();
    }
    return UnifiedShadowDOMManager.instance;
  }

  /**
   * Initialize the shadow DOM with proper isolation
   */
  async initialize(): Promise<ShadowRoot | null> {
    if (this.isInitialized && this.shadowRoot) {
      return this.shadowRoot;
    }

    try {
      // Find or create the shadow host
      this.shadowHost = document.querySelector("#chrome-extension-filliny-all") as HTMLElement;

      if (!this.shadowHost) {
        this.shadowHost = document.createElement("div");
        this.shadowHost.id = "chrome-extension-filliny-all";
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

      // Inject unified styles
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
   * Inject comprehensive styles into shadow DOM
   */
  private async injectStyles(): Promise<void> {
    if (!this.shadowRoot) return;

    // Remove existing styles to avoid duplicates
    const existingStyles = this.shadowRoot.querySelectorAll("style[data-filliny-styles]");
    existingStyles.forEach(style => style.remove());

    const styleElement = document.createElement("style");
    styleElement.setAttribute("data-filliny-styles", "true");
    styleElement.textContent = UNIFIED_SHADOW_STYLES;
    this.shadowRoot.appendChild(styleElement);
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
export const initializeShadowDOM = () => unifiedShadowDOM.initialize();
export const getShadowRoot = () => unifiedShadowDOM.getShadowRoot();
export const getContainer = (config: ShadowContainerConfig) => unifiedShadowDOM.getContainer(config);
export const injectComponent = (config: ComponentInjectionConfig) => unifiedShadowDOM.injectComponent(config);
export const cleanupContainer = (containerId: string) => unifiedShadowDOM.cleanupContainer(containerId);
export const cleanupShadowDOM = () => unifiedShadowDOM.cleanup();
export const isShadowDOMReady = () => unifiedShadowDOM.isReady();
export const waitForShadowDOM = (timeout?: number) => unifiedShadowDOM.waitForReady(timeout);
