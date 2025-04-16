import { createBaseField } from "./utils";
import type { Field } from "@extension/shared";

// Extend Field type with file-specific properties
interface FileField extends Field {
  acceptTypes?: string;
  multiple?: boolean;
}

/**
 * Update a file input with a mock file
 * This function simulates selecting a file
 */
export const updateFileInput = async (fileInput: HTMLInputElement, value: string | string[]): Promise<void> => {
  console.log(`Updating file input with ${typeof value === "string" ? "single file" : "multiple files"}`);

  try {
    // File inputs can't be programmatically set for security reasons
    // In real use, we must simulate a file selection
    // For testing purposes, we'll just add indicators

    // For visual feedback
    fileInput.classList.add("filliny-file-selected");

    // Indicate selection via attributes for test purposes
    if (Array.isArray(value)) {
      fileInput.setAttribute("data-filliny-files", value.join(", "));
      fileInput.setAttribute("data-filliny-files-count", value.length.toString());
    } else {
      fileInput.setAttribute("data-filliny-file", value);
    }

    // Attempt to trigger change events
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    fileInput.dispatchEvent(new Event("input", { bubbles: true }));

    // Add a visual indicator next to the input
    const parent = fileInput.parentElement;
    if (parent) {
      const indicator = document.createElement("span");
      indicator.className = "filliny-file-indicator";
      indicator.style.marginLeft = "8px";
      indicator.style.color = "#0284c7";
      indicator.style.fontStyle = "italic";

      // Show appropriate message based on number of files
      if (Array.isArray(value)) {
        indicator.textContent = `${value.length} files selected (simulated)`;
      } else {
        indicator.textContent = `File selected: ${value} (simulated)`;
      }

      // Remove any existing indicators
      const existingIndicator = parent.querySelector(".filliny-file-indicator");
      if (existingIndicator) {
        parent.removeChild(existingIndicator);
      }

      parent.appendChild(indicator);

      // Remove the indicator after 5 seconds
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 5000);
    }
  } catch (error) {
    console.error("Error updating file input:", error);
  }
};

/**
 * Detect file input fields from a set of elements
 */
export const detectFileFields = async (
  elements: HTMLElement[],
  baseIndex: number,
  testMode: boolean = false,
): Promise<Field[]> => {
  const fields: Field[] = [];

  // Filter for file inputs
  const fileElements = elements.filter(element => element instanceof HTMLInputElement && element.type === "file");

  for (let i = 0; i < fileElements.length; i++) {
    const element = fileElements[i] as HTMLInputElement;

    // Skip disabled/hidden elements
    if (
      element.disabled ||
      element.readOnly ||
      element.getAttribute("aria-hidden") === "true" ||
      window.getComputedStyle(element).display === "none" ||
      window.getComputedStyle(element).visibility === "hidden"
    ) {
      continue;
    }

    // Create field based on input type
    const field = (await createBaseField(element, baseIndex + i, "file", testMode)) as FileField;

    // Add file-specific metadata
    field.acceptTypes = element.accept || undefined;
    field.multiple = element.multiple;
    field.required = element.required;
    field.name = element.name || "";

    // Handle test values
    if (testMode) {
      if (element.multiple) {
        // For multiple files, create an array of test file paths
        if (field.acceptTypes) {
          // Create test values based on accepted types
          const testFiles: string[] = [];

          if (field.acceptTypes.includes("image/")) {
            testFiles.push("test-image.jpg");
          }
          if (field.acceptTypes.includes(".pdf") || field.acceptTypes.includes("application/pdf")) {
            testFiles.push("test-document.pdf");
          }
          if (field.acceptTypes.includes(".doc") || field.acceptTypes.includes("application/msword")) {
            testFiles.push("test-document.docx");
          }

          // Add default if nothing matched
          if (testFiles.length === 0) {
            testFiles.push("test-file-1.txt", "test-file-2.txt");
          }

          field.testValue = testFiles;
        } else {
          field.testValue = ["test-file-1.txt", "test-file-2.txt"];
        }
      } else {
        // For single file, create an appropriate test value based on accept types
        if (field.acceptTypes) {
          if (field.acceptTypes.includes("image/")) {
            field.testValue = "test-image.jpg";
          } else if (field.acceptTypes.includes(".pdf") || field.acceptTypes.includes("application/pdf")) {
            field.testValue = "test-document.pdf";
          } else if (field.acceptTypes.includes(".doc") || field.acceptTypes.includes("application/msword")) {
            field.testValue = "test-document.docx";
          } else {
            field.testValue = "test-file.txt";
          }
        } else {
          field.testValue = "test-file.txt";
        }
      }
    }

    fields.push(field);
  }

  return fields;
};
