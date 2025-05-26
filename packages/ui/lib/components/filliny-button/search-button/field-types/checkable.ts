import { createBaseField, getFieldLabel, findRelatedRadioButtons } from "./utils";
import type { Field } from "@extension/shared";

// Extend Field type with checkable-specific properties
interface CheckableField extends Field {
  checked?: boolean;
  groupName?: string;
}

/**
 * Check if a value indicates a "checked" or "true" state
 * Handles various formats like true/false, 0/1, "yes"/"no", etc.
 */
export const isValueChecked = (value: unknown): boolean => {
  if (value === undefined || value === null) {
    return false;
  }

  // Direct boolean
  if (typeof value === "boolean") {
    return value;
  }

  // Numbers (0 = false, anything else = true)
  if (typeof value === "number") {
    return value !== 0;
  }

  // String representations
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    // Standard boolean strings
    if (
      normalized === "true" ||
      normalized === "yes" ||
      normalized === "on" ||
      normalized === "1" ||
      normalized === "selected" ||
      normalized === "checked"
    ) {
      return true;
    }

    // Standard false strings
    if (
      normalized === "false" ||
      normalized === "no" ||
      normalized === "off" ||
      normalized === "0" ||
      normalized === "unselected" ||
      normalized === "unchecked"
    ) {
      return false;
    }

    // Any non-empty string that doesn't explicitly indicate false is treated as true
    return normalized !== "";
  }

  // Arrays - if there are any items, consider it checked
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  // For objects, treat as true (existence implies checked)
  return true;
};

/**
 * Match checkbox values considering different formats
 * Used to determine if a checkbox should be checked when multiple values are involved
 */
export const matchesCheckboxValue = (optionValue: string, targetValue: unknown): boolean => {
  // Handle direct equality
  if (optionValue === targetValue) {
    return true;
  }

  // If target is an array, check if this value is in the array
  if (Array.isArray(targetValue)) {
    return targetValue.some(v => String(v) === optionValue);
  }

  // Handle string comparison
  if (typeof targetValue === "string") {
    const normalizedOption = optionValue.toLowerCase();
    const normalizedTarget = targetValue.toLowerCase();

    // Exact match after normalization
    if (normalizedOption === normalizedTarget) {
      return true;
    }

    // Split by commas or semicolons for multiple values in a string
    if (normalizedTarget.includes(",") || normalizedTarget.includes(";")) {
      const parts = normalizedTarget.split(/[,;]/).map(p => p.trim());
      return parts.includes(normalizedOption);
    }
  }

  return false;
};

/**
 * Update a checkbox or radio button input
 * This is the main entry point for updating checkable fields
 */
export const updateCheckable = (element: HTMLElement, checked: boolean): void => {
  try {
    // Handle both native inputs and ARIA-based custom controls
    if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
      updateNativeCheckable(element, checked);
    } else if (
      element.getAttribute("role") === "checkbox" ||
      element.getAttribute("role") === "radio" ||
      element.getAttribute("role") === "switch"
    ) {
      updateAriaCheckable(element, checked);
    } else {
      // Attempt to handle custom components by looking for common patterns
      updateCustomCheckable(element, checked);
    }

    // If this is a radio button, ensure that related radio buttons in the same group are properly updated
    if ((element instanceof HTMLInputElement && element.type === "radio") || element.getAttribute("role") === "radio") {
      if (checked) {
        // Find and uncheck all other radio buttons in this group
        updateRelatedRadioButtons(element);
      }
    }
  } catch (error) {
    console.error("Error updating checkable element:", error);
  }
};

/**
 * Update a native checkbox or radio input
 */
const updateNativeCheckable = (element: HTMLInputElement, checked: boolean): void => {
  // First check if element is already in the desired state
  if (element.checked === checked) return;

  // Update the checked state
  element.checked = checked;

  // Dispatch appropriate events to trigger any event listeners
  const changeEvent = new Event("change", { bubbles: true });
  element.dispatchEvent(changeEvent);

  const inputEvent = new Event("input", { bubbles: true });
  element.dispatchEvent(inputEvent);

  // Trigger click event only if state needs to change
  if (element.checked !== checked) {
    element.click();
  }
};

/**
 * Update an ARIA-based checkbox or radio element
 */
const updateAriaCheckable = (element: HTMLElement, checked: boolean): void => {
  // Determine the role
  const role = element.getAttribute("role");

  // Get the current state
  const currentChecked =
    role === "switch"
      ? element.getAttribute("aria-checked") === "true"
      : element.getAttribute("aria-checked") === "true";

  // If already in desired state, return
  if (currentChecked === checked) return;

  // Update the ARIA state
  element.setAttribute("aria-checked", checked ? "true" : "false");

  // Look for an actual input that might be controlled by this ARIA element
  const controlledInput = findControlledInput(element);
  if (controlledInput) {
    updateNativeCheckable(controlledInput, checked);
    return;
  }

  // If no controlled input, simulate a click to trigger any bound event handlers
  element.click();

  // Update CSS classes based on common patterns
  if (checked) {
    element.classList.add("checked", "selected", "active");
    element.classList.remove("unchecked");
  } else {
    element.classList.remove("checked", "selected", "active");
    element.classList.add("unchecked");
  }

  // Dispatch events
  const changeEvent = new Event("change", { bubbles: true });
  element.dispatchEvent(changeEvent);

  const inputEvent = new Event("input", { bubbles: true });
  element.dispatchEvent(inputEvent);
};

/**
 * Find any native input that might be controlled by an ARIA element
 */
const findControlledInput = (element: HTMLElement): HTMLInputElement | null => {
  // Check for common patterns

  // 1. Input might be a child
  const childInput = element.querySelector('input[type="checkbox"], input[type="radio"]') as HTMLInputElement;
  if (childInput) return childInput;

  // 2. Input might be a sibling
  const siblingInput = element.parentElement?.querySelector(
    'input[type="checkbox"], input[type="radio"]',
  ) as HTMLInputElement;
  if (siblingInput && siblingInput !== element) return siblingInput;

  // 3. Input might be linked by ARIA attributes
  const controlsId = element.getAttribute("aria-controls");
  if (controlsId) {
    const controlledElement = document.getElementById(controlsId);
    if (controlledElement instanceof HTMLInputElement) {
      return controlledElement;
    }
  }

  // 4. Input might be hidden in the DOM
  if (element.id) {
    const relatedInput = document.querySelector(`input[aria-labelledby="${element.id}"]`) as HTMLInputElement;
    if (relatedInput) return relatedInput;
  }

  return null;
};

/**
 * Update visual indicators for custom checkbox/radio components
 */
const updateVisualIndicators = (element: HTMLElement, checked: boolean): void => {
  // Update CSS classes based on common patterns
  if (checked) {
    element.classList.add("checked", "selected", "active");
    element.classList.remove("unchecked");
  } else {
    element.classList.remove("checked", "selected", "active");
    element.classList.add("unchecked");
  }

  // If this is a radio button, ensure that related radio buttons in the same group are properly updated
  if ((element instanceof HTMLInputElement && element.type === "radio") || element.getAttribute("role") === "radio") {
    if (checked) {
      // Find and uncheck all other radio buttons in this group
      updateRelatedRadioButtons(element);
    }
  }

  // Dispatch events
  const changeEvent = new Event("change", { bubbles: true });
  element.dispatchEvent(changeEvent);

  const inputEvent = new Event("input", { bubbles: true });
  element.dispatchEvent(inputEvent);
};

/**
 * Attempt to update custom checkable components
 */
const updateCustomCheckable = (element: HTMLElement, checked: boolean): void => {
  // First, try to find a native input that might be associated with this element
  let inputFound = false;

  // Check if element contains an input
  const containedInput = element.querySelector('input[type="checkbox"], input[type="radio"]') as HTMLInputElement;
  if (containedInput) {
    updateNativeCheckable(containedInput, checked);
    inputFound = true;
  }

  // Check if element's parent contains an input
  if (!inputFound && element.parentElement) {
    const parentInput = element.parentElement.querySelector(
      'input[type="checkbox"], input[type="radio"]',
    ) as HTMLInputElement;
    if (parentInput && !parentInput.contains(element)) {
      updateNativeCheckable(parentInput, checked);
      inputFound = true;
    }
  }

  // Check for label that might be connected to an input
  if (!inputFound && element.tagName === "LABEL") {
    const labelFor = element.getAttribute("for");
    if (labelFor) {
      const linkedInput = document.getElementById(labelFor) as HTMLInputElement;
      if (linkedInput && (linkedInput.type === "checkbox" || linkedInput.type === "radio")) {
        updateNativeCheckable(linkedInput, checked);
        inputFound = true;
      }
    }
  }

  // If no input found, treat as a custom component
  if (!inputFound) {
    // Set custom data attribute to track state
    element.setAttribute("data-filliny-checked", checked ? "true" : "false");

    // Update classes based on common patterns
    if (checked) {
      element.classList.add("checked", "selected", "active");
      element.classList.remove("unchecked");
    } else {
      element.classList.remove("checked", "selected", "active");
      element.classList.add("unchecked");
    }

    // Trigger click if needed
    const currentChecked =
      element.classList.contains("checked") ||
      element.classList.contains("selected") ||
      element.classList.contains("active");

    if (currentChecked !== checked) {
      element.click();
    }
  }
};

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
          const changeEvent = new Event("change", { bubbles: true });
          radio.dispatchEvent(changeEvent);

          const inputEvent = new Event("input", { bubbles: true });
          radio.dispatchEvent(inputEvent);
        }
      } else if (radio.getAttribute("role") === "radio") {
        if (radio.getAttribute("aria-checked") === "true") {
          radio.setAttribute("aria-checked", "false");

          // Update visual indicators
          updateVisualIndicators(radio, false);
        }
      }
    }
  });
};

/**
 * Get a random item from an array
 */
const getRandomItem = <T>(items: T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

/**
 * Detect checkable fields (radio buttons and checkboxes)
 */
export const detectCheckableFields = async (
  elements: HTMLElement[],
  baseIndex: number,
  testMode: boolean = false,
): Promise<Field[]> => {
  const fields: Field[] = [];
  let fieldIndex = 0;

  // Special handling for radio buttons - group them by name
  const radioGroups = new Map<string, HTMLInputElement[]>();
  const processedRadios = new Set<HTMLElement>();

  // First, collect radio groups
  elements.forEach(element => {
    if (element instanceof HTMLInputElement && element.type === "radio") {
      const groupName = element.name || "";
      if (!radioGroups.has(groupName)) {
        radioGroups.set(groupName, []);
      }
      radioGroups.get(groupName)?.push(element);
    }
  });

  // Handle aria-based checkboxes and switches separately
  const ariaCheckables = elements.filter(
    el =>
      (el.getAttribute("role") === "checkbox" || el.getAttribute("role") === "switch") &&
      !(el instanceof HTMLInputElement),
  );

  // Process regular input checkboxes
  const checkboxElements = elements.filter(
    el => el instanceof HTMLInputElement && el.type === "checkbox" && !processedRadios.has(el),
  );

  for (const element of checkboxElements) {
    const field = (await createBaseField(element, baseIndex + fieldIndex, "checkbox", testMode)) as CheckableField;

    field.checked = (element as HTMLInputElement).checked;

    // In test mode, randomly set checkbox state
    if (testMode) {
      field.testValue = Math.random() > 0.5 ? "true" : "false";
    }

    fields.push(field);
    fieldIndex++;
  }

  // Process aria-based checkboxes
  for (const element of ariaCheckables) {
    const isChecked = element.getAttribute("aria-checked") === "true";
    const field = (await createBaseField(element, baseIndex + fieldIndex, "checkbox", testMode)) as CheckableField;

    field.checked = isChecked;

    // In test mode, randomly set checkbox state
    if (testMode) {
      field.testValue = Math.random() > 0.5 ? "true" : "false";
    }

    fields.push(field);
    fieldIndex++;
  }

  // Process radio groups
  for (const [groupName, groupElements] of radioGroups.entries()) {
    // Skip empty groups
    if (groupElements.length === 0) continue;

    // Pick the first radio from the group
    const inputElement = groupElements[0];

    // Skip if already processed
    if (processedRadios.has(inputElement)) continue;

    if (inputElement.type === "radio") {
      // For radio buttons, we handle the entire group at once
      const _React = inputElement.name || null;

      if (_React) {
        // Get all radios in this group
        const groupRadios = radioGroups.get(groupName) || [inputElement];

        // Create one field for the entire radio group
        const field = (await createBaseField(
          inputElement,
          baseIndex + fieldIndex,
          "radio",
          testMode,
        )) as CheckableField;

        field.name = groupName;
        field.groupName = groupName;
        field.label = groupName; // Default label to group name

        // Find which option is currently selected
        const checkedRadio = groupRadios.find(radio => radio.checked);
        field.checked = !!checkedRadio;

        // Determine label from surrounding context
        const fieldset = inputElement.closest("fieldset");
        if (fieldset) {
          const legend = fieldset.querySelector("legend");
          if (legend && legend.textContent) {
            field.label = legend.textContent.trim();
          }
        }

        // Get possible values from all options
        const values: string[] = groupRadios.map(radio => radio.value);
        field.options = values.length > 0 ? values.map(value => ({ value, text: value, selected: false })) : undefined;

        // Set test value to a random option value
        if (testMode && values.length > 0) {
          // For gender fields in test mode, prefer "female" option if available
          const femaleValue = values.find(
            v =>
              v.toLowerCase() === "female" ||
              v.toLowerCase() === "f" ||
              v.toLowerCase() === "frau" ||
              v.toLowerCase() === "w" ||
              v === "1", // Often used for female in legacy systems
          );

          // If a gender field is detected, use female value, otherwise pick randomly
          if (
            femaleValue &&
            (field.label?.toLowerCase().includes("gender") ||
              field.label?.toLowerCase().includes("sex") ||
              field.label?.toLowerCase().includes("geschlecht") ||
              field.label?.toLowerCase().includes("anrede"))
          ) {
            field.testValue = femaleValue;
          } else {
            // Pick a random option
            field.testValue = getRandomItem(values);
          }
        }

        fields.push(field);
        fieldIndex++;

        // Mark all radios in this group as processed
        groupRadios.forEach(radio => processedRadios.add(radio));
      }
    }
  }

  // Process ARIA role=radio elements - similar to radio inputs
  const ariaRadioGroups = new Map<string, HTMLElement[]>();
  const ariaRadios = elements.filter(el => el.getAttribute("role") === "radio" && !processedRadios.has(el));

  // Group by radiogroup container
  ariaRadios.forEach(element => {
    const radioGroup = element.closest('[role="radiogroup"]');
    const groupId = radioGroup ? radioGroup.id || "radiogroup-" + Date.now() : "standalone-" + Date.now();
    if (!ariaRadioGroups.has(groupId)) {
      ariaRadioGroups.set(groupId, []);
    }
    ariaRadioGroups.get(groupId)?.push(element);
  });

  // Process each ARIA radio group
  for (const [groupId, groupElements] of ariaRadioGroups.entries()) {
    if (groupElements.length === 0) continue;

    // Create one field for the entire radio group
    const inputElement = groupElements[0];
    const field = (await createBaseField(inputElement, baseIndex + fieldIndex, "radio", testMode)) as CheckableField;

    field.groupName = groupId;
    field.label = groupId; // Default label to group name

    // Find which option is currently selected
    const checkedRadio = groupElements.find(radio => radio.getAttribute("aria-checked") === "true");
    field.checked = !!checkedRadio;

    // Get possible values from all options
    const values: string[] = groupElements.map(
      radio => radio.getAttribute("data-value") || radio.textContent?.trim() || "",
    );
    field.options = values.length > 0 ? values.map(value => ({ value, text: value, selected: false })) : undefined;

    // Set test value to a random option value
    if (testMode && values.length > 0) {
      field.testValue = getRandomItem(values);
    }

    fields.push(field);
    fieldIndex++;

    // Mark all radios in this group as processed
    groupElements.forEach(radio => processedRadios.add(radio));
  }

  return fields;
};

/**
 * Detect radio button fields from a set of elements
 * Groups radio buttons with the same name into a single field
 */
export const detectRadioFields = async (
  elements: HTMLElement[],
  baseIndex: number,
  testMode: boolean = false,
): Promise<Field[]> => {
  const fields: Field[] = [];
  const processedGroups = new Set<string>();
  const radioGroups = new Map<string, HTMLElement[]>();

  // First, group radio elements by name or common container
  const radioElements = elements.filter(
    element =>
      (element instanceof HTMLInputElement && element.type === "radio") || element.getAttribute("role") === "radio",
  );

  for (const element of radioElements) {
    // Skip disabled elements
    if (
      element.hasAttribute("disabled") ||
      element.hasAttribute("readonly") ||
      element.getAttribute("aria-hidden") === "true"
    ) {
      continue;
    }

    // Get group name - either from name attribute or container
    let groupName = "";
    if (element instanceof HTMLInputElement) {
      groupName = element.name;
    } else {
      const radioGroup = element.closest('[role="radiogroup"]');
      groupName = radioGroup?.id || radioGroup?.getAttribute("aria-labelledby") || "";
    }

    // If no explicit group name, try to find common container
    if (!groupName) {
      const container = element.closest('fieldset, [class*="radio-group"], [class*="radio_group"]');
      groupName = container?.id || `radio-group-${baseIndex}`;
    }

    // Add to group mapping
    if (!radioGroups.has(groupName)) {
      radioGroups.set(groupName, []);
    }
    radioGroups.get(groupName)?.push(element);
  }

  // Now process each radio group
  let index = 0;
  for (const [groupName, groupElements] of radioGroups.entries()) {
    if (processedGroups.has(groupName)) continue;

    // Skip empty groups
    if (groupElements.length === 0) continue;

    // Create a field for this radio group
    const firstElement = groupElements[0];
    const field = await createBaseField(firstElement, baseIndex + index, "radio", testMode);

    // Try to get a label from the common container
    const commonContainer = findCommonContainer(groupElements);
    if (commonContainer) {
      const containerLabel = await getFieldLabel(commonContainer);
      if (containerLabel && containerLabel !== "Field " + (baseIndex + index)) {
        field.label = containerLabel;
      }
    }

    // Set options for the radio group
    field.options = await Promise.all(
      groupElements.map(async el => {
        const labelContainer = findRadioLabelContainer(el as HTMLElement);
        let labelText = "";
        if (labelContainer) {
          labelText = await getFieldLabel(labelContainer);
        }

        let value = "";
        let selected = false;

        if (el instanceof HTMLInputElement) {
          value = el.value;
          selected = el.checked;
        } else {
          value = el.getAttribute("value") || el.getAttribute("data-value") || "";
          selected = el.getAttribute("aria-checked") === "true";
        }

        return {
          value,
          text: labelText || value,
          selected,
        };
      }),
    );

    // Set the current value
    const selectedRadio = groupElements.find(el =>
      el instanceof HTMLInputElement ? el.checked : el.getAttribute("aria-checked") === "true",
    );

    if (selectedRadio) {
      if (selectedRadio instanceof HTMLInputElement) {
        field.value = selectedRadio.value;
      } else {
        field.value = selectedRadio.getAttribute("value") || "";
      }
    }

    // For test mode, set an appropriate test value
    if (testMode && field.options && field.options.length > 0) {
      // Look for options that might indicate gender selection
      let bestTestOption = field.options[0].value;

      // For gender fields, try to select "female" by default
      const isGenderField =
        field.label?.toLowerCase().includes("gender") ||
        field.label?.toLowerCase().includes("geschlecht") ||
        field.label?.toLowerCase().includes("anrede") ||
        field.options.some(
          opt =>
            opt.text.toLowerCase().includes("female") ||
            opt.text.toLowerCase().includes("male") ||
            opt.text.toLowerCase().includes("frau") ||
            opt.text.toLowerCase().includes("herr"),
        );

      if (isGenderField) {
        // Try to find female option
        const femaleOption = field.options.find(
          opt =>
            opt.text.toLowerCase().includes("female") ||
            opt.text.toLowerCase().includes("frau") ||
            opt.text.toLowerCase() === "f" ||
            opt.text.toLowerCase() === "w",
        );

        if (femaleOption) {
          bestTestOption = femaleOption.value;
        }
      }

      field.testValue = bestTestOption;
    }

    fields.push(field);
    index++;
    processedGroups.add(groupName);
  }

  return fields;
};

/**
 * Find a common container for radio buttons in a group
 */
const findCommonContainer = (elements: HTMLElement[]): HTMLElement | undefined => {
  if (elements.length === 0) return undefined;
  if (elements.length === 1) return elements[0].parentElement || undefined;

  // Start with the first element's parent
  let commonAncestor = elements[0].parentElement;

  while (commonAncestor) {
    // Check if this container contains all elements in the group
    if (elements.every(el => commonAncestor?.contains(el))) {
      // Prefer containers with radiogroup semantic meaning
      if (
        commonAncestor.tagName.toLowerCase() === "fieldset" ||
        commonAncestor.getAttribute("role") === "radiogroup" ||
        commonAncestor.classList.contains("radio-group") ||
        commonAncestor.querySelector("legend")
      ) {
        return commonAncestor;
      }
    }
    commonAncestor = commonAncestor.parentElement;
  }

  return undefined;
};

/**
 * Find the label container for a radio button
 */
const findRadioLabelContainer = (radio: HTMLElement): HTMLElement | null => {
  // Check for explicit label with 'for' attribute
  if (radio.id) {
    const explicitLabel = radio.ownerDocument.querySelector<HTMLElement>(`label[for="${radio.id}"]`);
    if (explicitLabel) return explicitLabel;
  }

  // Check if radio is wrapped in a label
  const wrapperLabel = radio.closest("label");
  if (wrapperLabel) return wrapperLabel as HTMLElement;

  // Look at siblings
  const parent = radio.parentElement;
  if (!parent) return null;

  const siblings = Array.from(parent.children);
  const radioIndex = siblings.indexOf(radio);

  // Check next sibling (common pattern)
  if (radioIndex < siblings.length - 1) {
    const next = siblings[radioIndex + 1];
    if (isLabelLike(next)) return next as HTMLElement;
  }

  // Check previous sibling
  if (radioIndex > 0) {
    const prev = siblings[radioIndex - 1];
    if (isLabelLike(prev)) return prev as HTMLElement;
  }

  return parent;
};

/**
 * Helper function to detect if an element is label-like
 */
function isLabelLike(element: Element): boolean {
  if (!element || !(element instanceof HTMLElement)) return false;

  // Check for actual labels
  if (element.tagName.toLowerCase() === "label") return true;

  // Check common label-like patterns
  if (element.tagName.toLowerCase() === "span" || element.tagName.toLowerCase() === "div") {
    // Check classes
    const classStr = element.className.toLowerCase();
    if (
      classStr.includes("label") ||
      classStr.includes("text") ||
      classStr.includes("caption") ||
      classStr.includes("title")
    ) {
      return true;
    }

    // Check if it has mostly text content and minimal HTML
    const htmlContent = element.innerHTML;
    const textContent = element.textContent || "";
    if (textContent.length > 0 && htmlContent.length - textContent.length < 20) {
      return true;
    }
  }

  return false;
}

// Export for testing
export const __testing = {
  updateNativeCheckable,
  updateAriaCheckable,
  updateCustomCheckable,
  findControlledInput,
  updateVisualIndicators,
  updateRelatedRadioButtons,
};
