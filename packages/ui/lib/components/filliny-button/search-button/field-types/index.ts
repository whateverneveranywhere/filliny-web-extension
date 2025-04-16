// Export all field type handlers
export * from "./utils";
export * from "./text";
export * from "./checkable";
export * from "./file";
export * from "./select";

import type { Field } from "@extension/shared";
import { detectCheckboxFields, detectRadioFields } from "./checkable";
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

  // Get all form elements
  const formElements = Array.from(
    container.querySelectorAll<HTMLElement>(
      `input:not([type="hidden"]):not([type="submit"]),
     select, 
     textarea,
     [role="textbox"],
     [role="combobox"],
     [role="spinbutton"],
     [contenteditable="true"],
     [data-filliny-field],
     [role="checkbox"],
     [role="switch"],
     [role="radio"]`,
    ),
  ).filter(element => {
    // Skip elements that shouldn't be processed
    const isHidden =
      window.getComputedStyle(element).display === "none" || window.getComputedStyle(element).visibility === "hidden";
    const isDisabled = element.hasAttribute("disabled") || element.hasAttribute("readonly");

    return !isHidden && !isDisabled && !element.hasAttribute("data-filliny-skip");
  });

  if (formElements.length === 0) return fields;

  // Process text fields (including textareas and contenteditable)
  const textFields = await detectTextField(formElements, baseIndex, testMode);
  fields.push(...textFields);
  baseIndex += textFields.length;

  // Process select fields
  const selectFields = await detectSelectFields(formElements, baseIndex, testMode);
  fields.push(...selectFields);
  baseIndex += selectFields.length;

  // Process checkbox fields
  const checkboxFields = await detectCheckboxFields(formElements, baseIndex, testMode);
  fields.push(...checkboxFields);
  baseIndex += checkboxFields.length;

  // Process radio fields (groups radios with same name)
  const radioFields = await detectRadioFields(formElements, baseIndex, testMode);
  fields.push(...radioFields);
  baseIndex += radioFields.length;

  // Process file inputs
  const fileFields = await detectFileFields(formElements, baseIndex, testMode);
  fields.push(...fileFields);
  baseIndex += fileFields.length;

  return fields;
};
