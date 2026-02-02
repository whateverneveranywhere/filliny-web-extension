/**
 * Comprehensive unit tests for enum definitions
 * Tests field detection enums, confidence levels, and timing constants
 */
import {
  FieldTypeEnum,
  ConfidenceLevel,
  DetectionPass,
  GroupingStrategy,
  ScoreReason,
  FrameworkPattern,
  VisibilityState,
  MessageType,
  EventType,
  HttpMethod,
  ErrorCategory,
  StorageKey,
  WebappEnvs,
  ELEMENT_CONFIDENCE_THRESHOLDS,
  DETECTION_DELAYS,
  DETECTION_PASS_CONFIDENCE,
  TIMING_CONSTANTS,
  CONTAINER_SCORING,
  FIELD_COUNT_THRESHOLDS,
  INPUT_TYPES,
  ARIA_ROLES,
  INTERACTIVE_ARIA_ROLES,
  TEXT_INPUT_TYPES,
  CHECKABLE_TYPES,
} from '../types/enums.js';
import { describe, it, expect } from 'vitest';

describe('FieldTypeEnum', () => {
  it('should have all standard HTML input types', () => {
    expect(FieldTypeEnum.TEXT).toBe('text');
    expect(FieldTypeEnum.EMAIL).toBe('email');
    expect(FieldTypeEnum.PASSWORD).toBe('password');
    expect(FieldTypeEnum.NUMBER).toBe('number');
    expect(FieldTypeEnum.TEL).toBe('tel');
    expect(FieldTypeEnum.URL).toBe('url');
    expect(FieldTypeEnum.SEARCH).toBe('search');
  });

  it('should have date/time input types', () => {
    expect(FieldTypeEnum.DATE).toBe('date');
    expect(FieldTypeEnum.DATETIME_LOCAL).toBe('datetime-local');
    expect(FieldTypeEnum.MONTH).toBe('month');
    expect(FieldTypeEnum.WEEK).toBe('week');
    expect(FieldTypeEnum.TIME).toBe('time');
  });

  it('should have other field types', () => {
    expect(FieldTypeEnum.SELECT).toBe('select');
    expect(FieldTypeEnum.CHECKBOX).toBe('checkbox');
    expect(FieldTypeEnum.RADIO).toBe('radio');
    expect(FieldTypeEnum.TEXTAREA).toBe('textarea');
    expect(FieldTypeEnum.FILE).toBe('file');
    expect(FieldTypeEnum.BUTTON).toBe('button');
    expect(FieldTypeEnum.FIELDSET).toBe('fieldset');
  });
});

describe('ConfidenceLevel', () => {
  it('should have correct confidence values in order', () => {
    expect(ConfidenceLevel.VERY_LOW).toBe(0.4);
    expect(ConfidenceLevel.LOW).toBe(0.5);
    expect(ConfidenceLevel.MEDIUM).toBe(0.65);
    expect(ConfidenceLevel.HIGH).toBe(0.85);
    expect(ConfidenceLevel.VERY_HIGH).toBe(0.95);
  });

  it('should have values in ascending order', () => {
    expect(ConfidenceLevel.VERY_LOW).toBeLessThan(ConfidenceLevel.LOW);
    expect(ConfidenceLevel.LOW).toBeLessThan(ConfidenceLevel.MEDIUM);
    expect(ConfidenceLevel.MEDIUM).toBeLessThan(ConfidenceLevel.HIGH);
    expect(ConfidenceLevel.HIGH).toBeLessThan(ConfidenceLevel.VERY_HIGH);
  });
});

describe('DetectionPass', () => {
  it('should have all detection passes', () => {
    expect(DetectionPass.IMMEDIATE).toBe('immediate');
    expect(DetectionPass.FAST).toBe('fast');
    expect(DetectionPass.MEDIUM).toBe('medium');
    expect(DetectionPass.THOROUGH).toBe('thorough');
    expect(DetectionPass.FINAL).toBe('final');
  });
});

describe('DETECTION_DELAYS', () => {
  it('should have increasing delays for each pass', () => {
    expect(DETECTION_DELAYS[DetectionPass.IMMEDIATE]).toBe(0);
    expect(DETECTION_DELAYS[DetectionPass.FAST]).toBe(500);
    expect(DETECTION_DELAYS[DetectionPass.MEDIUM]).toBe(1500);
    expect(DETECTION_DELAYS[DetectionPass.THOROUGH]).toBe(3000);
    expect(DETECTION_DELAYS[DetectionPass.FINAL]).toBe(5000);
  });

  it('should have delays in ascending order', () => {
    const delays = Object.values(DETECTION_DELAYS);
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1]);
    }
  });
});

describe('DETECTION_PASS_CONFIDENCE', () => {
  it('should have decreasing confidence thresholds for each pass', () => {
    expect(DETECTION_PASS_CONFIDENCE[DetectionPass.IMMEDIATE]).toBe(0.8);
    expect(DETECTION_PASS_CONFIDENCE[DetectionPass.FAST]).toBe(0.7);
    expect(DETECTION_PASS_CONFIDENCE[DetectionPass.MEDIUM]).toBe(0.6);
    expect(DETECTION_PASS_CONFIDENCE[DetectionPass.THOROUGH]).toBe(0.5);
    expect(DETECTION_PASS_CONFIDENCE[DetectionPass.FINAL]).toBe(0.4);
  });

  it('should have thresholds in descending order', () => {
    expect(DETECTION_PASS_CONFIDENCE[DetectionPass.IMMEDIATE]).toBeGreaterThan(
      DETECTION_PASS_CONFIDENCE[DetectionPass.FAST],
    );
    expect(DETECTION_PASS_CONFIDENCE[DetectionPass.FAST]).toBeGreaterThan(
      DETECTION_PASS_CONFIDENCE[DetectionPass.MEDIUM],
    );
  });
});

describe('GroupingStrategy', () => {
  it('should have all grouping strategies', () => {
    expect(GroupingStrategy.BY_NAME).toBe('by_name');
    expect(GroupingStrategy.BY_SEMANTIC_CONTAINER).toBe('by_semantic_container');
    expect(GroupingStrategy.BY_PROXIMITY).toBe('by_proximity');
    expect(GroupingStrategy.BY_ARIA_RELATIONSHIP).toBe('by_aria_relationship');
    expect(GroupingStrategy.INDIVIDUAL).toBe('individual');
  });
});

describe('ScoreReason', () => {
  it('should have positive scoring reasons', () => {
    expect(ScoreReason.SEMANTIC_ELEMENT).toBe('semantic_element');
    expect(ScoreReason.ARIA_FORM_ROLE).toBe('aria_form_role');
    expect(ScoreReason.FORM_CLASS).toBe('form_class');
    expect(ScoreReason.HAS_FORM_FIELDS).toBe('has_form_fields');
    expect(ScoreReason.HAS_SUBMIT_BUTTON).toBe('has_submit_button');
  });

  it('should have negative scoring reasons', () => {
    expect(ScoreReason.NO_FIELDS).toBe('no_fields');
    expect(ScoreReason.HIDDEN_ELEMENT).toBe('hidden_element');
    expect(ScoreReason.DEEP_NESTING).toBe('deep_nesting');
    expect(ScoreReason.NAVIGATION_ELEMENT).toBe('navigation_element');
  });

  it('should have pattern detection reasons', () => {
    expect(ScoreReason.CONTACT_FORM_PATTERN).toBe('contact_form_pattern');
    expect(ScoreReason.APPLICATION_FORM_PATTERN).toBe('application_form_pattern');
    expect(ScoreReason.SURVEY_FORM_PATTERN).toBe('survey_form_pattern');
    expect(ScoreReason.FRAMEWORK_PATTERN).toBe('framework_pattern');
  });
});

describe('FrameworkPattern', () => {
  it('should have all framework patterns', () => {
    expect(FrameworkPattern.GOOGLE_FORMS).toBe('google_forms');
    expect(FrameworkPattern.MATERIAL_UI).toBe('material_ui');
    expect(FrameworkPattern.ANT_DESIGN).toBe('ant_design');
    expect(FrameworkPattern.CHAKRA_UI).toBe('chakra_ui');
    expect(FrameworkPattern.BOOTSTRAP).toBe('bootstrap');
    expect(FrameworkPattern.TAILWIND).toBe('tailwind');
    expect(FrameworkPattern.REACT_SELECT).toBe('react_select');
    expect(FrameworkPattern.VUE).toBe('vue');
    expect(FrameworkPattern.ANGULAR_MATERIAL).toBe('angular_material');
    expect(FrameworkPattern.VANILLA).toBe('vanilla');
  });
});

describe('VisibilityState', () => {
  it('should have all visibility states', () => {
    expect(VisibilityState.VISIBLE).toBe('visible');
    expect(VisibilityState.HIDDEN).toBe('hidden');
    expect(VisibilityState.INACTIVE_TAB).toBe('inactive_tab');
    expect(VisibilityState.COLLAPSED).toBe('collapsed');
    expect(VisibilityState.IN_MODAL).toBe('in_modal');
    expect(VisibilityState.ZERO_SIZE).toBe('zero_size');
    expect(VisibilityState.OFFSCREEN).toBe('offscreen');
  });
});

describe('TIMING_CONSTANTS', () => {
  it('should have all timing constants', () => {
    expect(TIMING_CONSTANTS.STABILITY_THRESHOLD).toBe(1000);
    expect(TIMING_CONSTANTS.MAX_STABILITY_WAIT).toBe(5000);
    expect(TIMING_CONSTANTS.STABILITY_CHECK_INTERVAL).toBe(200);
    expect(TIMING_CONSTANTS.FRAME_RETRY_DELAY).toBe(500);
    expect(TIMING_CONSTANTS.MAX_FRAME_RETRIES).toBe(3);
    expect(TIMING_CONSTANTS.API_RESPONSE_DELAY).toBe(100);
    expect(TIMING_CONSTANTS.VISUAL_FEEDBACK_DURATION).toBe(800);
    expect(TIMING_CONSTANTS.TEST_MODE_INDICATOR_DURATION).toBe(3000);
  });

  it('should have reasonable timing values', () => {
    // Stability threshold should be less than max wait
    expect(TIMING_CONSTANTS.STABILITY_THRESHOLD).toBeLessThan(TIMING_CONSTANTS.MAX_STABILITY_WAIT);

    // Check interval should be less than threshold
    expect(TIMING_CONSTANTS.STABILITY_CHECK_INTERVAL).toBeLessThan(TIMING_CONSTANTS.STABILITY_THRESHOLD);

    // All timings should be positive
    Object.values(TIMING_CONSTANTS).forEach(value => {
      expect(value).toBeGreaterThan(0);
    });
  });
});

describe('CONTAINER_SCORING', () => {
  it('should have all scoring constants', () => {
    expect(CONTAINER_SCORING.EXPLICIT_CONTAINER_MIN).toBe(50);
    expect(CONTAINER_SCORING.IMPLICIT_CONTAINER_MIN).toBe(50);
    expect(CONTAINER_SCORING.SEMANTIC_BONUS).toBe(1.2);
    expect(CONTAINER_SCORING.NESTING_PENALTY_START).toBe(12);
    expect(CONTAINER_SCORING.MAX_NESTING_PENALTY).toBe(40);
  });

  it('should have semantic bonus greater than 1', () => {
    expect(CONTAINER_SCORING.SEMANTIC_BONUS).toBeGreaterThan(1);
  });
});

describe('FIELD_COUNT_THRESHOLDS', () => {
  it('should have field count thresholds', () => {
    expect(FIELD_COUNT_THRESHOLDS.HIGH).toBe(10);
    expect(FIELD_COUNT_THRESHOLDS.MEDIUM).toBe(5);
  });

  it('should have HIGH greater than MEDIUM', () => {
    expect(FIELD_COUNT_THRESHOLDS.HIGH).toBeGreaterThan(FIELD_COUNT_THRESHOLDS.MEDIUM);
  });
});

describe('ELEMENT_CONFIDENCE_THRESHOLDS', () => {
  it('should have all element type thresholds', () => {
    expect(ELEMENT_CONFIDENCE_THRESHOLDS.STANDARD_FORM_ELEMENTS).toBe(35);
    expect(ELEMENT_CONFIDENCE_THRESHOLDS.ARIA_FORM_ELEMENTS).toBe(45);
    expect(ELEMENT_CONFIDENCE_THRESHOLDS.CONTENT_EDITABLE).toBe(50);
    expect(ELEMENT_CONFIDENCE_THRESHOLDS.DEFAULT).toBe(65);
  });

  it('should have thresholds in ascending order by specificity', () => {
    expect(ELEMENT_CONFIDENCE_THRESHOLDS.STANDARD_FORM_ELEMENTS).toBeLessThan(
      ELEMENT_CONFIDENCE_THRESHOLDS.ARIA_FORM_ELEMENTS,
    );
    expect(ELEMENT_CONFIDENCE_THRESHOLDS.ARIA_FORM_ELEMENTS).toBeLessThan(
      ELEMENT_CONFIDENCE_THRESHOLDS.CONTENT_EDITABLE,
    );
    expect(ELEMENT_CONFIDENCE_THRESHOLDS.CONTENT_EDITABLE).toBeLessThan(ELEMENT_CONFIDENCE_THRESHOLDS.DEFAULT);
  });
});

describe('MessageType', () => {
  it('should have all message types', () => {
    expect(MessageType.API_REQUEST).toBe('API_REQUEST');
    expect(MessageType.STREAM_CHUNK).toBe('STREAM_CHUNK');
    expect(MessageType.STREAM_DONE).toBe('STREAM_DONE');
    expect(MessageType.STREAM_ERROR).toBe('STREAM_ERROR');
    expect(MessageType.EXTENSION_INSTALLED).toBe('EXTENSION_INSTALLED');
  });
});

describe('EventType', () => {
  it('should have all event types', () => {
    expect(EventType.INPUT).toBe('input');
    expect(EventType.CHANGE).toBe('change');
    expect(EventType.FOCUS).toBe('focus');
    expect(EventType.BLUR).toBe('blur');
    expect(EventType.CLICK).toBe('click');
    expect(EventType.KEYDOWN).toBe('keydown');
    expect(EventType.KEYUP).toBe('keyup');
    expect(EventType.KEYPRESS).toBe('keypress');
    expect(EventType.SUBMIT).toBe('submit');
    expect(EventType.RESET).toBe('reset');
  });
});

describe('HttpMethod', () => {
  it('should have all HTTP methods', () => {
    expect(HttpMethod.GET).toBe('GET');
    expect(HttpMethod.POST).toBe('POST');
    expect(HttpMethod.PUT).toBe('PUT');
    expect(HttpMethod.PATCH).toBe('PATCH');
    expect(HttpMethod.DELETE).toBe('DELETE');
  });
});

describe('ErrorCategory', () => {
  it('should have all error categories', () => {
    expect(ErrorCategory.NETWORK).toBe('network');
    expect(ErrorCategory.AUTH).toBe('auth');
    expect(ErrorCategory.VALIDATION).toBe('validation');
    expect(ErrorCategory.PERMISSION).toBe('permission');
    expect(ErrorCategory.STORAGE).toBe('storage');
    expect(ErrorCategory.DETECTION).toBe('detection');
    expect(ErrorCategory.FILLING).toBe('filling');
    expect(ErrorCategory.UNKNOWN).toBe('unknown');
  });
});

describe('StorageKey', () => {
  it('should have all storage keys', () => {
    expect(StorageKey.WEBAPP_ENV).toBe('webapp_env');
    expect(StorageKey.AUTH_TOKEN).toBe('auth_token');
    expect(StorageKey.USER_PREFERENCES).toBe('user_preferences');
    expect(StorageKey.ACTIVE_PROFILE).toBe('active_profile');
    expect(StorageKey.CACHED_PROFILES).toBe('cached_profiles');
  });
});

describe('WebappEnvs', () => {
  it('should have all environment values', () => {
    expect(WebappEnvs.DEV).toBe('dev');
    expect(WebappEnvs.PREVIEW).toBe('preview');
    expect(WebappEnvs.PROD).toBe('prod');
  });
});

describe('INPUT_TYPES', () => {
  it('should have all input types', () => {
    expect(INPUT_TYPES.TEXT).toBe('text');
    expect(INPUT_TYPES.EMAIL).toBe('email');
    expect(INPUT_TYPES.PASSWORD).toBe('password');
    expect(INPUT_TYPES.NUMBER).toBe('number');
    expect(INPUT_TYPES.TEL).toBe('tel');
    expect(INPUT_TYPES.URL).toBe('url');
    expect(INPUT_TYPES.SEARCH).toBe('search');
    expect(INPUT_TYPES.DATE).toBe('date');
    expect(INPUT_TYPES.HIDDEN).toBe('hidden');
  });
});

describe('ARIA_ROLES', () => {
  it('should have form field ARIA roles', () => {
    expect(ARIA_ROLES.TEXTBOX).toBe('textbox');
    expect(ARIA_ROLES.COMBOBOX).toBe('combobox');
    expect(ARIA_ROLES.CHECKBOX).toBe('checkbox');
    expect(ARIA_ROLES.RADIO).toBe('radio');
    expect(ARIA_ROLES.SWITCH).toBe('switch');
    expect(ARIA_ROLES.LISTBOX).toBe('listbox');
    expect(ARIA_ROLES.SLIDER).toBe('slider');
    expect(ARIA_ROLES.SPINBUTTON).toBe('spinbutton');
    expect(ARIA_ROLES.SEARCHBOX).toBe('searchbox');
  });

  it('should have container ARIA roles', () => {
    expect(ARIA_ROLES.FORM).toBe('form');
    expect(ARIA_ROLES.GROUP).toBe('group');
    expect(ARIA_ROLES.RADIOGROUP).toBe('radiogroup');
    expect(ARIA_ROLES.REGION).toBe('region');
    expect(ARIA_ROLES.DIALOG).toBe('dialog');
  });
});

describe('INTERACTIVE_ARIA_ROLES', () => {
  it('should be an array of interactive roles', () => {
    expect(Array.isArray(INTERACTIVE_ARIA_ROLES)).toBe(true);
    expect(INTERACTIVE_ARIA_ROLES).toContain('textbox');
    expect(INTERACTIVE_ARIA_ROLES).toContain('combobox');
    expect(INTERACTIVE_ARIA_ROLES).toContain('checkbox');
    expect(INTERACTIVE_ARIA_ROLES).toContain('radio');
    expect(INTERACTIVE_ARIA_ROLES).toContain('listbox');
  });

  it('should not contain non-interactive roles', () => {
    expect(INTERACTIVE_ARIA_ROLES).not.toContain('form');
    expect(INTERACTIVE_ARIA_ROLES).not.toContain('group');
    expect(INTERACTIVE_ARIA_ROLES).not.toContain('region');
  });
});

describe('TEXT_INPUT_TYPES', () => {
  it('should be an array of text-like input types', () => {
    expect(Array.isArray(TEXT_INPUT_TYPES)).toBe(true);
    expect(TEXT_INPUT_TYPES).toContain('text');
    expect(TEXT_INPUT_TYPES).toContain('email');
    expect(TEXT_INPUT_TYPES).toContain('password');
    expect(TEXT_INPUT_TYPES).toContain('search');
    expect(TEXT_INPUT_TYPES).toContain('tel');
    expect(TEXT_INPUT_TYPES).toContain('url');
    expect(TEXT_INPUT_TYPES).toContain('number');
  });

  it('should not contain non-text input types', () => {
    expect(TEXT_INPUT_TYPES).not.toContain('checkbox');
    expect(TEXT_INPUT_TYPES).not.toContain('radio');
    expect(TEXT_INPUT_TYPES).not.toContain('file');
    expect(TEXT_INPUT_TYPES).not.toContain('hidden');
  });
});

describe('CHECKABLE_TYPES', () => {
  it('should have all checkable types', () => {
    expect(CHECKABLE_TYPES.CHECKBOX).toBe('checkbox');
    expect(CHECKABLE_TYPES.RADIO).toBe('radio');
    expect(CHECKABLE_TYPES.SWITCH).toBe('switch');
  });
});
