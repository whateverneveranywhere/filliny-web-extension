/**
 * Analytics event definitions and property interfaces for PostHog tracking.
 * No form field values are tracked - only metadata (count, type, duration).
 */

/** All analytics events tracked by the extension */
export enum AnalyticsEvent {
  // Authentication
  USER_LOGGED_IN = 'user_logged_in',
  USER_LOGGED_OUT = 'user_logged_out',
  AUTH_ERROR = 'auth_error',

  // Form Filling - Core
  FORM_FILL_STARTED = 'form_fill_started',
  FORM_FILL_COMPLETED = 'form_fill_completed',
  FORM_FILL_ERROR = 'form_fill_error',
  SINGLE_FIELD_FILL_STARTED = 'single_field_fill_started',
  SINGLE_FIELD_FILL_COMPLETED = 'single_field_fill_completed',
  TEST_MODE_FILL_STARTED = 'test_mode_fill_started',

  // Form Detection
  FORMS_DETECTED = 'forms_detected',
  FORMS_HIGHLIGHTED = 'forms_highlighted',
  CROSS_ORIGIN_IFRAME_DETECTED = 'cross_origin_iframe_detected',

  // Quota & Billing
  QUOTA_EXHAUSTED = 'quota_exhausted',
  UPGRADE_PROMPT_SHOWN = 'upgrade_prompt_shown',
  UPGRADE_CLICKED = 'upgrade_clicked',
  QUOTA_LIMIT_APPROACHING = 'quota_limit_approaching',

  // Profile Management
  PROFILE_CREATED = 'profile_created',
  PROFILE_EDITED = 'profile_edited',
  PROFILE_DELETED = 'profile_deleted',
  PROFILE_SWITCHED = 'profile_switched',

  // Extension Lifecycle
  EXTENSION_INSTALLED = 'extension_installed',
  EXTENSION_UPDATED = 'extension_updated',
  SIDE_PANEL_OPENED = 'side_panel_opened',

  // Internal control events (used for cross-context message relay)
  /** Relay event to trigger user identification in the background context */
  INTERNAL_IDENTIFY = '__identify',
  /** Relay event to trigger user reset in the background context */
  INTERNAL_RESET = '__reset',
}

/** Property interfaces for type-safe event tracking */

export interface AuthEventProperties {
  method?: 'bearer' | 'cookie';
}

export interface AuthErrorProperties {
  status_code?: number;
}

export interface FormFillStartedProperties {
  field_count: number;
  form_count: number;
  has_context: boolean;
  has_authorized_files: boolean;
  website_domain: string;
}

export interface FormFillCompletedProperties {
  outcome: 'success' | 'partial' | 'failed';
  fields_total: number;
  fields_filled: number;
  fields_failed: number;
  duration_ms: number;
}

export interface FormFillErrorProperties {
  error_category: string;
  error_message: string;
}

export interface SingleFieldFillProperties {
  field_type: string;
}

export interface SingleFieldFillCompletedProperties {
  field_type: string;
  success: boolean;
  duration_ms: number;
}

export interface TestModeFillProperties {
  field_count: number;
}

export interface FormsDetectedProperties {
  form_count: number;
  field_count: number;
  website_domain: string;
}

export interface FormsHighlightedProperties {
  form_count: number;
}

export interface CrossOriginIframeProperties {
  website_domain: string;
}

export interface QuotaExhaustedProperties {
  tier: 'free' | 'pro';
}

export interface UpgradePromptProperties {
  tier: 'free' | 'pro';
  trigger: string;
}

export interface UpgradeClickedProperties {
  tier: 'free' | 'pro';
  source: string;
}

export interface QuotaLimitApproachingProperties {
  tier: 'free' | 'pro';
  remaining_percent: number;
}

export interface ProfileCreatedProperties {
  website_count: number;
}

export interface ExtensionInstalledProperties {
  version: string;
}

export interface ExtensionUpdatedProperties {
  version: string;
  previous_version: string;
}

/** Union type of all valid event property maps */
export type AnalyticsEventProperties = Record<string, string | number | boolean | undefined>;

/** Message payload sent from content-UI to background for analytics relay */
export interface AnalyticsMessage {
  event: AnalyticsEvent;
  properties?: AnalyticsEventProperties;
}
