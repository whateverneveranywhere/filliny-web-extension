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

// Re-export all utilities for convenience
export * from "./shadow-injection";
