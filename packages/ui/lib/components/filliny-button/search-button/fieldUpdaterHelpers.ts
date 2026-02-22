import { updateCheckable, isValueChecked, matchesCheckboxValue } from './field-types/checkable';
import { updateFileInput } from './field-types/file';
import { updateSelect } from './field-types/select';
import { updateTextField, updateContentEditable } from './field-types/text';
import {
  addVisualFeedback,
  getStringValue,
  setNativeValue,
  invokeReactOnChange,
  isHoneypotField,
  isElementAttached,
  simulatePaste,
  simulateTyping,
} from './field-types/utils';
import { formFillStore } from './stores';
import { unifiedFieldRegistry } from './unifiedFieldDetection.js';
import { createDebugLogger, FieldTypeEnum, StreamingErrorSchema, StreamingFieldDataSchema } from '@extension/shared';
import type { PartialFieldValueMap } from './stores';
import type { Field, StreamingFieldData } from '@extension/shared';

const debug = createDebugLogger('FieldUpdater');

/**
 * Union type representing all possible field values
 * This replaces 'unknown' with a proper typed union
 */
type FieldValue = string | string[] | boolean | number | undefined;

// ----------------------------------------
// Verification & Recovery Types
// ----------------------------------------

/**
 * Result of verifying a single field after fill
 */
interface FieldVerificationEntry {
  fieldId: string;
  expectedValue: FieldValue;
  actualValue: FieldValue;
  passed: boolean;
  retried: boolean;
  retriedSuccessfully: boolean;
  strategy: string;
}

/**
 * Aggregated results from batch verification
 */
interface BatchVerificationResults {
  totalFields: number;
  verified: number;
  failed: number;
  retried: number;
  retriedSuccessfully: number;
  entries: FieldVerificationEntry[];
}

// ----------------------------------------
// Named Update Strategies (escalating order)
// ----------------------------------------

/**
 * Ordered list of escalating field update strategies.
 * Each retry attempt uses the next strategy in this list
 * instead of repeating the same approach.
 */
const FIELD_UPDATE_STRATEGIES = [
  'standard', // Default updateField path (native setter + framework events)
  'native-setter', // Direct native value setter with React onChange
  'composition-events', // Composition events for IME-aware frameworks
  'paste-simulation', // Simulate clipboard paste event
  'char-by-char', // Character-by-character typing with natural delays
] as const;

type FieldUpdateStrategy = (typeof FIELD_UPDATE_STRATEGIES)[number];

// ----------------------------------------
// Field Value Reading & Element Finding Helpers
// ----------------------------------------

/**
 * Read the current DOM value of a field element.
 * Works across input types, selects, textareas, contentEditable, and ARIA elements.
 */
const getCurrentFieldValue = (element: HTMLElement): FieldValue => {
  if (element instanceof HTMLInputElement) {
    switch (element.type) {
      case FieldTypeEnum.CHECKBOX:
      case FieldTypeEnum.RADIO:
        return element.checked;
      case FieldTypeEnum.FILE:
        return element.files && element.files.length > 0 ? Array.from(element.files).map(f => f.name) : undefined;
      default:
        return element.value;
    }
  }

  if (element instanceof HTMLSelectElement) {
    if (element.multiple) {
      return Array.from(element.selectedOptions).map(opt => opt.value);
    }
    return element.value;
  }

  if (element instanceof HTMLTextAreaElement) {
    return element.value;
  }

  if (element.isContentEditable) {
    return element.textContent ?? '';
  }

  // ARIA checkbox/switch
  const role = element.getAttribute('role');
  if (role === FieldTypeEnum.CHECKBOX || role === 'switch') {
    return element.getAttribute('aria-checked') === 'true';
  }

  // ARIA textbox
  if (role === 'textbox' || role === 'searchbox') {
    return element.textContent ?? '';
  }

  return undefined;
};

/**
 * Generate a simple test value for a given field type.
 * Used by silentFieldTest to probe a field before user fills.
 */
const generateTestValue = (fieldType: string): string => {
  switch (fieldType) {
    case FieldTypeEnum.EMAIL:
      return 'test@filliny.io';
    case FieldTypeEnum.TEL:
      return '+10000000000';
    case FieldTypeEnum.URL:
      return 'https://filliny.io';
    case FieldTypeEnum.NUMBER:
      return '42';
    case FieldTypeEnum.DATE:
      return '2024-01-01';
    case FieldTypeEnum.COLOR:
      return '#ff0000';
    default:
      return 'filliny_test';
  }
};

/**
 * Restore a field element to a previous value.
 * Used after silentFieldTest to undo the test probe.
 */
const restoreFieldValue = (element: HTMLElement, previousValue: FieldValue): void => {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const strValue = typeof previousValue === 'string' ? previousValue : String(previousValue ?? '');
    setNativeValue(element, strValue);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (element instanceof HTMLSelectElement) {
    const strValue = typeof previousValue === 'string' ? previousValue : String(previousValue ?? '');
    setNativeValue(element, strValue);
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (element.isContentEditable) {
    element.textContent = String(previousValue ?? '');
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
};

/**
 * Find a field element using the registry first, then fallback to DOM query by data-filliny-id.
 * Used for error recovery when the cached element reference becomes stale.
 */
const findFieldElement = (fieldId: string): HTMLElement | null => {
  // Strategy 1: Registry lookup
  const fieldInfo = unifiedFieldRegistry.getField(fieldId);
  if (fieldInfo?.element && isElementAttached(fieldInfo.element)) {
    return fieldInfo.element;
  }

  // Strategy 2: DOM query by data-filliny-id
  const domElement = document.querySelector<HTMLElement>(`[data-filliny-id="${fieldId}"]`);
  if (domElement && isElementAttached(domElement)) {
    return domElement;
  }

  return null;
};

/**
 * Apply a value to a field using a specific named strategy.
 * This enables per-retry escalation instead of repeating the same approach.
 */
const applyValueWithStrategy = async (
  element: HTMLElement,
  value: string,
  strategy: FieldUpdateStrategy,
): Promise<void> => {
  switch (strategy) {
    case 'standard':
      // Standard path: native setter + standard events
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        setNativeValue(element, value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (element.isContentEditable) {
        element.textContent = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
      break;

    case 'native-setter':
      // Native setter + React props onChange
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        setNativeValue(element, value);
        invokeReactOnChange(element);
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
      break;

    case 'composition-events':
      // Composition events for IME-aware frameworks
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        setNativeValue(element, value);
        element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
        element.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data: value }));
        element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: value }));
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
      break;

    case 'paste-simulation':
      // Simulate clipboard paste
      simulatePaste(element, value);
      break;

    case 'char-by-char':
      // Character-by-character typing with natural delays
      await simulateTyping(element, value);
      break;
  }
};

/**
 * Silently test ONE field before user-initiated fill.
 * Saves original value, sets test value, verifies it took, then restores original.
 * Returns true if the fill mechanism works for this field type.
 */
const silentFieldTest = async (element: HTMLElement, field: Field): Promise<{ success: boolean; strategy: string }> => {
  const originalValue = getCurrentFieldValue(element);
  const testValue = generateTestValue(field.type);

  debug.log(`Silent field test for ${field.id} (${field.type})`);

  for (const strategy of FIELD_UPDATE_STRATEGIES) {
    try {
      // Apply test value using the current strategy
      await applyValueWithStrategy(element, testValue, strategy);

      // Brief wait for framework processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Read back
      const currentValue = getCurrentFieldValue(element);
      const matched =
        typeof currentValue === 'string' ? currentValue === testValue : String(currentValue) === testValue;

      if (matched) {
        debug.log(`Silent test passed with strategy "${strategy}" for ${field.id}`);
        // Restore original value
        restoreFieldValue(element, originalValue);
        await new Promise(resolve => setTimeout(resolve, 30));
        return { success: true, strategy };
      }
    } catch (error) {
      debug.log(`Silent test strategy "${strategy}" failed for ${field.id}:`, error);
    }
  }

  // Restore original value even if all strategies failed
  restoreFieldValue(element, originalValue);
  await new Promise(resolve => setTimeout(resolve, 30));
  return { success: false, strategy: 'none' };
};

// Error Categorization
// ----------------------------------------

/**
 * Enumeration of error categories for better error handling and user feedback
 */
enum ErrorCategory {
  DETECTION_FAILED = 'detection_failed',
  ELEMENT_NOT_FOUND = 'element_not_found',
  UPDATE_FAILED = 'update_failed',
  VERIFICATION_FAILED = 'verification_failed',
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
}

/**
 * Custom error class for field update errors with categorization
 */
class FieldUpdateError extends Error {
  public readonly category: ErrorCategory;
  public readonly fieldId: string;
  public readonly originalError?: Error;

  constructor(message: string, category: ErrorCategory, fieldId: string, originalError?: Error) {
    super(message);
    this.name = 'FieldUpdateError';
    this.category = category;
    this.fieldId = fieldId;
    this.originalError = originalError;
  }
}

/**
 * Result of a field update operation
 */
interface FieldUpdateResult {
  success: boolean;
  fieldId: string;
  error?: FieldUpdateError;
  retryCount?: number;
  strategy?: string;
}

/**
 * Categorize an error based on its type and message
 */
const categorizeError = (error: unknown, fieldId: string): FieldUpdateError => {
  if (error instanceof FieldUpdateError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const originalError = error instanceof Error ? error : undefined;

  // Timeout errors
  if (message.toLowerCase().includes('timeout')) {
    return new FieldUpdateError(
      `Operation timed out for field ${fieldId}`,
      ErrorCategory.TIMEOUT,
      fieldId,
      originalError,
    );
  }

  // Network errors
  if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
    return new FieldUpdateError(
      `Network error for field ${fieldId}`,
      ErrorCategory.NETWORK_ERROR,
      fieldId,
      originalError,
    );
  }

  // Element not found
  if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('null')) {
    return new FieldUpdateError(
      `Element not found for field ${fieldId}`,
      ErrorCategory.ELEMENT_NOT_FOUND,
      fieldId,
      originalError,
    );
  }

  // Default to update failed
  return new FieldUpdateError(
    `Update failed for field ${fieldId}: ${message}`,
    ErrorCategory.UPDATE_FAILED,
    fieldId,
    originalError,
  );
};

// Timeout utilities
// ----------------------------------------

/**
 * Default timeout for field update operations in milliseconds
 */
const DEFAULT_FIELD_UPDATE_TIMEOUT = 10000;

/**
 * Wrap a promise with a timeout mechanism
 * Returns a cleanup function to clear the timeout if needed
 */
const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  fieldId: string,
): { promise: Promise<T>; cleanup: () => void } => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new FieldUpdateError(`Operation timed out after ${ms}ms`, ErrorCategory.TIMEOUT, fieldId));
    }, ms);
  });

  const cleanup = (): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const wrappedPromise = Promise.race([promise, timeoutPromise]).finally(cleanup);

  return { promise: wrappedPromise, cleanup };
};

// Core utilities for field updates
// ----------------------------------------

/**
 * Enhanced field update with retry mechanism using escalating strategies.
 * Each retry attempt uses a DIFFERENT strategy from FIELD_UPDATE_STRATEGIES
 * for better coverage of framework-specific quirks.
 * Includes error recovery: if an element is stale, re-finds it by data-filliny-id.
 *
 * @param element - The HTML element to update
 * @param field - The field data containing the value to set
 * @param isTestMode - Whether this is a test mode fill
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param timeoutMs - Timeout for each attempt in milliseconds (default: 10000)
 * @returns FieldUpdateResult with success status, strategy used, and any errors
 */
const updateFieldWithRetry = async (
  element: HTMLElement,
  field: Field,
  isTestMode: boolean,
  maxRetries: number = 3,
  timeoutMs: number = DEFAULT_FIELD_UPDATE_TIMEOUT,
): Promise<FieldUpdateResult> => {
  let lastError: FieldUpdateError | undefined;
  let currentElement = element;
  // Cap retries to available strategies
  const effectiveMaxRetries = Math.min(maxRetries, FIELD_UPDATE_STRATEGIES.length);

  for (let attempt = 1; attempt <= effectiveMaxRetries; attempt++) {
    let cleanup: (() => void) | undefined;
    const strategyName = FIELD_UPDATE_STRATEGIES[attempt - 1] ?? 'standard';

    try {
      // Error recovery: check if element is still attached, re-find if stale
      if (!isElementAttached(currentElement)) {
        debug.log(`Element stale on attempt ${attempt} for ${field.id}, attempting re-find`);
        const refound = findFieldElement(field.id);
        if (refound) {
          currentElement = refound;
        } else {
          lastError = new FieldUpdateError(
            `Element detached and could not be re-found for ${field.id}`,
            ErrorCategory.ELEMENT_NOT_FOUND,
            field.id,
          );
          break;
        }
      }

      // First attempt uses the standard updateField path
      if (attempt === 1) {
        const updatePromise = updateField(currentElement, field, isTestMode);
        const { promise: timedPromise, cleanup: timeoutCleanup } = withTimeout(updatePromise, timeoutMs, field.id);
        cleanup = timeoutCleanup;
        await timedPromise;
      } else {
        // Subsequent attempts use escalating strategies
        const valueToUse =
          isTestMode && field.testValue !== undefined ? String(field.testValue) : String(field.value ?? '');
        debug.log(`Retry ${attempt} for ${field.id} using strategy "${strategyName}"`);
        const strategyPromise = applyValueWithStrategy(currentElement, valueToUse, strategyName);
        const { promise: timedPromise, cleanup: timeoutCleanup } = withTimeout(strategyPromise, timeoutMs, field.id);
        cleanup = timeoutCleanup;
        await timedPromise;
      }

      // Verify the update was successful with its own timeout
      const verifyPromise = verifyFieldUpdate(currentElement, field, isTestMode);
      const { promise: timedVerifyPromise, cleanup: verifyCleanup } = withTimeout(
        verifyPromise,
        timeoutMs / 2,
        field.id,
      );
      cleanup = verifyCleanup;

      const verified = await timedVerifyPromise;

      if (verified) {
        debug.log(`Field ${field.id} updated and verified (attempt ${attempt}, strategy: ${strategyName})`);
        // Record strategy result in the store
        formFillStore.getState().recordStrategyResult(strategyName, true);
        return { success: true, fieldId: field.id, retryCount: attempt - 1, strategy: strategyName };
      }

      // Verification failed - create specific error
      lastError = new FieldUpdateError(
        `Verification failed for field ${field.id} (strategy: ${strategyName})`,
        ErrorCategory.VERIFICATION_FAILED,
        field.id,
      );

      formFillStore.getState().recordStrategyResult(strategyName, false);

      if (attempt < effectiveMaxRetries) {
        debug.log(
          `Field update verification failed for ${field.id}, retrying (attempt ${attempt}/${effectiveMaxRetries})`,
        );
        // Exponential backoff with jitter
        const delay = Math.min(100 * Math.pow(2, attempt - 1) + Math.random() * 50, 2000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      // Ensure cleanup is called on error
      if (cleanup) {
        cleanup();
      }

      lastError = categorizeError(error, field.id);
      debug.error(
        `Error updating field ${field.id} (attempt ${attempt}/${effectiveMaxRetries}, strategy: ${strategyName}):`,
        lastError,
      );

      formFillStore.getState().recordStrategyResult(strategyName, false);

      // Error recovery: try to re-find the element for next attempt
      if (attempt < effectiveMaxRetries) {
        const refound = findFieldElement(field.id);
        if (refound) {
          currentElement = refound;
          debug.log(`Re-found element for ${field.id} after error, will retry`);
        }

        // Exponential backoff with jitter
        const delay = Math.min(100 * Math.pow(2, attempt - 1) + Math.random() * 50, 2000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted
  const finalError =
    lastError ||
    new FieldUpdateError(
      `Failed to update field ${field.id} after ${effectiveMaxRetries} attempts`,
      ErrorCategory.UPDATE_FAILED,
      field.id,
    );

  debug.error(`All retry attempts exhausted for field ${field.id}:`, finalError);
  return { success: false, fieldId: field.id, error: finalError, retryCount: effectiveMaxRetries };
};

/**
 * Immediate synchronous verification of field value (Step 1)
 */
const verifyFieldValueImmediate = (element: HTMLElement, expectedValue: FieldValue): boolean => {
  if (element instanceof HTMLInputElement) {
    switch (element.type) {
      case FieldTypeEnum.CHECKBOX:
      case FieldTypeEnum.RADIO: {
        const expectedChecked = isValueChecked(expectedValue);
        return element.checked === expectedChecked;
      }
      case FieldTypeEnum.FILE:
        return element.hasAttribute('data-filliny-file') || element.hasAttribute('data-filliny-files');
      default:
        return element.value === String(expectedValue || '');
    }
  } else if (element instanceof HTMLSelectElement) {
    if (Array.isArray(expectedValue)) {
      const selectedValues = Array.from(element.selectedOptions).map(opt => opt.value);
      return expectedValue.every(val => selectedValues.includes(String(val)));
    } else {
      return element.value === String(expectedValue || '');
    }
  } else if (element instanceof HTMLTextAreaElement) {
    return element.value === String(expectedValue || '');
  } else if (element.isContentEditable) {
    return element.textContent === String(expectedValue || '');
  } else if (element.getAttribute('role') === FieldTypeEnum.CHECKBOX || element.getAttribute('role') === 'switch') {
    const expectedChecked = isValueChecked(expectedValue);
    return element.getAttribute('aria-checked') === String(expectedChecked);
  }

  return true;
};

/**
 * Verify that a field update was successful with multi-step async verification
 */
const verifyFieldUpdate = async (element: HTMLElement, field: Field, isTestMode: boolean): Promise<boolean> => {
  const expectedValue = isTestMode && field.testValue !== undefined ? field.testValue : field.value;

  try {
    // Step 1: Immediate synchronous check
    const immediateResult = verifyFieldValueImmediate(element, expectedValue);
    if (immediateResult) return true;

    // Step 2: requestAnimationFrame check (after paint)
    const rafCheck = await new Promise<boolean>(resolve => {
      requestAnimationFrame(() => {
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          resolve(element.value === String(expectedValue || ''));
        } else if (element instanceof HTMLSelectElement) {
          resolve(element.value === String(expectedValue || ''));
        } else {
          resolve(true);
        }
      });
    });
    if (rafCheck) return true;

    // Step 3: Delayed check (50ms for framework processing)
    await new Promise(resolve => setTimeout(resolve, 50));
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      if (element.value === String(expectedValue || '')) return true;
    }

    // Step 4: If value was reverted, re-apply using escalating strategies
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      if (element.value !== String(expectedValue || '')) {
        const expectedStr = String(expectedValue || '');

        // Try native setter
        setNativeValue(element, expectedStr);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));

        await new Promise(resolve => setTimeout(resolve, 50));
        if (element.value === expectedStr) return true;

        // Try React props onChange
        setNativeValue(element, expectedStr);
        invokeReactOnChange(element);

        await new Promise(resolve => setTimeout(resolve, 50));
        return element.value === expectedStr;
      }
    }

    // For other elements, assume success if no error was thrown
    return true;
  } catch (error) {
    debug.error('Error verifying field update:', error);
    return false;
  }
};

// Main field updating function
// ----------------------------------------

/**
 * Update a form field with the provided value
 * This is the main entry point for field updates
 */
const updateField = async (element: HTMLElement, field: Field, isTestMode = false): Promise<void> => {
  // Defensive programming: validate inputs
  if (!element || !field) {
    debug.warn('updateField: Invalid element or field provided');
    return;
  }

  // Skip honeypot fields to prevent silent form rejection
  if (isHoneypotField(element)) {
    debug.log(`Skipping honeypot field: ${field.id}`);
    return;
  }

  // Check if element is still attached to the DOM
  if (!isElementAttached(element)) {
    debug.log(`Element is stale, attempting re-find for field: ${field.id}`);
    const refound = document.querySelector(`[data-filliny-id="${field.id}"]`) as HTMLElement | null;
    if (refound && isElementAttached(refound)) {
      element = refound;
    } else {
      debug.warn(`Could not re-find stale element for field: ${field.id}`);
      return;
    }
  }

  try {
    // Skip elements that shouldn't be updated
    if (
      element.hasAttribute('disabled') ||
      element.hasAttribute('readonly') ||
      element.getAttribute('aria-readonly') === 'true'
    ) {
      debug.log(`Skipping disabled/readonly field: ${field.id}`);
      return;
    }

    // Add visual feedback with error handling
    try {
      addVisualFeedback(element);
    } catch (visualError) {
      debug.log('Error adding visual feedback:', visualError);
    }

    // Get the value to use - ensure it's never undefined
    const valueToUse =
      isTestMode && field.testValue !== undefined ? field.testValue : field.value !== undefined ? field.value : '';

    debug.log(`Updating field ${field.id} (${field.type}) with value:`, valueToUse);

    // Special handling for test mode - mark the field visually
    if (isTestMode) {
      try {
        // Add a test mode indicator
        element.setAttribute('data-filliny-test-mode', 'true');

        // Store the value used for testing in a data attribute for debugging
        element.setAttribute('data-filliny-test-value', getStringValue(valueToUse));
      } catch (testModeError) {
        debug.log('Error setting test mode attributes:', testModeError);
      }
    }

    // Handle each element type with enhanced error handling.
    // Priority: native element type checks first, then field.type-based routing
    // for custom components (e.g. React Select, MUI Select) that use <div> elements.
    if (element instanceof HTMLInputElement) {
      await updateInputElement(element, field, valueToUse, isTestMode);
    } else if (element instanceof HTMLSelectElement) {
      debug.log(`Processing select ${element.id || element.name || 'unnamed'}`);
      const selectValue = valueToUse !== undefined ? valueToUse : '';
      await updateSelect(element, selectValue);
    } else if (element instanceof HTMLTextAreaElement) {
      debug.log(`Processing textarea ${element.id || element.name || 'unnamed'}`);
      await updateTextField(element, getStringValue(valueToUse));
    } else if (element instanceof HTMLButtonElement) {
      if (element.type !== 'submit' && element.type !== 'reset') {
        element.textContent = getStringValue(valueToUse);
      }
    } else if (element.hasAttribute('contenteditable')) {
      debug.log(`Processing contentEditable element ${element.id || 'unnamed'}`);
      await updateContentEditable(element, getStringValue(valueToUse));
    } else if (field.type === FieldTypeEnum.SELECT) {
      // Custom select components (React Select, MUI, Headless UI, Radix, etc.)
      // that use <div> elements instead of native <select>.
      // Route to updateSelect() which handles all custom select libraries.
      debug.log(`Processing custom select component for field ${field.id}`);
      const selectValue = valueToUse !== undefined ? valueToUse : '';
      await updateSelect(element, selectValue);
    } else if (element.hasAttribute('role')) {
      await updateAriaElement(element, field, valueToUse);
    } else {
      debug.warn(`Unknown element type for field ${field.id}:`, element.tagName);
    }
  } catch (error) {
    debug.error(`Error updating field ${field.id}:`, error);
    throw error; // Re-throw to allow retry mechanism to handle it
  }
};

/**
 * Update HTML input elements with enhanced type handling
 */
const updateInputElement = async (
  element: HTMLInputElement,
  field: Field,
  valueToUse: FieldValue,
  isTestMode: boolean,
): Promise<void> => {
  switch (element.type) {
    case FieldTypeEnum.CHECKBOX:
      await updateCheckboxInput(element, field, valueToUse, isTestMode);
      break;
    case FieldTypeEnum.RADIO:
      await updateRadioInput(element, field, valueToUse, isTestMode);
      break;
    case FieldTypeEnum.FILE:
      await updateFileInputElement(element, field, valueToUse, isTestMode);
      break;
    case FieldTypeEnum.TEXT:
    case FieldTypeEnum.EMAIL:
    case FieldTypeEnum.URL:
    case FieldTypeEnum.SEARCH:
    case FieldTypeEnum.TEL:
    case FieldTypeEnum.PASSWORD:
    case FieldTypeEnum.NUMBER:
    case FieldTypeEnum.DATE:
    case FieldTypeEnum.DATETIME_LOCAL:
    case FieldTypeEnum.MONTH:
    case FieldTypeEnum.WEEK:
    case FieldTypeEnum.TIME:
    case FieldTypeEnum.COLOR:
    case FieldTypeEnum.RANGE:
      await updateTextLikeInput(element, valueToUse);
      break;
    default:
      await updateDefaultInput(element, valueToUse);
      break;
  }
};

/**
 * Update checkbox input element
 */
const updateCheckboxInput = async (
  element: HTMLInputElement,
  field: Field,
  valueToUse: FieldValue,
  isTestMode: boolean,
): Promise<void> => {
  debug.log(`Processing checkbox ${element.id || element.name || 'unnamed'} with value:`, valueToUse);

  let isChecked = false;

  if (field.metadata && 'checkboxValue' in field.metadata) {
    const checkboxValue = field.metadata.checkboxValue as string;
    debug.log(`Checkbox has metadata value: ${checkboxValue}, comparing with:`, valueToUse);

    if (typeof valueToUse === 'boolean') {
      isChecked = valueToUse;
    } else if (typeof valueToUse === 'string') {
      isChecked = matchesCheckboxValue(checkboxValue, valueToUse);
    } else if (Array.isArray(valueToUse)) {
      isChecked = valueToUse.some(v => String(v) === checkboxValue);
    }
  } else {
    isChecked = isValueChecked(valueToUse);
  }

  // In test mode, check the checkbox by default unless explicitly set to false
  if (isTestMode && (valueToUse === undefined || valueToUse === '')) {
    debug.log('Test mode with no explicit value, checking the checkbox by default');
    isChecked = true;
  }

  debug.log(`Setting checkbox checked state to: ${isChecked}`);
  await updateCheckable(element, isChecked);
};

/**
 * Update radio input element
 */
const updateRadioInput = async (
  element: HTMLInputElement,
  _field: Field,
  valueToUse: FieldValue,
  isTestMode: boolean,
): Promise<void> => {
  debug.log(`Processing radio ${element.id || element.name || 'unnamed'} with value:`, valueToUse);

  const isSelected = determineRadioSelection(element, valueToUse, isTestMode);

  debug.log(`Setting radio selected state to: ${isSelected}`);
  await updateCheckable(element, isSelected);

  // If this radio is selected, uncheck others in the same group
  if (isSelected) {
    await uncheckOtherRadiosInGroup(element);
  }
};

/**
 * Determine if a radio button should be selected
 */
const determineRadioSelection = (element: HTMLInputElement, valueToUse: FieldValue, isTestMode: boolean): boolean => {
  let isSelected = false;

  // Check if this specific radio button's value matches the desired value
  if (typeof valueToUse === 'string') {
    isSelected = element.value === valueToUse;
    debug.log(
      `Radio value match check: element.value="${element.value}" === valueToUse="${valueToUse}" = ${isSelected}`,
    );
  } else if (typeof valueToUse === 'boolean') {
    // If boolean, select this radio if it's the value of 'true' and we want true
    isSelected = valueToUse && (element.value === 'true' || element.value === '1' || element.value === 'yes');
  }

  // In test mode, if no specific match and this is the first radio in group, select it
  if (!isSelected && isTestMode) {
    const radioGroup = document.querySelectorAll<HTMLInputElement>(`input[name="${element.name}"][type="radio"]`);
    const isFirstRadio = radioGroup.length > 0 && radioGroup[0] === element;
    if (isFirstRadio) {
      isSelected = true;
      debug.log(`Test mode: Selecting first radio in group ${element.name}`);
    }
  }

  return isSelected;
};

/**
 * Uncheck other radio buttons in the same group
 */
const uncheckOtherRadiosInGroup = async (selectedElement: HTMLInputElement): Promise<void> => {
  const radioGroup = document.querySelectorAll<HTMLInputElement>(`input[name="${selectedElement.name}"][type="radio"]`);
  for (const radio of Array.from(radioGroup)) {
    if (radio !== selectedElement) {
      await updateCheckable(radio, false);
    }
  }
};

/**
 * Update file input element
 */
const updateFileInputElement = async (
  element: HTMLInputElement,
  field: Field,
  valueToUse: FieldValue,
  isTestMode: boolean,
): Promise<void> => {
  debug.log(`Processing file input ${element.id || element.name || 'unnamed'}`);

  const fileValue = typeof valueToUse === 'string' || Array.isArray(valueToUse) ? valueToUse : String(valueToUse);
  const isAiMode = isFileValueFromAI(fileValue);

  await updateFileInput(element, fileValue, isTestMode, isAiMode, field.metadata);
};

/**
 * Pattern for authorized file references from AI
 * Format: "authorized_file:123" where 123 is the file ID
 */
const AUTHORIZED_FILE_PATTERN = /^authorized_file:\d+$/;

const LOCAL_FILENAME_PATTERN =
  /\.(pdf|doc|docx|txt|rtf|odt|jpg|jpeg|png|gif|webp|svg|bmp|heic|heif|xls|xlsx|csv|ods|ppt|pptx|odp|zip)$/i;

const isLikelyLocalFilename = (val: string): boolean =>
  !val.startsWith('http://') &&
  !val.startsWith('https://') &&
  !AUTHORIZED_FILE_PATTERN.test(val) &&
  LOCAL_FILENAME_PATTERN.test(val);

const isFileValueFromAI = (fileValue: string | string[]): boolean => {
  const isAIValue = (val: string): boolean =>
    val.startsWith('http://') ||
    val.startsWith('https://') ||
    AUTHORIZED_FILE_PATTERN.test(val) ||
    isLikelyLocalFilename(val);

  if (typeof fileValue === 'string') {
    return isAIValue(fileValue);
  }

  if (Array.isArray(fileValue)) {
    return fileValue.some(isAIValue);
  }

  return false;
};

/**
 * Update text-like input elements
 */
const updateTextLikeInput = async (element: HTMLInputElement, valueToUse: FieldValue): Promise<void> => {
  debug.log(`Processing text-like input ${element.id || element.name || 'unnamed'} (${element.type})`);
  await updateTextField(element, getStringValue(valueToUse));
};

/**
 * Update default/unknown input types
 */
const updateDefaultInput = async (element: HTMLInputElement, valueToUse: FieldValue): Promise<void> => {
  debug.log(`Handling default case for input type: ${element.type}`);
  if (element.type !== 'submit' && element.type !== 'reset' && element.type !== 'button') {
    await updateTextField(element, getStringValue(valueToUse));
  }
};

/**
 * Update ARIA elements (role-based elements)
 */
const updateAriaElement = async (element: HTMLElement, field: Field, valueToUse: FieldValue): Promise<void> => {
  const role = element.getAttribute('role');

  if (role === FieldTypeEnum.CHECKBOX || role === 'switch') {
    const isChecked =
      typeof valueToUse === 'boolean'
        ? valueToUse
        : ['true', 'yes', 'on', '1'].includes(String(valueToUse).toLowerCase());
    await updateCheckable(element, isChecked);
  } else if (role === FieldTypeEnum.RADIO) {
    const isChecked =
      typeof valueToUse === 'boolean'
        ? valueToUse
        : ['true', 'yes', 'on', '1'].includes(String(valueToUse).toLowerCase());
    // Find other radios in the same group and uncheck them
    const group = element.closest('[role="radiogroup"]');
    if (group) {
      group.querySelectorAll('[role="radio"]').forEach(radio => {
        if (radio !== element) {
          radio.setAttribute('aria-checked', 'false');
        }
      });
    }
    await updateCheckable(element, isChecked);
  } else if (role === 'textbox' || role === 'searchbox') {
    debug.log(`Processing role=${role} element ${element.id || 'unnamed'}`);
    await updateTextField(element, getStringValue(valueToUse));
  } else if (role === 'combobox' || role === 'listbox') {
    debug.log(`Processing role=${role} element ${element.id || 'unnamed'}`);
    await updateSelect(element, valueToUse);
  } else {
    debug.warn(`Unknown ARIA role for field ${field.id}: ${role}`);
  }
};

// Form update API
// ----------------------------------------

/**
 * Aggregated results from updating multiple form fields
 */
interface FormUpdateResults {
  successful: number;
  failed: number;
  skipped: number;
  errors: FieldUpdateError[];
  totalRetries: number;
}

/**
 * Batch size for parallel field updates
 */
const BATCH_SIZE = 5;

/**
 * Watch for conditional fields that may appear after fills (e.g., state depends on country).
 * Uses MutationObserver to detect new form elements added to the DOM.
 * Resolves early if new fields are detected before the timeout expires.
 */
const watchForNewFields = (container: HTMLElement, duration: number = 500): Promise<HTMLElement[]> =>
  new Promise(resolve => {
    const newElements: HTMLElement[] = [];
    let resolved = false;
    let earlyResolveTimer: ReturnType<typeof setTimeout> | null = null;

    const finalize = (): void => {
      if (resolved) return;
      resolved = true;
      observer.disconnect();
      if (earlyResolveTimer !== null) {
        clearTimeout(earlyResolveTimer);
      }
      resolve(newElements);
    };

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLElement) {
            const inputs = node.querySelectorAll('input, select, textarea, [role="textbox"], [role="combobox"]');
            inputs.forEach(el => {
              if (el instanceof HTMLElement) newElements.push(el);
            });
            if (node.matches('input, select, textarea, [role="textbox"], [role="combobox"]')) {
              newElements.push(node);
            }
          }
        }
      }

      // Early resolution: once we detect new fields, wait a brief 100ms for any
      // additional mutations, then resolve without waiting the full duration
      if (newElements.length > 0 && earlyResolveTimer === null) {
        earlyResolveTimer = setTimeout(finalize, 100);
      }
    });

    observer.observe(container, { childList: true, subtree: true });

    // Full timeout fallback
    setTimeout(finalize, duration);
  });

/**
 * Check if a field type is a choice-type that may trigger conditional fields
 */
const isChoiceFieldType = (fieldType: string): boolean =>
  fieldType === FieldTypeEnum.SELECT || fieldType === FieldTypeEnum.RADIO || fieldType === FieldTypeEnum.CHECKBOX;

/**
 * Verify all fields after the entire form has been filled.
 * Re-reads each field's current DOM value, compares against expected,
 * and retries failures with escalating strategies.
 * Results are logged but not surfaced to the user.
 */
const verifyAllFields = async (fields: Field[], testMode: boolean): Promise<BatchVerificationResults> => {
  const results: BatchVerificationResults = {
    totalFields: fields.length,
    verified: 0,
    failed: 0,
    retried: 0,
    retriedSuccessfully: 0,
    entries: [],
  };

  debug.log(`Starting post-fill verification for ${fields.length} fields`);

  for (const field of fields) {
    const element = findFieldElement(field.id);
    if (!element) {
      debug.log(`Verification skip: element not found for ${field.id}`);
      results.failed++;
      results.entries.push({
        fieldId: field.id,
        expectedValue: testMode && field.testValue !== undefined ? field.testValue : field.value,
        actualValue: undefined,
        passed: false,
        retried: false,
        retriedSuccessfully: false,
        strategy: 'none',
      });
      continue;
    }

    const expectedValue = testMode && field.testValue !== undefined ? field.testValue : field.value;
    const actualValue = getCurrentFieldValue(element);

    // Check if value matches
    const passed = verifyFieldValueImmediate(element, expectedValue);

    if (passed) {
      results.verified++;
      results.entries.push({
        fieldId: field.id,
        expectedValue,
        actualValue,
        passed: true,
        retried: false,
        retriedSuccessfully: false,
        strategy: 'standard',
      });
      formFillStore.getState().setVerificationResult(field.id, true, 'standard');
      continue;
    }

    // Value mismatch - retry with escalating strategies
    debug.log(
      `Verification mismatch for ${field.id}: expected=${String(expectedValue)}, actual=${String(actualValue)}`,
    );
    results.retried++;
    let retriedOk = false;
    let winningStrategy = 'none';

    // Skip 'standard' since it already failed
    for (let i = 1; i < FIELD_UPDATE_STRATEGIES.length; i++) {
      const strategy = FIELD_UPDATE_STRATEGIES[i];
      try {
        const valueStr = typeof expectedValue === 'string' ? expectedValue : String(expectedValue ?? '');
        await applyValueWithStrategy(element, valueStr, strategy);
        await new Promise(resolve => setTimeout(resolve, 60));

        if (verifyFieldValueImmediate(element, expectedValue)) {
          retriedOk = true;
          winningStrategy = strategy;
          debug.log(`Verification retry succeeded for ${field.id} with strategy "${strategy}"`);
          formFillStore.getState().recordStrategyResult(strategy, true);
          break;
        }
        formFillStore.getState().recordStrategyResult(strategy, false);
      } catch (retryErr) {
        debug.log(`Verification retry strategy "${strategy}" failed for ${field.id}:`, retryErr);
        formFillStore.getState().recordStrategyResult(strategy, false);
      }
    }

    if (retriedOk) {
      results.verified++;
      results.retriedSuccessfully++;
      formFillStore.getState().setVerificationResult(field.id, true, winningStrategy);
    } else {
      results.failed++;
      formFillStore.getState().setVerificationResult(field.id, false);
    }

    results.entries.push({
      fieldId: field.id,
      expectedValue,
      actualValue,
      passed: retriedOk,
      retried: true,
      retriedSuccessfully: retriedOk,
      strategy: winningStrategy,
    });
  }

  debug.log(
    `Post-fill verification complete: ${results.verified}/${results.totalFields} verified, ` +
      `${results.retried} retried, ${results.retriedSuccessfully} retry successes, ${results.failed} failed`,
  );

  return results;
};

/**
 * Update multiple form fields with their values using parallel batching.
 * After all batches complete, runs a silent post-fill verification pass
 * that retries failed fields with escalating strategies.
 *
 * @param fields - Array of fields to update
 * @param testMode - Whether this is a test mode fill
 * @returns FormUpdateResults with detailed statistics
 */
const updateFormFields = async (fields: Field[], testMode = false): Promise<FormUpdateResults> => {
  document.body.setAttribute('data-filliny-updating', 'true');
  debug.log(`Updating ${fields.length} form fields (testMode: ${testMode})`);
  const startTime = performance.now();

  const results: FormUpdateResults = {
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    totalRetries: 0,
  };

  try {
    // Process fields in batches of BATCH_SIZE using Promise.allSettled
    for (let i = 0; i < fields.length; i += BATCH_SIZE) {
      const batch = fields.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(batch.map(field => updateFieldWithGroupHandling(field, testMode)));

      // Track whether this batch contained choice fields
      let batchHasChoiceFields = false;

      for (let j = 0; j < batchResults.length; j++) {
        const settledResult = batchResults[j];
        const field = batch[j];

        if (isChoiceFieldType(field.type)) {
          batchHasChoiceFields = true;
        }

        if (settledResult.status === 'fulfilled') {
          const updateResult = settledResult.value;
          if (updateResult.success) {
            results.successful++;
            results.totalRetries += updateResult.retryCount || 0;
          } else {
            results.failed++;
            if (updateResult.error) {
              results.errors.push(updateResult.error);
            }
          }
        } else {
          results.failed++;
          const error = categorizeError(settledResult.reason, field.id);
          results.errors.push(error);
        }
      }

      // Watch for conditional fields after batches containing choice-type fills.
      // Use 2 seconds for choice fields to allow dependent UI to render.
      if (batchHasChoiceFields) {
        const newElements = await watchForNewFields(document.body, 2000);
        if (newElements.length > 0) {
          debug.log(`Detected ${newElements.length} new conditional field(s) after choice-type batch fill`);
        }
      }
    }

    // Run silent post-fill verification pass
    const verificationResults = await verifyAllFields(fields, testMode);
    if (verificationResults.retriedSuccessfully > 0) {
      // Adjust counts: fields that were marked failed but succeeded on retry
      results.successful += verificationResults.retriedSuccessfully;
      results.failed = Math.max(0, results.failed - verificationResults.retriedSuccessfully);
    }

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    debug.log(
      `%c⏱ Form filling completed: ${duration}s`,
      'background: #404040; color: white; padding: 4px 8px; border-radius: 4px; font-size: 14px;',
    );

    debug.log(`Results: ${results.successful} successful, ${results.failed} failed, ${results.skipped} skipped`);

    // Log errors for debugging
    if (results.errors.length > 0) {
      debug.warn(`${results.errors.length} field(s) failed to update:`);
      results.errors.forEach(error => {
        debug.warn(`  - ${error.fieldId} (${error.category}): ${error.message}`);
      });
    }

    // Dispatch event with results for UI feedback
    document.dispatchEvent(
      new CustomEvent('filliny:updateComplete', {
        detail: {
          results,
          duration: parseFloat(duration),
        },
      }),
    );

    return results;
  } catch (error) {
    debug.error('Error in updateFormFields:', error);
    throw error;
  } finally {
    setTimeout(() => document.body.removeAttribute('data-filliny-updating'), 100);
  }
};

/**
 * Update a field, handling radio/checkbox groups appropriately.
 * Includes error recovery: if the update throws, attempts to re-find the element
 * by data-filliny-id and retries once.
 */
const updateFieldWithGroupHandling = async (field: Field, testMode: boolean): Promise<FieldUpdateResult> => {
  try {
    // Get the original field info and element from the registry
    const originalFieldInfo = unifiedFieldRegistry.getField(field.id);

    if (!originalFieldInfo?.element) {
      debug.warn(`Element not found in registry for field ${field.id}. Attempting DOM query.`);
      const element = document.querySelector(`[data-filliny-id="${field.id}"]`) as HTMLElement;
      if (element) {
        return await updateFieldWithRetry(element, field, testMode);
      }
      debug.warn(`Element not found in DOM for field ${field.id}. Cannot update.`);
      return {
        success: false,
        fieldId: field.id,
        error: new FieldUpdateError(
          `Element not found for field ${field.id}`,
          ErrorCategory.ELEMENT_NOT_FOUND,
          field.id,
        ),
      };
    }

    // Use the definitive element from the registry
    const element = originalFieldInfo.element;
    // Create an updated field object that includes the new value and original metadata
    const updatedField = { ...originalFieldInfo.field, ...field };

    if (originalFieldInfo.isGrouped) {
      debug.log(`Updating grouped field: ${updatedField.id} (${updatedField.type})`);
      // Pass the merged field data to the group handler
      return await updateGroupedField(updatedField, testMode);
    } else {
      // Handle individual fields normally
      debug.log(`Updating individual field: ${updatedField.id} (${updatedField.type})`);
      return await updateFieldWithRetry(element, updatedField, testMode);
    }
  } catch (error) {
    debug.error(`Error updating field ${field.id}:`, error);

    // Error recovery: try to re-find the element and retry once
    const refound = findFieldElement(field.id);
    if (refound) {
      debug.log(`Error recovery: re-found element for ${field.id}, retrying once`);
      try {
        return await updateFieldWithRetry(refound, field, testMode);
      } catch (retryError) {
        debug.error(`Error recovery retry also failed for ${field.id}:`, retryError);
      }
    }

    return {
      success: false,
      fieldId: field.id,
      error: categorizeError(error, field.id),
    };
  }
};

/**
 * Update a grouped field (radio group or checkbox group)
 */
const updateGroupedField = async (field: Field, testMode: boolean): Promise<FieldUpdateResult> => {
  const fieldValue = testMode && field.testValue !== undefined ? field.testValue : field.value;

  try {
    if (field.type === FieldTypeEnum.RADIO) {
      const success = await updateRadioGroup(field, fieldValue, testMode);
      return {
        success,
        fieldId: field.id,
        error: success
          ? undefined
          : new FieldUpdateError(`Failed to update radio group ${field.id}`, ErrorCategory.UPDATE_FAILED, field.id),
      };
    } else if (field.type === FieldTypeEnum.CHECKBOX && field.options && field.options.length > 1) {
      const success = await updateCheckboxGroup(field, fieldValue);
      return {
        success,
        fieldId: field.id,
        error: success
          ? undefined
          : new FieldUpdateError(`Failed to update checkbox group ${field.id}`, ErrorCategory.UPDATE_FAILED, field.id),
      };
    } else {
      // This case handles single checkboxes that might be misclassified as grouped.
      // We now fetch the element directly from the registry.
      debug.log(`Updating single checkbox (as grouped fallback): ${field.id}`);
      const fieldInfo = unifiedFieldRegistry.getField(field.id);
      const element = fieldInfo?.element;

      if (element) {
        return await updateFieldWithRetry(element, field, testMode);
      } else {
        debug.warn(`Element not found for single checkbox field ${field.id}`);
        return {
          success: false,
          fieldId: field.id,
          error: new FieldUpdateError(
            `Element not found for single checkbox field ${field.id}`,
            ErrorCategory.ELEMENT_NOT_FOUND,
            field.id,
          ),
        };
      }
    }
  } catch (error) {
    debug.error(`Error updating grouped field ${field.id}:`, error);
    return {
      success: false,
      fieldId: field.id,
      error: categorizeError(error, field.id),
    };
  }
};

/**
 * Update a radio group - select the appropriate option
 */
const updateRadioGroup = async (field: Field, value: FieldValue, testMode: boolean): Promise<boolean> => {
  if (!field.options) {
    debug.warn(`No options found for radio group ${field.id}`);
    return false;
  }

  const targetValue = String(value || '');
  debug.log(`Updating radio group ${field.id} with value: ${targetValue} (testMode: ${testMode})`);

  const selectedOption = findMatchingRadioOption(field.options, targetValue, testMode);

  if (selectedOption) {
    return await selectRadioOption(field, selectedOption, field.options.indexOf(selectedOption));
  } else {
    logRadioGroupMatchFailure(field, targetValue);
    return false;
  }
};

/**
 * Find the matching radio option based on value and test mode
 */
const findMatchingRadioOption = (options: Field['options'], targetValue: string, testMode: boolean) => {
  if (!options) return undefined;

  // Try exact value matching first
  let selectedOption = options.find(opt => opt.value === targetValue);

  // Try text matching if value matching fails
  if (!selectedOption && targetValue) {
    selectedOption = options.find(opt => opt.text.toLowerCase() === targetValue.toLowerCase());
    if (selectedOption) {
      debug.log(`Found radio option by text matching: ${selectedOption.text}`);
    }
  }

  // Enhanced fallback logic for test mode
  if (!selectedOption && testMode) {
    selectedOption = selectTestModeRadioOption(options);
  }

  // For non-test mode, try partial matching strategies
  if (!selectedOption && !testMode && targetValue) {
    selectedOption = findPartialMatchRadioOption(options, targetValue);
  }

  return selectedOption;
};

/**
 * Select a random valid option for test mode
 */
const selectTestModeRadioOption = (options: Field['options']) => {
  if (!options) return undefined;

  const validOptions = options.filter(
    opt =>
      !opt.text.toLowerCase().includes('select') &&
      !opt.text.toLowerCase().includes('choose') &&
      !opt.text.toLowerCase().includes('pick') &&
      opt.text !== '' &&
      opt.value !== '',
  );

  if (validOptions.length > 0) {
    const randomIndex = Math.floor(Math.random() * validOptions.length);
    const selectedOption = validOptions[randomIndex];
    debug.log(`Using random test mode option: ${selectedOption.text} (${selectedOption.value})`);
    return selectedOption;
  } else {
    const fallbackOption = options[0];
    debug.log(`Using first option as fallback: ${fallbackOption.text}`);
    return fallbackOption;
  }
};

/**
 * Find option using partial text matching
 */
const findPartialMatchRadioOption = (options: Field['options'], targetValue: string) => {
  if (!options) return undefined;

  const selectedOption = options.find(
    opt =>
      opt.text.toLowerCase().includes(targetValue.toLowerCase()) ||
      targetValue.toLowerCase().includes(opt.text.toLowerCase()),
  );

  if (selectedOption) {
    debug.log(`Found radio option by partial text matching: ${selectedOption.text}`);
  }

  return selectedOption;
};

/**
 * Select the radio option element and update its state
 */
const selectRadioOption = async (
  field: Field,
  selectedOption: NonNullable<Field['options']>[0],
  optionIndex: number,
): Promise<boolean> => {
  const optionElement = findRadioOptionElement(field, selectedOption, optionIndex);

  if (optionElement) {
    setupRadioOptionElement(field, selectedOption, optionElement, optionIndex);
    uncheckRadioGroupMembers(field.name, optionElement);
    updateCheckable(optionElement, true);
    return true;
  } else {
    logRadioElementNotFound(field, selectedOption, optionIndex);
    return false;
  }
};

/**
 * Find the actual radio button element using multiple strategies
 */
const findRadioOptionElement = (
  field: Field,
  selectedOption: NonNullable<Field['options']>[0],
  optionIndex: number,
): HTMLElement | null => {
  const findStrategies = createRadioFindStrategies(field, selectedOption, optionIndex);

  for (let i = 0; i < findStrategies.length; i++) {
    try {
      const optionElement = findStrategies[i]();
      if (optionElement) {
        debug.log(`Found radio option element using strategy ${i + 1}: ${selectedOption.text}`);
        return optionElement;
      }
    } catch (error) {
      debug.log(`Radio find strategy ${i + 1} failed:`, error);
    }
  }

  return null;
};

/**
 * Create the array of strategies for finding radio option elements
 */
const createRadioFindStrategies = (
  field: Field,
  selectedOption: NonNullable<Field['options']>[0],
  optionIndex: number,
) => [
  // Strategy 1: Use the standard filliny-id pattern
  () => document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}-option-${optionIndex}"]`),

  // Strategy 2: Find by name and value
  () =>
    field.name
      ? document.querySelector<HTMLElement>(`input[name="${field.name}"][value="${selectedOption.value}"]`)
      : null,

  // Strategy 3: Find all radio inputs with the same name and pick by index
  () => {
    if (field.name) {
      const radios = Array.from(
        document.querySelectorAll<HTMLInputElement>(`input[name="${field.name}"][type="radio"]`),
      );
      return radios[optionIndex] || null;
    }
    return null;
  },

  // Strategy 4: Find by value across all radio inputs
  () => document.querySelector<HTMLElement>(`input[type="radio"][value="${selectedOption.value}"]`),

  // Strategy 5: Find by partial value matching
  () => {
    const radios = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
    return (
      radios.find(
        radio =>
          radio.value.toLowerCase().includes(selectedOption.value.toLowerCase()) ||
          selectedOption.value.toLowerCase().includes(radio.value.toLowerCase()),
      ) || null
    );
  },

  // Strategy 6: Find by label text matching
  () => findRadioByLabelText(selectedOption),
];

/**
 * Find radio element by matching label text
 */
const findRadioByLabelText = (selectedOption: NonNullable<Field['options']>[0]): HTMLElement | null => {
  const labels = Array.from(document.querySelectorAll('label'));

  for (const label of labels) {
    const labelText = label.textContent?.trim().toLowerCase();
    const optionText = selectedOption.text.trim().toLowerCase();

    if (
      labelText &&
      optionText &&
      (labelText === optionText || labelText.includes(optionText) || optionText.includes(labelText))
    ) {
      const forAttr = label.getAttribute('for');
      if (forAttr) {
        const linkedElement = document.getElementById(forAttr) as HTMLInputElement;
        if (linkedElement && linkedElement.type === FieldTypeEnum.RADIO) {
          return linkedElement;
        }
      }
      // Check if label contains the input
      const input = label.querySelector('input[type="radio"]');
      if (input) return input as HTMLElement;
    }
  }

  return null;
};

/**
 * Setup the radio option element with proper attributes
 */
const setupRadioOptionElement = (
  field: Field,
  selectedOption: NonNullable<Field['options']>[0],
  optionElement: HTMLElement,
  optionIndex: number,
): void => {
  // Set the filliny-id for future reference if not already set
  if (!optionElement.hasAttribute('data-filliny-id')) {
    optionElement.setAttribute('data-filliny-id', `${field.id}-option-${optionIndex}`);
  }

  debug.log(`Selecting radio option: ${selectedOption.text} (${selectedOption.value})`);
};

/**
 * Uncheck all other radio buttons in the same group
 */
const uncheckRadioGroupMembers = (fieldName: string | undefined, selectedElement: HTMLElement): void => {
  if (fieldName) {
    const allRadiosInGroup = document.querySelectorAll<HTMLInputElement>(`input[name="${fieldName}"][type="radio"]`);
    allRadiosInGroup.forEach(radio => {
      if (radio !== selectedElement) {
        updateCheckable(radio, false);
      }
    });
  }
};

/**
 * Log debug information when radio element is not found
 */
const logRadioElementNotFound = (
  field: Field,
  selectedOption: NonNullable<Field['options']>[0],
  optionIndex: number,
): void => {
  debug.warn(`Radio option element not found for ${field.id}-option-${optionIndex} (${selectedOption.text})`);

  // Debug: Log all available radio inputs for this field
  debug.log('Available radio inputs:');
  const allRadios = document.querySelectorAll('input[type="radio"]');
  allRadios.forEach(radio => {
    const input = radio as HTMLInputElement;
    debug.log(`  - name: "${input.name}", value: "${input.value}", id: "${input.id}"`);
  });
};

/**
 * Log debug information when no matching radio option is found
 */
const logRadioGroupMatchFailure = (field: Field, targetValue: string): void => {
  debug.warn(`No matching radio option found for value: ${targetValue} in field ${field.id}`);
  debug.log(
    'Available options:',
    field.options?.map(opt => `${opt.text} (${opt.value})`),
  );
};

/**
 * Update a checkbox group - select multiple options if needed
 */
const updateCheckboxGroup = async (field: Field, value: unknown): Promise<boolean> => {
  if (!field.options) return false;

  debug.log(`Updating checkbox group ${field.id} with value:`, value);

  // Normalize value to array of strings
  let targetValues: string[] = [];
  if (Array.isArray(value)) {
    targetValues = value.map(v => String(v));
  } else if (value !== undefined && value !== null) {
    targetValues = [String(value)];
  }

  let successCount = 0;

  // Update each checkbox in the group
  for (let idx = 0; idx < field.options.length; idx++) {
    const option = field.options[idx];
    const optionElement = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}-option-${idx}"]`);

    if (optionElement) {
      const shouldBeChecked = targetValues.includes(option.value) || targetValues.includes(option.text);

      debug.log(`Setting checkbox option ${option.text} to ${shouldBeChecked}`);
      try {
        await updateCheckable(optionElement, shouldBeChecked);
        successCount++;
      } catch (error) {
        debug.error(`Error updating checkbox option ${idx}:`, error);
      }
    } else {
      debug.warn(`Checkbox option element not found for ${field.id}-option-${idx}`);
    }
  }

  return successCount > 0;
};

// ----------------------------------------
// Diff-Aware Streaming Helpers
// ----------------------------------------

/**
 * Compare two field values (string or string[]) for equality
 */
const hasValueChanged = (prev: string | string[] | undefined, next: string | string[] | undefined): boolean => {
  if (prev === next) return false;
  if (prev === undefined || next === undefined) return true;

  if (Array.isArray(prev) && Array.isArray(next)) {
    if (prev.length !== next.length) return true;
    return prev.some((v, i) => v !== next[i]);
  }

  return String(prev) !== String(next);
};

/**
 * Classify a field type for streaming behavior
 * - text-like: updates immediately during streaming
 * - choice: only updates when value matches an available option
 * - file: skips streaming updates entirely
 */
const classifyFieldForStreaming = (fieldType: string): 'text-like' | 'choice' | 'file' => {
  switch (fieldType) {
    case FieldTypeEnum.SELECT:
    case FieldTypeEnum.RADIO:
    case FieldTypeEnum.CHECKBOX:
      return 'choice';
    case FieldTypeEnum.FILE:
      return 'file';
    default:
      return 'text-like';
  }
};

/**
 * Lightweight DOM write for a single field during streaming.
 * Calls updateField() directly with no retry or verification.
 */
const immediateFieldSet = async (element: HTMLElement, field: Field): Promise<void> => {
  try {
    await updateField(element, field, false);
  } catch (error) {
    debug.warn(`immediateFieldSet failed for field ${field.id}:`, error);
  }
};

/**
 * Diff-aware chunk processing for streaming form fill.
 * Only updates fields whose values have actually changed since the last partial.
 */
/**
 * Wait for the next animation frame - used to batch DOM writes
 * for smoother visual updates during streaming.
 */
const rafDelay = (): Promise<void> => new Promise(resolve => requestAnimationFrame(() => resolve()));

/**
 * Diff-aware chunk processing for streaming form fill.
 * Uses formFillStore directly for state management - no adapter needed.
 * Only updates fields whose values have actually changed since the last partial.
 */
const processChunksDiffAware = async (
  text: string,
  originalFields: Field[],
  previousPartial: string,
): Promise<string> => {
  try {
    const combinedText = previousPartial + text;
    const lines = combinedText.split('\n');

    // The last line might be incomplete, so save it for the next chunk
    let partial = '';
    if (combinedText[combinedText.length - 1] !== '\n') {
      partial = lines.pop() || '';
    }

    // Parse all complete lines, take the last valid JSON object
    let latestParsed: StreamingFieldData | null = null;

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const jsonResponse: unknown = JSON.parse(line);

        // Handle streaming error from backend
        const errorResult = StreamingErrorSchema.safeParse(jsonResponse);
        if (errorResult.success) {
          debug.error('Streaming error from server:', errorResult.data.error.message);
          // Don't return - continue processing any valid data we received before the error
          continue;
        }

        // Validate as field data
        const dataResult = StreamingFieldDataSchema.safeParse(jsonResponse);
        if (dataResult.success && dataResult.data.data.length > 0) {
          latestParsed = dataResult.data;
        }
      } catch {
        debug.warn('Failed to parse JSON line during diff-aware processing');
      }
    }

    if (!latestParsed) return partial;

    const storeState = formFillStore.getState();
    const previousLookup: PartialFieldValueMap = storeState.lastPartialObject || {};

    // Build lookup from current parsed data
    const currentLookup: PartialFieldValueMap = {};
    for (const parsedField of latestParsed.data) {
      if (parsedField.id && parsedField.value !== undefined) {
        currentLookup[parsedField.id] = parsedField.value;
      }
    }

    // Collect changed fields first, then apply with RAF-batched updates
    const changedFields: Array<{ fieldId: string; mergedField: Field; element: HTMLElement }> = [];

    for (const parsedField of latestParsed.data) {
      const fieldId = parsedField.id;
      if (!fieldId) continue;

      const originalField = originalFields.find(f => f.id === fieldId);
      if (!originalField) continue;

      const newValue = parsedField.value;
      const prevValue = previousLookup[fieldId];

      // Skip fields with no value
      if (newValue === undefined) continue;

      const fieldClass = classifyFieldForStreaming(originalField.type);

      // Skip file fields during streaming
      if (fieldClass === 'file') continue;

      // Check if the value actually changed
      if (!hasValueChanged(prevValue, newValue)) {
        // Value unchanged - mark as stable
        formFillStore.getState().markFieldStable(fieldId);
        continue;
      }

      // For choice fields, only update if value matches an available option
      if (fieldClass === 'choice' && originalField.options) {
        if (Array.isArray(newValue)) {
          if (newValue.length > 0) {
            const matchesAnyOption = newValue.some(val =>
              originalField.options!.some(
                opt => opt.value === String(val) || opt.text.toLowerCase() === String(val).toLowerCase(),
              ),
            );
            if (!matchesAnyOption) continue;
          }
        } else {
          const valueStr = String(newValue);
          const matchesOption = originalField.options.some(
            opt => opt.value === valueStr || opt.text.toLowerCase() === valueStr.toLowerCase(),
          );
          if (!matchesOption) continue;
        }
      }

      // Value changed - update store value immediately for reactive UI
      formFillStore.getState().updateFieldValue(fieldId, newValue);

      const mergedField = { ...originalField, ...parsedField };
      const fieldInfo = unifiedFieldRegistry.getField(fieldId);
      const element = fieldInfo?.element || (document.querySelector(`[data-filliny-id="${fieldId}"]`) as HTMLElement);

      if (element) {
        changedFields.push({ fieldId, mergedField, element });
      }
    }

    // Apply DOM updates using requestAnimationFrame for smoother visual feedback.
    for (let i = 0; i < changedFields.length; i++) {
      const { fieldId, mergedField, element } = changedFields[i];

      // Wait for next animation frame before DOM write
      await rafDelay();

      // Update DOM, then mark in store so UI reflects actual state
      await immediateFieldSet(element, mergedField);
      formFillStore.getState().markFieldFilled(fieldId);

      // Persistent green outline during streaming - cleared after streaming completes
      element.style.outline = '2px solid #10b981';
      element.style.outlineOffset = '1px';
      element.style.transition = 'outline 0.2s ease';
    }

    // Save current partial object for next diff
    formFillStore.getState().setLastPartialObject(currentLookup);

    return partial;
  } catch (error) {
    debug.error('Error in processChunksDiffAware:', error);
    return previousPartial;
  }
};

/**
 * Run a final verification pass after streaming completes.
 * Uses updateFieldWithGroupHandling with full retry+verify for each field
 * that has a value in the store.
 */
/**
 * Run a final verification pass after streaming completes.
 * Uses formFillStore directly for state access - no adapter needed.
 * Uses updateFieldWithGroupHandling with full retry+verify for each field
 * that has a value in the store.
 */
const runFinalVerificationPass = async (originalFields: Field[]): Promise<FormUpdateResults> => {
  const results: FormUpdateResults = {
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    totalRetries: 0,
  };

  const storeFields = formFillStore.getState().fields;

  for (const originalField of originalFields) {
    const storeField = storeFields[originalField.id];
    if (!storeField) {
      results.skipped++;
      continue;
    }

    // Skip fields already verified or with no value
    if (storeField.status === 'VERIFIED') {
      results.successful++;
      continue;
    }

    if (storeField.currentValue === undefined) {
      results.skipped++;
      continue;
    }

    // Build the field with the current value from the store
    const fieldWithValue: Field = {
      ...originalField,
      value: storeField.currentValue,
    };

    const updateResult = await updateFieldWithGroupHandling(fieldWithValue, false);

    if (updateResult.success) {
      results.successful++;
      results.totalRetries += updateResult.retryCount || 0;
      formFillStore.getState().markFieldVerified(originalField.id);
    } else {
      results.failed++;
      if (updateResult.error) {
        results.errors.push(updateResult.error);
        formFillStore.getState().markFieldError(originalField.id, updateResult.error.message);
      }
    }
  }

  // Clean up streaming outlines from all filled fields after a brief delay
  setTimeout(() => {
    for (const field of originalFields) {
      const fieldInfo = unifiedFieldRegistry.getField(field.id);
      const element = fieldInfo?.element;
      if (element) {
        element.style.outline = '';
        element.style.outlineOffset = '';
        element.style.transition = '';
      }
    }
  }, 1500);

  return results;
};

export {
  ErrorCategory,
  FieldUpdateError,
  updateFieldWithRetry,
  updateField,
  updateFormFields,
  hasValueChanged,
  classifyFieldForStreaming,
  immediateFieldSet,
  processChunksDiffAware,
  runFinalVerificationPass,
  isFileValueFromAI,
  AUTHORIZED_FILE_PATTERN,
  getCurrentFieldValue,
  silentFieldTest,
  verifyAllFields,
  findFieldElement,
  FIELD_UPDATE_STRATEGIES,
};

export type { FieldUpdateResult, FormUpdateResults, FieldVerificationEntry, BatchVerificationResults };
