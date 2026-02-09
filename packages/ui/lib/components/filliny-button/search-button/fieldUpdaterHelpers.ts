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
  captureFormState,
  restoreFormState,
  ensureFocus,
} from './field-types/utils';
import { unifiedFieldRegistry } from './unifiedFieldDetection.js';
import { createDebugLogger } from '@extension/shared';
import type { PartialFieldValueMap } from './stores';
import type { Field } from '@extension/shared';

const debug = createDebugLogger('FieldUpdater');

// Re-export imported utilities to suppress unused-import warnings.
// These are used by downstream consumers of fieldUpdaterHelpers.
const _captureFormState = captureFormState;
const _restoreFormState = restoreFormState;
const _ensureFocus = ensureFocus;

/**
 * Union type representing all possible field values
 * This replaces 'unknown' with a proper typed union
 */
type FieldValue = string | string[] | boolean | number | undefined;

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
 * Enhanced field update with retry mechanism and better error handling
 * @param element - The HTML element to update
 * @param field - The field data containing the value to set
 * @param isTestMode - Whether this is a test mode fill
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param timeoutMs - Timeout for each attempt in milliseconds (default: 10000)
 * @returns FieldUpdateResult with success status and any errors
 */
const updateFieldWithRetry = async (
  element: HTMLElement,
  field: Field,
  isTestMode: boolean,
  maxRetries: number = 3,
  timeoutMs: number = DEFAULT_FIELD_UPDATE_TIMEOUT,
): Promise<FieldUpdateResult> => {
  let lastError: FieldUpdateError | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let cleanup: (() => void) | undefined;

    try {
      // Wrap the update operation with a timeout
      const updatePromise = updateField(element, field, isTestMode);
      const { promise: timedPromise, cleanup: timeoutCleanup } = withTimeout(updatePromise, timeoutMs, field.id);
      cleanup = timeoutCleanup;

      await timedPromise;

      // Verify the update was successful with its own timeout
      const verifyPromise = verifyFieldUpdate(element, field, isTestMode);
      const { promise: timedVerifyPromise, cleanup: verifyCleanup } = withTimeout(
        verifyPromise,
        timeoutMs / 2,
        field.id,
      );
      cleanup = verifyCleanup;

      const verified = await timedVerifyPromise;

      if (verified) {
        debug.log(`Field ${field.id} updated and verified successfully (attempt ${attempt})`);
        return { success: true, fieldId: field.id, retryCount: attempt - 1 };
      }

      // Verification failed - create specific error
      lastError = new FieldUpdateError(
        `Verification failed for field ${field.id}`,
        ErrorCategory.VERIFICATION_FAILED,
        field.id,
      );

      if (attempt < maxRetries) {
        debug.log(`Field update verification failed for ${field.id}, retrying (attempt ${attempt}/${maxRetries})`);
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
      debug.error(`Error updating field ${field.id} (attempt ${attempt}/${maxRetries}):`, lastError);

      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff with jitter
      const delay = Math.min(100 * Math.pow(2, attempt - 1) + Math.random() * 50, 2000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted
  const finalError =
    lastError ||
    new FieldUpdateError(
      `Failed to update field ${field.id} after ${maxRetries} attempts`,
      ErrorCategory.UPDATE_FAILED,
      field.id,
    );

  debug.error(`All retry attempts exhausted for field ${field.id}:`, finalError);
  return { success: false, fieldId: field.id, error: finalError, retryCount: maxRetries };
};

/**
 * Immediate synchronous verification of field value (Step 1)
 */
const verifyFieldValueImmediate = (element: HTMLElement, expectedValue: FieldValue): boolean => {
  if (element instanceof HTMLInputElement) {
    switch (element.type) {
      case 'checkbox':
      case 'radio': {
        const expectedChecked = isValueChecked(expectedValue);
        return element.checked === expectedChecked;
      }
      case 'file':
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
  } else if (element.getAttribute('role') === 'checkbox' || element.getAttribute('role') === 'switch') {
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

    // Handle each element type with enhanced error handling
    if (element instanceof HTMLInputElement) {
      await updateInputElement(element, field, valueToUse, isTestMode);
    } else if (element instanceof HTMLSelectElement) {
      debug.log(`Processing select ${element.id || element.name || 'unnamed'}`);
      // Ensure we pass a non-undefined value to updateSelect
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
    case 'checkbox':
      await updateCheckboxInput(element, field, valueToUse, isTestMode);
      break;
    case 'radio':
      await updateRadioInput(element, field, valueToUse, isTestMode);
      break;
    case 'file':
      await updateFileInputElement(element, field, valueToUse, isTestMode);
      break;
    case 'text':
    case 'email':
    case 'url':
    case 'search':
    case 'tel':
    case 'password':
    case 'number':
    case 'date':
    case 'datetime-local':
    case 'month':
    case 'week':
    case 'time':
    case 'color':
    case 'range':
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

/**
 * Determine if file value is from AI (URL-based or authorized file reference)
 */
const isFileValueFromAI = (fileValue: string | string[]): boolean => {
  const isAIValue = (val: string): boolean =>
    val.startsWith('http://') || val.startsWith('https://') || AUTHORIZED_FILE_PATTERN.test(val);

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

  if (role === 'checkbox' || role === 'switch') {
    const isChecked =
      typeof valueToUse === 'boolean'
        ? valueToUse
        : ['true', 'yes', 'on', '1'].includes(String(valueToUse).toLowerCase());
    await updateCheckable(element, isChecked);
  } else if (role === 'radio') {
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
 */
const watchForNewFields = (container: HTMLElement, duration: number = 500): Promise<HTMLElement[]> =>
  new Promise(resolve => {
    const newElements: HTMLElement[] = [];
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
    });

    observer.observe(container, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      resolve(newElements);
    }, duration);
  });

/**
 * Check if a field type is a choice-type that may trigger conditional fields
 */
const isChoiceFieldType = (fieldType: string): boolean =>
  fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox';

/**
 * Update multiple form fields with their values using parallel batching
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

      // Watch for conditional fields after batches containing choice-type fills
      if (batchHasChoiceFields) {
        const newElements = await watchForNewFields(document.body, 300);
        if (newElements.length > 0) {
          debug.log(`Detected ${newElements.length} new conditional field(s) after batch fill`);
        }
      }
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
 * Update a field, handling radio/checkbox groups appropriately
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
    if (field.type === 'radio') {
      const success = await updateRadioGroup(field, fieldValue, testMode);
      return {
        success,
        fieldId: field.id,
        error: success
          ? undefined
          : new FieldUpdateError(`Failed to update radio group ${field.id}`, ErrorCategory.UPDATE_FAILED, field.id),
      };
    } else if (field.type === 'checkbox' && field.options && field.options.length > 1) {
      const success = await updateCheckboxGroup(field, fieldValue, testMode);
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
        if (linkedElement && linkedElement.type === 'radio') {
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
const updateCheckboxGroup = async (field: Field, value: unknown, _testMode: boolean): Promise<boolean> => {
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
    case 'select':
    case 'radio':
    case 'checkbox':
      return 'choice';
    case 'file':
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
const processChunksDiffAware = async (
  text: string,
  originalFields: Field[],
  previousPartial: string,
  store: {
    getState: () => {
      lastPartialObject: PartialFieldValueMap | null;
      fields: Record<string, { currentValue: string | string[] | undefined }>;
    };
    updateFieldValue: (id: string, value: string | string[] | undefined) => void;
    markFieldStable: (id: string) => void;
    markFieldFilled: (id: string) => void;
    setLastPartialObject: (obj: PartialFieldValueMap | null) => void;
  },
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
    let latestParsed: { data: Field[] } | null = null;

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const jsonResponse = JSON.parse(line);
        if (jsonResponse?.data?.length) {
          latestParsed = jsonResponse;
        }
      } catch {
        debug.warn('Failed to parse JSON line during diff-aware processing');
      }
    }

    if (!latestParsed) return partial;

    const { lastPartialObject } = store.getState();
    const previousLookup: PartialFieldValueMap = lastPartialObject || {};

    // Build lookup from current parsed data
    const currentLookup: PartialFieldValueMap = {};
    for (const parsedField of latestParsed.data) {
      if (parsedField.id && parsedField.value !== undefined) {
        currentLookup[parsedField.id] = parsedField.value;
      }
    }

    // Process each field in the parsed data
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
        store.markFieldStable(fieldId);
        continue;
      }

      // For choice fields, only update if value matches an available option
      if (fieldClass === 'choice' && originalField.options) {
        if (Array.isArray(newValue)) {
          // For arrays (checkbox groups, multi-selects), check if any element matches an option
          // Empty arrays are allowed (clear all selections)
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

      // Value changed - update store and do immediate DOM write
      store.updateFieldValue(fieldId, newValue);

      const mergedField = { ...originalField, ...parsedField };
      const fieldInfo = unifiedFieldRegistry.getField(fieldId);
      const element = fieldInfo?.element || (document.querySelector(`[data-filliny-id="${fieldId}"]`) as HTMLElement);

      if (element) {
        store.markFieldFilled(fieldId);
        await immediateFieldSet(element, mergedField);
      }
    }

    // Save current partial object for next diff
    store.setLastPartialObject(currentLookup);

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
const runFinalVerificationPass = async (
  originalFields: Field[],
  store: {
    getState: () => {
      fields: Record<
        string,
        {
          status: string;
          currentValue: string | string[] | undefined;
        }
      >;
    };
    markFieldVerified: (id: string) => void;
    markFieldError: (id: string, message: string) => void;
  },
): Promise<FormUpdateResults> => {
  const results: FormUpdateResults = {
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    totalRetries: 0,
  };

  const storeFields = store.getState().fields;

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
      store.markFieldVerified(originalField.id);
    } else {
      results.failed++;
      if (updateResult.error) {
        results.errors.push(updateResult.error);
        store.markFieldError(originalField.id, updateResult.error.message);
      }
    }
  }

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
  _captureFormState as captureFormState,
  _restoreFormState as restoreFormState,
  _ensureFocus as ensureFocus,
};

export type { FieldUpdateResult, FormUpdateResults };
