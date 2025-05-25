// Export all field type handlers
export * from "./utils";
export * from "./text";
export * from "./checkable";
export * from "./file";
export * from "./select";

import type { Field } from "@extension/shared";
import { detectCheckableFields } from "./checkable";
import { detectFileFields } from "./file";
import { detectSelectFields } from "./select";
import { detectTextField } from "./text";

/**
 * Main field detection function that processes all field types
 *
 * @param container The container element to detect fields within
 * @param testMode Whether to generate test values for fields
 * @returns An array of detected fields
 */
export const detectFields = async (container: HTMLElement, testMode: boolean = false): Promise<Field[]> => {
  const fields: Field[] = [];
  let baseIndex = 0;

  // Get all form elements with enhanced selectors for better field coverage
  const formElements = Array.from(
    container.querySelectorAll<HTMLElement>(
      `input:not([type="hidden"]):not([type="submit"]):not([type="button"]),
     select, 
     textarea,
     [role="textbox"],
     [role="combobox"],
     [role="spinbutton"],
     [contenteditable="true"],
     [data-filliny-field],
     [role="checkbox"],
     [role="switch"],
     [role="radio"],
     [class*="checkbox"],
     [class*="radio"],
     [class*="toggle"],
     [class*="switch"],
     [class*="select-input"],
     [class*="text-field"],
     [class*="input-field"],
     [class*="custom-input"],
     [data-input],
     [data-field],
     [class*="autocomplete"],
     [class*="combobox"],
     [class*="dropdown"],
     [class*="date-picker"],
     [class*="time-picker"]`,
    ),
  ).filter(element => {
    // Skip elements that shouldn't be processed
    const isHidden =
      window.getComputedStyle(element).display === "none" || window.getComputedStyle(element).visibility === "hidden";
    const isDisabled = element.hasAttribute("disabled") || element.hasAttribute("readonly");

    // Skip elements inside a form that are not input-related
    const isDecorativeElement =
      element.tagName === "DIV" &&
      !element.hasAttribute("role") &&
      !element.hasAttribute("contenteditable") &&
      !element.classList.toString().includes("input") &&
      !element.classList.toString().includes("field") &&
      !element.classList.toString().includes("select") &&
      !element.hasAttribute("data-filliny-field");

    return !isHidden && !isDisabled && !element.hasAttribute("data-filliny-skip") && !isDecorativeElement;
  });

  // If no form elements were found, try to look for custom elements that might be form fields
  // This is especially useful for frameworks like Material UI, Chakra, etc.
  if (formElements.length === 0) {
    // Look for probable custom input components
    const customElements = Array.from(
      container.querySelectorAll<HTMLElement>(
        `[class*="input"]:not(form):not(fieldset):not(div):not(span),
         [class*="field"]:not(form):not(fieldset):not(div):not(span),
         [class*="control"]:not(form):not(fieldset):not(div):not(span),
         div[class*="input"]:not([class*="group"]):not([class*="wrapper"]),
         div[class*="field"]:not([class*="group"]):not([class*="wrapper"]),
         div[class*="control"]:not([class*="group"]):not([class*="wrapper"])`,
      ),
    ).filter(element => {
      const isHidden =
        window.getComputedStyle(element).display === "none" || window.getComputedStyle(element).visibility === "hidden";
      const isDisabled = element.hasAttribute("disabled") || element.hasAttribute("readonly");

      // Skip container elements
      const containsOtherInputs = !!element.querySelector("input, select, textarea");

      return !isHidden && !isDisabled && !containsOtherInputs && !element.hasAttribute("data-filliny-skip");
    });

    if (customElements.length > 0) {
      // Process these as text fields by default, and the specific handlers will determine the right type
      const customTextFields = await detectTextField(customElements, baseIndex, testMode);
      fields.push(...customTextFields);
      return fields;
    }

    return fields;
  }

  // Process text fields (including textareas and contenteditable)
  const textFields = await detectTextField(formElements, baseIndex, testMode);
  fields.push(...textFields);
  baseIndex += textFields.length;

  // Process select fields
  const selectFields = await detectSelectFields(formElements, baseIndex, testMode);
  fields.push(...selectFields);
  baseIndex += selectFields.length;

  // Process checkbox fields
  const checkableFields = await detectCheckableFields(formElements, baseIndex, testMode);
  fields.push(...checkableFields);
  baseIndex += checkableFields.length;

  // Process file inputs
  const fileFields = await detectFileFields(formElements, baseIndex, testMode);
  fields.push(...fileFields);
  baseIndex += fileFields.length;

  // Add data attributes to help identify detected fields
  fields.forEach(field => {
    try {
      // Find the element for this field
      const selector =
        field.uniqueSelectors && field.uniqueSelectors.length > 0
          ? field.uniqueSelectors[0]
          : `[data-filliny-id="${field.id}"]`;

      const element = container.querySelector<HTMLElement>(selector);
      if (element) {
        element.setAttribute("data-filliny-detected", "true");
        element.setAttribute("data-filliny-type", field.type);
        // Store the detected label for debugging
        if (field.label) {
          element.setAttribute("data-filliny-label", field.label);
        }
      }
    } catch (e) {
      console.error("Error adding data attributes to field:", e);
    }
  });

  return fields;
};
