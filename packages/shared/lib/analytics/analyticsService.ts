/**
 * Context-aware analytics service.
 *
 * - In background / extension pages: captures directly via PostHog.
 * - In content-UI: relays events to background via chrome.runtime.sendMessage.
 *
 * Callers use `track()` without caring which context they're in.
 */
import { captureEvent, identifyUser as phIdentify, resetUser as phReset } from './posthogClient.js';
import { AnalyticsEvent } from './types.js';
import { MessageType } from '../types/enums.js';
import type { AnalyticsEventProperties } from './types.js';

type ExtensionContext = 'background' | 'extension_page' | 'content_ui';

let currentContext: ExtensionContext = 'content_ui';

/** Call once at startup to tell the service which context it's running in. */
export const setAnalyticsContext = (context: ExtensionContext): void => {
  currentContext = context;
};

/**
 * Track an analytics event.
 * Routes to PostHog directly or relays via message passing depending on context.
 */
export const track = (event: AnalyticsEvent, properties?: AnalyticsEventProperties): void => {
  try {
    if (currentContext === 'content_ui') {
      // Relay to background via message passing
      chrome.runtime
        .sendMessage({
          type: MessageType.ANALYTICS_EVENT,
          payload: { event, properties },
        })
        .catch(() => {
          // Background might not be listening yet, silently ignore
        });
    } else {
      // Capture directly in background / extension pages
      captureEvent(event, properties);
    }
  } catch {
    // Analytics should never break the app
  }
};

/** Identify a user across all contexts. */
export const identifyUser = (distinctId: string, properties?: AnalyticsEventProperties): void => {
  try {
    if (currentContext === 'content_ui') {
      chrome.runtime
        .sendMessage({
          type: MessageType.ANALYTICS_EVENT,
          payload: { event: AnalyticsEvent.INTERNAL_IDENTIFY, properties: { distinct_id: distinctId, ...properties } },
        })
        .catch(() => {});
    } else {
      phIdentify(distinctId, properties);
    }
  } catch {
    // Silently ignore
  }
};

/** Reset user identity (on logout). */
export const resetAnalyticsUser = (): void => {
  try {
    if (currentContext === 'content_ui') {
      chrome.runtime
        .sendMessage({
          type: MessageType.ANALYTICS_EVENT,
          payload: { event: AnalyticsEvent.INTERNAL_RESET },
        })
        .catch(() => {});
    } else {
      phReset();
    }
  } catch {
    // Silently ignore
  }
};
