import { dispatchEvent, createBaseField, getFieldLabel } from "./utils";
import type { Field } from "@extension/shared";

// Extend Field type with checkable-specific properties
interface CheckableField extends Field {
  checked?: boolean;
  groupName?: string;
}

/**
 * Update a checkable input (radio or checkbox)
 */
export const updateCheckable = async (element: HTMLElement, value: boolean | string): Promise<void> => {
  try {
    // Parse string value to boolean if needed
    let shouldCheck = typeof value === "boolean" ? value : value.toLowerCase() === "true";

    if (element instanceof HTMLInputElement) {
      // Special case for radio buttons, value might be the value attribute
      if (element.type === "radio" && typeof value === "string" && value !== "true" && value !== "false") {
        shouldCheck = element.value === value;
      }

      // Set checked state
      element.checked = shouldCheck;

      // Trigger events
      dispatchEvent(element, "click");
      dispatchEvent(element, "change");

      // For radios, ensure only one in group is checked
      if (element.type === "radio" && element.name && shouldCheck) {
        const form = element.form;
        const radios = form
          ? form.querySelectorAll(`input[type="radio"][name="${element.name}"]`)
          : document.querySelectorAll(`input[type="radio"][name="${element.name}"]`);

        radios.forEach(radio => {
          if (radio instanceof HTMLInputElement && radio !== element) {
            radio.checked = false;
          }
        });
      }
    } else {
      // Handle ARIA role elements
      element.setAttribute("aria-checked", shouldCheck ? "true" : "false");

      // Trigger events
      dispatchEvent(element, "click");
      dispatchEvent(element, "change");
    }
  } catch (error) {
    console.error("Error updating checkable input:", error);
  }
};

/**
 * Detects checkable inputs (radio buttons and checkboxes)
 */
export const detectCheckableFields = async (
  elements: HTMLElement[],
  baseIndex: number,
  testMode: boolean = false,
): Promise<Field[]> => {
  const fields: Field[] = [];

  // Filter for checkable inputs
  const checkableElements = elements.filter(
    element => element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio"),
  );

  // Group radio buttons by name for special handling
  const radioGroups: Map<string, HTMLInputElement[]> = new Map();

  // First pass to categorize and group elements
  for (const element of checkableElements) {
    const inputElement = element as HTMLInputElement;

    // Skip disabled/hidden elements
    if (
      inputElement.disabled ||
      inputElement.getAttribute("aria-hidden") === "true" ||
      window.getComputedStyle(inputElement).display === "none" ||
      window.getComputedStyle(inputElement).visibility === "hidden"
    ) {
      continue;
    }

    if (inputElement.type === "radio" && inputElement.name) {
      // Group radios with the same name
      const groupName = inputElement.name;
      if (!radioGroups.has(groupName)) {
        radioGroups.set(groupName, []);
      }
      radioGroups.get(groupName)?.push(inputElement);
    }
  }

  // Track processed radios to avoid duplicates
  const processedRadios = new Set<HTMLInputElement>();

  // Process each element
  let fieldIndex = 0;
  for (const element of checkableElements) {
    const inputElement = element as HTMLInputElement;

    // Skip already processed radios
    if (processedRadios.has(inputElement)) {
      continue;
    }

    // Skip disabled/hidden elements
    if (
      inputElement.disabled ||
      inputElement.getAttribute("aria-hidden") === "true" ||
      window.getComputedStyle(inputElement).display === "none" ||
      window.getComputedStyle(inputElement).visibility === "hidden"
    ) {
      continue;
    }

    // Different handling based on input type
    if (inputElement.type === "checkbox") {
      // Create individual checkbox field
      const field = (await createBaseField(
        inputElement,
        baseIndex + fieldIndex,
        "checkbox",
        testMode,
      )) as CheckableField;

      field.checked = inputElement.checked;
      field.required = inputElement.required;
      field.name = inputElement.name || "";

      // Add test value
      if (testMode) {
        field.testValue = !inputElement.checked ? "true" : "false";
      }

      fields.push(field);
      fieldIndex++;
    } else if (inputElement.type === "radio") {
      // For radio buttons, we handle the entire group at once
      const groupName = inputElement.name || null;

      if (groupName) {
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

        // Set test value to first option value
        if (testMode && values.length > 0) {
          field.testValue = "true";
        }

        fields.push(field);
        fieldIndex++;

        // Mark all radios in this group as processed
        groupRadios.forEach(radio => processedRadios.add(radio));
      } else {
        // Handle unnamed radio button as individual field
        const field = (await createBaseField(
          inputElement,
          baseIndex + fieldIndex,
          "radio",
          testMode,
        )) as CheckableField;

        field.checked = inputElement.checked;

        // For test mode, select this radio
        if (testMode) {
          field.testValue = "true";
        }

        fields.push(field);
        fieldIndex++;
      }
    }
  }

  return fields;
};

/**
 * Detect the state of a checkable input for the given value
 */
export const getCheckableState = (valueToUse: unknown, checkboxValue?: string): boolean => {
  if (typeof valueToUse === "boolean") {
    return valueToUse;
  } else if (typeof valueToUse === "string") {
    if (checkboxValue) {
      // Check if the string value indicates this specific checkbox should be checked
      return (
        valueToUse === checkboxValue ||
        valueToUse.toLowerCase() === "true" ||
        valueToUse.toLowerCase() === "yes" ||
        valueToUse.toLowerCase() === "on" ||
        valueToUse === "1"
      );
    } else {
      // Standard boolean conversion for simple cases
      return ["true", "yes", "on", "1"].includes(valueToUse.toLowerCase());
    }
  } else if (Array.isArray(valueToUse) && checkboxValue) {
    // If array of values, check if this checkbox's value is in the array
    return valueToUse.some(v => v === checkboxValue);
  }

  return false;
};

/**
 * Detect checkbox fields from a set of elements
 */
export const detectCheckboxFields = async (
  elements: HTMLElement[],
  baseIndex: number,
  testMode: boolean = false,
): Promise<Field[]> => {
  const fields: Field[] = [];

  const checkboxElements = elements.filter(
    element =>
      (element instanceof HTMLInputElement && element.type === "checkbox") ||
      element.getAttribute("role") === "checkbox" ||
      element.getAttribute("role") === "switch",
  );

  for (let i = 0; i < checkboxElements.length; i++) {
    const element = checkboxElements[i];

    // Skip disabled/hidden elements
    if (
      element.hasAttribute("disabled") ||
      element.hasAttribute("readonly") ||
      element.getAttribute("aria-hidden") === "true" ||
      window.getComputedStyle(element).display === "none" ||
      window.getComputedStyle(element).visibility === "hidden"
    ) {
      continue;
    }

    // Create base field
    const field = await createBaseField(element, baseIndex + i, "checkbox", testMode);

    // Add checkbox-specific metadata
    let isChecked = false;
    if (element instanceof HTMLInputElement) {
      isChecked = element.checked;
      field.value = isChecked.toString();
      field.metadata = {
        framework: "vanilla",
        visibility: { isVisible: true },
        checkboxValue: element.value || "on",
        isExclusive:
          element.hasAttribute("data-exclusive") ||
          element.closest("[role='radiogroup']") !== null ||
          element.closest("fieldset[data-exclusive]") !== null,
        groupName: element.name || element.getAttribute("data-group") || element.closest("fieldset")?.id,
      };
    } else {
      isChecked = element.getAttribute("aria-checked") === "true" || element.hasAttribute("checked");
      field.value = isChecked.toString();
      field.metadata = {
        framework: "vanilla",
        visibility: { isVisible: true },
        checkboxValue: element.getAttribute("value") || "on",
        isExclusive: element.hasAttribute("data-exclusive") || element.closest("[role='radiogroup']") !== null,
        groupName: element.getAttribute("data-group") || element.getAttribute("name") || undefined,
      };
    }

    // Set default test value if in test mode
    if (testMode && !field.testValue) {
      field.testValue = "true";
    }

    fields.push(field);
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
        const labelContainer = findRadioLabelContainer(el);
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

    // Set test value
    if (testMode && field.options.length > 0) {
      // Skip "Select" or placeholder options
      const validOptions = field.options.filter(
        opt =>
          !opt.text.toLowerCase().includes("select") &&
          !opt.text.includes("--") &&
          !opt.text.toLowerCase().includes("choose"),
      );

      if (validOptions.length > 0) {
        field.testValue = validOptions[0].value;
      }
    }

    // Mark all elements in this group with the field ID
    groupElements.forEach(el => {
      el.setAttribute("data-filliny-id", field.id);
      const container = findRadioLabelContainer(el);
      if (container) container.setAttribute("data-filliny-id", field.id);
    });

    fields.push(field);
    processedGroups.add(groupName);
    index++;
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
 * Check if an element looks like a label
 */
const isLabelLike = (element: Element): boolean => {
  if (!(element instanceof HTMLElement)) return false;

  const tagName = element.tagName.toLowerCase();
  if (["label", "span", "div", "p"].includes(tagName)) {
    const text = element.textContent?.trim() || "";
    return text.length > 0 && text.length < 100 && !/^[0-9.,$€£%]+$/.test(text);
  }

  return false;
};
