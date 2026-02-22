/**
 * Post-detection validation module
 *
 * Validates detected fields to ensure they are still valid, visible,
 * interactive, and not honeypot traps. Removes invalid fields from results.
 */

import { isHoneypotField } from './utils';
import { FieldTypeEnum } from '@extension/shared';
import type { Field } from '@extension/shared';

/**
 * Result of validating a single field element
 */
interface FieldValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Check if an element is still attached to the DOM
 */
const isElementInDOM = (element: HTMLElement): boolean => {
  try {
    return element.isConnected;
  } catch {
    return false;
  }
};

/**
 * Check if an element is visible via computed styles
 */
const isElementVisibleByStyle = (element: HTMLElement): boolean => {
  try {
    const style = window.getComputedStyle(element);

    // Fully hidden (all three conditions met simultaneously)
    if (style.display === 'none' && style.visibility === 'hidden' && style.opacity === '0') {
      return false;
    }

    // display:none alone hides the element, but allow special cases
    if (style.display === 'none') {
      // Allow hidden file inputs with visible labels
      if (element instanceof HTMLInputElement && element.type === FieldTypeEnum.FILE) {
        const id = element.id;
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          if (label) {
            const labelStyle = window.getComputedStyle(label);
            if (labelStyle.display !== 'none' && labelStyle.visibility !== 'hidden') {
              return true;
            }
          }
        }
      }

      // Allow elements inside modals, tabs, accordions that may become visible
      const hiddenContainer = element.closest('[style*="display: none"], [hidden]');
      if (hiddenContainer) {
        const isInDynamicContainer = hiddenContainer.closest(
          '[role="dialog"], [role="tabpanel"], .modal, .tab-pane, .accordion',
        );
        if (isInDynamicContainer) {
          return true;
        }
      }

      return false;
    }

    return true;
  } catch {
    // Default to visible if we cannot determine
    return true;
  }
};

/**
 * Check if an element is interactive (not disabled, not readonly for text fields)
 */
const isElementInteractiveForValidation = (element: HTMLElement): boolean => {
  // Check disabled attribute
  if (element.hasAttribute('disabled')) {
    return false;
  }

  // Check aria-disabled
  if (element.getAttribute('aria-disabled') === 'true') {
    return false;
  }

  // Check if inside a disabled fieldset
  if (element.closest('fieldset[disabled]')) {
    return false;
  }

  // readonly is acceptable for some field types (select, checkbox, radio)
  // but for text inputs it means we cannot fill them
  if (element.hasAttribute('readonly')) {
    if (
      element instanceof HTMLInputElement &&
      ['text', 'email', 'tel', 'url', 'search', 'password', 'number'].includes(element.type)
    ) {
      return false;
    }
    if (element instanceof HTMLTextAreaElement) {
      return false;
    }
  }

  return true;
};

/**
 * Check if an element has a reasonable bounding rect (width > 0, height > 0)
 * with exceptions for special field types
 */
const hasReasonableBoundingRect = (element: HTMLElement): boolean => {
  try {
    const rect = element.getBoundingClientRect();

    // Zero-dimension check with exceptions
    if (rect.width <= 0 && rect.height <= 0) {
      // Allow checkboxes and radios (often visually hidden and replaced with CSS)
      if (element instanceof HTMLInputElement) {
        if (
          element.type === FieldTypeEnum.CHECKBOX ||
          element.type === FieldTypeEnum.RADIO ||
          element.type === FieldTypeEnum.FILE
        ) {
          return true;
        }
      }

      // Allow elements with ARIA roles (custom implementations may visually hide the actual input)
      const role = element.getAttribute('role');
      if (role && ['checkbox', 'radio', 'switch', 'combobox', 'listbox'].includes(role)) {
        return true;
      }

      // Allow custom elements (web components)
      if (element.tagName.includes('-')) {
        return true;
      }

      return false;
    }

    return true;
  } catch {
    // Default to valid if we cannot determine
    return true;
  }
};

/**
 * Validate a single detected field element
 */
const validateFieldElement = (element: HTMLElement): FieldValidationResult => {
  // 1. Is the element still in the DOM?
  if (!isElementInDOM(element)) {
    return { isValid: false, reason: 'element not in DOM' };
  }

  // 2. Is it visible (computed style)?
  if (!isElementVisibleByStyle(element)) {
    return { isValid: false, reason: 'element not visible' };
  }

  // 3. Is it interactive (not disabled)?
  if (!isElementInteractiveForValidation(element)) {
    return { isValid: false, reason: 'element not interactive' };
  }

  // 4. Does it have a reasonable bounding rect?
  if (!hasReasonableBoundingRect(element)) {
    return { isValid: false, reason: 'element has zero dimensions' };
  }

  // 5. Is it NOT a honeypot field?
  if (isHoneypotField(element)) {
    return { isValid: false, reason: 'element is a honeypot field' };
  }

  return { isValid: true };
};

/**
 * Find the DOM element for a detected field
 */
const findFieldElement = (field: Field, container: HTMLElement): HTMLElement | null => {
  const strategies: Array<() => HTMLElement | null> = [
    () => container.querySelector(`[data-filliny-id="${field.id}"]`),
    () => (field.uniqueSelectors?.length ? container.querySelector(field.uniqueSelectors[0]) : null),
    () => (field.name ? container.querySelector(`[name="${field.name}"]`) : null),
  ];

  for (const strategy of strategies) {
    try {
      const element = strategy();
      if (element instanceof HTMLElement) {
        return element;
      }
    } catch {
      // Continue to next strategy
    }
  }

  return null;
};

/**
 * Validate all detected fields and remove invalid ones.
 * This is the main entry point for post-detection validation.
 *
 * @param fields - Array of detected fields
 * @param container - The container element where fields were detected
 * @returns Filtered array containing only valid fields
 */
const validateDetectedFields = (fields: Field[], container: HTMLElement): Field[] => {
  const validFields: Field[] = [];
  let removedCount = 0;

  for (const field of fields) {
    const element = findFieldElement(field, container);

    if (!element) {
      // If we cannot find the element, still keep the field
      // (it may have been dynamically modified)
      validFields.push(field);
      continue;
    }

    const result = validateFieldElement(element);

    if (result.isValid) {
      validFields.push(field);
    } else {
      removedCount++;
      console.debug(`Post-detection validation removed field ${field.id}: ${result.reason}`);
    }
  }

  if (removedCount > 0) {
    console.log(`Post-detection validation: removed ${removedCount} invalid fields, ${validFields.length} remaining`);
  }

  return validFields;
};

export { validateDetectedFields, validateFieldElement, isElementInDOM, isElementVisibleByStyle };
export type { FieldValidationResult };
