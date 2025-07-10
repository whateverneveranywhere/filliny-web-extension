import { updateCheckable, isValueChecked, matchesCheckboxValue } from "./field-types/checkable";
import { updateFileInput } from "./field-types/file";
import { updateSelect } from "./field-types/select";
import { updateTextField, updateContentEditable } from "./field-types/text";
import { addVisualFeedback, getStringValue } from "./field-types/utils";
import { unifiedFieldRegistry } from "./unifiedFieldDetection.js";
import type { Field } from "@extension/shared";

// Core utilities for field updates
// ----------------------------------------

/**
 * Enhanced field update with retry mechanism and better error handling
 */
const updateFieldWithRetry = async (
  element: HTMLElement,
  field: Field,
  isTestMode: boolean,
  maxRetries: number = 3,
): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await updateField(element, field, isTestMode);

      // Verify the update was successful
      if (await verifyFieldUpdate(element, field, isTestMode)) {
        return true;
      }

      if (attempt < maxRetries) {
        console.log(`Field update verification failed for ${field.id}, retrying (attempt ${attempt}/${maxRetries})`);
        // Brief delay before retry
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
      }
    } catch (error) {
      console.error(`Error updating field ${field.id} (attempt ${attempt}/${maxRetries}):`, error);
      if (attempt === maxRetries) {
        throw error;
      }
      // Brief delay before retry
      await new Promise(resolve => setTimeout(resolve, 100 * attempt));
    }
  }

  return false;
};

/**
 * Verify that a field update was successful
 */
const verifyFieldUpdate = async (element: HTMLElement, field: Field, isTestMode: boolean): Promise<boolean> => {
  const expectedValue = isTestMode && field.testValue !== undefined ? field.testValue : field.value;

  try {
    if (element instanceof HTMLInputElement) {
      switch (element.type) {
        case "checkbox":
        case "radio": {
          // For checkable fields, verify the checked state
          const expectedChecked = isValueChecked(expectedValue);
          return element.checked === expectedChecked;
        }

        case "file":
          // File inputs can't be programmatically set, so just check for our marker
          return element.hasAttribute("data-filliny-file") || element.hasAttribute("data-filliny-files");

        default:
          // For text-like inputs, check if value matches
          return element.value === String(expectedValue || "");
      }
    } else if (element instanceof HTMLSelectElement) {
      if (Array.isArray(expectedValue)) {
        // Multi-select
        const selectedValues = Array.from(element.selectedOptions).map(opt => opt.value);
        return expectedValue.every(val => selectedValues.includes(String(val)));
      } else {
        return element.value === String(expectedValue || "");
      }
    } else if (element instanceof HTMLTextAreaElement) {
      return element.value === String(expectedValue || "");
    } else if (element.isContentEditable) {
      return element.textContent === String(expectedValue || "");
    } else if (element.getAttribute("role") === "checkbox" || element.getAttribute("role") === "switch") {
      const expectedChecked = isValueChecked(expectedValue);
      return element.getAttribute("aria-checked") === String(expectedChecked);
    }

    // For other elements, assume success if no error was thrown
    return true;
  } catch (error) {
    console.error("Error verifying field update:", error);
    return false;
  }
};

// Main field updating function
// ----------------------------------------

/**
 * Update a form field with the provided value
 * This is the main entry point for field updates
 */
export const updateField = async (element: HTMLElement, field: Field, isTestMode = false): Promise<void> => {
  // Defensive programming: validate inputs
  if (!element || !field) {
    console.warn("updateField: Invalid element or field provided");
    return;
  }

  try {
    // Skip elements that shouldn't be updated
    if (
      element.hasAttribute("disabled") ||
      element.hasAttribute("readonly") ||
      element.getAttribute("aria-readonly") === "true"
    ) {
      console.log(`Skipping disabled/readonly field: ${field.id}`);
      return;
    }

    // Add visual feedback with error handling
    try {
      addVisualFeedback(element);
    } catch (visualError) {
      console.debug("Error adding visual feedback:", visualError);
    }

    // Get the value to use - ensure it's never undefined
    const valueToUse =
      isTestMode && field.testValue !== undefined ? field.testValue : field.value !== undefined ? field.value : "";

    console.log(`Updating field ${field.id} (${field.type}) with value:`, valueToUse);

    // Special handling for test mode - mark the field visually
    if (isTestMode) {
      try {
        // Add a test mode indicator
        element.setAttribute("data-filliny-test-mode", "true");

        // Store the value used for testing in a data attribute for debugging
        element.setAttribute("data-filliny-test-value", getStringValue(valueToUse));
      } catch (testModeError) {
        console.debug("Error setting test mode attributes:", testModeError);
      }
    }

    // Handle each element type with enhanced error handling
    if (element instanceof HTMLInputElement) {
      await updateInputElement(element, field, valueToUse, isTestMode);
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
      await updateAriaElement(element, field, valueToUse);
    } else {
      console.warn(`Unknown element type for field ${field.id}:`, element.tagName);
    }
  } catch (error) {
    console.error(`Error updating field ${field.id}:`, error);
    throw error; // Re-throw to allow retry mechanism to handle it
  }
};

/**
 * Update HTML input elements with enhanced type handling
 */
const updateInputElement = async (
  element: HTMLInputElement,
  field: Field,
  valueToUse: unknown,
  isTestMode: boolean,
): Promise<void> => {
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
          isChecked = valueToUse.some(v => String(v) === checkboxValue);
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

      console.log(`Setting checkbox checked state to: ${isChecked}`);
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
        console.log(
          `Radio value match check: element.value="${element.value}" === valueToUse="${valueToUse}" = ${isSelected}`,
        );
      } else if (typeof valueToUse === "boolean") {
        // If boolean, select this radio if it's the value of 'true' and we want true
        isSelected = valueToUse && (element.value === "true" || element.value === "1" || element.value === "yes");
      }

      // In test mode, if no specific match and this is the first radio in group, select it
      if (!isSelected && isTestMode && element instanceof HTMLInputElement) {
        const radioGroup = document.querySelectorAll<HTMLInputElement>(`input[name="${element.name}"][type="radio"]`);
        const isFirstRadio = radioGroup.length > 0 && radioGroup[0] === element;
        if (isFirstRadio) {
          isSelected = true;
          console.log(`Test mode: Selecting first radio in group ${element.name}`);
        }
      }

      console.log(`Setting radio selected state to: ${isSelected}`);
      updateCheckable(element, isSelected);

      // If this radio is selected, uncheck others in the same group
      if (isSelected && element instanceof HTMLInputElement) {
        const radioGroup = document.querySelectorAll<HTMLInputElement>(`input[name="${element.name}"][type="radio"]`);
        radioGroup.forEach(radio => {
          if (radio !== element) {
            updateCheckable(radio, false);
          }
        });
      }

      break;
    }
    case "file": {
      console.log(`Processing file input ${element.id || element.name || "unnamed"}`);
      // Handle file inputs specially - cast valueToUse appropriately
      const fileValue = typeof valueToUse === "string" || Array.isArray(valueToUse) ? valueToUse : String(valueToUse);
      // Determine if we're in AI mode by checking if the value looks like a URL
      const isAiMode =
        (typeof fileValue === "string" && (fileValue.startsWith("http://") || fileValue.startsWith("https://"))) ||
        (Array.isArray(fileValue) && fileValue.some(val => val.startsWith("http://") || val.startsWith("https://")));
      await updateFileInput(element, fileValue, isTestMode, isAiMode, field.metadata);
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
      console.log(`Processing text-like input ${element.id || element.name || "unnamed"} (${element.type})`);
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
};

/**
 * Update ARIA elements (role-based elements)
 */
const updateAriaElement = async (element: HTMLElement, field: Field, valueToUse: unknown): Promise<void> => {
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
  } else if (role === "combobox" || role === "listbox") {
    console.log(`Processing role=${role} element ${element.id || "unnamed"}`);
    updateSelect(element, valueToUse);
  } else {
    console.warn(`Unknown ARIA role for field ${field.id}: ${role}`);
  }
};

// Form update API
// ----------------------------------------

/**
 * Update multiple form fields with their values
 */
export const updateFormFields = async (fields: Field[], testMode = false): Promise<void> => {
  document.body.setAttribute("data-filliny-updating", "true");
  console.log(`Updating ${fields.length} form fields (testMode: ${testMode})`);
  const startTime = performance.now();

  const results = {
    successful: 0,
    failed: 0,
    skipped: 0,
  };

  try {
    // Process fields in order, handling groups specially
    for (const field of fields) {
      try {
        const success = await updateFieldWithGroupHandling(field, testMode);
        if (success) {
          results.successful++;
        } else {
          results.failed++;
        }
      } catch (error) {
        console.error(`Failed to update field ${field.id}:`, error);
        results.failed++;
      }
    }

    console.log(
      `%c⏱ Form filling completed: ${((performance.now() - startTime) / 1000).toFixed(2)}s`,
      "background: #0284c7; color: white; padding: 4px 8px; border-radius: 4px; font-size: 14px;",
    );

    console.log(`Results: ${results.successful} successful, ${results.failed} failed, ${results.skipped} skipped`);
  } catch (error) {
    console.error("Error in updateFormFields:", error);
    throw error;
  } finally {
    setTimeout(() => document.body.removeAttribute("data-filliny-updating"), 100);
  }
};

/**
 * Update a field, handling radio/checkbox groups appropriately
 */
const updateFieldWithGroupHandling = async (field: Field, testMode: boolean): Promise<boolean> => {
  try {
    // Get the original field info and element from the registry
    const originalFieldInfo = unifiedFieldRegistry.getField(field.id);

    if (!originalFieldInfo?.element) {
      console.warn(`❌ Element not found in registry for field ${field.id}. Attempting DOM query.`);
      const element = document.querySelector(`[data-filliny-id="${field.id}"]`) as HTMLElement;
      if (element) {
        return await updateFieldWithRetry(element, field, testMode);
      }
      console.warn(`❌ Element not found in DOM for field ${field.id}. Cannot update.`);
      return false;
    }

    // Use the definitive element from the registry
    const element = originalFieldInfo.element;
    // Create an updated field object that includes the new value and original metadata
    const updatedField = { ...originalFieldInfo.field, ...field };

    if (originalFieldInfo.isGrouped) {
      console.log(`🔍 Updating grouped field: ${updatedField.id} (${updatedField.type})`);
      // Pass the merged field data to the group handler
      return await updateGroupedField(updatedField, testMode);
    } else {
      // Handle individual fields normally
      console.log(`🔍 Updating individual field: ${updatedField.id} (${updatedField.type})`);
      return await updateFieldWithRetry(element, updatedField, testMode);
    }
  } catch (error) {
    console.error(`❌ Error updating field ${field.id}:`, error);
    return false;
  }
};

/**
 * Update a grouped field (radio group or checkbox group)
 */
const updateGroupedField = async (field: Field, testMode: boolean): Promise<boolean> => {
  const fieldValue = testMode && field.testValue !== undefined ? field.testValue : field.value;

  try {
    if (field.type === "radio") {
      return await updateRadioGroup(field, fieldValue, testMode);
    } else if (field.type === "checkbox" && field.options && field.options.length > 1) {
      return await updateCheckboxGroup(field, fieldValue, testMode);
    } else {
      // This case handles single checkboxes that might be misclassified as grouped.
      // We now fetch the element directly from the registry.
      console.log(`🔍 Updating single checkbox (as grouped fallback): ${field.id}`);
      const fieldInfo = unifiedFieldRegistry.getField(field.id);
      const element = fieldInfo?.element;

      if (element) {
        return await updateFieldWithRetry(element, field, testMode);
      } else {
        console.warn(`❌ Element not found for single checkbox field ${field.id}`);
        return false;
      }
    }
  } catch (error) {
    console.error(`❌ Error updating grouped field ${field.id}:`, error);
    return false;
  }
};

/**
 * Update a radio group - select the appropriate option
 */
const updateRadioGroup = async (field: Field, value: unknown, testMode: boolean): Promise<boolean> => {
  if (!field.options) {
    console.warn(`❌ No options found for radio group ${field.id}`);
    return false;
  }

  const targetValue = String(value || "");
  console.log(`🔍 Updating radio group ${field.id} with value: ${targetValue} (testMode: ${testMode})`);

  // Find the option that matches the target value
  let selectedOption = field.options.find(opt => opt.value === targetValue);

  if (!selectedOption && targetValue) {
    // Try text matching if value matching fails
    selectedOption = field.options.find(opt => opt.text.toLowerCase() === targetValue.toLowerCase());
    if (selectedOption) {
      console.log(`✅ Found radio option by text matching: ${selectedOption.text}`);
    }
  }

  // Enhanced fallback logic for test mode
  if (!selectedOption && testMode) {
    // In test mode, pick a random valid option if no specific value matched
    const validOptions = field.options.filter(
      opt =>
        !opt.text.toLowerCase().includes("select") &&
        !opt.text.toLowerCase().includes("choose") &&
        !opt.text.toLowerCase().includes("pick") &&
        opt.text !== "" &&
        opt.value !== "",
    );

    if (validOptions.length > 0) {
      // Pick a random valid option for better test variety
      const randomIndex = Math.floor(Math.random() * validOptions.length);
      selectedOption = validOptions[randomIndex];
      console.log(`✅ Using random test mode option: ${selectedOption.text} (${selectedOption.value})`);
    } else {
      // Last resort: use first option
      selectedOption = field.options[0];
      console.log(`✅ Using first option as fallback: ${selectedOption.text}`);
    }
  }

  // For non-test mode, if no match found, try partial matching strategies
  if (!selectedOption && !testMode && targetValue) {
    // Try partial text matching
    selectedOption = field.options.find(
      opt =>
        opt.text.toLowerCase().includes(targetValue.toLowerCase()) ||
        targetValue.toLowerCase().includes(opt.text.toLowerCase()),
    );

    if (selectedOption) {
      console.log(`✅ Found radio option by partial text matching: ${selectedOption.text}`);
    }
  }

  if (selectedOption) {
    const optionIndex = field.options.indexOf(selectedOption);

    // Enhanced strategies to find the actual radio button element
    const findStrategies = [
      // Strategy 1: Use the standard filliny-id pattern
      () => document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}-option-${optionIndex}"]`),

      // Strategy 2: Find by name and value
      () =>
        field.name
          ? document.querySelector<HTMLElement>(`input[name="${field.name}"][value="${selectedOption!.value}"]`)
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
      () => document.querySelector<HTMLElement>(`input[type="radio"][value="${selectedOption!.value}"]`),

      // Strategy 5: Find by partial value matching
      () => {
        const radios = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
        return (
          radios.find(
            radio =>
              radio.value.toLowerCase().includes(selectedOption!.value.toLowerCase()) ||
              selectedOption!.value.toLowerCase().includes(radio.value.toLowerCase()),
          ) || null
        );
      },

      // Strategy 6: Find by label text matching
      () => {
        const labels = Array.from(document.querySelectorAll("label"));
        for (const label of labels) {
          const labelText = label.textContent?.trim().toLowerCase();
          const optionText = selectedOption!.text.trim().toLowerCase();

          if (
            labelText &&
            optionText &&
            (labelText === optionText || labelText.includes(optionText) || optionText.includes(labelText))
          ) {
            const forAttr = label.getAttribute("for");
            if (forAttr) {
              const linkedElement = document.getElementById(forAttr) as HTMLInputElement;
              if (linkedElement && linkedElement.type === "radio") {
                return linkedElement;
              }
            }
            // Check if label contains the input
            const input = label.querySelector('input[type="radio"]');
            if (input) return input as HTMLElement;
          }
        }
        return null;
      },
    ];

    let optionElement: HTMLElement | null = null;
    for (let i = 0; i < findStrategies.length; i++) {
      try {
        optionElement = findStrategies[i]();
        if (optionElement) {
          console.log(`✅ Found radio option element using strategy ${i + 1}: ${selectedOption.text}`);
          break;
        }
      } catch (error) {
        console.debug(`Radio find strategy ${i + 1} failed:`, error);
      }
    }

    if (optionElement) {
      // Set the filliny-id for future reference if not already set
      if (!optionElement.hasAttribute("data-filliny-id")) {
        optionElement.setAttribute("data-filliny-id", `${field.id}-option-${optionIndex}`);
      }

      console.log(`✅ Selecting radio option: ${selectedOption.text} (${selectedOption.value})`);

      // First, uncheck all other radio buttons in this group to ensure clean state
      if (field.name) {
        const allRadiosInGroup = document.querySelectorAll<HTMLInputElement>(
          `input[name="${field.name}"][type="radio"]`,
        );
        allRadiosInGroup.forEach(radio => {
          if (radio !== optionElement) {
            updateCheckable(radio, false);
          }
        });
      }

      // Now check the selected radio
      updateCheckable(optionElement, true);

      return true;
    } else {
      console.warn(`❌ Radio option element not found for ${field.id}-option-${optionIndex} (${selectedOption.text})`);

      // Debug: Log all available radio inputs for this field
      console.log("Available radio inputs:");
      const allRadios = document.querySelectorAll('input[type="radio"]');
      allRadios.forEach(radio => {
        const input = radio as HTMLInputElement;
        console.log(`  - name: "${input.name}", value: "${input.value}", id: "${input.id}"`);
      });

      return false;
    }
  } else {
    console.warn(`❌ No matching radio option found for value: ${targetValue} in field ${field.id}`);
    console.log(
      "Available options:",
      field.options.map(opt => `${opt.text} (${opt.value})`),
    );
    return false;
  }
};

/**
 * Update a checkbox group - select multiple options if needed
 */
const updateCheckboxGroup = async (field: Field, value: unknown, _testMode: boolean): Promise<boolean> => {
  if (!field.options) return false;

  console.log(`Updating checkbox group ${field.id} with value:`, value);

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

      console.log(`Setting checkbox option ${option.text} to ${shouldBeChecked}`);
      try {
        updateCheckable(optionElement, shouldBeChecked);
        successCount++;
      } catch (error) {
        console.error(`Error updating checkbox option ${idx}:`, error);
      }
    } else {
      console.warn(`Checkbox option element not found for ${field.id}-option-${idx}`);
    }
  }

  return successCount > 0;
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
