// Shadow DOM injection utilities
export {
  ShadowInjectionManager,
  shadowInjectionManager,
  initShadowDOM,
  getShadowRoot,
  getPortalContainer,
  injectIntoShadow,
  cleanupShadowInjection,
  waitForHydrationSafe,
} from "./shadow-injection";

// Unified Shadow DOM utilities
export {
  UnifiedShadowDOMManager,
  unifiedShadowDOM,
  initializeShadowDOM,
  getContainer,
  injectComponent,
  cleanupContainer,
  cleanupShadowDOM,
  isShadowDOMReady,
  waitForShadowDOM,
  updateShadowDOMStyles,
  type ShadowContainerConfig,
  type ComponentInjectionConfig,
  type ShadowDOMInitConfig,
} from "./unified-shadow-dom";

// Re-export all utilities for convenience
export * from "./shadow-injection";
