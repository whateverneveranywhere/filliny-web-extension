/**
 * React hook for analytics tracking in components.
 * Wraps the context-aware track() function for convenient use in React.
 */
import { track } from './analyticsService.js';
import { useCallback } from 'react';
import type { AnalyticsEvent, AnalyticsEventProperties } from './types.js';

export const useAnalytics = () => {
  const trackEvent = useCallback((event: AnalyticsEvent, properties?: AnalyticsEventProperties) => {
    track(event, properties);
  }, []);

  return { trackEvent };
};
