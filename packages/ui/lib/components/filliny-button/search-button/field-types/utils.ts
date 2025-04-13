/**
 * Safely get a string value from potentially complex field values
 */
export const getStringValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(",");
  return String(value);
};

/**
 * Dispatches an event on the given element
 * Ensures proper event bubbling and default handling
 */
export const dispatchEvent = (element: HTMLElement, eventName: string): void => {
  try {
    // Create and dispatch the event
    const event = new Event(eventName, {
      bubbles: true,
      cancelable: true,
    });

    element.dispatchEvent(event);

    // For React and other frameworks that may use synthetic events
    // Try to find and call any attached event handlers directly
    const reactHandler =
      // @ts-expect-error - Dynamic property access for event handlers
      element[`on${eventName}`] || element.getAttribute(`on${eventName}`);

    if (typeof reactHandler === "function") {
      reactHandler.call(element, event);
    }

    // For Angular, look for event handlers in the __ngContext__ property
    const elementWithContext = element as { __ngContext__?: unknown };
    if (elementWithContext.__ngContext__) {
      console.log(`Found Angular context, trying to trigger ${eventName} handler`);
    }

    // For jQuery-based sites
    const windowWithJQuery = window as { jQuery?: unknown };
    if (typeof windowWithJQuery.jQuery !== "undefined") {
      try {
        // @ts-expect-error - jQuery is not typed
        windowWithJQuery.jQuery(element).trigger(eventName);
      } catch (e) {
        console.log(`jQuery trigger failed:`, e);
      }
    }
  } catch (error) {
    console.error(`Error dispatching ${eventName} event:`, error);
  }
};

/**
 * Add visual feedback for users to see which fields are being filled
 */
export const addVisualFeedback = (element: HTMLElement): void => {
  try {
    // Store original styles for restoration
    if (!element.hasAttribute("data-filliny-original-border")) {
      element.setAttribute("data-filliny-original-border", element.style.border || "");
      element.setAttribute("data-filliny-original-boxShadow", element.style.boxShadow || "");
    }

    // Apply subtle highlighting
    element.style.border = "2px solid #4f46e5";
    element.style.boxShadow = "0 0 8px rgba(79, 70, 229, 0.4)";

    // Remove visual feedback after a delay
    setTimeout(() => {
      if (element.hasAttribute("data-filliny-original-border")) {
        element.style.border = element.getAttribute("data-filliny-original-border") || "";
        element.style.boxShadow = element.getAttribute("data-filliny-original-boxShadow") || "";
      }
    }, 2000);
  } catch (error) {
    console.error("Error adding visual feedback:", error);
  }
};

/**
 * Simulate human-like typing with proper focus events and composition
 */
export const simulateTyping = async (element: HTMLElement, value: string): Promise<void> => {
  try {
    // Focus the element
    element.focus();

    // Start composition (for IME-aware applications)
    // Use CustomEvent for composition events with data
    try {
      const startEvent = new CustomEvent("compositionstart", {
        bubbles: true,
        cancelable: true,
        detail: { data: "" },
      });
      element.dispatchEvent(startEvent);
    } catch (e) {
      console.debug("Custom composition event failed:", e);
    }

    // Make multiple attempts to set the value using different methods
    // Method 1: Direct property assignment
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = value;
    } else if ("value" in element) {
      (element as { value: string }).value = value;
    } else if (element.isContentEditable) {
      element.textContent = value;
    }

    // Method 2: Try using document.execCommand (for contentEditable and some frameworks)
    try {
      if (element.isContentEditable || element instanceof HTMLTextAreaElement) {
        // Clear existing content first
        const selection = window.getSelection();
        if (selection && element.contains(selection.anchorNode)) {
          document.execCommand("selectAll", false);
          document.execCommand("delete", false);
          document.execCommand("insertText", false, value);
        }
      }
    } catch (commandError) {
      console.debug("execCommand method not supported:", commandError);
    }

    // Method 3: For React-style controlled components that monitor specific events
    // Simulate individual keypresses for complex components
    let previousValue = "";
    for (let i = 0; i < value.length; i++) {
      const char = value[i];
      previousValue += char;

      // Use CustomEvent for composition update
      try {
        const updateEvent = new CustomEvent("compositionupdate", {
          bubbles: true,
          cancelable: true,
          detail: { data: previousValue },
        });
        element.dispatchEvent(updateEvent);
      } catch (e) {
        console.debug("Custom composition update event failed:", e);
      }

      // Some frameworks listen for keydown/keypress events
      const keyEvent = {
        key: char,
        code: `Key${char.toUpperCase()}`,
        bubbles: true,
        cancelable: true,
        composed: true,
      };

      try {
        element.dispatchEvent(new KeyboardEvent("keydown", keyEvent));
        element.dispatchEvent(new KeyboardEvent("keypress", keyEvent));
        element.dispatchEvent(new KeyboardEvent("keyup", keyEvent));
      } catch (keyError) {
        console.debug("Keyboard event simulation error:", keyError);
      }
    }

    // End composition with CustomEvent
    try {
      const endEvent = new CustomEvent("compositionend", {
        bubbles: true,
        cancelable: true,
        detail: { data: value },
      });
      element.dispatchEvent(endEvent);
    } catch (e) {
      console.debug("Custom composition end event failed:", e);
    }

    // Fire standard events
    dispatchEvent(element, "input");
    dispatchEvent(element, "change");

    // Check if value was actually set
    let valueSet = false;
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      valueSet = element.value === value;
    } else if (element.isContentEditable) {
      valueSet = element.textContent === value;
    }

    // If value wasn't set by previous methods, try more aggressive approaches
    if (!valueSet) {
      // Method 4: Use MutationObserver to detect if the value change was prevented
      const observer = new MutationObserver(() => {
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          if (element.value !== value) {
            element.value = value;
            dispatchEvent(element, "input");
            dispatchEvent(element, "change");
          }
        }
      });

      observer.observe(element, { attributes: true, childList: true, characterData: true });

      // Trigger an update to see if our value gets reverted
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.value = value;
      }

      // Disconnect immediately rather than waiting
      observer.disconnect();
    }

    // No need to wait for auto-resize since we want maximum speed
  } catch (error) {
    console.error("Error simulating typing:", error);
  } finally {
    // No delay before blurring to maximize speed
    // Only blur non-textarea elements to avoid losing focus effects
    if (!(element instanceof HTMLTextAreaElement)) {
      element.blur();
    }
  }
};
