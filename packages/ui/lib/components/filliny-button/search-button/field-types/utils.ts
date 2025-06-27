/**
 * Safely get a string value from potentially complex field values
 */
import { getFieldLabel as getFieldLabelFromUtils } from "../fieldUtils";
import type { Field, FieldType } from "@extension/shared";

// Track used field IDs to ensure uniqueness
const usedFieldIds = new Set<string>();

export const getStringValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(",");
  return String(value);
};

/**
 * Dispatches an event on the given element
 * Ensures proper event bubbling and default handling
 */
export const dispatchEvent = (element: HTMLElement, eventName: string): void => {
  try {
    // Create and dispatch the event
    const event = new Event(eventName, {
      bubbles: true,
      cancelable: true,
    });

    element.dispatchEvent(event);

    // For React and other frameworks that may use synthetic events
    // Try to find and call any attached event handlers directly
    const reactHandler =
      // @ts-expect-error - Dynamic property access for event handlers
      element[`on${eventName}`] || element.getAttribute(`on${eventName}`);

    if (typeof reactHandler === "function") {
      reactHandler.call(element, event);
    }

    // For Angular, look for event handlers in the __ngContext__ property
    const elementWithContext = element as { __ngContext__?: unknown };
    if (elementWithContext.__ngContext__) {
      console.log(`Found Angular context, trying to trigger ${eventName} handler`);
    }

    // For jQuery-based sites
    const windowWithJQuery = window as { jQuery?: unknown };
    if (typeof windowWithJQuery.jQuery !== "undefined") {
      try {
        // @ts-expect-error - jQuery is not typed
        windowWithJQuery.jQuery(element).trigger(eventName);
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
export const addVisualFeedback = (element: HTMLElement): void => {
  try {
    // First, add a data attribute to mark this field as updated
    element.setAttribute("data-filliny-updated", "true");

    // Create a subtle highlight animation
    const originalBackgroundColor = window.getComputedStyle(element).backgroundColor;
    const originalBoxShadow = window.getComputedStyle(element).boxShadow;

    // Add a subtle flash effect that doesn't interfere with the form
    element.style.transition = "background-color 0.5s ease, box-shadow 0.5s ease";
    element.style.backgroundColor = "rgba(2, 132, 199, 0.1)"; // Light blue highlight
    element.style.boxShadow = "0 0 0 2px rgba(2, 132, 199, 0.4)"; // Light blue outline

    // Return to original state after animation
    setTimeout(() => {
      element.style.backgroundColor = originalBackgroundColor;
      element.style.boxShadow = originalBoxShadow;

      // Keep a subtle indicator that this field was filled automatically
      element.style.outline = "1px solid rgba(2, 132, 199, 0.3)";

      // Remove transition to prevent animation on future user interactions
      setTimeout(() => {
        element.style.transition = "";
      }, 500);
    }, 800);
  } catch (error) {
    console.error("Error adding visual feedback:", error);
  }
};

/**
 * Determines if an element is visible and interactive
 */
export const isElementInteractive = (element: HTMLElement): boolean => {
  if (!element) return false;

  const style = window.getComputedStyle(element);

  // Check if element is visible
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }

  // Check if element is disabled or read-only
  if (
    element.hasAttribute("disabled") ||
    element.hasAttribute("readonly") ||
    element.getAttribute("aria-disabled") === "true" ||
    element.getAttribute("aria-readonly") === "true"
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
export const findRelatedRadioButtons = (radioButton: HTMLElement): HTMLElement[] => {
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
  if (radioButton.getAttribute("role") === "radio") {
    // Find the radiogroup container
    const radioGroup = radioButton.closest('[role="radiogroup"]');
    if (radioGroup) {
      Array.from(radioGroup.querySelectorAll('[role="radio"]')).forEach(radio => related.push(radio as HTMLElement));
      return related;
    }
  }

  // Method 3: Find by common container
  if (related.length === 0) {
    // Look for common patterns in containers
    const possibleContainers = [
      radioButton.closest("fieldset"),
      radioButton.closest('[class*="radio-group"]'),
      radioButton.closest('[class*="radioGroup"]'),
      radioButton.closest('[class*="option-group"]'),
      radioButton.closest('[class*="optionGroup"]'),
      radioButton.closest("ul"),
      radioButton.closest("div"),
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
export const findRelatedCheckboxes = (checkbox: HTMLElement): HTMLElement[] => {
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
  if (checkbox.getAttribute("role") === "checkbox") {
    // Find the checkboxgroup container
    const checkboxGroup = checkbox.closest('[role="group"]');
    if (checkboxGroup) {
      Array.from(checkboxGroup.querySelectorAll('[role="checkbox"]')).forEach(cb => related.push(cb as HTMLElement));
      return related;
    }
  }

  // Method 3: Find by common container patterns
  if (related.length === 0) {
    // Look for common patterns in containers
    const possibleContainers = [
      checkbox.closest("fieldset"),
      checkbox.closest('[class*="checkbox-group"]'),
      checkbox.closest('[class*="checkboxGroup"]'),
      checkbox.closest('[class*="option-group"]'),
      checkbox.closest('[class*="optionGroup"]'),
      checkbox.closest("ul"),
      checkbox.closest("div"),
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
export const isCustomSelect = (element: HTMLElement): boolean => {
  // Common class patterns for custom select components
  const selectClassPatterns = ["select", "dropdown", "combobox", "combo-box"];

  // Check for ARIA roles
  if (
    element.getAttribute("role") === "combobox" ||
    element.getAttribute("role") === "listbox" ||
    element.getAttribute("aria-haspopup") === "listbox"
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
export const findSelectOptions = (
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
  if (selectElement.getAttribute("role") === "combobox" || selectElement.getAttribute("role") === "listbox") {
    // Find the listbox element
    let listbox = selectElement;
    if (selectElement.getAttribute("role") === "combobox") {
      // If it's a combobox, look for its associated listbox
      const listboxId = selectElement.getAttribute("aria-controls") || selectElement.getAttribute("aria-owns");
      if (listboxId) {
        listbox = document.getElementById(listboxId) as HTMLElement;
      } else {
        // Try to find a listbox within or adjacent to the combobox
        listbox =
          (selectElement.querySelector('[role="listbox"]') as HTMLElement) ||
          (selectElement.nextElementSibling?.getAttribute("role") === "listbox"
            ? (selectElement.nextElementSibling as HTMLElement)
            : null);
      }
    }

    if (listbox) {
      // Find all options within the listbox
      const optionElements = listbox.querySelectorAll('[role="option"]');
      optionElements.forEach(optionEl => {
        const option = optionEl as HTMLElement;
        options.push({
          element: option,
          value:
            option.getAttribute("aria-value") || option.getAttribute("data-value") || option.textContent?.trim() || "",
          text: option.textContent?.trim() || "",
          selected: option.getAttribute("aria-selected") === "true",
        });
      });
    }

    return options;
  }

  // Case 3: Custom dropdown components - look for common patterns
  // Look for a button that toggles the dropdown
  const toggleButton = selectElement.querySelector('button, [role="button"]') as HTMLElement;
  if (toggleButton) {
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
            const option = item as HTMLElement;
            const isSelected =
              option.classList.contains("selected") ||
              option.classList.contains("active") ||
              option.getAttribute("aria-selected") === "true";

            options.push({
              element: option,
              value:
                option.getAttribute("data-value") || option.getAttribute("value") || option.textContent?.trim() || "",
              text: option.textContent?.trim() || "",
              selected: isSelected,
            });
          });
          return options;
        }
      }
    }
  }

  return options;
};

/**
 * Simulate human-like typing with proper focus events and composition
 */
export const simulateTyping = async (element: HTMLElement, value: string): Promise<void> => {
  try {
    // Focus the element
    element.focus();

    // Special handling for textareas to ensure they're properly focused
    const isTextarea = element instanceof HTMLTextAreaElement;
    if (isTextarea) {
      // For textareas, we need to ensure we have focus and selection
      try {
        element.focus();
        // Select all existing text first
        element.select();
      } catch (e) {
        console.debug("Textarea focus/select error:", e);
      }
    }

    // Start composition (for IME-aware applications)
    // Use CustomEvent for composition events with data
    try {
      const startEvent = new CustomEvent("compositionstart", {
        bubbles: true,
        cancelable: true,
        detail: { data: "" },
      });
      element.dispatchEvent(startEvent);
    } catch (e) {
      console.debug("Custom composition event failed:", e);
    }

    // Make multiple attempts to set the value using different methods
    // Method 1: Direct property assignment
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = value;

      // For textareas, immediately dispatch events after setting value
      if (isTextarea) {
        dispatchEvent(element, "input");
        dispatchEvent(element, "change");

        // Also try with native event constructors
        try {
          element.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true }));
          element.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
        } catch (e) {
          console.debug("Native event creation failed:", e);
        }
      }
    } else if ("value" in element) {
      (element as { value: string }).value = value;
    } else if (element.isContentEditable) {
      element.textContent = value;
    }

    // Method 2: Try using document.execCommand (for contentEditable and some frameworks)
    try {
      if (element.isContentEditable || element instanceof HTMLTextAreaElement) {
        // Clear existing content first
        const selection = window.getSelection();
        if (selection && element.contains(selection.anchorNode)) {
          document.execCommand("selectAll", false);
          document.execCommand("delete", false);
          document.execCommand("insertText", false, value);
        }
      }
    } catch (commandError) {
      console.debug("execCommand method not supported:", commandError);
    }

    // Method 3: For React-style controlled components that monitor specific events
    // Simulate individual keypresses for complex components
    let previousValue = "";
    for (let i = 0; i < value.length; i++) {
      const char = value[i];
      previousValue += char;

      // Use CustomEvent for composition update
      try {
        const updateEvent = new CustomEvent("compositionupdate", {
          bubbles: true,
          cancelable: true,
          detail: { data: previousValue },
        });
        element.dispatchEvent(updateEvent);
      } catch (e) {
        console.debug("Custom composition update event failed:", e);
      }

      // Some frameworks listen for keydown/keypress events
      const keyEvent = {
        key: char,
        code: `Key${char.toUpperCase()}`,
        bubbles: true,
        cancelable: true,
        composed: true,
      };

      try {
        element.dispatchEvent(new KeyboardEvent("keydown", keyEvent));
        element.dispatchEvent(new KeyboardEvent("keypress", keyEvent));
        element.dispatchEvent(new KeyboardEvent("keyup", keyEvent));
      } catch (keyError) {
        console.debug("Keyboard event simulation error:", keyError);
      }
    }

    // End composition with CustomEvent
    try {
      const endEvent = new CustomEvent("compositionend", {
        bubbles: true,
        cancelable: true,
        detail: { data: value },
      });
      element.dispatchEvent(endEvent);
    } catch (e) {
      console.debug("Custom composition end event failed:", e);
    }

    // Fire standard events
    dispatchEvent(element, "input");
    dispatchEvent(element, "change");

    // Check if value was actually set
    let valueSet = false;
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      valueSet = element.value === value;
    } else if (element.isContentEditable) {
      valueSet = element.textContent === value;
    }

    // If value wasn't set by previous methods, try more aggressive approaches
    if (!valueSet) {
      // Method 4: Use MutationObserver to detect if the value change was prevented
      const observer = new MutationObserver(() => {
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          if (element.value !== value) {
            element.value = value;
            dispatchEvent(element, "input");
            dispatchEvent(element, "change");
          }
        }
      });

      observer.observe(element, { attributes: true, childList: true, characterData: true });

      // Trigger an update to see if our value gets reverted
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.value = value;
      }

      // Disconnect immediately rather than waiting
      observer.disconnect();
    }

    // No need to wait for auto-resize since we want maximum speed
  } catch (error) {
    console.error("Error simulating typing:", error);
  } finally {
    // No delay before blurring to maximize speed
    // For textareas, we need to ensure we dispatch blur and focus events
    // to trigger validation and change detection in frameworks
    if (element instanceof HTMLTextAreaElement) {
      try {
        // Verify the value was set
        if (element.value !== value) {
          console.log("Textarea value not set correctly, trying final approach");
          element.value = value;
          dispatchEvent(element, "input");
          dispatchEvent(element, "change");
        }

        // Some frameworks need blur+focus to detect changes
        element.blur();
        element.focus();
      } catch (e) {
        console.debug("Textarea finalization error:", e);
      }
    } else if (!(element instanceof HTMLTextAreaElement)) {
      element.blur();
    }
  }
};

/**
 * Get an XPath expression that identifies an element
 */
export const getElementXPath = (element: HTMLElement): string => {
  if (!element.parentElement) return "";
  const idx =
    Array.from(element.parentElement.children)
      .filter(child => child.tagName === element.tagName)
      .indexOf(element) + 1;
  return `${getElementXPath(element.parentElement)}/${element.tagName.toLowerCase()}[${idx}]`;
};

/**
 * Generate unique selectors for an element to help with identification
 */
export const generateUniqueSelectors = (element: HTMLElement): string[] => {
  const selectors: string[] = [];
  if (element.id) selectors.push(`#${CSS.escape(element.id)}`);
  if (element.className) {
    const classSelector = Array.from(element.classList)
      .map(c => `.${CSS.escape(c)}`)
      .join("");
    if (classSelector) selectors.push(classSelector);
  }
  ["name", "type", "role", "aria-label"].forEach(attr => {
    if (element.hasAttribute(attr)) {
      selectors.push(`[${attr}="${CSS.escape(element.getAttribute(attr)!)}"]`);
    }
  });
  return selectors;
};

/**
 * Get a unique field ID
 */
export const getUniqueFieldId = (baseIndex: number): string => {
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
 * Create a base field object with common properties
 */
export const createBaseField = async (
  element: HTMLElement,
  index: number,
  type: string,
  testMode: boolean = false,
): Promise<Field> => {
  const fieldId = getUniqueFieldId(index);
  element.setAttribute("data-filliny-id", fieldId);
  const field: Field = {
    id: fieldId,
    type: type as FieldType,
    xpath: getElementXPath(element),
    uniqueSelectors: generateUniqueSelectors(element),
    value: "",
  };
  field.label = await getFieldLabel(element);
  if (testMode) {
    switch (type) {
      case "text":
        field.testValue = "Test text";
        break;
      case "email":
        field.testValue = "test@example.com";
        break;
      case "tel":
        field.testValue = "+1234567890";
        break;
      case "select":
        break;
      case "number":
        field.testValue = "42";
        break;
      default:
        field.testValue = `Test ${type}`;
    }
  }
  return field;
};

// Use the robust implementation from fieldUtils.ts
export const getFieldLabel = async (element: HTMLElement): Promise<string> => getFieldLabelFromUtils(element);

/**
 * Safely get a string value with fallback
 */
export const safeGetString = (value: unknown, fallback = ""): string => {
  try {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "string") return value;
    return String(value);
  } catch {
    return fallback;
  }
};

/**
 * Safely get lowercase string value
 */
export const safeGetLowerString = (value: unknown, fallback = ""): string => {
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
export const safeGetAttributes = (element: HTMLElement): Attr[] => {
  try {
    return Array.from(element.attributes || []);
  } catch {
    return [];
  }
};

/**
 * Safely check if element has a specific property
 */
export const safeHasProperty = (element: HTMLElement, property: string): boolean => {
  try {
    return Object.prototype.hasOwnProperty.call(element, property);
  } catch {
    return false;
  }
};
