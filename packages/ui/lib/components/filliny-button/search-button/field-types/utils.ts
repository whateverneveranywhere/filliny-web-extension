/**
 * Safely get a string value from potentially complex field values
 */
import { getElementXPath, generateUniqueSelectors } from '../core/utils';
import { getFieldLabel, getFieldDescription, humanizeString, extractReactFiberLabel } from '../fieldUtils';
import { hasProperty, isHTMLElement, FieldTypeSchema, FieldTypeEnum } from '@extension/shared';
import type { Field, FieldType, JQueryWindow, DOMEventHandler, AngularContextElement } from '@extension/shared';

// Track used field IDs to ensure uniqueness
const usedFieldIds = new Set<string>();

const getStringValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(',');
  return String(value);
};

/**
 * Type guard to check if a value is an event handler function
 */
const isEventHandler = (value: unknown): value is DOMEventHandler => typeof value === 'function';

/**
 * Type guard to check if an object has an Angular context
 */
const hasAngularContext = (element: HTMLElement): element is AngularContextElement =>
  hasProperty(element, '__ngContext__');

/**
 * Type guard to check if window has jQuery
 */
const hasJQuery = (win: Window): win is JQueryWindow =>
  hasProperty(win, 'jQuery') && typeof (win as JQueryWindow).jQuery !== 'undefined';

/**
 * jQuery Validation plugin validator instance
 */
interface JQueryValidatorInstance {
  element: (el: HTMLElement) => boolean;
}

/**
 * Type guard to check if a value is a jQuery Validation plugin validator
 */
const isJQueryValidator = (value: unknown): value is JQueryValidatorInstance =>
  typeof value === 'object' &&
  value !== null &&
  'element' in value &&
  typeof (value as JQueryValidatorInstance).element === 'function';

/**
 * Dispatches an event on the given element
 * Ensures proper event bubbling and default handling
 */
const dispatchEvent = (element: HTMLElement, eventName: string): void => {
  try {
    // Create and dispatch the event
    const event = new Event(eventName, {
      bubbles: true,
      cancelable: true,
    });

    element.dispatchEvent(event);

    // For React and other frameworks that may use synthetic events
    // Try to find and call any attached event handlers directly
    // Use a type-safe approach for accessing dynamic event handler properties
    const handlerPropertyName = `on${eventName}`;
    if (hasProperty(element, handlerPropertyName)) {
      const handler = element[handlerPropertyName];
      if (isEventHandler(handler)) {
        try {
          handler.call(element, event);
        } catch {
          // Handler call failed, continue silently
        }
      }
    }

    // For Angular, look for event handlers in the __ngContext__ property
    if (hasAngularContext(element)) {
      console.log(`Found Angular context, trying to trigger ${eventName} handler`);
    }

    // For jQuery-based sites
    const win: Window = window;
    if (hasJQuery(win) && win.jQuery) {
      try {
        win.jQuery(element).trigger(eventName);
      } catch (e) {
        console.log(`jQuery trigger failed:`, e);
      }
    }
  } catch (error) {
    console.error(`Error dispatching ${eventName} event:`, error);
  }
};

/**
 * Adds visual feedback to indicate that a field has been filled by the extension
 */
const addVisualFeedback = (element: HTMLElement): void => {
  try {
    // First, add a data attribute to mark this field as updated
    element.setAttribute('data-filliny-updated', 'true');

    // Create a subtle highlight animation
    const originalBackgroundColor = window.getComputedStyle(element).backgroundColor;
    const originalBoxShadow = window.getComputedStyle(element).boxShadow;

    // Add a subtle flash effect that doesn't interfere with the form
    element.style.transition = 'background-color 0.5s ease, box-shadow 0.5s ease';
    element.style.backgroundColor = 'rgba(100, 100, 100, 0.1)'; // Light gray highlight
    element.style.boxShadow = '0 0 0 2px rgba(100, 100, 100, 0.4)'; // Gray outline

    // Return to original state after animation
    setTimeout(() => {
      element.style.backgroundColor = originalBackgroundColor;
      element.style.boxShadow = originalBoxShadow;

      // Keep a subtle indicator that this field was filled automatically
      element.style.outline = '1px solid rgba(100, 100, 100, 0.3)';

      // Remove transition to prevent animation on future user interactions
      setTimeout(() => {
        element.style.transition = '';
      }, 500);
    }, 800);
  } catch (error) {
    console.error('Error adding visual feedback:', error);
  }
};

/**
 * Determines if an element is visible and interactive
 */
const isElementInteractive = (element: HTMLElement): boolean => {
  if (!element) return false;

  const style = window.getComputedStyle(element);

  // Check if element is visible
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  // Check if element is disabled, read-only, or hidden from assistive technology
  if (
    element.hasAttribute('disabled') ||
    element.hasAttribute('readonly') ||
    element.getAttribute('aria-disabled') === 'true' ||
    element.getAttribute('aria-readonly') === 'true' ||
    element.getAttribute('aria-hidden') === 'true'
  ) {
    return false;
  }

  // Check if element has zero dimensions
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return false;
  }

  return true;
};

/**
 * Find all related radio buttons in a group
 */
const findRelatedRadioButtons = (radioButton: HTMLElement): HTMLElement[] => {
  const related: HTMLElement[] = [];

  // Method 1: Find by name attribute (standard approach)
  if (radioButton instanceof HTMLInputElement && radioButton.name) {
    const name = radioButton.name;
    const form = radioButton.form;

    // If within a form, search within that form only
    if (form) {
      Array.from(form.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${name}"]`)).forEach(radio =>
        related.push(radio),
      );
    } else {
      // Otherwise search the entire document
      Array.from(document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${name}"]`)).forEach(radio =>
        related.push(radio),
      );
    }
  }

  // Method 2: Find by ARIA attributes
  if (radioButton.getAttribute('role') === FieldTypeEnum.RADIO) {
    // Find the radiogroup container
    const radioGroup = radioButton.closest('[role="radiogroup"]');
    if (radioGroup) {
      Array.from(radioGroup.querySelectorAll('[role="radio"]')).forEach(radio => {
        if (isHTMLElement(radio)) {
          related.push(radio);
        }
      });
      return related;
    }
  }

  // Method 3: Find by common container
  if (related.length === 0) {
    // Look for common patterns in containers
    const possibleContainers = [
      radioButton.closest('fieldset'),
      radioButton.closest('[class*="radio-group"]'),
      radioButton.closest('[class*="radioGroup"]'),
      radioButton.closest('[class*="option-group"]'),
      radioButton.closest('[class*="optionGroup"]'),
      radioButton.closest('ul'),
      radioButton.closest('div'),
    ].filter(Boolean);

    for (const container of possibleContainers) {
      if (container) {
        // Try to find radio buttons within this container
        const radios = Array.from(container.querySelectorAll<HTMLElement>('input[type="radio"], [role="radio"]'));
        if (radios.length > 1) {
          return radios;
        }
      }
    }
  }

  // If all else fails, at least return the original radio button
  if (related.length === 0) {
    related.push(radioButton);
  }

  return related;
};

/**
 * Find all related checkboxes in a group
 */
const findRelatedCheckboxes = (checkbox: HTMLElement): HTMLElement[] => {
  const related: HTMLElement[] = [];

  // Method 1: Find by name attribute (standard approach)
  if (checkbox instanceof HTMLInputElement && checkbox.name) {
    const name = checkbox.name;
    const form = checkbox.form;

    // If within a form, search within that form only
    if (form) {
      Array.from(form.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name="${name}"]`)).forEach(cb =>
        related.push(cb),
      );
    } else {
      // Otherwise search the entire document
      Array.from(document.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name="${name}"]`)).forEach(cb =>
        related.push(cb),
      );
    }
  }

  // Method 2: Find by ARIA attributes
  if (checkbox.getAttribute('role') === FieldTypeEnum.CHECKBOX) {
    // Find the checkboxgroup container
    const checkboxGroup = checkbox.closest('[role="group"]');
    if (checkboxGroup) {
      Array.from(checkboxGroup.querySelectorAll('[role="checkbox"]')).forEach(cb => {
        if (isHTMLElement(cb)) {
          related.push(cb);
        }
      });
      return related;
    }
  }

  // Method 3: Find by common container patterns
  if (related.length === 0) {
    // Look for common patterns in containers
    const possibleContainers = [
      checkbox.closest('fieldset'),
      checkbox.closest('[class*="checkbox-group"]'),
      checkbox.closest('[class*="checkboxGroup"]'),
      checkbox.closest('[class*="option-group"]'),
      checkbox.closest('[class*="optionGroup"]'),
      checkbox.closest('ul'),
      checkbox.closest('div'),
    ].filter(Boolean);

    for (const container of possibleContainers) {
      if (container) {
        // Try to find checkboxes within this container
        const checkboxes = Array.from(
          container.querySelectorAll<HTMLElement>('input[type="checkbox"], [role="checkbox"]'),
        );
        if (checkboxes.length > 1) {
          return checkboxes;
        }
      }
    }
  }

  // If all else fails, at least return the original checkbox
  if (related.length === 0) {
    related.push(checkbox);
  }

  return related;
};

/**
 * Check if an element is a custom select component
 */
const isCustomSelect = (element: HTMLElement): boolean => {
  // Common class patterns for custom select components
  const selectClassPatterns = ['select', 'dropdown', 'combobox', 'combo-box'];

  // Check for ARIA roles
  if (
    element.getAttribute('role') === 'combobox' ||
    element.getAttribute('role') === 'listbox' ||
    element.getAttribute('aria-haspopup') === 'listbox'
  ) {
    return true;
  }

  // Check class names for patterns
  const className = element.className.toLowerCase();
  if (selectClassPatterns.some(pattern => className.includes(pattern))) {
    // Additional check: make sure it's not just a container
    const hasInteractiveChild = element.querySelector('select, button, [role="button"], [role="combobox"]');
    if (!hasInteractiveChild) {
      return true;
    }
  }

  return false;
};

/**
 * Find select options from various types of select components
 */
const findSelectOptions = (
  selectElement: HTMLElement,
): { element: HTMLElement; value: string; text: string; selected: boolean }[] => {
  const options: { element: HTMLElement; value: string; text: string; selected: boolean }[] = [];

  // Case 1: Standard HTMLSelectElement
  if (selectElement instanceof HTMLSelectElement) {
    Array.from(selectElement.options).forEach(option => {
      options.push({
        element: option,
        value: option.value,
        text: option.text,
        selected: option.selected,
      });
    });
    return options;
  }

  // Case 2: ARIA Combobox/Listbox
  if (selectElement.getAttribute('role') === 'combobox' || selectElement.getAttribute('role') === 'listbox') {
    // Find the listbox element
    let listbox: HTMLElement | null = selectElement;
    if (selectElement.getAttribute('role') === 'combobox') {
      // If it's a combobox, look for its associated listbox
      const listboxId = selectElement.getAttribute('aria-controls') || selectElement.getAttribute('aria-owns');
      if (listboxId) {
        const foundListbox = document.getElementById(listboxId);
        listbox = isHTMLElement(foundListbox) ? foundListbox : null;
      } else {
        // Try to find a listbox within or adjacent to the combobox
        const innerListbox = selectElement.querySelector('[role="listbox"]');
        const siblingListbox = selectElement.nextElementSibling;
        if (isHTMLElement(innerListbox)) {
          listbox = innerListbox;
        } else if (siblingListbox?.getAttribute('role') === 'listbox' && isHTMLElement(siblingListbox)) {
          listbox = siblingListbox;
        } else {
          listbox = null;
        }
      }
    }

    if (listbox) {
      // Find all options within the listbox
      const optionElements = listbox.querySelectorAll('[role="option"]');
      optionElements.forEach(optionEl => {
        if (isHTMLElement(optionEl)) {
          options.push({
            element: optionEl,
            value:
              optionEl.getAttribute('aria-value') ||
              optionEl.getAttribute('data-value') ||
              optionEl.textContent?.trim() ||
              '',
            text: optionEl.textContent?.trim() || '',
            selected: optionEl.getAttribute('aria-selected') === 'true',
          });
        }
      });
    }

    return options;
  }

  // Case 3: Custom dropdown components - look for common patterns
  // Look for a button that toggles the dropdown
  const toggleButtonEl = selectElement.querySelector('button, [role="button"]');
  if (isHTMLElement(toggleButtonEl)) {
    // Try to find the dropdown list - could be next to or within the container
    const dropdownLists = [
      selectElement.querySelector('ul, [class*="dropdown"], [class*="options"], [class*="menu"]'),
      selectElement.nextElementSibling,
    ].filter(Boolean);

    for (const list of dropdownLists) {
      if (list) {
        // Look for list items that represent options
        const listItems = list.querySelectorAll('li, [class*="option"], [class*="item"]');
        if (listItems.length > 0) {
          listItems.forEach(item => {
            if (isHTMLElement(item)) {
              const isSelected =
                item.classList.contains('selected') ||
                item.classList.contains('active') ||
                item.getAttribute('aria-selected') === 'true';

              options.push({
                element: item,
                value: item.getAttribute('data-value') || item.getAttribute('value') || item.textContent?.trim() || '',
                text: item.textContent?.trim() || '',
                selected: isSelected,
              });
            }
          });
          return options;
        }
      }
    }
  }

  return options;
};

// ============================================================================
// Native Value Setter - bypasses React/Vue/Angular controlled input mechanisms
// Uses the native HTMLInputElement.prototype.value setter (technique from Playwright/Cypress)
// ============================================================================

/**
 * Set a value using the native prototype setter, bypassing framework interception.
 * Falls back to temporarily replacing the setter via Object.defineProperty
 * if the native prototype approach fails.
 */
const setNativeValue = (element: HTMLElement, value: string): boolean => {
  try {
    let setter: ((v: string) => void) | undefined;

    if (element instanceof HTMLInputElement) {
      setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    } else if (element instanceof HTMLTextAreaElement) {
      setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    } else if (element instanceof HTMLSelectElement) {
      setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    }

    if (setter) {
      setter.call(element, value);
      return true;
    }

    // Fallback: temporarily replace the setter via Object.defineProperty
    // This works when the prototype setter is unavailable (e.g., exotic environments)
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    ) {
      const originalDescriptor = Object.getOwnPropertyDescriptor(element, 'value');
      Object.defineProperty(element, 'value', {
        set(v: string) {
          // Remove our temporary override so the original behavior is restored
          if (originalDescriptor) {
            Object.defineProperty(element, 'value', originalDescriptor);
          } else {
            Reflect.deleteProperty(element, 'value');
          }
          // Now set through the prototype chain
          element.value = v;
        },
        get() {
          return originalDescriptor?.get?.call(element) ?? '';
        },
        configurable: true,
      });
      element.value = value;
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

// ============================================================================
// React Props Extraction - extract __reactProps$ for direct onChange invocation
// ============================================================================

interface ReactSyntheticEvent {
  target: HTMLElement;
  currentTarget: HTMLElement;
  type: string;
  bubbles: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
  nativeEvent: Event;
}

interface ReactProps {
  onChange?: (event: ReactSyntheticEvent) => void;
  onInput?: (event: ReactSyntheticEvent) => void;
  onBlur?: (event: ReactSyntheticEvent) => void;
  onFocus?: (event: ReactSyntheticEvent) => void;
  value?: string;
  checked?: boolean;
  [key: string]: unknown;
}

/**
 * Template literal type for React props keys attached to DOM elements.
 * React attaches props using keys like `__reactProps$abc123`.
 */
type ReactPropsKey = `__reactProps$${string}`;

/**
 * Check whether a string is a valid React props key.
 */
const isReactPropsKey = (key: string): key is ReactPropsKey => key.startsWith('__reactProps$');

/**
 * Element with React props attached via __reactProps$ key
 */
interface ReactPropsElement extends HTMLElement {
  [key: ReactPropsKey]: ReactProps;
}

/**
 * Type guard to check if element has React props for a given key.
 */
const isReactPropsElement = (element: HTMLElement, key: ReactPropsKey): element is ReactPropsElement => {
  if (!hasProperty(element, key)) return false;
  const value: unknown = element[key];
  return typeof value === 'object' && value !== null;
};

/**
 * Extract React props (__reactProps$) from an element for direct handler invocation.
 */
const getReactProps = (element: HTMLElement): ReactProps | null => {
  try {
    const propsKey = Object.keys(element).find(isReactPropsKey);
    if (propsKey && isReactPropsElement(element, propsKey)) {
      return element[propsKey] ?? null;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Create a minimal React-compatible synthetic event for direct handler invocation.
 */
const createReactSyntheticEvent = (element: HTMLElement, type: string): ReactSyntheticEvent => ({
  target: element,
  currentTarget: element,
  type,
  bubbles: true,
  preventDefault: () => {},
  stopPropagation: () => {},
  nativeEvent: new Event(type, { bubbles: true }),
});

// ============================================================================
// React Fiber Tree Walking - find onChange via __reactFiber$ / __reactInternalInstance$
// ============================================================================

/**
 * Template literal type for React fiber keys attached to DOM elements.
 */
type ReactFiberKey = `__reactFiber$${string}`;
type ReactInternalInstanceKey = `__reactInternalInstance$${string}`;

/**
 * React fiber node with props containing event handlers.
 * React attaches these to DOM elements at runtime for internal bookkeeping.
 */
interface ReactFiberNodeWithHandlers {
  memoizedProps?: {
    onChange?: (event: ReactSyntheticEvent) => void;
    onInput?: (event: ReactSyntheticEvent) => void;
    [key: string]: unknown;
  };
  pendingProps?: {
    onChange?: (event: ReactSyntheticEvent) => void;
    onInput?: (event: ReactSyntheticEvent) => void;
    [key: string]: unknown;
  };
  return?: ReactFiberNodeWithHandlers;
}

/**
 * Element with React fiber/internal instance keys attached at runtime.
 */
interface ReactFiberDOMElement extends HTMLElement {
  [key: ReactFiberKey]: ReactFiberNodeWithHandlers | undefined;
  [key: ReactInternalInstanceKey]: ReactFiberNodeWithHandlers | undefined;
}

/**
 * Check whether a string is a React fiber key.
 */
const isReactFiberKey = (key: string): key is ReactFiberKey => key.startsWith('__reactFiber$');

/**
 * Check whether a string is a React internal instance key.
 */
const isReactInternalInstanceKey = (key: string): key is ReactInternalInstanceKey =>
  key.startsWith('__reactInternalInstance$');

/**
 * Type guard: check whether an element has a React fiber for the given key.
 */
const hasReactFiberNode = (
  element: HTMLElement,
  key: ReactFiberKey | ReactInternalInstanceKey,
): element is ReactFiberDOMElement => key in element;

/**
 * Extract a React event handler from fiber props if it is a function.
 */
const extractFiberHandler = (
  props: ReactFiberNodeWithHandlers['memoizedProps'],
): ((event: ReactSyntheticEvent) => void) | null => {
  if (!props) return null;
  if (typeof props.onChange === 'function') return props.onChange;
  if (typeof props.onInput === 'function') return props.onInput;
  return null;
};

/**
 * Walk the React fiber tree upward to find the closest onChange handler.
 * Returns the handler if found, null otherwise.
 */
const findReactOnChangeInFiber = (element: HTMLElement): ((event: ReactSyntheticEvent) => void) | null => {
  try {
    const fiberKey = Object.keys(element).find(
      (key): key is ReactFiberKey | ReactInternalInstanceKey => isReactFiberKey(key) || isReactInternalInstanceKey(key),
    );

    if (!fiberKey || !hasReactFiberNode(element, fiberKey)) return null;

    // Walk up the fiber tree (max 15 levels to avoid infinite loops)
    let fiber: ReactFiberNodeWithHandlers | undefined = element[fiberKey];
    for (let i = 0; i < 15 && fiber; i++) {
      const handler = extractFiberHandler(fiber.memoizedProps) ?? extractFiberHandler(fiber.pendingProps);
      if (handler) return handler;

      // Move to parent fiber
      fiber = fiber.return;
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Invoke React onChange directly via __reactProps$ as a fallback strategy.
 * Also checks __reactFiber$ and __reactInternalInstance$ keys, walking
 * the fiber tree upward to find the closest onChange handler.
 */
const invokeReactOnChange = (element: HTMLElement): boolean => {
  try {
    // Strategy 1: Direct __reactProps$ lookup
    const props = getReactProps(element);
    if (props?.onChange) {
      props.onChange(createReactSyntheticEvent(element, 'change'));
      return true;
    }
    if (props?.onInput) {
      props.onInput(createReactSyntheticEvent(element, 'input'));
      return true;
    }

    // Strategy 2: Walk fiber tree via __reactFiber$ / __reactInternalInstance$
    const fiberHandler = findReactOnChangeInFiber(element);
    if (fiberHandler) {
      fiberHandler(createReactSyntheticEvent(element, 'change'));
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

// ============================================================================
// Pointer Event Sequence - full modern pointer event chain for UI frameworks
// ============================================================================

/**
 * Dispatch a complete user click sequence including hover enter/leave phases.
 * Full sequence:
 *   Hover in: pointerover -> pointerenter -> mouseover -> mouseenter -> pointermove -> mousemove
 *   Click:    pointerdown -> mousedown -> pointerup -> mouseup -> click
 *   Focus:    focusin (for focusable elements)
 *   Hover out: pointerout -> pointerleave -> mouseout -> mouseleave
 */
const dispatchPointerClickSequence = (element: HTMLElement): void => {
  try {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const commonProps = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y,
    };

    const nonBubblingProps = {
      ...commonProps,
      bubbles: false,
    };

    const pointerProps = {
      ...commonProps,
      pointerId: 1,
      pointerType: 'mouse' as const,
      isPrimary: true,
      width: 1,
      height: 1,
      pressure: 0.5,
    };

    const pointerNonBubblingProps = {
      ...pointerProps,
      bubbles: false,
    };

    // Phase 1: Hover enter (mouse moving to element)
    element.dispatchEvent(new PointerEvent('pointerover', pointerProps));
    element.dispatchEvent(new PointerEvent('pointerenter', pointerNonBubblingProps));
    element.dispatchEvent(new MouseEvent('mouseover', commonProps));
    element.dispatchEvent(new MouseEvent('mouseenter', nonBubblingProps));

    // Optional quick movement over element
    element.dispatchEvent(new PointerEvent('pointermove', pointerProps));
    element.dispatchEvent(new MouseEvent('mousemove', commonProps));

    // Phase 2: Click sequence
    element.dispatchEvent(new PointerEvent('pointerdown', pointerProps));
    element.dispatchEvent(new MouseEvent('mousedown', commonProps));
    element.dispatchEvent(new PointerEvent('pointerup', { ...pointerProps, pressure: 0 }));
    element.dispatchEvent(new MouseEvent('mouseup', commonProps));
    element.dispatchEvent(new MouseEvent('click', commonProps));

    // Phase 3: Focus (for elements that should receive focus)
    const isFocusable =
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLButtonElement ||
      element.hasAttribute('tabindex') ||
      element.isContentEditable;

    if (isFocusable) {
      element.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: null }));
    }

    // Phase 4: Hover leave (mouse moving away)
    element.dispatchEvent(new PointerEvent('pointerout', pointerProps));
    element.dispatchEvent(new PointerEvent('pointerleave', pointerNonBubblingProps));
    element.dispatchEvent(new MouseEvent('mouseout', commonProps));
    element.dispatchEvent(new MouseEvent('mouseleave', nonBubblingProps));
  } catch {
    // Fallback to simple click
    element.click();
  }
};

// ============================================================================
// Full User Interaction - comprehensive interaction simulation
// ============================================================================

/**
 * Simulate a complete user interaction with an element:
 * scrolls into view, hovers, clicks, and focuses.
 */
const dispatchFullUserInteraction = async (element: HTMLElement): Promise<void> => {
  try {
    // Scroll element into view
    element.scrollIntoView({ block: 'center', behavior: 'instant' });
    await new Promise<void>(r => setTimeout(r, 50));

    // Hover over element (pointer/mouse enter events)
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const hoverProps = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y,
    };

    const pointerHoverProps = {
      ...hoverProps,
      pointerId: 1,
      pointerType: 'mouse' as const,
      isPrimary: true,
      width: 1,
      height: 1,
      pressure: 0,
    };

    element.dispatchEvent(new PointerEvent('pointerover', pointerHoverProps));
    element.dispatchEvent(new PointerEvent('pointerenter', { ...pointerHoverProps, bubbles: false }));
    element.dispatchEvent(new MouseEvent('mouseover', hoverProps));
    element.dispatchEvent(new MouseEvent('mouseenter', { ...hoverProps, bubbles: false }));

    await new Promise<void>(r => setTimeout(r, 30));

    // Click the element (full pointer sequence)
    dispatchPointerClickSequence(element);

    // Focus the element
    ensureFocus(element);
  } catch {
    // Fallback: just click and focus
    element.click();
    element.focus();
  }
};

// ============================================================================
// Wait for Element - MutationObserver-based element appearance waiting
// ============================================================================

/**
 * Wait for an element matching a selector to appear in the DOM.
 * Uses MutationObserver for efficiency. Returns null on timeout.
 */
const waitForElement = (
  selector: string,
  timeout: number = 2000,
  root: Element | Document = document,
): Promise<HTMLElement | null> =>
  new Promise(resolve => {
    // Check if already present
    const existing = root.querySelector<HTMLElement>(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const found = root.querySelector<HTMLElement>(selector);
      if (found) {
        observer.disconnect();
        clearTimeout(timer);
        resolve(found);
      }
    });

    const timer = setTimeout(() => {
      observer.disconnect();
      // One last check
      resolve(root.querySelector<HTMLElement>(selector));
    }, timeout);

    observer.observe(root instanceof Document ? root.body : root, {
      childList: true,
      subtree: true,
    });
  });

// ============================================================================
// Honeypot Field Detection
// ============================================================================

/** Known honeypot field name patterns */
const HONEYPOT_NAME_PATTERNS = [
  /^hp_/i,
  /^pot_/i,
  /^honey/i,
  /^trap_/i,
  /^fax$/i,
  /^website$/i,
  /^url$/i,
  /^company_url$/i,
  /^zip_code_confirm$/i,
  /^address2_confirm$/i,
  /^leave.?blank/i,
  /^do.?not.?fill/i,
  /^phone_verify$/i,
  /^address_confirm$/i,
  /^captcha_/i,
];

/**
 * Detect if an element is a honeypot field (spam trap).
 * Filling honeypots causes silent form rejection.
 */
const isHoneypotField = (element: HTMLElement): boolean => {
  try {
    // Check name/id against known patterns
    const name = (element.getAttribute('name') || '').toLowerCase();
    const id = (element.getAttribute('id') || '').toLowerCase();
    if (HONEYPOT_NAME_PATTERNS.some(p => p.test(name) || p.test(id))) {
      // Only flag if the field is also hidden in some way
      const style = window.getComputedStyle(element);
      const isVisuallyHidden =
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0' ||
        (parseInt(style.height) === 0 && style.overflow === 'hidden') ||
        (parseInt(style.width) === 0 && style.overflow === 'hidden');

      if (isVisuallyHidden) return true;
    }

    // Check for off-screen positioning
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const isOffScreen =
      (style.position === 'absolute' || style.position === 'fixed') &&
      (rect.left < -9000 || rect.top < -9000 || rect.right < 0 || rect.bottom < 0);

    if (isOffScreen) {
      // Off-screen + autocomplete="off" or "nope" is very suspicious
      const autoComplete = element.getAttribute('autocomplete');
      if (autoComplete === 'off' || autoComplete === 'nope') return true;
      // Off-screen + tabindex="-1" is suspicious
      if (element.getAttribute('tabindex') === '-1') return true;
    }

    // Check for clip:rect(0,0,0,0) pattern
    if (style.clip === 'rect(0px, 0px, 0px, 0px)' || style.clipPath === 'inset(50%)') {
      return true;
    }

    // Check for aria-hidden with zero dimensions
    if (element.getAttribute('aria-hidden') === 'true' && element.getAttribute('tabindex') === '-1') {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

// ============================================================================
// Improved Composition Events
// ============================================================================

/**
 * Dispatch proper CompositionEvent (not CustomEvent) for IME-aware frameworks.
 */
const dispatchCompositionEvents = (element: HTMLElement, value: string): void => {
  try {
    element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
    element.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data: value }));
    element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: value }));
  } catch {
    // Fallback to CustomEvent if CompositionEvent not available
    element.dispatchEvent(new CustomEvent('compositionstart', { bubbles: true, detail: { data: '' } }));
    element.dispatchEvent(new CustomEvent('compositionend', { bubbles: true, detail: { data: value } }));
  }
};

// ============================================================================
// beforeinput Event
// ============================================================================

/**
 * Dispatch beforeinput event with proper inputType.
 */
const dispatchBeforeInput = (element: HTMLElement, data: string, inputType: string = 'insertText'): boolean => {
  try {
    const event = new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      data,
      inputType,
    });
    return element.dispatchEvent(event);
  } catch {
    return true;
  }
};

// ============================================================================
// Focus Management
// ============================================================================

/**
 * Ensure an element is properly focused, handling focus traps in modals/dialogs.
 */
const ensureFocus = (element: HTMLElement): boolean => {
  try {
    element.focus();

    // Verify focus was applied
    if (document.activeElement === element) return true;

    // If element is in Shadow DOM, check shadow root's activeElement
    const root = element.getRootNode();
    if (root instanceof ShadowRoot && root.activeElement === element) return true;

    // Try clicking to focus (some elements need this)
    element.click();
    element.focus();

    return document.activeElement === element;
  } catch {
    return false;
  }
};

// ============================================================================
// Clipboard Paste Simulation
// ============================================================================

/**
 * Simulate a paste event with ClipboardEvent and DataTransfer.
 * Useful as a fallback strategy for stubborn frameworks.
 */
const simulatePaste = (element: HTMLElement, value: string): boolean => {
  try {
    element.focus();

    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', value);

    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dataTransfer,
    });

    const notPrevented = element.dispatchEvent(pasteEvent);

    if (notPrevented) {
      // If paste wasn't prevented, apply the value
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        setNativeValue(element, value);
        element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste', data: value }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (element.isContentEditable) {
        document.execCommand('insertText', false, value);
      }
    }

    return true;
  } catch {
    return false;
  }
};

// ============================================================================
// Stale Element Detection
// ============================================================================

/**
 * Check if an element reference is still attached to the DOM.
 */
const isElementAttached = (element: HTMLElement): boolean => {
  try {
    return element.isConnected;
  } catch {
    return false;
  }
};

// ============================================================================
// Field Value Verification
// ============================================================================

/**
 * Verify that a value was set correctly on an element.
 * Flushes microtasks and a requestAnimationFrame before checking.
 */
const verifyFieldValueSet = async (element: HTMLElement, expected: string | boolean): Promise<boolean> => {
  // Flush microtasks
  await new Promise<void>(r => setTimeout(r, 0));
  // Flush requestAnimationFrame
  await new Promise<void>(r => requestAnimationFrame(() => r()));

  if (typeof expected === 'boolean') {
    if (element instanceof HTMLInputElement) {
      return element.checked === expected;
    }
    return element.getAttribute('aria-checked') === String(expected);
  }

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.value === expected;
  }

  if (element instanceof HTMLSelectElement) {
    return element.value === expected;
  }

  if (element.isContentEditable) {
    return (element.textContent || '').trim() === expected.trim();
  }

  return false;
};

// ============================================================================
// Form State Snapshot for Undo
// ============================================================================

interface FormStateSnapshot {
  values: Map<HTMLElement, { value: string; checked?: boolean; selectedIndex?: number }>;
  timestamp: number;
}

/**
 * Capture the current state of all form fields within a container.
 */
const captureFormState = (container: HTMLElement | Document): FormStateSnapshot => {
  const values = new Map<HTMLElement, { value: string; checked?: boolean; selectedIndex?: number }>();
  const elements = container.querySelectorAll<HTMLElement>('input, textarea, select, [contenteditable="true"]');

  elements.forEach(el => {
    if (el instanceof HTMLInputElement) {
      values.set(el, {
        value: el.value,
        checked: el.checked,
      });
    } else if (el instanceof HTMLTextAreaElement) {
      values.set(el, { value: el.value });
    } else if (el instanceof HTMLSelectElement) {
      values.set(el, { value: el.value, selectedIndex: el.selectedIndex });
    } else if (el.isContentEditable) {
      values.set(el, { value: el.textContent || '' });
    }
  });

  return { values, timestamp: Date.now() };
};

/**
 * Restore a previously captured form state.
 */
const restoreFormState = (snapshot: FormStateSnapshot): void => {
  snapshot.values.forEach((state, element) => {
    if (!isElementAttached(element)) return;

    try {
      if (element instanceof HTMLInputElement) {
        setNativeValue(element, state.value);
        if (state.checked !== undefined) element.checked = state.checked;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (element instanceof HTMLTextAreaElement) {
        setNativeValue(element, state.value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (element instanceof HTMLSelectElement) {
        setNativeValue(element, state.value);
        if (state.selectedIndex !== undefined) element.selectedIndex = state.selectedIndex;
        element.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (element.isContentEditable) {
        element.textContent = state.value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch {
      // Skip elements that can't be restored
    }
  });
};

// ============================================================================
// Natural Typing Delay
// ============================================================================

/**
 * Get a randomized typing delay for anti-bot resilience.
 */
const getTypingDelay = (): number => {
  // 15-80ms base delay with occasional 100-200ms pauses
  if (Math.random() < 0.1) {
    return 100 + Math.random() * 100; // occasional longer pause
  }
  return 15 + Math.random() * 65;
};

// ============================================================================
// Validation Triggers
// ============================================================================

/**
 * Trigger jQuery Validation plugin validation on a field, if jQuery and the
 * validator are available on the page.
 */
const triggerJQueryValidation = (element: HTMLElement): boolean => {
  try {
    const win: Window = window;
    if (!hasJQuery(win) || !win.jQuery) return false;

    const jq = win.jQuery;

    // Trigger focusout which jQuery Validation listens to
    jq(element).trigger('focusout');

    // Try to access $.validator.element() if available
    const closestForm = element.closest('form');
    if (closestForm) {
      const $form = jq(closestForm);
      const validator = $form.data('validator');
      if (isJQueryValidator(validator)) {
        validator.element(element);
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
};

/**
 * After filling a field, trigger the form's validation mechanisms.
 * Handles native HTML5 validation, React Hook Form / Formik (blur-based),
 * and jQuery Validation plugin.
 */
const detectAndTriggerValidation = (element: HTMLElement): void => {
  try {
    // 1. Dispatch blur to trigger on-blur validation (React Hook Form, Formik, etc.)
    element.dispatchEvent(new FocusEvent('blur', { bubbles: true, relatedTarget: null }));
    element.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));

    // 2. Native HTML5 constraint validation
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    ) {
      if (!element.checkValidity()) {
        element.dispatchEvent(new Event('invalid', { bubbles: false, cancelable: true }));
      }
    }

    // 3. Check for framework-specific validation attributes
    // data-validate, data-vv-rules (VeeValidate), data-parsley-* (Parsley.js)
    const hasDataValidate =
      element.hasAttribute('data-validate') ||
      element.hasAttribute('data-vv-rules') ||
      Array.from(element.attributes).some(attr => attr.name.startsWith('data-parsley-'));

    if (hasDataValidate) {
      // Trigger change to fire any data-attribute-based validation
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 4. jQuery Validation plugin
    triggerJQueryValidation(element);
  } catch {
    // Validation triggering is best-effort
  }
};

// ============================================================================
// Typing Simulation
// ============================================================================

/**
 * Helper to check whether the current value matches the expected value.
 */
const checkValueStuck = (element: HTMLElement, value: string): boolean => {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.value === value;
  }
  if (element.isContentEditable) {
    return (element.textContent || '').trim() === value.trim();
  }
  return false;
};

/**
 * Simulate human-like typing with proper focus events, composition, and beforeinput.
 * Enhanced with native value setter as primary strategy, value-sticking checks
 * between each fallback, and a nuclear requestAnimationFrame + MutationObserver fallback.
 */
const simulateTyping = async (element: HTMLElement, value: string): Promise<void> => {
  try {
    // Ensure proper focus
    ensureFocus(element);

    const isTextarea = element instanceof HTMLTextAreaElement;
    const isInput = element instanceof HTMLInputElement;

    if (isTextarea) {
      try {
        element.select();
      } catch {
        // Textarea focus/select error, continue
      }
    }

    // ---- PRIMARY: Native value setter (fastest, most reliable for React) ----
    if (isInput || isTextarea) {
      const nativeSet = setNativeValue(element, value);
      if (nativeSet) {
        dispatchBeforeInput(element, value, 'insertReplacementText');
        element.dispatchEvent(
          new InputEvent('input', { bubbles: true, cancelable: true, data: value, inputType: 'insertReplacementText' }),
        );
        element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

        if (checkValueStuck(element, value)) {
          element.blur();
          return;
        }
      }

      // ---- FALLBACK 1: Direct React props onChange ----
      setNativeValue(element, value);
      const invoked = invokeReactOnChange(element);
      if (invoked && checkValueStuck(element, value)) {
        element.blur();
        return;
      }
    }

    // ---- FALLBACK 2: Composition events + execCommand('insertText') ----
    dispatchCompositionEvents(element, value);

    // Direct property assignment
    if (isInput || isTextarea) {
      element.value = value;
      dispatchEvent(element, 'input');
      dispatchEvent(element, 'change');
    } else if (hasProperty(element, 'value') && typeof element.value === 'string') {
      element.value = value;
    } else if (element.isContentEditable) {
      element.textContent = value;
    }

    // Check if composition events worked
    if (checkValueStuck(element, value)) {
      return;
    }

    // Try execCommand('insertText') - works for contentEditable and some frameworks
    try {
      ensureFocus(element);
      if (element.isContentEditable || isTextarea || isInput) {
        document.execCommand('selectAll', false);
        document.execCommand('delete', false);
        const inserted = document.execCommand('insertText', false, value);
        if (inserted && checkValueStuck(element, value)) {
          return;
        }
      }
    } catch {
      // execCommand not supported, continue
    }

    // ---- FALLBACK 3: Character-by-character typing with natural delays ----
    if (!checkValueStuck(element, value) && (isInput || isTextarea)) {
      setNativeValue(element, '');
      element.dispatchEvent(new InputEvent('input', { bubbles: true, data: '', inputType: 'deleteContentBackward' }));

      for (let i = 0; i < value.length; i++) {
        const char = value[i];
        const newValue = value.substring(0, i + 1);

        const keyEvent = {
          key: char,
          code: `Key${char.toUpperCase()}`,
          bubbles: true,
          cancelable: true,
          composed: true,
        };

        element.dispatchEvent(new KeyboardEvent('keydown', keyEvent));
        dispatchBeforeInput(element, char, 'insertText');
        element.dispatchEvent(new KeyboardEvent('keypress', keyEvent));

        setNativeValue(element, newValue);

        element.dispatchEvent(
          new InputEvent('input', { bubbles: true, cancelable: true, data: char, inputType: 'insertText' }),
        );
        element.dispatchEvent(new KeyboardEvent('keyup', keyEvent));

        await new Promise(resolve => setTimeout(resolve, getTypingDelay()));
      }

      element.dispatchEvent(new Event('change', { bubbles: true }));

      if (checkValueStuck(element, value)) {
        return;
      }
    }

    // ---- FALLBACK 4: Paste simulation ----
    if ((isInput || isTextarea) && !checkValueStuck(element, value)) {
      simulatePaste(element, value);

      if (checkValueStuck(element, value)) {
        return;
      }
    }

    // ---- NUCLEAR FALLBACK 5: requestAnimationFrame + MutationObserver ----
    // Some frameworks reset the value on the next microtask/rAF. We observe
    // for resets and re-apply the value inside a requestAnimationFrame callback.
    if ((isInput || isTextarea) && !checkValueStuck(element, value)) {
      await new Promise<void>(resolve => {
        let resolved = false;
        const finish = () => {
          if (!resolved) {
            resolved = true;
            observer.disconnect();
            resolve();
          }
        };

        const observer = new MutationObserver(() => {
          // Something changed the element -- re-apply value in rAF
          if (!checkValueStuck(element, value)) {
            requestAnimationFrame(() => {
              setNativeValue(element, value);
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
            });
          }
        });

        observer.observe(element, {
          attributes: true,
          attributeFilter: ['value'],
          characterData: true,
          childList: true,
        });

        // Set value inside rAF
        requestAnimationFrame(() => {
          setNativeValue(element, value);
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));

          // Give a brief window for observers to fire
          setTimeout(finish, 100);
        });

        // Hard timeout to prevent hanging
        setTimeout(finish, 300);
      });
    }

    // Fire standard events
    dispatchEvent(element, 'input');
    dispatchEvent(element, 'change');
  } catch (error) {
    console.error('Error simulating typing:', error);
  } finally {
    if (element instanceof HTMLTextAreaElement) {
      try {
        if (element.value !== value) {
          setNativeValue(element, value);
          dispatchEvent(element, 'input');
          dispatchEvent(element, 'change');
        }
        element.blur();
        element.focus();
      } catch {
        // Textarea finalization error
      }
    } else {
      element.blur();
    }
  }
};

// getElementXPath and generateUniqueSelectors are imported from ../core/utils
// and re-exported at the bottom of this file to maintain backward compatibility.

/**
 * Get a unique field ID
 */
const getUniqueFieldId = (baseIndex: number): string => {
  let fieldId = `field-${baseIndex}`;
  let counter = baseIndex;
  while (usedFieldIds.has(fieldId)) {
    counter++;
    fieldId = `field-${counter}`;
  }
  usedFieldIds.add(fieldId);
  return fieldId;
};

/**
 * Create a base field object with common properties.
 * Ensures label is NEVER empty by combining all available metadata signals.
 */
const createBaseField = async (
  element: HTMLElement,
  index: number,
  type: string,
  testMode: boolean = false,
): Promise<Field> => {
  const fieldId = getUniqueFieldId(index);
  element.setAttribute('data-filliny-id', fieldId);
  // Validate type using Zod schema, defaulting to 'text' if invalid
  const validatedType = FieldTypeSchema.safeParse(type);
  const fieldType: FieldType = validatedType.success ? validatedType.data : 'text';
  const field: Field = {
    id: fieldId,
    type: fieldType,
    xpath: getElementXPath(element),
    uniqueSelectors: generateUniqueSelectors(element),
    value: '',
  };

  // Populate name from element attributes
  const nameAttr = element.getAttribute('name');
  if (nameAttr?.trim()) {
    field.name = nameAttr.trim();
  }

  // Populate placeholder
  const placeholderAttr = element.getAttribute('placeholder');
  if (placeholderAttr?.trim()) {
    field.placeholder = placeholderAttr.trim();
  }

  // Populate title from HTML title attribute
  const titleAttr = element.getAttribute('title');
  if (titleAttr?.trim()) {
    field.title = titleAttr.trim();
  }

  // Populate description from getFieldDescription
  const description = getFieldDescription(element);
  if (description) {
    field.description = description;
  }

  // Primary label from getFieldLabel (multi-strategy with 27+ strategies)
  field.label = getFieldLabel(element);

  // Bulletproof label enrichment: combine ALL available metadata signals
  // to ensure the API always gets maximum context about the field
  const labelSignals: string[] = [];

  // Start with the primary label if it's meaningful
  if (field.label && field.label !== `${element.tagName.toLowerCase()}:${element.getAttribute('type') || 'unknown'}`) {
    labelSignals.push(field.label);
  }

  // Add name if it provides additional info
  if (field.name) {
    const humanizedName = humanizeString(field.name);
    if (humanizedName && !labelSignals.some(s => s.toLowerCase().includes(humanizedName.toLowerCase()))) {
      labelSignals.push(humanizedName);
    }
  }

  // Add placeholder if it provides additional info
  if (field.placeholder && !labelSignals.some(s => s.toLowerCase().includes(field.placeholder!.toLowerCase()))) {
    labelSignals.push(field.placeholder);
  }

  // Add title if it provides additional info
  if (field.title && !labelSignals.some(s => s.toLowerCase().includes(field.title!.toLowerCase()))) {
    labelSignals.push(field.title);
  }

  // Add description if it provides additional info (truncated for label, full in description field)
  if (
    field.description &&
    field.description.length < 100 &&
    !labelSignals.some(s => s.toLowerCase().includes(field.description!.toLowerCase()))
  ) {
    labelSignals.push(field.description);
  }

  // Try React fiber as an additional signal
  const reactLabel = extractReactFiberLabel(element);
  if (reactLabel && !labelSignals.some(s => s.toLowerCase().includes(reactLabel.toLowerCase()))) {
    labelSignals.push(reactLabel);
  }

  // Final label assembly: combine all signals or use nuclear fallback
  if (labelSignals.length > 0) {
    field.label = labelSignals.join(' | ');
  } else {
    // Nuclear fallback: guarantee non-empty label
    field.label =
      humanizeString(element.getAttribute('name') || element.id || '') ||
      `${element.tagName.toLowerCase()}:${element.getAttribute('type') || 'unknown'}`;
  }

  if (testMode) {
    switch (type) {
      case 'text':
        field.testValue = 'Test text';
        break;
      case 'email':
        field.testValue = 'test@example.com';
        break;
      case 'tel':
        field.testValue = '+1234567890';
        break;
      case 'select':
        break;
      case 'number':
        field.testValue = '42';
        break;
      default:
        field.testValue = `Test ${type}`;
    }
  }
  return field;
};

/**
 * Safely get a string value with fallback
 */
const safeGetString = (value: unknown, fallback = ''): string => {
  try {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return value;
    return String(value);
  } catch {
    return fallback;
  }
};

/**
 * Safely get lowercase string value
 */
const safeGetLowerString = (value: unknown, fallback = ''): string => {
  try {
    const str = safeGetString(value, fallback);
    return str.toLowerCase();
  } catch {
    return fallback;
  }
};

/**
 * Safely get element attributes
 */
const safeGetAttributes = (element: HTMLElement): Attr[] => {
  try {
    return Array.from(element.attributes || []);
  } catch {
    return [];
  }
};

/**
 * Safely check if element has a specific property
 */
const safeHasProperty = (element: HTMLElement, property: string): boolean => {
  try {
    return Object.prototype.hasOwnProperty.call(element, property);
  } catch {
    return false;
  }
};

// ============================================================================
// Exports (at end of file per ESLint import-x/exports-last rule)
// ============================================================================

export {
  getStringValue,
  dispatchEvent,
  addVisualFeedback,
  isElementInteractive,
  findRelatedRadioButtons,
  findRelatedCheckboxes,
  isCustomSelect,
  findSelectOptions,
  simulateTyping,
  getElementXPath,
  generateUniqueSelectors,
  getUniqueFieldId,
  createBaseField,
  safeGetString,
  safeGetLowerString,
  safeGetAttributes,
  safeHasProperty,
  // Phase 1+ exports
  setNativeValue,
  getReactProps,
  invokeReactOnChange,
  createReactSyntheticEvent,
  dispatchPointerClickSequence,
  waitForElement,
  isHoneypotField,
  simulatePaste,
  dispatchCompositionEvents,
  dispatchBeforeInput,
  ensureFocus,
  isElementAttached,
  captureFormState,
  restoreFormState,
  getTypingDelay,
  // Phase 2 exports - enhanced interaction, validation, verification
  dispatchFullUserInteraction,
  verifyFieldValueSet,
  detectAndTriggerValidation,
  triggerJQueryValidation,
  findReactOnChangeInFiber,
};

export type { ReactProps, ReactSyntheticEvent, FormStateSnapshot };
