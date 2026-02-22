import { createBaseField, findRelatedRadioButtons, dispatchPointerClickSequence, ensureFocus } from './utils';
import { getFieldLabel } from '../fieldUtils';
import {
  createDebugLogger,
  isHTMLElement,
  isHTMLInputElement,
  queryInputElement,
  FieldTypeEnum,
} from '@extension/shared';
import { z } from 'zod';
import type { Field } from '@extension/shared';

const debug = createDebugLogger('Checkable');

// ============================================================================
// Constants
// ============================================================================

/** Delay (ms) after clicking before checking verification */
const VERIFICATION_DELAY_MS = 100;

/** Delay (ms) for fallback click attempts */
const FALLBACK_CLICK_DELAY_MS = 100;

/** Maximum number of ancestor levels to search for clickable wrappers */
const MAX_ANCESTOR_DEPTH = 5;

// ============================================================================
// Zod Schemas for Value Checking
// ============================================================================

/**
 * Schema for truthy string values
 */
const TruthyStringValues = ['true', 'yes', 'on', '1', 'selected', 'checked'] as const;
const TruthyStringSchema = z.enum(TruthyStringValues);

/**
 * Schema for falsy string values
 */
const FalsyStringValues = ['false', 'no', 'off', '0', 'unselected', 'unchecked'] as const;
const FalsyStringSchema = z.enum(FalsyStringValues);

/**
 * Schema for boolean values
 */
const BooleanValueSchema = z.boolean();

/**
 * Schema for number values
 */
const NumberValueSchema = z.number();

/**
 * Schema for string values
 */
const StringValueSchema = z.string();

/**
 * Schema for array values containing primitives (strings, numbers, booleans)
 * Used for checkbox/radio value matching where items are converted to strings
 */
const ArrayValueSchema = z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]));

// Extend Field type with checkable-specific properties
interface CheckableField extends Field {
  checked?: boolean;
  groupName?: string;
  groupType?: 'radio' | 'checkbox';
}

/**
 * Convert a base Field to a CheckableField by adding checkable-specific properties
 */
const toCheckableField = (baseField: Field, checkableProps?: Partial<CheckableField>): CheckableField => ({
  ...baseField,
  ...checkableProps,
});

/**
 * Check if a value indicates a "checked" or "true" state
 * Handles various formats like true/false, 0/1, "yes"/"no", etc.
 * Uses Zod for type validation.
 */
const isValueChecked = (value: unknown): boolean => {
  // Null/undefined check
  if (value === undefined || value === null) {
    return false;
  }

  // Direct boolean check using Zod
  const booleanResult = BooleanValueSchema.safeParse(value);
  if (booleanResult.success) {
    return booleanResult.data;
  }

  // Number check using Zod (0 = false, anything else = true)
  const numberResult = NumberValueSchema.safeParse(value);
  if (numberResult.success) {
    return numberResult.data !== 0;
  }

  // String check using Zod
  const stringResult = StringValueSchema.safeParse(value);
  if (stringResult.success) {
    const normalized = stringResult.data.trim().toLowerCase();

    // Check for truthy strings using Zod enum
    if (TruthyStringSchema.safeParse(normalized).success) {
      return true;
    }

    // Check for falsy strings using Zod enum
    if (FalsyStringSchema.safeParse(normalized).success) {
      return false;
    }

    // Any non-empty string that doesn't explicitly indicate false is treated as true
    return normalized !== '';
  }

  // Array check using Zod (if there are any items, consider it checked)
  const arrayResult = ArrayValueSchema.safeParse(value);
  if (arrayResult.success) {
    return arrayResult.data.length > 0;
  }

  // For objects, treat as true (existence implies checked)
  return true;
};

/**
 * Match checkbox values considering different formats
 * Used to determine if a checkbox should be checked when multiple values are involved
 * Uses Zod for type validation.
 */
const matchesCheckboxValue = (optionValue: string, targetValue: unknown): boolean => {
  // Handle direct equality
  if (optionValue === targetValue) {
    return true;
  }

  // Check if target is an array using Zod
  const arrayResult = ArrayValueSchema.safeParse(targetValue);
  if (arrayResult.success) {
    return arrayResult.data.some(v => String(v) === optionValue);
  }

  // Check if target is a string using Zod
  const stringResult = StringValueSchema.safeParse(targetValue);
  if (stringResult.success) {
    const normalizedOption = optionValue.toLowerCase();
    const normalizedTarget = stringResult.data.toLowerCase();

    // Exact match after normalization
    if (normalizedOption === normalizedTarget) {
      return true;
    }

    // Split by commas or semicolons for multiple values in a string
    if (normalizedTarget.includes(',') || normalizedTarget.includes(';')) {
      const parts = normalizedTarget.split(/[,;]/).map(p => p.trim());
      return parts.includes(normalizedOption);
    }
  }

  return false;
};

// ============================================================================
// Clickable Target Discovery (Requirement 2)
// ============================================================================

/**
 * Find the best clickable target for a given input element.
 * Searches for associated labels, framework wrappers, and clickable ancestors.
 * Returns the outermost clickable container rather than the raw input.
 */
const findClickableTarget = (element: HTMLElement): HTMLElement => {
  // 1. Check for an associated <label> via the `for` attribute
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (isHTMLElement(label)) {
      debug.log(`findClickableTarget: found label[for="${element.id}"]`);
      return label;
    }
  }

  // 2. Check if the element is inside a <label>
  const ancestorLabel = element.closest('label');
  if (ancestorLabel && isHTMLElement(ancestorLabel)) {
    debug.log('findClickableTarget: found ancestor <label>');
    return ancestorLabel;
  }

  // 3. Check for framework-specific wrappers
  const frameworkWrapper = findFrameworkWrapper(element);
  if (frameworkWrapper) {
    debug.log('findClickableTarget: found framework wrapper');
    return frameworkWrapper;
  }

  // 4. Search for a generic clickable parent
  const clickableWrapper = findClickableWrapper(element);
  if (clickableWrapper) {
    debug.log('findClickableTarget: found clickable wrapper');
    return clickableWrapper;
  }

  // 5. Fallback: return the element itself
  return element;
};

/**
 * Detect framework-specific wrapper elements around a checkable input.
 * Supports: Ant Design, Chakra UI, Bootstrap, MUI, Radix, Headless UI.
 */
const findFrameworkWrapper = (element: HTMLElement): HTMLElement | null => {
  const frameworkSelectors = [
    // Ant Design
    '.ant-checkbox-wrapper',
    '.ant-radio-wrapper',
    '.ant-switch',
    // Chakra UI
    '.chakra-checkbox',
    '.chakra-radio',
    '.chakra-switch',
    '[class*="chakra-checkbox"]',
    '[class*="chakra-radio"]',
    '[class*="chakra-switch"]',
    // Bootstrap
    '.form-check',
    '.form-switch',
    '.custom-control',
    '.custom-switch',
    // MUI
    '.MuiSwitch-root',
    '.MuiCheckbox-root',
    '.MuiRadio-root',
    '.MuiFormControlLabel-root',
    // Radix UI
    '[data-state][role="checkbox"]',
    '[data-state][role="switch"]',
    '[data-state][role="radio"]',
    // Headless UI
    '[data-headlessui-state]',
  ];

  for (const selector of frameworkSelectors) {
    const wrapper = element.closest(selector);
    if (wrapper && isHTMLElement(wrapper)) {
      return wrapper;
    }
  }

  return null;
};

/**
 * Search up the DOM tree for a generic clickable wrapper element.
 * Identifies elements with cursor:pointer, click handlers, or interactive roles.
 */
const findClickableWrapper = (element: HTMLElement): HTMLElement | null => {
  let current = element.parentElement;
  let depth = 0;

  while (current && depth < MAX_ANCESTOR_DEPTH && current !== document.body) {
    // Check for cursor:pointer in computed styles
    try {
      const computedStyle = window.getComputedStyle(current);
      if (computedStyle.cursor === 'pointer') {
        return current;
      }
    } catch {
      // getComputedStyle can fail in some edge cases
    }

    // Check for click-related attributes
    if (
      current.getAttribute('onclick') ||
      current.getAttribute('tabindex') === '0' ||
      current.getAttribute('role') === 'button' ||
      current.getAttribute('role') === 'checkbox' ||
      current.getAttribute('role') === 'radio' ||
      current.getAttribute('role') === 'switch'
    ) {
      return current;
    }

    current = current.parentElement;
    depth++;
  }

  return null;
};

// ============================================================================
// Verification Helpers (Requirement 3)
// ============================================================================

/**
 * Verify whether an element is in the desired checked state.
 * Checks native .checked, aria-checked, data-state, data-headlessui-state,
 * and common CSS class patterns.
 */
const verifyCheckableState = (element: HTMLElement, desiredChecked: boolean): boolean => {
  // Native input
  if (element instanceof HTMLInputElement) {
    return element.checked === desiredChecked;
  }

  // ARIA state
  const ariaChecked = element.getAttribute('aria-checked');
  if (ariaChecked !== null) {
    return (ariaChecked === 'true') === desiredChecked;
  }

  // Radix UI data-state
  const dataState = element.getAttribute('data-state');
  if (dataState !== null) {
    return (dataState === 'checked') === desiredChecked;
  }

  // Headless UI data-headlessui-state
  const headlessState = element.getAttribute('data-headlessui-state');
  if (headlessState !== null) {
    return headlessState.includes('checked') === desiredChecked;
  }

  // Check within the element for a hidden native input
  const hiddenInput = element.querySelector('input[type="checkbox"], input[type="radio"]');
  if (hiddenInput instanceof HTMLInputElement) {
    return hiddenInput.checked === desiredChecked;
  }

  // CSS class heuristics
  const hasCheckedClass =
    element.classList.contains('checked') ||
    element.classList.contains('selected') ||
    element.classList.contains('active') ||
    element.classList.contains('Mui-checked') ||
    element.classList.contains('ant-checkbox-checked') ||
    element.classList.contains('ant-radio-checked') ||
    element.classList.contains('ant-switch-checked');

  return hasCheckedClass === desiredChecked;
};

/**
 * Wait a short delay then verify the element state.
 * Looks at both the element itself and nearby containers/parents.
 */
const waitAndVerify = async (element: HTMLElement, desiredChecked: boolean): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, VERIFICATION_DELAY_MS));

  // Check the element directly
  if (verifyCheckableState(element, desiredChecked)) {
    return true;
  }

  // Check parent containers (framework wrappers may hold the state)
  const frameworkWrapper = findFrameworkWrapper(element);
  if (frameworkWrapper && verifyCheckableState(frameworkWrapper, desiredChecked)) {
    return true;
  }

  // Check for a controlled native input nearby
  const controlledInput = findControlledInput(element);
  if (controlledInput && controlledInput.checked === desiredChecked) {
    return true;
  }

  return false;
};

// ============================================================================
// Custom Toggle Detection (Requirement 8)
// ============================================================================

/**
 * Detect whether an element looks like a custom iOS-style toggle switch.
 * Checks for CSS transition on transform, border-radius making a circle,
 * and small overall dimensions typical of toggle switches.
 */
const isCustomToggleElement = (element: HTMLElement): boolean => {
  try {
    const style = window.getComputedStyle(element);

    // Check for transition on transform (sliding toggle indicator)
    const transition = style.transition || style.getPropertyValue('transition');
    const hasTransformTransition = transition.includes('transform') || transition.includes('left');

    // Check for circular shape (toggle knob)
    const borderRadius = style.borderRadius;
    const isRound = borderRadius === '50%' || parseInt(borderRadius, 10) >= 10;

    // Check for toggle-like dimensions
    const rect = element.getBoundingClientRect();
    const isToggleSized = rect.width >= 30 && rect.width <= 80 && rect.height >= 15 && rect.height <= 40;

    // Check for toggle-related class names
    const className = element.className.toLowerCase();
    const hasToggleClass =
      className.includes('toggle') ||
      className.includes('switch') ||
      className.includes('slider') ||
      className.includes('knob');

    // An element is likely a toggle if it has transition + round shape, or toggle classes
    return (hasTransformTransition && isRound) || (isToggleSized && hasToggleClass);
  } catch {
    return false;
  }
};

/**
 * Capture a serialized snapshot of an element's current state.
 * Used to detect whether a click actually changed something.
 */
const captureElementState = (element: HTMLElement): string => {
  const parts: string[] = [];

  if (element instanceof HTMLInputElement) {
    parts.push(`checked:${element.checked}`);
    parts.push(`value:${element.value}`);
  }

  parts.push(`aria-checked:${element.getAttribute('aria-checked')}`);
  parts.push(`data-state:${element.getAttribute('data-state')}`);
  parts.push(`classes:${element.className}`);

  // Check child inputs
  const childInput = element.querySelector('input[type="checkbox"], input[type="radio"]');
  if (childInput instanceof HTMLInputElement) {
    parts.push(`child-checked:${childInput.checked}`);
  }

  return parts.join('|');
};

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Update a checkbox or radio button input
 * This is the main entry point for updating checkable fields
 */
const updateCheckable = async (element: HTMLElement, checked: boolean): Promise<void> => {
  try {
    // Headless UI Switch/Checkbox
    if (element.closest('[data-headlessui-state]')) {
      const result = await handleHeadlessUISwitch(element, checked);
      if (result) return;
    }

    // Radix UI Checkbox/Switch
    if (element.closest('[data-state]')) {
      if (element.closest('[role="switch"]')) {
        const result = await handleRadixSwitch(element, checked);
        if (result) return;
      } else {
        const result = await handleRadixCheckbox(element, checked);
        if (result) return;
      }
    }

    // MUI Switch
    if (
      element.closest('.MuiSwitch-root') ||
      element.closest('.Mui-checked') ||
      element.closest('[class*="MuiSwitch"]')
    ) {
      const result = await handleMUISwitch(element, checked);
      if (result) return;
    }

    // Ant Design (Requirement 5)
    if (
      element.closest('.ant-checkbox-wrapper') ||
      element.closest('.ant-radio-wrapper') ||
      element.closest('.ant-switch')
    ) {
      const result = await handleAntDesign(element, checked);
      if (result) return;
    }

    // Chakra UI (Requirement 6)
    if (
      element.closest('.chakra-checkbox') ||
      element.closest('.chakra-radio') ||
      element.closest('.chakra-switch') ||
      element.closest('[class*="chakra-checkbox"]') ||
      element.closest('[class*="chakra-radio"]') ||
      element.closest('[class*="chakra-switch"]')
    ) {
      const result = await handleChakraUI(element, checked);
      if (result) return;
    }

    // Bootstrap toggle (Requirement 7)
    if (
      element.closest('.form-check') ||
      element.closest('.form-switch') ||
      element.closest('.custom-control') ||
      element.closest('.custom-switch')
    ) {
      const result = await handleBootstrapToggle(element, checked);
      if (result) return;
    }

    // iOS-style custom toggle (Requirement 8)
    if (isCustomToggleElement(element) || (element.parentElement && isCustomToggleElement(element.parentElement))) {
      const result = await handleCustomToggle(element, checked);
      if (result) return;
    }

    // Handle both native inputs and ARIA-based custom controls
    if (
      element instanceof HTMLInputElement &&
      (element.type === FieldTypeEnum.CHECKBOX || element.type === FieldTypeEnum.RADIO)
    ) {
      await updateNativeCheckable(element, checked);
    } else if (
      element.getAttribute('role') === FieldTypeEnum.CHECKBOX ||
      element.getAttribute('role') === FieldTypeEnum.RADIO ||
      element.getAttribute('role') === 'switch'
    ) {
      await updateAriaCheckable(element, checked);
    } else {
      // Universal fallback for unknown custom components (Requirement 10)
      await updateWithUniversalFallback(element, checked);
    }

    // If this is a radio button and we're checking it, ensure that other radio buttons in the same group are unchecked
    if (
      checked &&
      ((element instanceof HTMLInputElement && element.type === FieldTypeEnum.RADIO) ||
        element.getAttribute('role') === FieldTypeEnum.RADIO)
    ) {
      updateRelatedRadioButtons(element);
    }
  } catch (error) {
    debug.error('Error updating checkable element:', error);
  }
};

// ============================================================================
// Native Checkable Update (Requirement 1 - Click-first approach)
// ============================================================================

/**
 * Update a native checkbox or radio input using click-first behavior.
 * Clicks the label or wrapper first, then falls back to direct property manipulation.
 */
const updateNativeCheckable = async (element: HTMLInputElement, checked: boolean): Promise<void> => {
  // Already in the desired state
  if (element.checked === checked) return;

  // Strategy 1: Click the outermost clickable target (label, wrapper)
  const clickTarget = findClickableTarget(element);
  if (clickTarget !== element) {
    debug.log('updateNativeCheckable: clicking label/wrapper instead of input');
    ensureFocus(clickTarget);
    dispatchPointerClickSequence(clickTarget);

    const verified = await waitAndVerify(element, checked);
    if (verified) {
      debug.log('updateNativeCheckable: label/wrapper click succeeded');
      return;
    }
  }

  // Strategy 2: Click the input directly
  debug.log('updateNativeCheckable: clicking input directly');
  ensureFocus(element);
  dispatchPointerClickSequence(element);

  const verifiedAfterClick = await waitAndVerify(element, checked);
  if (verifiedAfterClick) {
    debug.log('updateNativeCheckable: direct click succeeded');
    return;
  }

  // Strategy 3: Direct property manipulation (last resort)
  debug.log('updateNativeCheckable: falling back to direct property manipulation');
  element.checked = checked;

  const changeEvent = new Event('change', { bubbles: true });
  element.dispatchEvent(changeEvent);

  const inputEvent = new Event('input', { bubbles: true });
  element.dispatchEvent(inputEvent);

  // Try React-style synthetic event via native setter
  try {
    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set;
    if (nativeSetter) {
      nativeSetter.call(element, checked);
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  } catch {
    // Ignore setter errors
  }
};

// ============================================================================
// ARIA Checkable Update (Requirement 1 - Click-first approach)
// ============================================================================

/**
 * Update an ARIA-based checkbox or radio element.
 * Clicks the element first, then falls back to attribute manipulation.
 */
const updateAriaCheckable = async (element: HTMLElement, checked: boolean): Promise<void> => {
  // Get the current state
  const currentChecked = element.getAttribute('aria-checked') === 'true';

  // If already in desired state, return
  if (currentChecked === checked) return;

  // Strategy 1: Click the outermost clickable target
  const clickTarget = findClickableTarget(element);
  ensureFocus(clickTarget);
  dispatchPointerClickSequence(clickTarget);

  const verified = await waitAndVerify(element, checked);
  if (verified) {
    debug.log('updateAriaCheckable: click succeeded');
    return;
  }

  // Strategy 2: Try clicking the element itself if different from target
  if (clickTarget !== element) {
    ensureFocus(element);
    dispatchPointerClickSequence(element);

    const verifiedDirect = await waitAndVerify(element, checked);
    if (verifiedDirect) {
      debug.log('updateAriaCheckable: direct element click succeeded');
      return;
    }
  }

  // Strategy 3: Look for a controlled native input
  const controlledInput = findControlledInput(element);
  if (controlledInput) {
    await updateNativeCheckable(controlledInput, checked);
    // Sync aria-checked with the input state
    element.setAttribute('aria-checked', checked ? 'true' : 'false');
    return;
  }

  // Strategy 4: Direct attribute manipulation (last resort)
  debug.log('updateAriaCheckable: falling back to attribute manipulation');
  element.setAttribute('aria-checked', checked ? 'true' : 'false');

  // Update CSS classes
  updateVisualIndicators(element, checked);
};

/**
 * Find any native input that might be controlled by an ARIA element
 */
const findControlledInput = (element: HTMLElement): HTMLInputElement | null => {
  // Check for common patterns

  // 1. Input might be a child
  const childInput = queryInputElement(element, 'input[type="checkbox"], input[type="radio"]');
  if (childInput) return childInput;

  // 2. Input might be a sibling
  const siblingInput = element.parentElement
    ? queryInputElement(element.parentElement, 'input[type="checkbox"], input[type="radio"]')
    : null;
  if (siblingInput && siblingInput !== element) return siblingInput;

  // 3. Input might be linked by ARIA attributes
  const controlsId = element.getAttribute('aria-controls');
  if (controlsId) {
    const controlledElement = document.getElementById(controlsId);
    if (isHTMLInputElement(controlledElement)) {
      return controlledElement;
    }
  }

  // 4. Input might be hidden in the DOM
  if (element.id) {
    const relatedInput = document.querySelector(`input[aria-labelledby="${element.id}"]`);
    if (isHTMLInputElement(relatedInput)) return relatedInput;
  }

  return null;
};

/**
 * Update visual indicators for custom checkbox/radio components
 */
const updateVisualIndicators = (element: HTMLElement, checked: boolean): void => {
  // Update CSS classes based on common patterns
  if (checked) {
    element.classList.add('checked', 'selected', 'active');
    element.classList.remove('unchecked');
  } else {
    element.classList.remove('checked', 'selected', 'active');
    element.classList.add('unchecked');
  }

  // Dispatch events
  const changeEvent = new Event('change', { bubbles: true });
  element.dispatchEvent(changeEvent);

  const inputEvent = new Event('input', { bubbles: true });
  element.dispatchEvent(inputEvent);
};

// ============================================================================
// Framework-Specific Handlers
// ============================================================================

/**
 * Handle Headless UI Switch/Checkbox components
 */
const handleHeadlessUISwitch = async (element: HTMLElement, shouldBeChecked: boolean): Promise<boolean> => {
  try {
    const switchEl = element.closest<HTMLElement>('[data-headlessui-state]') ?? element;
    const currentState =
      switchEl.getAttribute('data-headlessui-state')?.includes('checked') ||
      switchEl.getAttribute('aria-checked') === 'true';

    if (currentState !== shouldBeChecked) {
      // Click the switch element itself (Headless UI handles state internally)
      const clickTarget = findClickableTarget(switchEl);
      ensureFocus(clickTarget);
      dispatchPointerClickSequence(clickTarget);

      const verified = await waitAndVerify(switchEl, shouldBeChecked);
      if (verified) return true;

      // Fallback: click the switch directly
      if (clickTarget !== switchEl) {
        dispatchPointerClickSequence(switchEl);
        return await waitAndVerify(switchEl, shouldBeChecked);
      }

      return false;
    }
    return true; // Already in desired state
  } catch {
    return false;
  }
};

/**
 * Handle Radix UI Checkbox components
 */
const handleRadixCheckbox = async (element: HTMLElement, shouldBeChecked: boolean): Promise<boolean> => {
  try {
    const checkEl = element.closest<HTMLElement>('[data-state]') ?? element;
    const currentState = checkEl.getAttribute('data-state') === 'checked';

    if (currentState !== shouldBeChecked) {
      const clickTarget = findClickableTarget(checkEl);
      ensureFocus(clickTarget);
      dispatchPointerClickSequence(clickTarget);

      const verified = await waitAndVerify(checkEl, shouldBeChecked);
      if (verified) return true;

      // Fallback: click the data-state element directly
      if (clickTarget !== checkEl) {
        dispatchPointerClickSequence(checkEl);
        return await waitAndVerify(checkEl, shouldBeChecked);
      }

      return false;
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Handle Radix UI Switch components
 */
const handleRadixSwitch = async (element: HTMLElement, shouldBeChecked: boolean): Promise<boolean> => {
  try {
    const switchEl = element.closest<HTMLElement>('[data-state][role="switch"]') ?? element;
    const currentState = switchEl.getAttribute('data-state') === 'checked';

    if (currentState !== shouldBeChecked) {
      const clickTarget = findClickableTarget(switchEl);
      ensureFocus(clickTarget);
      dispatchPointerClickSequence(clickTarget);

      const verified = await waitAndVerify(switchEl, shouldBeChecked);
      if (verified) return true;

      // Fallback: click the switch directly
      if (clickTarget !== switchEl) {
        dispatchPointerClickSequence(switchEl);
        return await waitAndVerify(switchEl, shouldBeChecked);
      }

      return false;
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Handle MUI Switch components (Requirement 9 - improved)
 * Clicks the .MuiSwitch-root container first instead of finding the checkbox input.
 */
const handleMUISwitch = async (element: HTMLElement, shouldBeChecked: boolean): Promise<boolean> => {
  try {
    // Strategy 1: Click the .MuiSwitch-root container
    const muiRoot =
      element.closest<HTMLElement>('.MuiSwitch-root') || element.closest<HTMLElement>('.MuiFormControlLabel-root');

    if (muiRoot) {
      // Find the input to check current state
      const input = muiRoot.querySelector<HTMLInputElement>('input[type="checkbox"]');
      const currentChecked = input ? input.checked : element.classList.contains('Mui-checked');

      if (currentChecked !== shouldBeChecked) {
        ensureFocus(muiRoot);
        dispatchPointerClickSequence(muiRoot);

        const verified = await waitAndVerify(element, shouldBeChecked);
        if (verified) return true;

        // Strategy 2: Click the MuiSwitch-switchBase (the clickable thumb area)
        const switchBase = muiRoot.querySelector<HTMLElement>('.MuiSwitch-switchBase');
        if (switchBase) {
          dispatchPointerClickSequence(switchBase);
          const verifiedBase = await waitAndVerify(element, shouldBeChecked);
          if (verifiedBase) return true;
        }

        // Strategy 3: Click the input directly
        if (input && input.checked !== shouldBeChecked) {
          ensureFocus(input);
          dispatchPointerClickSequence(input);
          await new Promise(resolve => setTimeout(resolve, VERIFICATION_DELAY_MS));

          if (input.checked !== shouldBeChecked) {
            // Last resort: direct manipulation
            input.checked = shouldBeChecked;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }

        return input ? input.checked === shouldBeChecked : false;
      }

      return true; // Already in desired state
    }

    // No MUI root found - try finding input directly
    const input =
      element.querySelector<HTMLInputElement>('input[type="checkbox"]') ||
      (element instanceof HTMLInputElement ? element : null);

    if (!input) return false;

    if (input.checked !== shouldBeChecked) {
      ensureFocus(input);
      dispatchPointerClickSequence(input);
      await new Promise(resolve => setTimeout(resolve, VERIFICATION_DELAY_MS));

      if (input.checked !== shouldBeChecked) {
        input.checked = shouldBeChecked;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    return input.checked === shouldBeChecked;
  } catch {
    return false;
  }
};

/**
 * Handle Ant Design Checkbox/Radio/Switch components (Requirement 5)
 * Clicks the .ant-checkbox-wrapper, .ant-radio-wrapper, or .ant-switch element.
 */
const handleAntDesign = async (element: HTMLElement, shouldBeChecked: boolean): Promise<boolean> => {
  try {
    // Find the Ant Design wrapper
    const wrapper =
      element.closest<HTMLElement>('.ant-checkbox-wrapper') ||
      element.closest<HTMLElement>('.ant-radio-wrapper') ||
      element.closest<HTMLElement>('.ant-switch');

    if (!wrapper) return false;

    // Determine current state
    const isAntSwitch = wrapper.classList.contains('ant-switch');
    const currentChecked = isAntSwitch
      ? wrapper.classList.contains('ant-switch-checked')
      : wrapper.classList.contains('ant-checkbox-checked') ||
        wrapper.classList.contains('ant-radio-checked') ||
        wrapper.querySelector('.ant-checkbox-checked, .ant-radio-checked') !== null;

    // Also check via hidden input
    const hiddenInput = wrapper.querySelector<HTMLInputElement>('input[type="checkbox"], input[type="radio"]');
    const inputChecked = hiddenInput ? hiddenInput.checked : currentChecked;

    if (inputChecked !== shouldBeChecked) {
      // Click the wrapper (Ant Design handles state via React)
      ensureFocus(wrapper);
      dispatchPointerClickSequence(wrapper);

      const verified = await waitAndVerify(element, shouldBeChecked);
      if (verified) return true;

      // Fallback: click the inner checkbox/radio/switch element
      const innerTarget = wrapper.querySelector<HTMLElement>('.ant-checkbox, .ant-radio, .ant-switch-inner') ?? wrapper;

      if (innerTarget !== wrapper) {
        dispatchPointerClickSequence(innerTarget);
        const verifiedInner = await waitAndVerify(element, shouldBeChecked);
        if (verifiedInner) return true;
      }

      // Last resort: manipulate the hidden input
      if (hiddenInput && hiddenInput.checked !== shouldBeChecked) {
        hiddenInput.checked = shouldBeChecked;
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      return hiddenInput ? hiddenInput.checked === shouldBeChecked : false;
    }

    return true; // Already in desired state
  } catch {
    return false;
  }
};

/**
 * Handle Chakra UI Checkbox/Radio/Switch components (Requirement 6)
 * Clicks the chakra-checkbox/radio/switch container element.
 */
const handleChakraUI = async (element: HTMLElement, shouldBeChecked: boolean): Promise<boolean> => {
  try {
    // Find the Chakra wrapper
    const wrapper =
      element.closest<HTMLElement>('.chakra-checkbox') ||
      element.closest<HTMLElement>('.chakra-radio') ||
      element.closest<HTMLElement>('.chakra-switch') ||
      element.closest<HTMLElement>('[class*="chakra-checkbox"]') ||
      element.closest<HTMLElement>('[class*="chakra-radio"]') ||
      element.closest<HTMLElement>('[class*="chakra-switch"]');

    if (!wrapper) return false;

    // Find the hidden input
    const hiddenInput = wrapper.querySelector<HTMLInputElement>('input[type="checkbox"], input[type="radio"]');
    const currentChecked = hiddenInput
      ? hiddenInput.checked
      : wrapper.getAttribute('data-checked') !== null || wrapper.getAttribute('aria-checked') === 'true';

    if (currentChecked !== shouldBeChecked) {
      // Chakra UI uses labels or the wrapper itself as click targets
      const label = wrapper.querySelector<HTMLElement>('label');
      const clickTarget = label || wrapper;

      ensureFocus(clickTarget);
      dispatchPointerClickSequence(clickTarget);

      const verified = await waitAndVerify(element, shouldBeChecked);
      if (verified) return true;

      // Fallback: click the control element
      const control = wrapper.querySelector<HTMLElement>('.chakra-checkbox__control, .chakra-switch__track');
      if (control) {
        dispatchPointerClickSequence(control);
        const verifiedControl = await waitAndVerify(element, shouldBeChecked);
        if (verifiedControl) return true;
      }

      // Last resort: manipulate the hidden input
      if (hiddenInput && hiddenInput.checked !== shouldBeChecked) {
        hiddenInput.checked = shouldBeChecked;
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      return hiddenInput ? hiddenInput.checked === shouldBeChecked : false;
    }

    return true; // Already in desired state
  } catch {
    return false;
  }
};

/**
 * Handle Bootstrap toggle/checkbox/radio components (Requirement 7)
 * Clicks the .form-check wrapper or the associated label.
 */
const handleBootstrapToggle = async (element: HTMLElement, shouldBeChecked: boolean): Promise<boolean> => {
  try {
    // Find the Bootstrap wrapper
    const wrapper =
      element.closest<HTMLElement>('.form-switch') ||
      element.closest<HTMLElement>('.form-check') ||
      element.closest<HTMLElement>('.custom-switch') ||
      element.closest<HTMLElement>('.custom-control');

    if (!wrapper) return false;

    // Find the input
    const input = wrapper.querySelector<HTMLInputElement>('input[type="checkbox"], input[type="radio"]');

    if (!input) return false;

    if (input.checked !== shouldBeChecked) {
      // Bootstrap: clicking the label toggles the input
      const label = wrapper.querySelector<HTMLElement>('.form-check-label, .custom-control-label, label');
      const clickTarget = label || input;

      ensureFocus(clickTarget);
      dispatchPointerClickSequence(clickTarget);

      const verified = await waitAndVerify(input, shouldBeChecked);
      if (verified) return true;

      // Fallback: click the input directly
      if (clickTarget !== input) {
        ensureFocus(input);
        dispatchPointerClickSequence(input);

        const verifiedInput = await waitAndVerify(input, shouldBeChecked);
        if (verifiedInput) return true;
      }

      // Last resort: direct manipulation
      input.checked = shouldBeChecked;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('input', { bubbles: true }));

      return input.checked === shouldBeChecked;
    }

    return true; // Already in desired state
  } catch {
    return false;
  }
};

/**
 * Handle iOS-style custom toggle switches (Requirement 8)
 * Detects elements with CSS transitions on transform, circular knobs, etc.
 */
const handleCustomToggle = async (element: HTMLElement, shouldBeChecked: boolean): Promise<boolean> => {
  try {
    // Find the toggle container (the element or its parent)
    const toggleEl = isCustomToggleElement(element)
      ? element
      : element.parentElement && isCustomToggleElement(element.parentElement)
        ? element.parentElement
        : null;

    if (!toggleEl) return false;

    // Check for a hidden input inside the toggle
    const hiddenInput = toggleEl.querySelector<HTMLInputElement>('input[type="checkbox"]');
    const currentChecked = hiddenInput
      ? hiddenInput.checked
      : toggleEl.getAttribute('aria-checked') === 'true' ||
        toggleEl.classList.contains('checked') ||
        toggleEl.classList.contains('active') ||
        toggleEl.classList.contains('on');

    if (currentChecked !== shouldBeChecked) {
      // Click the toggle
      ensureFocus(toggleEl);
      dispatchPointerClickSequence(toggleEl);

      const verified = await waitAndVerify(toggleEl, shouldBeChecked);
      if (verified) return true;

      // Fallback: try clicking the knob/thumb
      const knob = toggleEl.querySelector<HTMLElement>('.toggle-knob, .toggle-thumb, .slider, .knob, .thumb');
      if (knob) {
        dispatchPointerClickSequence(knob);
        const verifiedKnob = await waitAndVerify(toggleEl, shouldBeChecked);
        if (verifiedKnob) return true;
      }

      // Last resort: manipulate the hidden input
      if (hiddenInput && hiddenInput.checked !== shouldBeChecked) {
        hiddenInput.checked = shouldBeChecked;
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
        return hiddenInput.checked === shouldBeChecked;
      }

      // Direct attribute manipulation
      toggleEl.setAttribute('aria-checked', shouldBeChecked ? 'true' : 'false');
      if (shouldBeChecked) {
        toggleEl.classList.add('checked', 'active', 'on');
        toggleEl.classList.remove('unchecked', 'off');
      } else {
        toggleEl.classList.remove('checked', 'active', 'on');
        toggleEl.classList.add('unchecked', 'off');
      }

      return false; // Cannot confidently verify custom toggles with attribute manipulation
    }

    return true; // Already in desired state
  } catch {
    return false;
  }
};

// ============================================================================
// Universal Fallback (Requirement 10)
// ============================================================================

/**
 * Universal fallback for custom toggle/checkbox/radio components.
 * Progressively attempts: click element, click parent, click children, direct manipulation.
 */
const updateWithUniversalFallback = async (element: HTMLElement, checked: boolean): Promise<void> => {
  // Capture initial state to detect changes
  const initialState = captureElementState(element);

  // Strategy 1: Find and click a native input inside
  const containedInput = queryInputElement(element, 'input[type="checkbox"], input[type="radio"]');
  if (containedInput) {
    await updateNativeCheckable(containedInput, checked);
    const newState = captureElementState(element);
    if (newState !== initialState) {
      debug.log('updateWithUniversalFallback: contained input update succeeded');
      return;
    }
  }

  // Strategy 2: Check for a label linked to an input
  if (element.tagName === 'LABEL') {
    const labelFor = element.getAttribute('for');
    if (labelFor) {
      const linkedInput = document.getElementById(labelFor);
      if (
        isHTMLInputElement(linkedInput) &&
        (linkedInput.type === FieldTypeEnum.CHECKBOX || linkedInput.type === FieldTypeEnum.RADIO)
      ) {
        await updateNativeCheckable(linkedInput, checked);
        return;
      }
    }
  }

  // Strategy 3: Click the element itself
  ensureFocus(element);
  dispatchPointerClickSequence(element);
  await new Promise(resolve => setTimeout(resolve, FALLBACK_CLICK_DELAY_MS));

  const stateAfterClick = captureElementState(element);
  if (stateAfterClick !== initialState) {
    debug.log('updateWithUniversalFallback: element click succeeded (state changed)');
    return;
  }

  // Strategy 4: Click the parent element
  if (element.parentElement && element.parentElement !== document.body) {
    dispatchPointerClickSequence(element.parentElement);
    await new Promise(resolve => setTimeout(resolve, FALLBACK_CLICK_DELAY_MS));

    const stateAfterParentClick = captureElementState(element);
    if (stateAfterParentClick !== initialState) {
      debug.log('updateWithUniversalFallback: parent click succeeded (state changed)');
      return;
    }
  }

  // Strategy 5: Try clicking interactive children (buttons, links, etc.)
  const interactiveChildren = element.querySelectorAll('button, a, [role="button"], [tabindex="0"]');
  for (const child of Array.from(interactiveChildren)) {
    if (isHTMLElement(child)) {
      dispatchPointerClickSequence(child);
      await new Promise(resolve => setTimeout(resolve, FALLBACK_CLICK_DELAY_MS));

      const stateAfterChildClick = captureElementState(element);
      if (stateAfterChildClick !== initialState) {
        debug.log('updateWithUniversalFallback: child click succeeded (state changed)');
        return;
      }
    }
  }

  // Strategy 6: Check parent for input siblings
  if (element.parentElement) {
    const parentInput = queryInputElement(element.parentElement, 'input[type="checkbox"], input[type="radio"]');
    if (parentInput && !parentInput.contains(element)) {
      await updateNativeCheckable(parentInput, checked);
      return;
    }
  }

  // Strategy 7: Direct manipulation (absolute last resort)
  debug.log('updateWithUniversalFallback: all click strategies failed, using direct manipulation');
  element.setAttribute('data-filliny-checked', checked ? 'true' : 'false');

  if (checked) {
    element.classList.add('checked', 'selected', 'active');
    element.classList.remove('unchecked');
  } else {
    element.classList.remove('checked', 'selected', 'active');
    element.classList.add('unchecked');
  }

  // Dispatch events
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('input', { bubbles: true }));
};

// ============================================================================
// Radio Group Helpers (Requirement 4 - click LABELS not inputs)
// ============================================================================

/**
 * Find and update related radio buttons in the same group
 */
const updateRelatedRadioButtons = (element: HTMLElement): void => {
  // Find all related radio buttons
  const relatedRadios = findRelatedRadioButtons(element);

  // Uncheck all except the current one
  relatedRadios.forEach(radio => {
    if (radio !== element) {
      if (radio instanceof HTMLInputElement) {
        if (radio.checked) {
          radio.checked = false;

          // Dispatch events
          const changeEvent = new Event('change', { bubbles: true });
          radio.dispatchEvent(changeEvent);

          const inputEvent = new Event('input', { bubbles: true });
          radio.dispatchEvent(inputEvent);
        }
      } else if (radio.getAttribute('role') === 'radio') {
        if (radio.getAttribute('aria-checked') === 'true') {
          radio.setAttribute('aria-checked', 'false');

          // Update visual indicators
          updateVisualIndicators(radio, false);
        }
      }
    }
  });
};

/**
 * Find a common container for elements
 */
const findCommonContainer = (elements: HTMLElement[]): HTMLElement | null => {
  if (elements.length === 0) return null;
  if (elements.length === 1) return elements[0].parentElement;

  // Start with the first element's ancestors
  let commonAncestor = elements[0].parentElement;

  while (commonAncestor) {
    // Check if this ancestor contains all elements
    const containsAll = elements.every(el => commonAncestor?.contains(el));
    if (containsAll) {
      // Prefer semantic containers
      if (
        commonAncestor.tagName.toLowerCase() === 'fieldset' ||
        commonAncestor.getAttribute('role') === 'radiogroup' ||
        commonAncestor.getAttribute('role') === 'group' ||
        commonAncestor.classList.contains('radio-group') ||
        commonAncestor.classList.contains('checkbox-group') ||
        commonAncestor.querySelector('legend')
      ) {
        return commonAncestor;
      }
    }
    commonAncestor = commonAncestor.parentElement;
  }

  return null;
};

// ============================================================================
// Field Detection
// ============================================================================

/**
 * Detect checkable fields with proper grouping
 * This is the main entry point for detecting radio and checkbox fields
 */
const detectCheckableFields = async (
  elements: HTMLElement[],
  baseIndex: number,
  testMode: boolean = false,
): Promise<Field[]> => {
  const fields: Field[] = [];
  let fieldIndex = 0;

  console.log(
    `Detecting checkable fields from ${elements.length} elements, baseIndex: ${baseIndex}, testMode: ${testMode}`,
  );

  // Separate elements by type
  const radioElements = elements.filter(
    el =>
      (el instanceof HTMLInputElement && el.type === FieldTypeEnum.RADIO) ||
      el.getAttribute('role') === FieldTypeEnum.RADIO,
  );
  const checkboxElements = elements.filter(
    el =>
      (el instanceof HTMLInputElement && el.type === FieldTypeEnum.CHECKBOX) ||
      el.getAttribute('role') === FieldTypeEnum.CHECKBOX,
  );
  const switchElements = elements.filter(el => el.getAttribute('role') === 'switch');

  console.log(
    `Found ${radioElements.length} radio elements, ${checkboxElements.length} checkbox elements, ${switchElements.length} switch elements`,
  );

  // Process radio buttons as groups
  if (radioElements.length > 0) {
    const radioGroups = await groupRadioElements(radioElements);
    debug.log(`Created ${radioGroups.size} radio groups`);

    for (const [groupId, groupElements] of radioGroups.entries()) {
      try {
        const field = await createRadioGroupField(groupElements, baseIndex + fieldIndex, groupId, testMode);
        fields.push(field);
        fieldIndex++;
        debug.log(`Created radio group field: ${field.id} with ${groupElements.length} options`);
      } catch (error) {
        debug.error(`Error creating radio group field for ${groupId}:`, error);
      }
    }
  }

  // Process checkboxes - can be individual or grouped
  if (checkboxElements.length > 0) {
    const checkboxGroups = await groupCheckboxElements(checkboxElements);
    debug.log(`Created ${checkboxGroups.size} checkbox groups`);

    for (const [groupId, groupElements] of checkboxGroups.entries()) {
      try {
        if (groupElements.length === 1) {
          // Single checkbox
          const field = await createCheckboxField(groupElements[0], baseIndex + fieldIndex, testMode);
          fields.push(field);
          debug.log(`Created single checkbox field: ${field.id}`);
        } else {
          // Checkbox group
          const field = await createCheckboxGroupField(groupElements, baseIndex + fieldIndex, groupId, testMode);
          fields.push(field);
          debug.log(`Created checkbox group field: ${field.id} with ${groupElements.length} options`);
        }
        fieldIndex++;
      } catch (error) {
        debug.error(`Error creating checkbox field for ${groupId}:`, error);
      }
    }
  }

  // Process switch elements individually
  for (const switchElement of switchElements) {
    try {
      const field = await createSwitchField(switchElement, baseIndex + fieldIndex, testMode);
      fields.push(field);
      fieldIndex++;
      debug.log(`Created switch field: ${field.id}`);
    } catch (error) {
      debug.error(`Error creating switch field:`, error);
    }
  }

  debug.log(`Detected ${fields.length} checkable fields total`);
  return fields;
};

// ============================================================================
// Grouping Algorithms
// ============================================================================

/**
 * Enhanced grouping algorithm for radio elements with comprehensive fallback strategies
 */
const groupRadioElements = async (elements: HTMLElement[]): Promise<Map<string, HTMLElement[]>> => {
  const groups = new Map<string, HTMLElement[]>();
  const processed = new Set<HTMLElement>();

  debug.log(`Grouping ${elements.length} radio elements using enhanced algorithm`);

  // Strategy 1: Group by name attribute (most reliable for radio buttons)
  const namedGroups = new Map<string, HTMLElement[]>();
  for (const element of elements) {
    if (element instanceof HTMLInputElement && element.name) {
      const name = element.name;
      if (!namedGroups.has(name)) {
        namedGroups.set(name, []);
      }
      namedGroups.get(name)!.push(element);
      processed.add(element);
    }
  }

  // Add named groups (radio buttons with same name should always be grouped)
  for (const [name, groupElements] of namedGroups.entries()) {
    if (groupElements.length >= 1) {
      // Even single radios are part of a group conceptually
      groups.set(`radio-name-${name}`, groupElements);
      debug.log(`Created radio group from name "${name}" with ${groupElements.length} elements`);
    }
  }

  // Strategy 2: Group remaining elements by semantic containers and proximity
  const unprocessedElements = elements.filter(el => !processed.has(el));
  if (unprocessedElements.length > 0) {
    debug.log(`Processing ${unprocessedElements.length} unnamed radio elements`);

    // First try semantic containers
    const containerGroups = await groupBySemanticContainers(unprocessedElements, 'radio');
    for (const [groupId, groupElements] of containerGroups.entries()) {
      groups.set(groupId, groupElements);
      groupElements.forEach(el => processed.add(el));
      debug.log(`Created radio group from container "${groupId}" with ${groupElements.length} elements`);
    }

    // Then handle any remaining elements with proximity-based grouping
    const stillUnprocessed = elements.filter(el => !processed.has(el));
    if (stillUnprocessed.length > 0) {
      debug.log(`Creating individual groups for ${stillUnprocessed.length} remaining radio elements`);

      // For radio buttons, even individual ones should be treated as groups
      // This is because radio buttons are conceptually always part of a group
      stillUnprocessed.forEach((element, index) => {
        const elementId = element.id || element.getAttribute('data-filliny-id') || `radio-${Date.now()}-${index}`;
        const groupId = `radio-individual-${elementId}`;
        groups.set(groupId, [element]);
        debug.log(`Created individual radio group: ${groupId}`);
      });
    }
  }

  return groups;
};

/**
 * Enhanced grouping algorithm for checkbox elements with improved logic
 */
const groupCheckboxElements = async (elements: HTMLElement[]): Promise<Map<string, HTMLElement[]>> => {
  const groups = new Map<string, HTMLElement[]>();
  const processed = new Set<HTMLElement>();

  debug.log(`Grouping ${elements.length} checkbox elements using enhanced algorithm`);

  // Strategy 1: Group by name attribute (only if multiple checkboxes share the same name)
  const namedGroups = new Map<string, HTMLElement[]>();
  for (const element of elements) {
    if (element instanceof HTMLInputElement && element.name) {
      const name = element.name;
      if (!namedGroups.has(name)) {
        namedGroups.set(name, []);
      }
      namedGroups.get(name)!.push(element);
    }
  }

  // Add named groups only if they have multiple elements
  for (const [name, groupElements] of namedGroups.entries()) {
    if (groupElements.length > 1) {
      groups.set(`checkbox-name-${name}`, groupElements);
      groupElements.forEach(el => processed.add(el));
      debug.log(`Created checkbox group from name "${name}" with ${groupElements.length} elements`);
    }
  }

  // Strategy 2: Group remaining elements by semantic containers
  const unprocessedElements = elements.filter(el => !processed.has(el));
  if (unprocessedElements.length > 0) {
    debug.log(`Processing ${unprocessedElements.length} ungrouped checkbox elements`);

    const containerGroups = await groupBySemanticContainers(unprocessedElements, 'checkbox');
    for (const [groupId, groupElements] of containerGroups.entries()) {
      if (groupElements.length > 1) {
        // Only group checkboxes if there are multiple in the same semantic container
        groups.set(groupId, groupElements);
        groupElements.forEach(el => processed.add(el));
        debug.log(`Created checkbox group from container "${groupId}" with ${groupElements.length} elements`);
      }
    }
  }

  // Strategy 3: Individual checkboxes (those not grouped by above strategies)
  const stillUnprocessed = elements.filter(el => !processed.has(el));
  for (const element of stillUnprocessed) {
    // Create individual checkbox groups
    const groupId = `checkbox-individual-${element.id || element.getAttribute('data-filliny-id') || Date.now()}-${Math.random()}`;
    groups.set(groupId, [element]);
    debug.log(`Created individual checkbox: ${groupId}`);
  }

  return groups;
};

/**
 * Group elements by semantic containers using multiple detection strategies
 */
const groupBySemanticContainers = async (
  elements: HTMLElement[],
  type: 'radio' | 'checkbox',
): Promise<Map<string, HTMLElement[]>> => {
  const groups = new Map<string, HTMLElement[]>();
  const processed = new Set<HTMLElement>();

  // Define semantic container selectors in priority order
  const semanticSelectors = [
    '[role="radiogroup"]', // ARIA radiogroup (highest priority)
    '[role="group"]', // ARIA group
    'fieldset', // HTML fieldset
    '[class*="radio-group" i]', // CSS class patterns (case insensitive)
    '[class*="radiogroup" i]',
    '[class*="checkbox-group" i]',
    '[class*="checkboxgroup" i]',
    '[class*="option-group" i]',
    '[class*="optiongroup" i]',
    '[class*="form-group" i]',
    '[class*="field-group" i]',
    '[data-group]', // Data attributes
    '[data-radio-group]',
    '[data-checkbox-group]',
  ];

  for (const element of elements) {
    if (processed.has(element)) continue;

    let bestContainer: HTMLElement | null = null;
    let bestScore = 0;

    // Find the best semantic container for this element
    for (const selector of semanticSelectors) {
      const container = element.closest(selector);
      if (isHTMLElement(container)) {
        // Score this container based on how appropriate it is
        const score = scoreSemanticContainer(container, elements, type);
        if (score > bestScore) {
          bestScore = score;
          bestContainer = container;
        }
      }
    }

    if (bestContainer && bestScore > 0) {
      // Find all elements in this container
      const containerElements = elements.filter(el => bestContainer!.contains(el) && !processed.has(el));

      if (containerElements.length >= (type === 'radio' ? 1 : 2)) {
        // Create group identifier
        const containerId =
          bestContainer.id ||
          bestContainer.getAttribute('data-group') ||
          bestContainer.className.split(' ')[0] ||
          'container';

        const groupId = `${type}-semantic-${containerId}-${Date.now()}`;
        groups.set(groupId, containerElements);

        containerElements.forEach(el => processed.add(el));

        console.log(
          `Grouped ${containerElements.length} ${type} elements by semantic container: ${bestContainer.tagName}.${bestContainer.className}`,
        );
      }
    }
  }

  // Handle remaining elements with proximity-based grouping
  const remainingElements = elements.filter(el => !processed.has(el));
  if (remainingElements.length > 1) {
    const proximityGroups = groupByProximity(remainingElements, type);
    for (const [groupId, groupElements] of proximityGroups.entries()) {
      groups.set(groupId, groupElements);
      debug.log(`Created proximity-based ${type} group: ${groupId} with ${groupElements.length} elements`);
    }
  }

  return groups;
};

/**
 * Score a semantic container based on how well it groups the given elements
 */
const scoreSemanticContainer = (
  container: HTMLElement,
  allElements: HTMLElement[],
  type: 'radio' | 'checkbox',
): number => {
  let score = 0;

  // Count how many of our elements this container contains
  const containedElements = allElements.filter(el => container.contains(el));
  if (containedElements.length === 0) return 0;

  // Base score from element count
  score += containedElements.length * 10;

  // Bonus for semantic HTML and ARIA
  const tagName = container.tagName.toLowerCase();
  const role = container.getAttribute('role');

  if (role === 'radiogroup' && type === 'radio') score += 50;
  if (role === 'group') score += 30;
  if (tagName === 'fieldset') score += 40;

  // Bonus for appropriate class names
  const className = container.className.toLowerCase();
  if (className.includes(`${type}-group`)) score += 30;
  if (className.includes('form-group')) score += 20;
  if (className.includes('field-group')) score += 20;

  // Bonus for having a label (legend, aria-label, etc.)
  const hasLabel =
    container.querySelector('legend') ||
    container.getAttribute('aria-label') ||
    container.getAttribute('aria-labelledby');
  if (hasLabel) score += 15;

  // Penalty for containing too many other form elements (indicates it's too broad)
  const otherFormElements = container.querySelectorAll('input, select, textarea').length - containedElements.length;
  if (otherFormElements > containedElements.length * 2) {
    score -= 20;
  }

  // Penalty for being too deeply nested
  const depth = getContainerDepth(container);
  if (depth > 15) score -= (depth - 15) * 2;

  return Math.max(0, score);
};

/**
 * Group elements by proximity when no semantic containers are found
 */
const groupByProximity = (elements: HTMLElement[], type: 'radio' | 'checkbox'): Map<string, HTMLElement[]> => {
  const groups = new Map<string, HTMLElement[]>();

  if (elements.length <= 1) {
    // Single elements or empty array
    elements.forEach((el, idx) => {
      groups.set(`${type}-proximity-${idx}-${Date.now()}`, [el]);
    });
    return groups;
  }

  // Calculate distances between elements
  const elementPositions = elements.map(el => ({
    element: el,
    rect: el.getBoundingClientRect(),
  }));

  // Simple clustering based on vertical proximity
  const clusters: HTMLElement[][] = [];
  const processed = new Set<HTMLElement>();

  for (const { element, rect } of elementPositions) {
    if (processed.has(element)) continue;

    const cluster = [element];
    processed.add(element);

    // Find nearby elements
    for (const { element: otherElement, rect: otherRect } of elementPositions) {
      if (processed.has(otherElement)) continue;

      // Consider elements close if they're within 100px vertically
      const distance = Math.abs(rect.top - otherRect.top);
      if (distance <= 100) {
        cluster.push(otherElement);
        processed.add(otherElement);
      }
    }

    if (cluster.length >= (type === 'radio' ? 1 : 2)) {
      clusters.push(cluster);
    }
  }

  // Convert clusters to groups
  clusters.forEach((cluster, idx) => {
    groups.set(`${type}-proximity-${idx}-${Date.now()}`, cluster);
  });

  return groups;
};

/**
 * Get the depth of a container in the DOM tree
 */
const getContainerDepth = (container: HTMLElement): number => {
  let depth = 0;
  let current = container.parentElement;
  while (current && current !== document.body) {
    depth++;
    current = current.parentElement;
  }
  return depth;
};

// ============================================================================
// Field Creation
// ============================================================================

/**
 * Create a field for a radio group
 */
const createRadioGroupField = async (
  elements: HTMLElement[],
  index: number,
  groupId: string,
  testMode: boolean,
): Promise<CheckableField> => {
  const firstElement = elements[0];
  const field = toCheckableField(await createBaseField(firstElement, index, 'radio', testMode));

  // Set group metadata
  field.groupName = groupId;
  field.groupType = 'radio';

  // Get group label from container or fieldset
  const container = findCommonContainer(elements);
  if (container) {
    const legend = container.querySelector('legend');
    const groupLabel =
      legend?.textContent?.trim() || container.getAttribute('aria-label') || container.getAttribute('data-label');
    if (groupLabel) {
      field.label = groupLabel;
    }
  }

  // Create options from all radio buttons in the group
  field.options = elements.map((el, idx) => {
    const label = getFieldLabel(el);
    let value = '';
    let selected = false;

    if (el instanceof HTMLInputElement) {
      value = el.value || `option-${idx}`;
      selected = el.checked;
    } else {
      value = el.getAttribute('value') || el.getAttribute('data-value') || `option-${idx}`;
      selected = el.getAttribute('aria-checked') === 'true';
    }

    // Add filliny-id to each radio button for later reference
    el.setAttribute('data-filliny-id', `${field.id}-option-${idx}`);

    return {
      value,
      text: label || value,
      selected,
    };
  });

  // Set current value based on selected option
  const selectedOption = field.options.find(opt => opt.selected);
  if (selectedOption) {
    field.value = selectedOption.value;
  }

  // Set test value for test mode
  if (testMode && field.options.length > 0) {
    // For gender fields, prefer female option
    const isGenderField =
      field.label?.toLowerCase().includes('gender') ||
      field.label?.toLowerCase().includes('sex') ||
      field.options.some(opt => opt.text.toLowerCase().includes('male') || opt.text.toLowerCase().includes('female'));

    if (isGenderField) {
      const femaleOption = field.options.find(
        opt =>
          opt.text.toLowerCase().includes('female') ||
          opt.text.toLowerCase().includes('frau') ||
          opt.value.toLowerCase() === 'f',
      );
      field.testValue = femaleOption ? femaleOption.value : field.options[0].value;
    } else {
      // Pick a random non-placeholder option for better test variety
      const validOptions = field.options.filter(
        opt =>
          !opt.text.toLowerCase().includes('select') &&
          !opt.text.toLowerCase().includes('choose') &&
          !opt.text.toLowerCase().includes('pick') &&
          opt.text !== '' &&
          opt.value !== '',
      );

      if (validOptions.length > 0) {
        // Pick a random valid option
        const randomIndex = Math.floor(Math.random() * validOptions.length);
        field.testValue = validOptions[randomIndex].value;
        debug.log(`Generated random test value for radio group ${field.id}: ${field.testValue}`);
      } else {
        // Fallback to first option
        field.testValue = field.options[0].value;
        debug.log(`Using first option as test value for radio group ${field.id}: ${field.testValue}`);
      }
    }
  }

  return field;
};

/**
 * Create a field for a single checkbox
 */
const createCheckboxField = async (element: HTMLElement, index: number, testMode: boolean): Promise<CheckableField> => {
  const field = toCheckableField(await createBaseField(element, index, 'checkbox', testMode));

  // Set current state
  if (element instanceof HTMLInputElement) {
    field.checked = element.checked;
    field.value = element.checked ? 'true' : 'false';
  } else {
    field.checked = element.getAttribute('aria-checked') === 'true';
    field.value = field.checked ? 'true' : 'false';
  }

  // Set test value
  if (testMode) {
    field.testValue = Math.random() > 0.5 ? 'true' : 'false';
  }

  return field;
};

/**
 * Create a field for a checkbox group
 */
const createCheckboxGroupField = async (
  elements: HTMLElement[],
  index: number,
  groupId: string,
  testMode: boolean,
): Promise<CheckableField> => {
  const firstElement = elements[0];
  const field = toCheckableField(await createBaseField(firstElement, index, 'checkbox', testMode));

  // Set group metadata
  field.groupName = groupId;
  field.groupType = 'checkbox';

  // Get group label from container
  const container = findCommonContainer(elements);
  if (container) {
    const legend = container.querySelector('legend');
    const groupLabel =
      legend?.textContent?.trim() || container.getAttribute('aria-label') || container.getAttribute('data-label');
    if (groupLabel) {
      field.label = groupLabel;
    }
  }

  // Create options from all checkboxes in the group
  field.options = elements.map((el, idx) => {
    const label = getFieldLabel(el);
    let value = '';
    let selected = false;

    if (el instanceof HTMLInputElement) {
      value = el.value || `option-${idx}`;
      selected = el.checked;
    } else {
      value = el.getAttribute('value') || el.getAttribute('data-value') || `option-${idx}`;
      selected = el.getAttribute('aria-checked') === 'true';
    }

    // Add filliny-id to each checkbox for later reference
    el.setAttribute('data-filliny-id', `${field.id}-option-${idx}`);

    return {
      value,
      text: label || value,
      selected,
    };
  });

  // Set current value as array of selected values
  const selectedValues = field.options.filter(opt => opt.selected).map(opt => opt.value);
  field.value = selectedValues;

  // Set test value for test mode
  if (testMode && field.options.length > 0) {
    // Select 1-2 random options
    const numToSelect = Math.min(Math.ceil(Math.random() * 2), field.options.length);
    const shuffled = [...field.options].sort(() => 0.5 - Math.random());
    field.testValue = shuffled.slice(0, numToSelect).map(opt => opt.value);
  }

  return field;
};

/**
 * Create a field for a switch element
 */
const createSwitchField = async (element: HTMLElement, index: number, testMode: boolean): Promise<CheckableField> => {
  const field = toCheckableField(await createBaseField(element, index, 'checkbox', testMode));

  // Set current state
  field.checked = element.getAttribute('aria-checked') === 'true';
  field.value = field.checked ? 'true' : 'false';

  // Set test value
  if (testMode) {
    field.testValue = Math.random() > 0.5 ? 'true' : 'false';
  }

  return field;
};

// Testing utilities
const __testing = {
  updateNativeCheckable,
  updateAriaCheckable,
  updateWithUniversalFallback,
  findControlledInput,
  updateVisualIndicators,
  updateRelatedRadioButtons,
  groupRadioElements,
  groupCheckboxElements,
  createRadioGroupField,
  createCheckboxField,
  handleHeadlessUISwitch,
  handleRadixCheckbox,
  handleRadixSwitch,
  handleMUISwitch,
  handleAntDesign,
  handleChakraUI,
  handleBootstrapToggle,
  handleCustomToggle,
  findClickableTarget,
  verifyCheckableState,
  findFrameworkWrapper,
  findClickableWrapper,
  isCustomToggleElement,
  captureElementState,
  waitAndVerify,
};

// ============================================================================
// Exports (at end of file per ESLint import-x/exports-last rule)
// ============================================================================

export {
  isValueChecked,
  matchesCheckboxValue,
  updateCheckable,
  detectCheckableFields,
  handleHeadlessUISwitch,
  handleRadixCheckbox,
  handleRadixSwitch,
  handleMUISwitch,
  handleAntDesign,
  handleChakraUI,
  handleBootstrapToggle,
  handleCustomToggle,
  findClickableTarget,
  verifyCheckableState,
  __testing,
};
