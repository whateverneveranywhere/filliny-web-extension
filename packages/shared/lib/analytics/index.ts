export { AnalyticsEvent } from './types.js';
export type {
  AnalyticsEventProperties,
  AnalyticsMessage,
  AuthEventProperties,
  AuthErrorProperties,
  FormFillStartedProperties,
  FormFillCompletedProperties,
  FormFillErrorProperties,
  SingleFieldFillProperties,
  SingleFieldFillCompletedProperties,
  TestModeFillProperties,
  FormsDetectedProperties,
  FormsHighlightedProperties,
  CrossOriginIframeProperties,
  QuotaExhaustedProperties,
  UpgradePromptProperties,
  UpgradeClickedProperties,
  QuotaLimitApproachingProperties,
  ProfileCreatedProperties,
  ExtensionInstalledProperties,
  ExtensionUpdatedProperties,
} from './types.js';
export { getPostHogConfig } from './posthogConfig.js';
export type { PostHogConfig } from './posthogConfig.js';
export {
  initPostHog,
  captureEvent,
  identifyUser,
  resetUser,
  isInitialized,
  setAnalyticsEnabled,
  getAnalyticsEnabled,
  ANALYTICS_STORAGE_KEY,
} from './posthogClient.js';
export type { PostHogContext } from './posthogClient.js';
export {
  setAnalyticsContext,
  track,
  identifyUser as identifyAnalyticsUser,
  resetAnalyticsUser,
} from './analyticsService.js';
export { useAnalytics } from './useAnalytics.js';
