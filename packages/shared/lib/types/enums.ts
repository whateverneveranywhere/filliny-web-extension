/**
 * Enum definitions for field detection and form filling
 * These enums provide type-safe constants for common patterns
 */

/**
 * Field types supported by the form detection system
 * Maps to HTML input types and custom form elements
 * Note: This is an enum version. The string union type is in services/types/ai.ts
 */
import { z } from 'zod';

export enum FieldTypeEnum {
  TEXT = 'text',
  EMAIL = 'email',
  PASSWORD = 'password',
  NUMBER = 'number',
  TEL = 'tel',
  URL = 'url',
  SEARCH = 'search',
  DATE = 'date',
  DATETIME_LOCAL = 'datetime-local',
  MONTH = 'month',
  WEEK = 'week',
  TIME = 'time',
  COLOR = 'color',
  RANGE = 'range',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  TEXTAREA = 'textarea',
  FILE = 'file',
  BUTTON = 'button',
  FIELDSET = 'fieldset',
}

/**
 * Confidence levels for field detection scoring
 * Used to determine the reliability of field identification
 */
export enum ConfidenceLevel {
  /** Lowest acceptable confidence (0.4) - used for final detection pass */
  VERY_LOW = 0.4,
  /** Low confidence (0.5) - used for thorough detection pass */
  LOW = 0.5,
  /** Medium confidence (0.65) - standard detection threshold */
  MEDIUM = 0.65,
  /** High confidence (0.85) - ARIA and semantic elements */
  HIGH = 0.85,
  /** Very high confidence (0.95) - standard form elements */
  VERY_HIGH = 0.95,
}

/**
 * Detection confidence thresholds for different element types
 * Based on how reliably each element type can be identified as a form field
 */
export const ELEMENT_CONFIDENCE_THRESHOLDS = {
  /** Standard HTML input elements (input, select, textarea) */
  STANDARD_FORM_ELEMENTS: 35,
  /** ARIA form elements (textbox, combobox, checkbox, etc.) */
  ARIA_FORM_ELEMENTS: 45,
  /** Content editable elements */
  CONTENT_EDITABLE: 50,
  /** Default threshold for unknown element types */
  DEFAULT: 65,
} as const;

/**
 * Detection passes for progressive form detection
 * Each pass increases the thoroughness of detection
 */
export enum DetectionPass {
  /** Immediate detection with no delay */
  IMMEDIATE = 'immediate',
  /** Fast detection pass */
  FAST = 'fast',
  /** Medium detection pass */
  MEDIUM = 'medium',
  /** Thorough detection pass */
  THOROUGH = 'thorough',
  /** Final detection pass with lowest confidence threshold */
  FINAL = 'final',
}

/**
 * Delay values (in milliseconds) for each detection pass
 * Allows dynamic content to load before detection
 */
export const DETECTION_DELAYS: Record<DetectionPass, number> = {
  [DetectionPass.IMMEDIATE]: 0,
  [DetectionPass.FAST]: 500,
  [DetectionPass.MEDIUM]: 1500,
  [DetectionPass.THOROUGH]: 3000,
  [DetectionPass.FINAL]: 5000,
};

/**
 * Confidence thresholds for each detection pass
 * Lower thresholds allow more elements to be detected in later passes
 */
export const DETECTION_PASS_CONFIDENCE: Record<DetectionPass, number> = {
  [DetectionPass.IMMEDIATE]: 0.8,
  [DetectionPass.FAST]: 0.7,
  [DetectionPass.MEDIUM]: 0.6,
  [DetectionPass.THOROUGH]: 0.5,
  [DetectionPass.FINAL]: 0.4,
};

/**
 * Grouping strategies for organizing related fields
 * Used primarily for radio buttons and checkboxes
 */
export enum GroupingStrategy {
  /** Group by HTML name attribute */
  BY_NAME = 'by_name',
  /** Group by semantic container (fieldset, radiogroup, etc.) */
  BY_SEMANTIC_CONTAINER = 'by_semantic_container',
  /** Group by visual proximity */
  BY_PROXIMITY = 'by_proximity',
  /** Group by ARIA relationships */
  BY_ARIA_RELATIONSHIP = 'by_aria_relationship',
  /** Each element is treated individually */
  INDIVIDUAL = 'individual',
}

/**
 * Reasons for scoring adjustments during field detection
 * Used to explain why a field received a particular score
 */
export enum ScoreReason {
  // Positive scoring reasons (field indicators)
  /** Semantic form element (form, fieldset) */
  SEMANTIC_ELEMENT = 'semantic_element',
  /** ARIA form role attribute */
  ARIA_FORM_ROLE = 'aria_form_role',
  /** Form-related CSS class */
  FORM_CLASS = 'form_class',
  /** Form-related ID */
  FORM_ID = 'form_id',
  /** Contains form fields */
  HAS_FORM_FIELDS = 'has_form_fields',
  /** Contains submit button */
  HAS_SUBMIT_BUTTON = 'has_submit_button',
  /** Contains legend element */
  HAS_LEGEND = 'has_legend',
  /** Contains radio button groups */
  HAS_RADIO_GROUPS = 'has_radio_groups',
  /** Contains checkbox groups */
  HAS_CHECKBOX_GROUPS = 'has_checkbox_groups',
  /** Good field type diversity */
  FIELD_DIVERSITY = 'field_diversity',
  /** Reasonable element size */
  REASONABLE_SIZE = 'reasonable_size',
  /** Good field grouping pattern */
  GOOD_GROUPING = 'good_grouping',
  /** Contact form pattern detected */
  CONTACT_FORM_PATTERN = 'contact_form_pattern',
  /** Application form pattern detected */
  APPLICATION_FORM_PATTERN = 'application_form_pattern',
  /** Survey/preference form pattern detected */
  SURVEY_FORM_PATTERN = 'survey_form_pattern',
  /** Document upload form pattern detected */
  DOCUMENT_UPLOAD_PATTERN = 'document_upload_pattern',
  /** Framework-specific pattern (Material-UI, Ant Design, etc.) */
  FRAMEWORK_PATTERN = 'framework_pattern',
  /** Data attribute indicating form element */
  DATA_ATTRIBUTE = 'data_attribute',

  // Negative scoring reasons (penalties)
  /** No form fields found */
  NO_FIELDS = 'no_fields',
  /** Element is hidden */
  HIDDEN_ELEMENT = 'hidden_element',
  /** Element is too deeply nested */
  DEEP_NESTING = 'deep_nesting',
  /** Modal/popup container (may not be main form) */
  MODAL_CONTAINER = 'modal_container',
  /** Navigation element (not a form) */
  NAVIGATION_ELEMENT = 'navigation_element',
  /** Header/footer element (not a form) */
  HEADER_FOOTER_ELEMENT = 'header_footer_element',
  /** Sidebar element (not a form) */
  SIDEBAR_ELEMENT = 'sidebar_element',
}

/**
 * Framework detection patterns
 * Used to identify framework-specific form components
 */
export enum FrameworkPattern {
  /** Google Forms */
  GOOGLE_FORMS = 'google_forms',
  /** Material-UI / MUI */
  MATERIAL_UI = 'material_ui',
  /** Ant Design */
  ANT_DESIGN = 'ant_design',
  /** Chakra UI */
  CHAKRA_UI = 'chakra_ui',
  /** Bootstrap */
  BOOTSTRAP = 'bootstrap',
  /** Tailwind CSS */
  TAILWIND = 'tailwind',
  /** React Select */
  REACT_SELECT = 'react_select',
  /** Vue/Vuetify */
  VUE = 'vue',
  /** Angular Material */
  ANGULAR_MATERIAL = 'angular_material',
  /** Vanilla HTML */
  VANILLA = 'vanilla',
}

/**
 * Visibility states for form elements
 * Used to track element visibility across different contexts
 */
export enum VisibilityState {
  /** Element is fully visible */
  VISIBLE = 'visible',
  /** Element is hidden via CSS */
  HIDDEN = 'hidden',
  /** Element is in an inactive tab/accordion */
  INACTIVE_TAB = 'inactive_tab',
  /** Element is in a collapsed section */
  COLLAPSED = 'collapsed',
  /** Element is in a modal that's not shown */
  IN_MODAL = 'in_modal',
  /** Element has zero dimensions */
  ZERO_SIZE = 'zero_size',
  /** Element is off-screen */
  OFFSCREEN = 'offscreen',
}

/**
 * Timing constants used throughout field detection
 */
export const TIMING_CONSTANTS = {
  /** Time to wait for content stability (ms) */
  STABILITY_THRESHOLD: 1000,
  /** Maximum wait time for content stabilization (ms) */
  MAX_STABILITY_WAIT: 5000,
  /** Check interval for stability (ms) */
  STABILITY_CHECK_INTERVAL: 200,
  /** Retry delay for frame access (ms) */
  FRAME_RETRY_DELAY: 500,
  /** Maximum retries for frame access */
  MAX_FRAME_RETRIES: 3,
  /** API response processing delay (ms) */
  API_RESPONSE_DELAY: 100,
  /** Visual feedback duration (ms) */
  VISUAL_FEEDBACK_DURATION: 800,
  /** Test mode indicator duration (ms) */
  TEST_MODE_INDICATOR_DURATION: 3000,
} as const;

/**
 * Scoring thresholds for container detection
 */
export const CONTAINER_SCORING = {
  /** Minimum score for explicit form containers */
  EXPLICIT_CONTAINER_MIN: 50,
  /** Minimum score for implicit containers */
  IMPLICIT_CONTAINER_MIN: 50,
  /** Bonus multiplier for semantic containers */
  SEMANTIC_BONUS: 1.2,
  /** Penalty divisor for deep nesting */
  NESTING_PENALTY_START: 12,
  /** Maximum nesting penalty */
  MAX_NESTING_PENALTY: 40,
} as const;

/**
 * Field count thresholds for progressive scoring
 */
export const FIELD_COUNT_THRESHOLDS = {
  /** Threshold for high field count bonus */
  HIGH: 10,
  /** Threshold for medium field count bonus */
  MEDIUM: 5,
} as const;

/**
 * Chrome extension message types for chrome.runtime communication
 * Centralizes all message type constants for type safety
 */
export enum MessageType {
  /** API request from content script to background */
  API_REQUEST = 'API_REQUEST',
  /** Stream chunk from background to content script */
  STREAM_CHUNK = 'STREAM_CHUNK',
  /** Stream completed successfully */
  STREAM_DONE = 'STREAM_DONE',
  /** Stream error occurred */
  STREAM_ERROR = 'STREAM_ERROR',
  /** Extension was installed notification */
  EXTENSION_INSTALLED = 'EXTENSION_INSTALLED',
  /** Bearer token received from web app */
  SET_BEARER_TOKEN = 'SET_BEARER_TOKEN',
  /** Request to get current bearer token */
  GET_BEARER_TOKEN = 'GET_BEARER_TOKEN',
  /** Clear bearer token (logout) */
  CLEAR_BEARER_TOKEN = 'CLEAR_BEARER_TOKEN',
}

// NOTE: Framework is exported from utils/frameworkDetection.ts (single source of truth)
// Do NOT re-export here to avoid duplicate exports through the barrel files
// Import Framework directly from '@extension/shared' which exports it via utils/index.ts

/**
 * DOM Event types commonly used in form interactions
 * Provides type-safe event name constants
 */
export enum EventType {
  INPUT = 'input',
  CHANGE = 'change',
  FOCUS = 'focus',
  BLUR = 'blur',
  CLICK = 'click',
  KEYDOWN = 'keydown',
  KEYUP = 'keyup',
  KEYPRESS = 'keypress',
  SUBMIT = 'submit',
  RESET = 'reset',
}

/**
 * HTTP methods for API requests
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

/**
 * Error categories for structured error handling
 */
export enum ErrorCategory {
  /** Network-related errors (fetch failed, timeout, etc.) */
  NETWORK = 'network',
  /** Authentication errors (unauthorized, token expired) */
  AUTH = 'auth',
  /** Validation errors (invalid input, schema mismatch) */
  VALIDATION = 'validation',
  /** Permission errors (CORS, extension permissions) */
  PERMISSION = 'permission',
  /** Storage errors (quota exceeded, access denied) */
  STORAGE = 'storage',
  /** Field detection errors */
  DETECTION = 'detection',
  /** Form filling errors */
  FILLING = 'filling',
  /** Unknown/unexpected errors */
  UNKNOWN = 'unknown',
}

/**
 * Input field types for HTML input elements
 * Maps to standard HTML input type attribute values
 */
export const INPUT_TYPES = {
  TEXT: 'text',
  EMAIL: 'email',
  PASSWORD: 'password',
  NUMBER: 'number',
  TEL: 'tel',
  URL: 'url',
  SEARCH: 'search',
  DATE: 'date',
  DATETIME_LOCAL: 'datetime-local',
  MONTH: 'month',
  WEEK: 'week',
  TIME: 'time',
  COLOR: 'color',
  RANGE: 'range',
  HIDDEN: 'hidden',
} as const;

/**
 * Type for input field types
 */
export type InputType = (typeof INPUT_TYPES)[keyof typeof INPUT_TYPES];

/**
 * Text input types array for detection
 */
export const TEXT_INPUT_TYPES = [
  INPUT_TYPES.TEXT,
  INPUT_TYPES.EMAIL,
  INPUT_TYPES.PASSWORD,
  INPUT_TYPES.SEARCH,
  INPUT_TYPES.TEL,
  INPUT_TYPES.URL,
  INPUT_TYPES.NUMBER,
  INPUT_TYPES.DATE,
  INPUT_TYPES.DATETIME_LOCAL,
  INPUT_TYPES.MONTH,
  INPUT_TYPES.WEEK,
  INPUT_TYPES.TIME,
] as const;

/**
 * ARIA roles for form elements
 */
export const ARIA_ROLES = {
  TEXTBOX: 'textbox',
  COMBOBOX: 'combobox',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  SWITCH: 'switch',
  LISTBOX: 'listbox',
  SLIDER: 'slider',
  SPINBUTTON: 'spinbutton',
  SEARCHBOX: 'searchbox',
  OPTION: 'option',
  BUTTON: 'button',
  FORM: 'form',
  GROUP: 'group',
  RADIOGROUP: 'radiogroup',
  REGION: 'region',
  DIALOG: 'dialog',
  ALERTDIALOG: 'alertdialog',
  TABPANEL: 'tabpanel',
} as const;

/**
 * Type for ARIA roles
 */
export type AriaRole = (typeof ARIA_ROLES)[keyof typeof ARIA_ROLES];

/**
 * Interactive ARIA roles that indicate form fields
 */
export const INTERACTIVE_ARIA_ROLES = [
  ARIA_ROLES.TEXTBOX,
  ARIA_ROLES.COMBOBOX,
  ARIA_ROLES.CHECKBOX,
  ARIA_ROLES.RADIO,
  ARIA_ROLES.SWITCH,
  ARIA_ROLES.LISTBOX,
  ARIA_ROLES.SLIDER,
  ARIA_ROLES.SPINBUTTON,
  ARIA_ROLES.SEARCHBOX,
  ARIA_ROLES.OPTION,
] as const;

/**
 * Storage keys for Chrome extension storage
 */
export enum StorageKey {
  WEBAPP_ENV = 'webapp_env',
  AUTH_TOKEN = 'auth_token',
  USER_PREFERENCES = 'user_preferences',
  ACTIVE_PROFILE = 'active_profile',
  CACHED_PROFILES = 'cached_profiles',
}

/**
 * Web app environment identifiers
 */
export enum WebappEnvs {
  DEV = 'dev',
  PREVIEW = 'preview',
  PROD = 'prod',
}

/**
 * Zod schema for WebappEnvs validation
 */
export const WebappEnvsSchema = z.nativeEnum(WebappEnvs);

/**
 * Checkable field types
 */
export const CHECKABLE_TYPES = {
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  SWITCH: 'switch',
} as const;

/**
 * Type for checkable field types
 */
export type CheckableType = (typeof CHECKABLE_TYPES)[keyof typeof CHECKABLE_TYPES];

// ============================================================================
// Theme Enums
// ============================================================================

/**
 * Theme types for UI theming
 * Used for light/dark mode switching
 */
export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

/**
 * Binary theme type (without system option)
 * Used when a concrete theme value is required
 */
export enum BinaryTheme {
  LIGHT = 'light',
  DARK = 'dark',
}

// ============================================================================
// CLI Action Enums
// ============================================================================

/**
 * CLI action types for module manager
 * Used for feature deletion and recovery
 */
export enum CliAction {
  DELETE = 'delete',
  RECOVER = 'recover',
}

// ============================================================================
// UI Component Enums
// ============================================================================

/**
 * Button variant types for styled buttons
 */
export enum ButtonVariant {
  DEFAULT = 'default',
  DESTRUCTIVE = 'destructive',
  OUTLINE = 'outline',
  SECONDARY = 'secondary',
  GHOST = 'ghost',
  LINK = 'link',
}

/**
 * Button size types
 */
export enum ButtonSize {
  DEFAULT = 'default',
  SM = 'sm',
  LG = 'lg',
  ICON = 'icon',
}

/**
 * Badge variant types
 */
export enum BadgeVariant {
  DEFAULT = 'default',
  SECONDARY = 'secondary',
  DESTRUCTIVE = 'destructive',
  OUTLINE = 'outline',
}

/**
 * Alert variant types
 */
export enum AlertVariant {
  DEFAULT = 'default',
  DESTRUCTIVE = 'destructive',
}

// ============================================================================
// File Category Enums
// ============================================================================

/**
 * File category types for file uploads
 * Used to categorize accepted file types
 */
export enum FileCategory {
  IMAGE = 'image',
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio',
  ARCHIVE = 'archive',
  TEXT = 'text',
  OTHER = 'other',
}

// ============================================================================
// Log Level Enums
// ============================================================================

/**
 * Log level/severity types for logging and alerts
 */
export enum LogLevel {
  SUCCESS = 'success',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

// ============================================================================
// Form Input Variant Enums
// ============================================================================

/**
 * Text input variant types for form components
 */
export enum TextInputVariant {
  TEXT = 'text',
  CHECKBOX = 'checkbox',
  DATE = 'date',
  SWITCH = 'switch',
  NUMBER = 'number',
  URL = 'url',
  EMAIL = 'email',
  TEXTAREA = 'textarea',
}

/**
 * Options-based input variant types for form components
 */
export enum OptionsInputVariant {
  RADIO = 'radio',
  SELECT = 'select',
  COMBOBOX = 'combobox',
}
