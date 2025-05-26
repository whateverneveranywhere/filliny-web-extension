import type { Field } from "@extension/shared";
import { updateSelect } from "./field-types/select";
import { updateCheckable, isValueChecked, matchesCheckboxValue } from "./field-types/checkable";
import { updateFileInput } from "./field-types/file";
import { updateTextField, updateContentEditable } from "./field-types/text";
import { addVisualFeedback, getStringValue } from "./field-types/utils";

// Core utilities for field updates
// ----------------------------------------

// Main field updating function
// ----------------------------------------

/**
 * Update a form field with the provided value
 * This is the main entry point for field updates
 */
const updateField = async (element: HTMLElement, field: Field, isTestMode = false): Promise<void> => {
  try {
    // Skip elements that shouldn't be updated
    if (
      element.hasAttribute("disabled") ||
      element.hasAttribute("readonly") ||
      element.getAttribute("aria-readonly") === "true"
    ) {
      return;
    }

    // Add visual feedback
    addVisualFeedback(element);

    // Get the value to use - ensure it's never undefined
    const valueToUse =
      isTestMode && field.testValue !== undefined ? field.testValue : field.value !== undefined ? field.value : "";

    // Special handling for test mode - mark the field visually
    if (isTestMode) {
      // Add a test mode indicator
      element.setAttribute("data-filliny-test-mode", "true");

      // Store the value used for testing in a data attribute for debugging
      element.setAttribute("data-filliny-test-value", getStringValue(valueToUse));
    }

    // Handle each element type
    if (element instanceof HTMLInputElement) {
      switch (element.type) {
        case "checkbox": {
          console.log(`Processing checkbox ${element.id || element.name || "unnamed"} with value:`, valueToUse);

          // Get checkbox value from metadata if available
          let isChecked = false;

          if (field.metadata && "checkboxValue" in field.metadata) {
            // Check if the valueToUse matches the checkboxValue
            const checkboxValue = field.metadata.checkboxValue as string;
            console.log(`Checkbox has metadata value: ${checkboxValue}, comparing with:`, valueToUse);

            if (typeof valueToUse === "boolean") {
              isChecked = valueToUse;
            } else if (typeof valueToUse === "string") {
              // Use the improved matching logic for checkbox values
              isChecked = matchesCheckboxValue(checkboxValue, valueToUse);
            } else if (Array.isArray(valueToUse)) {
              // If array of values, check if this checkbox's value is in the array
              isChecked = valueToUse.some(v => v === checkboxValue);
            }
          } else {
            // Use the more robust value checking function
            isChecked = isValueChecked(valueToUse);
          }

          // In test mode, check the checkbox by default unless explicitly set to false
          if (isTestMode && (valueToUse === undefined || valueToUse === "")) {
            console.log("Test mode with no explicit value, checking the checkbox by default");
            isChecked = true;
          }

          updateCheckable(element, isChecked);
          break;
        }
        case "radio": {
          console.log(`Processing radio ${element.id || element.name || "unnamed"} with value:`, valueToUse);

          // For radio buttons, we need to check if this specific radio should be selected
          let isSelected = false;

          // Check if this specific radio button's value matches the desired value
          if (typeof valueToUse === "string") {
            isSelected = element.value === valueToUse;
          } else if (typeof valueToUse === "boolean") {
            // If boolean, select this radio if it's the value of 'true' and we want true
            isSelected = valueToUse && (element.value === "true" || element.value === "1" || element.value === "yes");
          }

          // Special case for fields with options
          if (field.options && field.options.length > 0) {
            // Find if this radio button's value is in one of the selected options
            isSelected = field.options.some(option => option.selected && option.value === element.value);
          }

          updateCheckable(element, isSelected);
          break;
        }
        case "file": {
          console.log(`Processing file input ${element.id || element.name || "unnamed"}`);
          // Handle file inputs specially - cast valueToUse appropriately
          const fileValue =
            typeof valueToUse === "string" || Array.isArray(valueToUse) ? valueToUse : String(valueToUse);
          await updateFileInput(element, fileValue);
          break;
        }
        // Use the new updateTextField function for all text-like inputs
        case "text":
        case "email":
        case "url":
        case "search":
        case "tel":
        case "password":
        case "number":
        case "date":
        case "datetime-local":
        case "month":
        case "week":
        case "time":
        case "color":
        case "range": {
          console.log(`Processing text-like input ${element.id || element.name || "unnamed"}`);
          await updateTextField(element, getStringValue(valueToUse));
          break;
        }
        default: {
          console.log(`Handling default case for input type: ${element.type}`);
          if (element.type !== "submit" && element.type !== "reset" && element.type !== "button") {
            await updateTextField(element, getStringValue(valueToUse));
          }
          break;
        }
      }
    } else if (element instanceof HTMLSelectElement) {
      console.log(`Processing select ${element.id || element.name || "unnamed"}`);
      // Ensure we pass a non-undefined value to updateSelect
      const selectValue = valueToUse !== undefined ? valueToUse : "";
      updateSelect(element, selectValue);
    } else if (element instanceof HTMLTextAreaElement) {
      console.log(`Processing textarea ${element.id || element.name || "unnamed"}`);
      await updateTextField(element, getStringValue(valueToUse));
    } else if (element instanceof HTMLButtonElement) {
      if (element.type !== "submit" && element.type !== "reset") {
        element.textContent = getStringValue(valueToUse);
      }
    } else if (element.hasAttribute("contenteditable")) {
      console.log(`Processing contentEditable element ${element.id || "unnamed"}`);
      await updateContentEditable(element, getStringValue(valueToUse));
    } else if (element.hasAttribute("role")) {
      // Handle ARIA role elements
      const role = element.getAttribute("role");
      if (role === "checkbox" || role === "switch") {
        const isChecked =
          typeof valueToUse === "boolean"
            ? valueToUse
            : ["true", "yes", "on", "1"].includes(String(valueToUse).toLowerCase());
        updateCheckable(element, isChecked);
      } else if (role === "radio") {
        const isChecked =
          typeof valueToUse === "boolean"
            ? valueToUse
            : ["true", "yes", "on", "1"].includes(String(valueToUse).toLowerCase());
        // Find other radios in the same group and uncheck them
        const group = element.closest('[role="radiogroup"]');
        if (group) {
          group.querySelectorAll('[role="radio"]').forEach(radio => {
            if (radio !== element) {
              radio.setAttribute("aria-checked", "false");
            }
          });
        }
        updateCheckable(element, isChecked);
      } else if (role === "textbox" || role === "searchbox") {
        console.log(`Processing role=${role} element ${element.id || "unnamed"}`);
        await updateTextField(element, getStringValue(valueToUse));
      }
    }
  } catch (error) {
    console.error(`Error updating field ${field.id}:`, error);
  }
};

// Form update API
// ----------------------------------------

/**
 * Update multiple form fields with their values
 */
export const updateFormFields = async (fields: Field[], testMode = false): Promise<void> => {
  // Helper function to find a common parent for radio buttons that might be part of a group
  function findRadioGroupContainer(element: HTMLElement): HTMLElement | null {
    // Look for common container patterns
    const radioGroup = element.closest('[role="radiogroup"], fieldset, [class*="radio-group"], [class*="radio_group"]');
    if (radioGroup) return radioGroup as HTMLElement;

    // Look for siblings with the same classes/patterns that might indicate a radio group
    let currentElement = element.parentElement;
    let searchDepth = 0;
    const maxDepth = 3; // Don't go too far up the tree

    while (currentElement && searchDepth < maxDepth) {
      // Look for other radio inputs
      const radioInputs = Array.from(currentElement.querySelectorAll('input[type="radio"]'));
      if (radioInputs.length > 1) {
        // If we found multiple radio inputs in this container, it's likely a group
        return currentElement;
      }

      // Check for common class patterns that indicate a radio group
      const classNames = currentElement.className.toLowerCase();
      if (
        classNames.includes("radio") ||
        classNames.includes("option") ||
        classNames.includes("toggle") ||
        classNames.includes("choice")
      ) {
        return currentElement;
      }

      currentElement = currentElement.parentElement;
      searchDepth++;
    }

    return null;
  }

  console.log(`Updating ${fields.length} form fields (testMode: ${testMode})`);
  const startTime = performance.now();

  try {
    // Initialize structures to track processed fields and groups
    const processedFields = new Set<string>();
    const selectFieldIds = new Set<string>();
    const radioGroups = new Map<string, Field[]>();
    const checkboxGroups = new Map<string, Field[]>();

    // Track unnamed radio inputs that might be part of a group
    const potentialRadioGroups = new Map<string, HTMLElement[]>();

    // First pass: identify select fields and group radio/checkbox fields
    console.log("First pass: identifying field types and grouping related fields");
    for (const field of fields) {
      const element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
      if (!element) continue;

      if (element instanceof HTMLSelectElement) {
        selectFieldIds.add(field.id);
      } else if (element instanceof HTMLInputElement && element.type === "radio") {
        // Group radio fields by name (standard approach)
        if (element.name) {
          const groupKey = element.name;
          if (!radioGroups.has(groupKey)) {
            radioGroups.set(groupKey, []);
          }
          radioGroups.get(groupKey)?.push(field);
        } else {
          // Handle unnamed radio inputs by finding a common parent container
          const commonContainer = findRadioGroupContainer(element);
          if (commonContainer) {
            const containerId = commonContainer.id || `radio-container-${commonContainer.tagName}-${Date.now()}`;
            if (!potentialRadioGroups.has(containerId)) {
              potentialRadioGroups.set(containerId, []);
            }
            potentialRadioGroups.get(containerId)?.push(element);
          }
        }
      } else if (element instanceof HTMLInputElement && element.type === "checkbox") {
        // Group checkboxes by name
        const groupKey = element.name || (field.metadata?.groupName as string) || `checkbox-${field.label}`;
        if (groupKey) {
          if (!checkboxGroups.has(groupKey)) {
            checkboxGroups.set(groupKey, []);
          }
          checkboxGroups.get(groupKey)?.push(field);
        }
      }
    }

    // Process potential radio groups (those without proper name attribute)
    console.log(`Found ${potentialRadioGroups.size} potential radio groups without proper name attributes`);
    for (const [containerId, radioElements] of potentialRadioGroups.entries()) {
      if (radioElements.length > 1) {
        // These likely belong to the same group - find their fields
        const radioFields = radioElements
          .map(el => {
            const fieldId = el.getAttribute("data-filliny-id");
            return fields.find(f => f.id === fieldId);
          })
          .filter((f): f is Field => !!f);

        if (radioFields.length > 1) {
          console.log(`Created unnamed radio group with ${radioFields.length} elements in container ${containerId}`);
          radioGroups.set(`unnamed-group-${containerId}`, radioFields);
        }
      }
    }

    // Process radio groups
    console.log(`Processing ${radioGroups.size} radio groups and ${checkboxGroups.size} checkbox groups`);
    for (const [groupName, groupFields] of radioGroups.entries()) {
      // Flag to track if we've found a field to update
      let foundFieldToUpdate = false;

      // First try to find a field with a non-empty value
      for (const field of groupFields) {
        if (processedFields.has(field.id)) continue;

        const element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
        if (!element) continue;

        // In test mode, use testValue if available
        const fieldValue = testMode && field.testValue !== undefined ? field.testValue : field.value;

        if (fieldValue && fieldValue !== "false" && fieldValue !== "0") {
          console.log(`Selecting radio field ${field.id} in group ${groupName} with value ${fieldValue}`);
          await updateCheckable(element, true);
          groupFields.forEach(f => processedFields.add(f.id));
          foundFieldToUpdate = true;
          break;
        }
      }

      // If no field had a value and we're in test mode, select the first radio
      if (!foundFieldToUpdate && testMode) {
        // Find the first radio button that isn't a placeholder
        for (const field of groupFields) {
          if (processedFields.has(field.id)) continue;

          const element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
          if (!element) continue;

          // Skip common placeholder options
          const label = field.label?.toLowerCase() || "";
          if (label.includes("select") || label.includes("choose") || label === "none" || label === "") {
            continue;
          }

          console.log(`Test mode: Selecting first non-placeholder radio in group ${groupName}: ${field.id}`);
          await updateCheckable(element, true);
          groupFields.forEach(f => processedFields.add(f.id));
          foundFieldToUpdate = true;
          break;
        }

        // If all options looked like placeholders, just pick the first one
        if (!foundFieldToUpdate && groupFields.length > 0) {
          const firstField = groupFields[0];
          const element = document.querySelector<HTMLElement>(`[data-filliny-id="${firstField.id}"]`);
          if (element) {
            console.log(`Test mode: Selecting first radio in group ${groupName} as fallback: ${firstField.id}`);
            await updateCheckable(element, true);
            groupFields.forEach(f => processedFields.add(f.id));
          }
        }
      }
    }

    // Process checkbox groups
    for (const [groupName, groupFields] of checkboxGroups.entries()) {
      // In test mode, check a subset of checkboxes
      if (testMode) {
        // Select up to 2 checkboxes in test mode if they're part of a group
        const fieldsToCheck = groupFields.slice(0, Math.min(2, groupFields.length));
        for (const field of fieldsToCheck) {
          const element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
          if (!element || processedFields.has(field.id)) continue;

          console.log(`Test mode: Checking checkbox ${field.id} in group ${groupName}`);
          await updateCheckable(element, true);
          processedFields.add(field.id);
        }
      } else {
        // Otherwise, use the specified values
        for (const field of groupFields) {
          if (processedFields.has(field.id)) continue;

          const element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
          if (!element) continue;

          const fieldValue = testMode && field.testValue !== undefined ? field.testValue : field.value;
          const shouldBeChecked = fieldValue === "true" || fieldValue === "1" || fieldValue === "yes";

          console.log(`Setting checkbox ${field.id} in group ${groupName} to ${shouldBeChecked}`);
          await updateCheckable(element, shouldBeChecked);
          processedFields.add(field.id);
        }
      }
    }

    // Process remaining fields
    console.log("Processing remaining fields");

    // First process select fields (visible ones first, then hidden)
    for (const field of fields) {
      if (!field.id || processedFields.has(field.id) || !selectFieldIds.has(field.id)) continue;

      const allElements = document.querySelectorAll<HTMLElement>(`[data-filliny-id="${field.id}"]`);
      if (allElements.length === 0) continue;

      // Sort elements - process visible ones first
      const sortedElements = Array.from(allElements).sort((a, b) => {
        const aHidden = a.classList.contains("hide-at-sm-block") || getComputedStyle(a).display === "none";
        const bHidden = b.classList.contains("hide-at-sm-block") || getComputedStyle(b).display === "none";
        return aHidden === bHidden ? 0 : aHidden ? 1 : -1;
      });

      console.log(`Processing select field ${field.id} with ${sortedElements.length} elements`);
      const fieldValue = testMode && field.testValue !== undefined ? field.testValue : field.value;

      // Process all elements with this ID
      for (const element of sortedElements) {
        if (element instanceof HTMLSelectElement) {
          updateSelect(element, fieldValue || "");
        } else {
          await updateField(element, field, testMode);
        }
      }

      processedFields.add(field.id);
    }

    // Then process all remaining fields
    for (const field of fields) {
      if (!field.id || processedFields.has(field.id)) continue;

      const element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
      if (!element) continue;

      console.log(`Processing field: ${field.id}, type: ${field.type}`);
      await updateField(element, field, testMode);
      processedFields.add(field.id);
    }

    console.log(
      `%c⏱ Form filling took: ${((performance.now() - startTime) / 1000).toFixed(2)}s`,
      "background: #0284c7; color: white; padding: 4px 8px; border-radius: 4px; font-size: 14px;",
    );
  } catch (error) {
    console.error("Error in updateFormFields:", error);
  }
};

/**
 * Process streaming response chunks
 */
export const processChunks = async (text: string, originalFields: Field[], previousPartial = ""): Promise<string> => {
  try {
    // Combine with any previous partial data
    const combinedText = previousPartial + text;
    const lines = combinedText.split("\n");

    // The last line might be incomplete, so save it for the next chunk
    let partial = "";
    if (combinedText[combinedText.length - 1] !== "\n") {
      partial = lines.pop() || "";
    }

    // Process each complete JSON line
    const fieldsToUpdate: Field[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const jsonResponse = JSON.parse(line);
        if (jsonResponse?.data?.length) {
          // Merge with original fields to maintain metadata
          const mergedFields = jsonResponse.data.map((updatedField: Field) => {
            const originalField = originalFields.find(f => f.id === updatedField.id);
            return originalField ? { ...originalField, ...updatedField } : updatedField;
          });

          fieldsToUpdate.push(...mergedFields);
        }
      } catch (e) {
        console.warn("Failed to parse JSON line:", e);
      }
    }

    // Update fields if we have any
    if (fieldsToUpdate.length > 0) {
      await updateFormFields(fieldsToUpdate);
    }

    return partial;
  } catch (error) {
    console.error("Error processing chunks:", error);
    return previousPartial;
  }
};

/**
 * Process a stream response
 */
export const processStreamResponse = async (response: ReadableStream, originalFields: Field[]): Promise<void> => {
  try {
    const reader = response.getReader();
    const decoder = new TextDecoder();
    let remainder = "";

    const processText = async (result: ReadableStreamReadResult<Uint8Array>): Promise<void> => {
      if (result.done) {
        // Process any remaining text
        if (remainder) {
          await processChunks("\n", originalFields, remainder);
        }
        return;
      }

      const chunkText = decoder.decode(result.value, { stream: true });
      remainder = await processChunks(chunkText, originalFields, remainder);

      // Continue reading
      await reader.read().then(processText);
    };

    await reader.read().then(processText);
  } catch (error) {
    console.error("Error processing stream response:", error);
  }
};
