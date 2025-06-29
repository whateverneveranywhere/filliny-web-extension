import { updateField } from "./fieldUpdaterHelpers";
import { prepareFieldForTestMode, showTestModeIndicator } from "./testModeHelpers";
import type { Field } from "@extension/shared";

/**
 * Handle filling a single field with test data
 * This function uses the test values defined in the field or generates appropriate test data
 */
export const handleTestFieldFill = async (field: Field): Promise<void> => {
  console.log(`Starting TEST MODE field fill for: ${field.id}, type: ${field.type}`);

  try {
    // Show test mode indicator
    showTestModeIndicator();

    // Find the element in the DOM
    const element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
    if (!element) {
      console.error(`Element with ID ${field.id} not found for test fill`);
      return;
    }

    // Add visual feedback
    element.setAttribute("data-filliny-loading", "true");
    // Mark as our element to avoid observer loops
    element.setAttribute("data-filliny-element", "true");

    // Add a highlight effect to show which field is being filled
    const originalOutline = element.style.outline;
    const originalOutlineOffset = element.style.outlineOffset;
    const originalTransition = element.style.transition;

    element.style.outline = "2px solid #ca8a04"; // Amber color for test mode
    element.style.outlineOffset = "2px";
    element.style.transition = "all 0.3s ease";

    // Prepare field with test values using the shared utility
    const fieldWithTestValue = prepareFieldForTestMode(field);

    // Log the test value for debugging
    console.log(`Test mode: Using test value for ${field.id} (${field.type}):`, fieldWithTestValue.testValue);

    // Fill the field with test data using the updateField function
    // Setting isTestMode=true tells it to use field.testValue
    await updateField(element, fieldWithTestValue, true);

    // Show success feedback with different color for test mode
    element.style.outline = "2px solid #eab308"; // Yellow color for test success

    // Reset outline after a delay
    setTimeout(() => {
      element.style.outline = originalOutline;
      element.style.outlineOffset = originalOutlineOffset;
      element.style.transition = originalTransition;
    }, 2000);

    console.log(`✅ Test fill completed for field: ${field.id}`);
  } catch (error) {
    console.error("Error in handleTestFieldFill:", error);

    // Show error feedback if element exists
    const element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
    if (element) {
      element.style.outline = "2px solid #ef4444"; // Red error color
    }
  } finally {
    // Remove loading indicator
    const element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
    if (element) {
      element.removeAttribute("data-filliny-loading");
    }
  }
};
