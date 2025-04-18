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

    // Detect if the element is part of a framework component
    const isReactComponent = Object.keys(element).some(
      key => key.startsWith("__react") || key.startsWith("_reactProps"),
    );
    const isAngularComponent =
      element.hasAttribute("ng-model") ||
      element.hasAttribute("[(ngModel)]") ||
      element.hasAttribute("formControlName");
    const isVueComponent = element.hasAttribute("v-model") || element.hasAttribute("data-v-");

    // Handle native HTML input elements
    if (element instanceof HTMLInputElement) {
      // Special case for radio buttons, value might be the value attribute
      if (element.type === "radio" && typeof value === "string" && value !== "true" && value !== "false") {
        shouldCheck = element.value === value;
      }

      // Set checked state
      element.checked = shouldCheck;
      element.setAttribute("checked", shouldCheck ? "checked" : "");

      // Trigger events in correct sequence for framework detection
      if (isReactComponent) {
        // React needs specific event sequence
        // Create custom events with bubbles option
        const inputEvent = new Event("input", { bubbles: true });
        const changeEvent = new Event("change", { bubbles: true });
        element.dispatchEvent(inputEvent);
        element.dispatchEvent(changeEvent);
        // React often uses SyntheticEvents, dispatch native events as fallback
        element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      } else if (isAngularComponent) {
        // Angular often uses zone.js for change detection
        const changeEvent = new Event("change", { bubbles: true });
        element.dispatchEvent(changeEvent);
        // Trigger blur to ensure ngModelChange fires in Angular
        const blurEvent = new Event("blur", { bubbles: true });
        element.dispatchEvent(blurEvent);
      } else if (isVueComponent) {
        // Vue relies heavily on input events
        const inputEvent = new Event("input", { bubbles: true });
        const changeEvent = new Event("change", { bubbles: true });
        element.dispatchEvent(inputEvent);
        element.dispatchEvent(changeEvent);
      } else {
        // Standard sequence for vanilla JS
        dispatchEvent(element, "click");
        dispatchEvent(element, "change");
      }

      // For radios, ensure only one in group is checked using various strategies to find related radios
      if (element.type === "radio" && shouldCheck) {
        // Start with the most specific way to get related radios and move to more general approaches
        let groupRadios: NodeListOf<Element> | HTMLInputElement[] | null = null;
        let radioGroup: Element | null = null;

        // Strategy 1: Use the name attribute - most reliable if present
        if (element.name) {
          // Look in different contexts (form first, then document)
          if (element.form) {
            groupRadios = element.form.querySelectorAll(`input[type="radio"][name="${element.name}"]`);
          } else {
            // If no form, try document - with specific safety to avoid cross-form conflicts
            const allRadios = Array.from(document.querySelectorAll(`input[type="radio"][name="${element.name}"]`));
            groupRadios = allRadios.filter(radio => {
              const radioForm = (radio as HTMLInputElement).form;
              return !radioForm || radioForm === element.form;
            }) as HTMLInputElement[];
          }
        }

        // Strategy 2: If no name, look for a common container with role="radiogroup" or similar patterns
        if (!groupRadios || groupRadios.length <= 1) {
          radioGroup = element.closest(
            '[role="radiogroup"], fieldset, [class*="radio-group"], [class*="radio_group"], [class*="radioGroup"]',
          );
          if (radioGroup) {
            groupRadios = radioGroup.querySelectorAll('input[type="radio"]');
          }
        }

        // Strategy 3: Find radios in the closest form or fieldset
        if (!groupRadios || groupRadios.length <= 1) {
          const container = element.closest("form, fieldset");
          if (container) {
            // Try to find radios with similar data attributes or classes
            const inputClass = Array.from(element.classList).find(
              c => c.includes("radio") || c.includes("option") || c.includes("input"),
            );

            if (inputClass) {
              groupRadios = container.querySelectorAll(`input[type="radio"].${inputClass}`);
            } else {
              // Last resort: check if there are nearby radio buttons in the same container
              const allRadios = Array.from(container.querySelectorAll('input[type="radio"]'));
              const elementRect = element.getBoundingClientRect();

              // Filter to those that appear to be in the same group (nearby in the DOM and visually)
              groupRadios = allRadios.filter(radio => {
                if (radio === element) return true;

                // Check DOM proximity (less than 5 siblings away)
                let domDistance = 0;
                let current = radio;
                while (current && current !== element && domDistance < 5) {
                  current = current.nextElementSibling as HTMLElement;
                  domDistance++;
                }

                if (domDistance < 5) return true;

                // Check visual proximity
                const radioRect = radio.getBoundingClientRect();
                const verticallyAligned = Math.abs(elementRect.left - radioRect.left) < 50;
                const horizontallyAligned = Math.abs(elementRect.top - radioRect.top) < 50;
                const sameColumn = verticallyAligned && Math.abs(elementRect.top - radioRect.top) < 200;
                const sameRow = horizontallyAligned && Math.abs(elementRect.left - radioRect.left) < 200;

                return sameColumn || sameRow;
              }) as HTMLInputElement[];
            }
          }
        }

        // If we found radios, uncheck all others in the group
        if (groupRadios && groupRadios.length > 1) {
          groupRadios.forEach(radio => {
            if (radio instanceof HTMLInputElement && radio !== element) {
              radio.checked = false;
              radio.removeAttribute("checked");

              // Fire change event on the unselected radios too for framework detection
              dispatchEvent(radio as HTMLElement, "change");
            }
          });
        }
      }
    } else if (element.getAttribute("role") === "checkbox" || element.getAttribute("role") === "switch") {
      // Handle ARIA role checkbox/switch elements
      element.setAttribute("aria-checked", shouldCheck ? "true" : "false");

      // Toggle active/checked classes used by various frameworks
      if (shouldCheck) {
        element.classList.add("checked", "active", "selected");
      } else {
        element.classList.remove("checked", "active", "selected");
      }

      // Fire appropriate events
      dispatchEvent(element, "click");
      dispatchEvent(element, "change");

      // Look for and update any hidden inputs
      const hiddenInput =
        element.querySelector('input[type="hidden"]') ||
        document.querySelector(`input[type="hidden"][data-id="${element.id}"]`);
      if (hiddenInput instanceof HTMLInputElement) {
        hiddenInput.value = shouldCheck ? "true" : "false";
        dispatchEvent(hiddenInput, "change");
      }
    } else if (element.getAttribute("role") === "radio") {
      // Handle ARIA role radio elements
      element.setAttribute("aria-checked", shouldCheck ? "true" : "false");

      if (shouldCheck) {
        element.classList.add("checked", "active", "selected");

        // Find and uncheck other radio buttons in the same group using multiple strategies
        // Strategy 1: Standard radiogroup container
        let groupContainer = element.closest('[role="radiogroup"]');

        // Strategy 2: Look for common containers if no explicit radiogroup
        if (!groupContainer) {
          groupContainer = element.closest(
            'fieldset, [class*="radio-group"], [class*="radio_group"], [class*="radioGroup"], ul, ol, div[class*="options"]',
          );
        }

        // Strategy 3: Look for parent with multiple radio children
        if (!groupContainer) {
          let current = element.parentElement;
          while (current && current !== document.body) {
            const childRadios = current.querySelectorAll('[role="radio"]');
            if (childRadios.length > 1) {
              groupContainer = current;
              break;
            }
            current = current.parentElement;
          }
        }

        if (groupContainer) {
          groupContainer.querySelectorAll('[role="radio"]').forEach(radio => {
            if (radio !== element) {
              radio.setAttribute("aria-checked", "false");
              radio.classList.remove("checked", "active", "selected");

              // Dispatch events on unselected radio elements too
              dispatchEvent(radio as HTMLElement, "change");
            }
          });
        }
      }

      // Trigger appropriate events
      dispatchEvent(element, "click");
      dispatchEvent(element, "change");
    } else {
      // Handle standard checkable elements as fallback
      if (shouldCheck) {
        element.classList.add("checked", "active", "selected");
      } else {
        element.classList.remove("checked", "active", "selected");
      }

      // Try to find any hidden input that might store the value
      const nearbyInputs = Array.from(
        element.querySelectorAll('input[type="hidden"], input[type="checkbox"], input[type="radio"]'),
      );
      if (nearbyInputs.length > 0) {
        nearbyInputs.forEach(input => {
          if (input instanceof HTMLInputElement) {
            if (input.type === "checkbox" || input.type === "radio") {
              input.checked = shouldCheck;
            } else {
              input.value = shouldCheck ? "true" : "false";
            }
            dispatchEvent(input, "change");
          }
        });
      }

      // Trigger events on the main element too
      dispatchEvent(element, "click");
      dispatchEvent(element, "change");
    }

    // Handle Material-UI checkbox/radio components
    if (
      element.classList.contains("MuiCheckbox-root") ||
      element.classList.contains("MuiRadio-root") ||
      element.closest(".MuiCheckbox-root") ||
      element.closest(".MuiRadio-root")
    ) {
      const iconButton = element.querySelector(".MuiIconButton-root") || element.closest(".MuiIconButton-root");
      if (iconButton instanceof HTMLElement) {
        iconButton.click();
      }
    }

    // Handle Bootstrap custom checkboxes
    if (element.classList.contains("custom-control-input") || element.classList.contains("form-check-input")) {
      // Bootstrap custom checkboxes need the change event
      const changeEvent = new Event("change", { bubbles: true });
      element.dispatchEvent(changeEvent);
    }

    // Special handling for Salesforce Lightning components
    if (element.classList.contains("slds-checkbox") || element.classList.contains("slds-radio")) {
      const input = element.querySelector("input");
      if (input instanceof HTMLInputElement) {
        input.checked = shouldCheck;
        const changeEvent = new Event("change", { bubbles: true });
        input.dispatchEvent(changeEvent);
      }
    }

    // Handle popular form library components
    // Semantic UI
    if (
      element.classList.contains("ui") &&
      (element.classList.contains("checkbox") || element.classList.contains("radio"))
    ) {
      const input = element.querySelector("input");
      if (input) {
        const event = new Event("change", { bubbles: true });
        input.dispatchEvent(event);
      }
    }

    // Ant Design
    if (element.classList.contains("ant-checkbox") || element.classList.contains("ant-radio")) {
      const input = element.querySelector("input");
      if (input) {
        input.checked = shouldCheck;
        const event = new Event("change", { bubbles: true });
        input.dispatchEvent(event);
      }
    }
  } catch (error) {
    console.error("Error updating checkable input:", error);
  }
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
    fields.push(field);
    fieldIndex++;
  }

  // Process aria-based checkboxes
  for (const element of ariaCheckables) {
    const isChecked = element.getAttribute("aria-checked") === "true";
    const field = (await createBaseField(element, baseIndex + fieldIndex, "checkbox", testMode)) as CheckableField;

    field.checked = isChecked;
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

        // Set test value to first option value
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

          field.testValue = femaleValue || values[0];
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

    // Set test value to first option value
    if (testMode && values.length > 0) {
      field.testValue = values[0];
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
