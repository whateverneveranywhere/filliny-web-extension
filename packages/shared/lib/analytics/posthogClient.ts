/**
 * Lightweight PostHog client for Chrome extension contexts.
 * Uses the PostHog HTTP API directly instead of the heavy posthog-js SDK,
 * which avoids bundling issues with MV3 service workers (rrweb, web workers, etc.).
 *
 * Events are batched and flushed periodically or on threshold.
 * Respects user opt-out via chrome.storage.local key 'analytics_enabled'.
 */
import type { PostHogConfig } from './posthogConfig.js';
import type { AnalyticsEventProperties } from './types.js';

type PostHogContext = 'background' | 'extension_page';

interface InitOptions {
  context: PostHogContext;
  config: PostHogConfig;
  version: string;
}

interface QueuedEvent {
  event: string;
  properties: Record<string, unknown>;
  timestamp: string;
}

/** Storage key for analytics opt-out. Defaults to true (opt-out model). */
const ANALYTICS_STORAGE_KEY = 'analytics_enabled';

// Module state
let apiKey = '';
let apiHost = '';
let envEnabled = false;
let userOptedIn = true; // Default: opted in (user can opt out)
let initialized = false;
let distinctId = '';
let superProperties: Record<string, unknown> = {};
const eventQueue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const FLUSH_INTERVAL_MS = 30000; // 30 seconds
const FLUSH_THRESHOLD = 10; // Flush after 10 events

/** Whether analytics is currently active (environment enabled AND user opted in) */
const isActive = (): boolean => initialized && envEnabled && userOptedIn;

/** Generate a random anonymous distinct ID */
const generateAnonymousId = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
};

/** Flush queued events to PostHog */
const flush = async (): Promise<void> => {
  if (eventQueue.length === 0 || !isActive()) return;

  const batch = eventQueue.splice(0, eventQueue.length);

  try {
    await fetch(`${apiHost}/batch/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        batch: batch.map(e => ({
          ...e,
          distinct_id: distinctId,
        })),
      }),
    });
  } catch {
    // Analytics should never break the app - silently discard on failure
  }
};

/** Schedule periodic flush */
const scheduleFlush = (): void => {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
};

/**
 * Initialize the PostHog client for the given extension context.
 * Should be called once per context (background service worker or extension page).
 * Respects the user's opt-out preference stored in chrome.storage.local.
 */
const initPostHog = ({ context, config, version }: InitOptions): void => {
  if (initialized || !config.enabled) return;

  apiKey = config.apiKey;
  apiHost = config.host;
  envEnabled = config.enabled;

  // Check user opt-out preference and restore distinct_id
  try {
    chrome.storage.local.get([ANALYTICS_STORAGE_KEY, 'posthog_distinct_id'], result => {
      // If the key has never been set, default to true (opted in)
      if (result[ANALYTICS_STORAGE_KEY] === false) {
        userOptedIn = false;
      }

      if (typeof result.posthog_distinct_id === 'string') {
        distinctId = result.posthog_distinct_id;
      } else {
        distinctId = generateAnonymousId();
        chrome.storage.local.set({ posthog_distinct_id: distinctId });
      }
    });

    // Listen for changes to the analytics preference
    chrome.storage.local.onChanged.addListener(changes => {
      if (ANALYTICS_STORAGE_KEY in changes) {
        userOptedIn = changes[ANALYTICS_STORAGE_KEY].newValue !== false;
        if (!userOptedIn) {
          // Clear pending events when user opts out
          eventQueue.length = 0;
        }
      }
    });
  } catch {
    distinctId = generateAnonymousId();
  }

  // Set super properties included in every event
  superProperties = {
    extension_version: version,
    extension_context: context,
  };

  initialized = true;
  scheduleFlush();
};

/** Capture an analytics event */
const captureEvent = (event: string, properties?: AnalyticsEventProperties): void => {
  if (!isActive()) return;

  eventQueue.push({
    event,
    properties: {
      ...superProperties,
      ...(properties ?? {}),
    },
    timestamp: new Date().toISOString(),
  });

  if (eventQueue.length >= FLUSH_THRESHOLD) {
    flush();
  } else {
    scheduleFlush();
  }
};

/** Identify the current user */
const identifyUser = (newDistinctId: string, properties?: AnalyticsEventProperties): void => {
  if (!isActive()) return;

  const previousId = distinctId;
  distinctId = newDistinctId;

  // Persist the new distinct_id
  try {
    chrome.storage.local.set({ posthog_distinct_id: newDistinctId });
  } catch {
    // Silently ignore storage errors
  }

  // Send $identify event
  eventQueue.push({
    event: '$identify',
    properties: {
      ...superProperties,
      $anon_distinct_id: previousId,
      $set: properties ?? {},
    },
    timestamp: new Date().toISOString(),
  });

  flush();
};

/** Reset user identity (on logout) */
const resetUser = (): void => {
  if (!initialized) return;

  distinctId = generateAnonymousId();
  try {
    chrome.storage.local.set({ posthog_distinct_id: distinctId });
  } catch {
    // Silently ignore
  }
};

/** Check if PostHog has been initialized */
const isInitialized = (): boolean => initialized;

/** Set analytics opt-in/opt-out preference */
const setAnalyticsEnabled = (value: boolean): void => {
  userOptedIn = value;
  try {
    chrome.storage.local.set({ [ANALYTICS_STORAGE_KEY]: value });
    if (!value) {
      eventQueue.length = 0;
    }
  } catch {
    // Silently ignore
  }
};

/** Get current analytics enabled state */
const getAnalyticsEnabled = (): boolean => userOptedIn;

export {
  ANALYTICS_STORAGE_KEY,
  initPostHog,
  captureEvent,
  identifyUser,
  resetUser,
  isInitialized,
  setAnalyticsEnabled,
  getAnalyticsEnabled,
};
export type { PostHogContext };
