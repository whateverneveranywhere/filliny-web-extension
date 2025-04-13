import { dispatchEvent } from "./utils";

/**
 * Update checkbox or radio button state with enhanced interaction
 */
export const updateCheckable = (element: HTMLElement, checked: boolean): void => {
  console.log(`Updating checkable element ${element.id || "unnamed"} to ${checked}`);

  try {
    // First check if element is in viewport, if not scroll it into view
    const rect = element.getBoundingClientRect();
    const isInViewport =
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth);

    if (!isInViewport) {
      console.log("Element not in viewport, scrolling into view");
      try {
        // Use instant scroll instead of smooth
        element.scrollIntoView({ block: "center" });
      } catch {
        // Fallback to simple scroll
        element.scrollIntoView();
      }
    }

    // Always update immediately, regardless of scrolling
    performCheckableUpdate(element, checked);
  } catch (error) {
    console.error("Error in updateCheckable:", error);
  }
};

/**
 * Perform the actual update on a checkable element with multiple strategies
 */
const performCheckableUpdate = (element: HTMLElement, checked: boolean): void => {
  console.log(`Performing checkable update on element ${element.id || "unnamed"} to ${checked}`);

  // Universal approach that works across different sites and implementations
  try {
    // 1. First approach: Direct property setting for standard inputs
    if (element instanceof HTMLInputElement) {
      element.checked = checked;

      // Dispatch standard events
      dispatchEvent(element, "input");
      dispatchEvent(element, "change");

      // Check if the change was successful
      if (element.checked === checked) {
        console.log("Successfully updated via direct property setting");
        return;
      }
    }

    // 2. Second approach: Attribute setting for ARIA elements
    if (element.hasAttribute("aria-checked")) {
      element.setAttribute("aria-checked", checked ? "true" : "false");
      dispatchEvent(element, "change");
      console.log("Updated ARIA attribute for the element");
    }

    // 3. Third approach: Click the element directly
    console.log("Trying direct click approach");
    element.click();

    // Re-check if we succeeded with the input
    if (element instanceof HTMLInputElement && element.checked === checked) {
      console.log("Successfully updated via click method");
      return;
    }

    // 4. Fourth approach: Try triggering input events in sequence
    console.log("Trying event sequence approach");
    try {
      // Comprehensive event sequence that works on many frameworks
      element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      element.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      // Some frameworks monitor keyboard events for accessibility
      if (checked) {
        element.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true }));
        element.dispatchEvent(new KeyboardEvent("keyup", { key: " ", code: "Space", bubbles: true }));
      }

      // Follow up with standard form events
      dispatchEvent(element, "input");
      dispatchEvent(element, "change");
    } catch (e) {
      console.debug("Event simulation failed:", e);
    }

    // 5. Fifth approach: Try to find and click label elements
    console.log("Trying label approach");
    // First check for explicit labels
    let clickedLabel = false;
    if (element.id) {
      const explicitLabel = document.querySelector(`label[for="${element.id}"]`);
      if (explicitLabel) {
        console.log("Clicking explicit label with for attribute");
        (explicitLabel as HTMLElement).click();
        clickedLabel = true;
      }
    }

    // Try using native labels collection
    if (!clickedLabel && element instanceof HTMLInputElement && element.labels && element.labels.length > 0) {
      console.log("Clicking via labels collection");
      (element.labels[0] as HTMLElement).click();
      clickedLabel = true;
    }

    // Then try parent label (wrapped input pattern)
    if (!clickedLabel) {
      const parentLabel = element.closest("label");
      if (parentLabel) {
        console.log("Clicking parent label");
        parentLabel.click();
        clickedLabel = true;
      }
    }

    // 6. Sixth approach: Try to find and click custom label patterns
    if (!clickedLabel) {
      // Look for adjacent elements that might be acting as labels
      const parent = element.parentElement;
      if (parent) {
        // Find nearby elements that might be acting as labels
        const siblings = Array.from(parent.children);
        const elementIndex = siblings.indexOf(element);

        // Check next sibling first (common pattern)
        if (elementIndex < siblings.length - 1) {
          const nextSibling = siblings[elementIndex + 1] as HTMLElement;
          if (nextSibling && nextSibling.tagName !== "INPUT" && nextSibling.tagName !== "SELECT") {
            console.log("Clicking next sibling as potential label");
            nextSibling.click();
            clickedLabel = true;
          }
        }

        // Check previous sibling if needed
        if (!clickedLabel && elementIndex > 0) {
          const prevSibling = siblings[elementIndex - 1] as HTMLElement;
          if (prevSibling && prevSibling.tagName !== "INPUT" && prevSibling.tagName !== "SELECT") {
            console.log("Clicking previous sibling as potential label");
            prevSibling.click();
            clickedLabel = true;
          }
        }

        // Try parent click if all else fails
        if (!clickedLabel) {
          console.log("Clicking parent element as last resort");
          parent.click();
        }
      }
    }

    // 7. Last attempt: Force property update after all click attempts
    if (element instanceof HTMLInputElement && element.checked !== checked) {
      console.log("Force updating checked property as final measure");
      element.checked = checked;
      dispatchEvent(element, "input");
      dispatchEvent(element, "change");
    }

    // Find and update any hidden inputs that might be part of this control
    if (element.id) {
      // Create a selector that only includes the name attribute check when appropriate
      let hiddenInputSelector = `input[type="hidden"][data-related="${element.id}"]`;
      if (element instanceof HTMLInputElement && element.name) {
        hiddenInputSelector += `, input[type="hidden"][name="${element.name}"]`;
      }

      const relatedHiddenInput = document.querySelector(hiddenInputSelector);
      if (relatedHiddenInput instanceof HTMLInputElement) {
        console.log("Updating related hidden input");
        relatedHiddenInput.value = checked ? "true" : "false";
        dispatchEvent(relatedHiddenInput, "input");
        dispatchEvent(relatedHiddenInput, "change");
      }
    }

    console.log(
      `Final state check: ${element instanceof HTMLInputElement ? `checked=${element.checked}` : `aria-checked=${element.getAttribute("aria-checked")}`}`,
    );
  } catch (error) {
    console.error("Error in performCheckableUpdate:", error);
  }
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
