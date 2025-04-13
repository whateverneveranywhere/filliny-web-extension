import { dispatchEvent, simulateTyping, addVisualFeedback } from "./utils";

/**
 * Update a text input field with enhanced interaction support
 * Handles various text input types with special formatting
 */
export const updateTextField = async (element: HTMLElement, value: string): Promise<void> => {
  try {
    // First check if element is in viewport, scroll it into view if needed
    const rect = element.getBoundingClientRect();
    const isInViewport =
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth);

    if (!isInViewport) {
      console.log("Element not in viewport, scrolling into view");
      element.scrollIntoView({ block: "center" });
    }

    // Add visual feedback
    addVisualFeedback(element);

    // Identify input type if it's an HTMLInputElement
    let inputType = "text";
    let normalizedValue = value;

    if (element instanceof HTMLInputElement) {
      inputType = element.type;

      // Format value based on input type
      switch (inputType) {
        case "email":
          // Ensure email format
          if (!normalizedValue.includes("@")) {
            normalizedValue = normalizedValue.includes(".")
              ? `${normalizedValue.split(".")[0]}@example.com`
              : `${normalizedValue}@example.com`;
          }
          break;

        case "url":
          // Ensure URL format
          if (!normalizedValue.match(/^https?:\/\//)) {
            normalizedValue = `https://${normalizedValue.replace(/^(www\.)?/, "www.")}`;
          }
          break;

        case "tel":
          // Format as phone number if not already
          if (!normalizedValue.match(/^\+?[\d\s\-()]{7,}/)) {
            // Create a basic phone number pattern if one isn't provided
            normalizedValue = normalizedValue.replace(/\D/g, "");
            if (normalizedValue.length < 10) {
              normalizedValue = "555" + normalizedValue.padEnd(7, "0");
            }
          }
          break;

        case "number":
          // Ensure it's a valid number
          if (isNaN(Number(normalizedValue))) {
            normalizedValue = "0";
          }
          break;

        case "date":
          // Ensure date format (YYYY-MM-DD)
          if (!normalizedValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const now = new Date();
            normalizedValue = now.toISOString().split("T")[0];
          }
          break;

        case "time":
          // Ensure time format (HH:MM)
          if (!normalizedValue.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
            const now = new Date();
            normalizedValue = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
          }
          break;

        case "datetime-local":
          // Ensure datetime-local format (YYYY-MM-DDTHH:MM)
          if (!normalizedValue.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)) {
            const now = new Date();
            normalizedValue = now.toISOString().slice(0, 16);
          }
          break;

        case "month":
          // Ensure month format (YYYY-MM)
          if (!normalizedValue.match(/^\d{4}-\d{2}$/)) {
            const now = new Date();
            normalizedValue = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
          }
          break;

        case "week":
          // Ensure week format (YYYY-W##)
          if (!normalizedValue.match(/^\d{4}-W\d{2}$/)) {
            const now = new Date();
            const weekNum = Math.ceil(
              ((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7,
            );
            normalizedValue = `${now.getFullYear()}-W${weekNum.toString().padStart(2, "0")}`;
          }
          break;

        case "color":
          // Ensure color format (#RRGGBB)
          if (!normalizedValue.match(/^#[0-9A-F]{6}$/i)) {
            normalizedValue = "#4f46e5"; // Default to a nice indigo color
          }
          break;

        case "range": {
          // Ensure it's within range
          const min = element.hasAttribute("min") ? Number(element.getAttribute("min")) : 0;
          const max = element.hasAttribute("max") ? Number(element.getAttribute("max")) : 100;
          const num = Number(normalizedValue);
          if (isNaN(num)) {
            normalizedValue = String(min + (max - min) / 2); // Default to middle of range
          } else {
            normalizedValue = String(Math.max(min, Math.min(max, num)));
          }
          break;
        }
      }
    }

    // Handle special cases for React components and other frameworks
    // Try to detect React-based components by looking at element properties
    const hasReactProps =
      element.hasAttribute("data-reactid") ||
      // Use safer way to check for React properties
      Object.prototype.hasOwnProperty.call(element, "__reactEventHandlers") ||
      element.getAttribute("class")?.includes("react-") ||
      document.querySelector("[data-reactroot]") !== null;

    if (hasReactProps) {
      console.log("Detected React component, using enhanced update strategy");
      await handleReactTextInput(element, normalizedValue);
      return;
    }

    // Handle Angular components
    const hasAngularProps =
      element.hasAttribute("ng-model") ||
      element.hasAttribute("[(ngModel)]") ||
      element.hasAttribute("formControlName") ||
      element.getAttribute("class")?.includes("ng-");

    if (hasAngularProps) {
      console.log("Detected Angular component, using enhanced update strategy");
      await handleAngularTextInput(element, normalizedValue);
      return;
    }

    // If no special frameworks detected, use standard approach with simulateTyping
    await simulateTyping(element, normalizedValue);
  } catch (error) {
    console.error("Error updating text field:", error);
    // Fallback to direct value setting if simulation fails
    try {
      if (element instanceof HTMLInputElement) {
        element.value = value;
        dispatchEvent(element, "input");
        dispatchEvent(element, "change");
      }
    } catch (fallbackError) {
      console.error("Even fallback approach failed:", fallbackError);
    }
  }
};

/**
 * Handle React-specific text input components
 */
async function handleReactTextInput(element: HTMLElement, value: string): Promise<void> {
  try {
    // Most React components listen to onFocus, onChange, and onBlur
    // Focus the element
    element.focus();

    // For controlled components, we need to dispatch specific events
    // that React is listening for
    if (element instanceof HTMLInputElement) {
      // Set the value property directly
      element.value = value;
    } else if (element.isContentEditable) {
      element.textContent = value;
    }

    // Trigger React-specific events
    // React listens to specific synthetic events rather than native ones
    ["input", "change"].forEach(eventName => {
      const event = new Event(eventName, { bubbles: true, cancelable: true });
      element.dispatchEvent(event);

      // Also try to find and call any attached event handlers directly
      const reactHandler =
        // @ts-expect-error - Dynamic property access for event handlers
        element[`on${eventName}`] || element.getAttribute(`on${eventName}`);

      if (typeof reactHandler === "function") {
        reactHandler.call(element, event);
      }
    });

    // For Material UI and other component libraries, try additional strategies
    // Some libraries store state in data attributes
    if (element.closest('[class*="MuiInputBase"]')) {
      const rootElement = element.closest('[class*="MuiInputBase"]');
      rootElement?.setAttribute("data-value", value);

      // Trigger events on the container element too
      ["input", "change"].forEach(eventName => {
        const event = new Event(eventName, { bubbles: true, cancelable: true });
        rootElement?.dispatchEvent(event);
      });
    }
  } catch (error) {
    console.error("Error in React input handler:", error);
    // Fall back to standard typing simulation
    await simulateTyping(element, value);
  }
}

/**
 * Handle Angular-specific text input components
 */
async function handleAngularTextInput(element: HTMLElement, value: string): Promise<void> {
  try {
    // Focus the element
    element.focus();

    // For Angular forms, we need to update the value and dispatch specific events
    if (element instanceof HTMLInputElement) {
      element.value = value;
    } else if (element.isContentEditable) {
      element.textContent = value;
    }

    // Angular listens to these events
    ["input", "change", "blur"].forEach(eventName => {
      const event = new Event(eventName, { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
    });

    // For Angular forms, try to find and update NgModel
    const ngModelName =
      element.getAttribute("ng-model") ||
      element.getAttribute("[(ngModel)]") ||
      element.getAttribute("formControlName");

    if (ngModelName) {
      // Try to find Angular context
      const elementWithContext = element as unknown as { __ngContext__?: unknown };
      if (elementWithContext.__ngContext__) {
        console.log(`Found Angular context for model: ${ngModelName}`);
        // We can't directly modify Angular context, but the events should trigger updates
      }
    }
  } catch (error) {
    console.error("Error in Angular input handler:", error);
    // Fall back to standard typing simulation
    await simulateTyping(element, value);
  }
}

/**
 * Handle contentEditable elements like rich text editors
 */
export const updateContentEditable = async (element: HTMLElement, value: string): Promise<void> => {
  try {
    // First check if we're dealing with a rich text editor
    const isRichEditor =
      element.closest('[class*="editor"]') !== null ||
      element.closest('[class*="wysiwyg"]') !== null ||
      element.closest('[class*="rich-text"]') !== null;

    if (isRichEditor) {
      console.log("Detected rich text editor, attempting appropriate update strategy");

      // Focus the element first
      element.focus();

      // For CKEditor, TinyMCE and similar editors
      if (window.document.querySelector(".ck-editor, .tox-tinymce, .trumbowyg")) {
        // Use document.execCommand for these editors
        document.execCommand("selectAll", false);
        document.execCommand("insertText", false, value);
      } else {
        // Standard approach for other contentEditable elements
        element.innerHTML = value.replace(/\n/g, "<br>");

        // Dispatch appropriate events
        dispatchEvent(element, "input");
        dispatchEvent(element, "change");
      }
    } else {
      // For simple contentEditable elements
      await simulateTyping(element, value);
    }
  } catch (error) {
    console.error("Error updating contentEditable element:", error);
    // Fallback approach
    try {
      element.innerHTML = value.replace(/\n/g, "<br>");
      dispatchEvent(element, "input");
    } catch (fallbackError) {
      console.error("Even fallback approach failed:", fallbackError);
    }
  }
};
