import type { Field } from "@extension/shared";

// Core utilities for field updates
// ----------------------------------------

/**
 * Safely get a string value from potentially complex field values
 */
const getStringValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(",");
  return String(value);
};

/**
 * Dispatch DOM events on elements with error handling
 */
export const dispatchEvent = (
  element: HTMLElement,
  eventType: string,
  customOptions: Record<string, unknown> = {},
): void => {
  try {
    // Use InputEvent for input-related events when available
    let event: Event;
    if (eventType === "input" && typeof InputEvent !== "undefined") {
      event = new InputEvent(eventType, {
        bubbles: true,
        cancelable: true,
        ...(element instanceof HTMLInputElement ? { data: element.value } : {}),
        ...customOptions,
      });
    } else {
      event = new Event(eventType, { bubbles: true, cancelable: true });
    }
    element.dispatchEvent(event);
  } catch (error) {
    console.error(`Error dispatching ${eventType} event:`, error);
    // Fallback for older browsers
    try {
      const fallbackEvent = document.createEvent("Event");
      fallbackEvent.initEvent(eventType, true, true);
      element.dispatchEvent(fallbackEvent);
    } catch (fallbackError) {
      console.error(`Fallback event dispatch failed for ${eventType}:`, fallbackError);
    }
  }
};

/**
 * Add visual feedback for users to see which fields are being filled
 */
const addVisualFeedback = (element: HTMLElement): void => {
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

// Core field updating functions
// ----------------------------------------

/**
 * Simulate human-like typing with proper focus events and composition
 */
const simulateTyping = async (element: HTMLElement, value: string): Promise<void> => {
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

/**
 * Update checkbox or radio button state with enhanced interaction
 */
const updateCheckable = (element: HTMLElement, checked: boolean): void => {
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
      } catch (e) {
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

// Separated the actual update logic to a helper function
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

// Move the entire updateSelect function below the handleReactSelect and handleTsselect functions
// Define these helper functions first

/**
 * React Select handler stub - will be properly implemented later
 * This is just a placeholder for now and will be filled in with the actual implementation
 */
const handleReactSelect = (): boolean => {
  // This function will be implemented properly, for now return false
  return false;
};

const handleTsselect = (element: HTMLSelectElement, normalizedValues: string[]): boolean => {
  try {
    console.log("Attempting to handle Tsselect component...");

    // Enhanced check for React-Select components used on Exclaimer careers site
    const isReactSelect =
      element.classList.contains("react-select__input") ||
      element.parentElement?.classList.contains("css-1hac4vs-dummyInput") ||
      !!element.closest(".css-26l3qy-container") ||
      !!element.closest('[class*="react-select"]') ||
      element.getAttribute("role") === "combobox" ||
      element.getAttribute("id")?.includes("application_form");

    if (isReactSelect) {
      console.log("Detected React-Select component...", element.id);

      // Look for both visible and hidden select elements
      // Exclaimer careers site uses a hidden native select with specific classes
      const elementId = element.id || "";
      const fieldNumber = elementId.match(/field-(\d+)/)?.[1] || "";

      // Try multiple strategies to find associated hidden selects
      const possibleHiddenSelect = document.querySelector(
        `select.hide-at-sm-block[id$="field-${fieldNumber}"], ` +
          `select[id$="${elementId.split("_").pop()}"], ` +
          `select[data-filliny-id="${element.getAttribute("data-filliny-id")}"]`,
      ) as HTMLSelectElement;

      if (possibleHiddenSelect) {
        console.log("Found associated hidden select:", possibleHiddenSelect.id);

        // Try updating the hidden select directly
        try {
          possibleHiddenSelect.value = normalizedValues[0];
          possibleHiddenSelect.dispatchEvent(new Event("change", { bubbles: true }));
          console.log("Updated hidden select value to", normalizedValues[0]);
        } catch (e) {
          console.warn("Could not update hidden select:", e);
        }
      }

      // Find the React-Select container - try multiple approaches for Exclaimer site
      let selectContainer: HTMLElement | null = null;

      // Approach 1: Find through parent chain
      selectContainer = element.closest('[class*="react-select"][class*="container"]') as HTMLElement;

      // Approach 2: Find through related element IDs
      if (!selectContainer && elementId) {
        const relatedId = elementId.replace("input", "control");
        selectContainer = document.querySelector(
          `[id="${relatedId}"], [id*="${elementId.split("_")[0]}"][class*="container"]`,
        ) as HTMLElement;
      }

      // Approach 3: Find any React-Select container near this element
      if (!selectContainer) {
        // Look for containers near our field
        const parentForm = element.closest('form, [role="form"], [class*="form"]');
        if (parentForm) {
          const allContainers = parentForm.querySelectorAll('[class*="react-select"][class*="container"]');

          // Find the closest container to our element
          let closestDistance = Infinity;
          Array.from(allContainers).forEach(container => {
            const rect1 = element.getBoundingClientRect();
            const rect2 = container.getBoundingClientRect();
            const distance = Math.abs(rect1.top - rect2.top) + Math.abs(rect1.left - rect2.left);

            if (distance < closestDistance) {
              closestDistance = distance;
              selectContainer = container as HTMLElement;
            }
          });
        }
      }

      // Approach 4: Find by looking at parent elements
      if (!selectContainer) {
        let currentElement = element.parentElement;
        while (currentElement && !selectContainer) {
          if (
            currentElement.classList.contains("react-select__control") ||
            currentElement.classList.toString().includes("react-select")
          ) {
            selectContainer = currentElement;
          }
          currentElement = currentElement.parentElement;
        }
      }

      if (!selectContainer) {
        console.warn("Could not find React-Select container to click");
        return false;
      }

      console.log("Found select container:", selectContainer);

      // Click to open the dropdown
      selectContainer.click();
      console.log("Clicked on select container to open dropdown");

      // Process dropdown immediately rather than using setTimeout
      const optionSelectors = [
        ".react-select__menu .react-select__option",
        ".css-26l3qy-menu .css-4ljt47-option",
        '[class*="react-select__menu"] [class*="react-select__option"]',
        '[class*="select__menu"] [class*="select__option"]',
        '[class*="select-dropdown"] [class*="select-option"]',
        '[class*="dropdown"] [role="option"]',
        '[role="listbox"] [role="option"]',
      ];

      let options: Element[] = [];
      for (const selector of optionSelectors) {
        const foundOptions = document.querySelectorAll(selector);
        if (foundOptions.length > 0) {
          options = Array.from(foundOptions);
          console.log(`Found ${options.length} options using selector: ${selector}`);
          break;
        }
      }

      if (options.length === 0) {
        console.log("No dropdown options found for React-Select");
        document.body.click(); // Close dropdown
        return true;
      }

      // Get the value we're looking for
      const valueToFind = normalizedValues[0];
      console.log("Looking for option matching:", valueToFind);

      // First try to match numeric IDs exactly - this is critical for Exclaimer forms
      let matchedOption: Element | null = null;

      // For numeric IDs, prioritize exact matching
      if (/^\d+$/.test(valueToFind)) {
        console.log("Detected numeric ID, using exact matching strategy");

        // Strategy 1: Match by data-value attribute
        for (const option of options) {
          const dataValue = option.getAttribute("data-value");
          if (dataValue === valueToFind) {
            matchedOption = option;
            console.log("Found exact data-value match:", dataValue);
            break;
          }
        }

        // Strategy 2: Match by value attribute
        if (!matchedOption) {
          for (const option of options) {
            const optValue = option.getAttribute("value");
            if (optValue === valueToFind) {
              matchedOption = option;
              console.log("Found exact value attribute match:", optValue);
              break;
            }
          }
        }

        // Strategy 3: Try to match by option text (some implementations show ID in text)
        if (!matchedOption) {
          for (const option of options) {
            const optText = option.textContent?.trim() || "";
            // Check if text contains our numeric ID
            if (optText === valueToFind || optText.includes(valueToFind)) {
              matchedOption = option;
              console.log("Found text match containing ID:", optText);
              break;
            }
          }
        }
      }

      // If numeric matching didn't work, try text-based matching
      if (!matchedOption) {
        console.log("Trying text-based matching strategies");

        // Try exact match
        for (const option of options) {
          const optionText = option.textContent?.toLowerCase().trim() || "";
          if (optionText === valueToFind.toLowerCase()) {
            matchedOption = option;
            console.log("Found exact text match:", optionText);
            break;
          }
        }

        // Try partial match
        if (!matchedOption) {
          for (const option of options) {
            const optionText = option.textContent?.toLowerCase().trim() || "";
            if (optionText.includes(valueToFind.toLowerCase()) || valueToFind.toLowerCase().includes(optionText)) {
              matchedOption = option;
              console.log("Found partial text match:", optionText);
              break;
            }
          }
        }
      }

      // If still no match, use fuzzy matching or select first non-placeholder
      if (!matchedOption && options.length > 0) {
        console.log("No exact match found, using alternative selection strategies");

        // Skip placeholder options
        const nonPlaceholders = Array.from(options).filter(opt => {
          const text = opt.textContent?.toLowerCase().trim() || "";
          return !text.includes("select") && !text.includes("choose") && !text.includes("please") && text !== "";
        });

        if (nonPlaceholders.length > 0) {
          matchedOption = nonPlaceholders[0];
          console.log("Using first non-placeholder option:", matchedOption.textContent);
        } else {
          matchedOption = options[0];
          console.log("Using first available option:", options[0].textContent);
        }
      }

      if (matchedOption) {
        // Click the matched option
        console.log("Clicking on matched option:", matchedOption.textContent);

        try {
          // Click and dispatch events immediately without timeouts
          (matchedOption as HTMLElement).click();

          // Dispatch additional events for React handlers
          // Some React components need these specific events
          const mouseDownEvent = new MouseEvent("mousedown", { bubbles: true });
          matchedOption?.dispatchEvent(mouseDownEvent);

          // Dispatch events to both the option and the original element
          const changeEvent = new Event("change", { bubbles: true });
          element.dispatchEvent(changeEvent);

          // Also try to update any hidden inputs
          const hiddenInput = document.querySelector(
            `input[type="hidden"][name$="${elementId}"], ` + `input[type="hidden"][id$="${elementId}"]`,
          );

          if (hiddenInput instanceof HTMLInputElement) {
            hiddenInput.value = valueToFind;
            hiddenInput.dispatchEvent(new Event("input", { bubbles: true }));
            hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
          }

          console.log("Successfully triggered events on the selected option");
        } catch (e) {
          console.warn("Error clicking option:", e);
        }
      } else {
        console.log("No matching option found");
        document.body.click(); // Close dropdown
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error("Error in handleTsselect:", error);
    return false;
  }
};

// Now define updateSelect function after the helper functions
const updateSelect = (element: HTMLSelectElement, value: string | string[]): void => {
  try {
    const normalizedValues = Array.isArray(value) ? value : [value];
    if (!normalizedValues.length || !normalizedValues[0]) return;

    // Create a proper element identifier with type safety
    const elementName = element.name || "";
    console.log(`Updating select ${element.id || elementName || "unnamed"} with value:`, normalizedValues);

    // Enhanced detection for Exclaimer careers form React-Select components
    const isExclaimerReactSelect =
      window.location.href.includes("exclaimer.com/") &&
      window.location.href.includes("/careers") &&
      (element.getAttribute("id")?.includes("application_form") ||
        element.classList.contains("hide-at-sm-block") ||
        !!document.querySelector(".react-select__value-container"));

    // For numeric IDs on Exclaimer forms, aggressively use Tsselect handler
    const hasNumericValue = /^\d+$/.test(normalizedValues[0]);

    if (
      isExclaimerReactSelect ||
      hasNumericValue ||
      element.getAttribute("role") === "combobox" ||
      element.classList.contains("react-select__input") ||
      element.getAttribute("id")?.includes("application_form")
    ) {
      console.log("Prioritizing Tsselect handler for Exclaimer React component");
      if (handleTsselect(element, normalizedValues)) {
        return; // Successfully handled by Tsselect
      }
    }

    // Continue with existing handlers if Tsselect failed or wasn't applicable
    if (handleReactSelect()) return;

    // Existing code follows...

    // Log available options for debugging
    console.log(
      "Available options:",
      Array.from(element.options).map(opt => ({
        value: opt.value,
        text: opt.text,
        selected: opt.selected,
      })),
    );

    // Check for directly accessible React component container
    const reactContainer =
      element.closest('[class*="react-select"]') ||
      document.querySelector(`[data-filliny-id="${element.id}"][class*="react-select"]`) ||
      document.querySelector(`[class*="react-select"][id*="${element.id}"]`);

    if (reactContainer || element.offsetParent === null || getComputedStyle(element).display === "none") {
      console.log("Detected hidden select or React-Select container, trying specialized handling...");

      // First attempt with React-Select handling
      if (handleReactSelect()) {
        console.log("React-Select handling was applied");
        return;
      }

      // If React-Select handling didn't work, try other libraries
      console.log("Trying other custom select libraries...");
    }

    // Try standard handling for native selects
    // ----------------------------------------

    // Try exact match first
    let matched = false;
    if (element.multiple) {
      // Reset all options first for multiple selects
      Array.from(element.options).forEach(option => {
        option.selected = normalizedValues.includes(option.value);
        if (normalizedValues.includes(option.value)) {
          console.log(`Selected multiple option with value: ${option.value}`);
          matched = true;
        }
      });
    } else {
      // For single selects, try direct value assignment
      const valueToUse = normalizedValues[0];
      console.log(`Attempting to set select value to: ${valueToUse}`);

      // First try direct assignment
      element.value = valueToUse;

      // Check if value was successfully set
      matched = Array.from(element.options).some(option => option.selected && option.value === valueToUse);
      if (matched) {
        console.log(`Successfully set select value to: ${valueToUse}`);
      }
    }

    // If no match was found, try more flexible matching
    if (!matched) {
      console.log("No exact match found, trying flexible matching");
      const lowerValues = normalizedValues.map(v => v.toLowerCase());

      // Try more matching strategies
      const matchAttempts = (option: HTMLOptionElement): boolean => {
        // 1. Direct value matching (case insensitive)
        const valueLower = option.value.toLowerCase();
        if (lowerValues.includes(valueLower)) {
          console.log(`Matched by lowercase value: ${option.value}`);
          return true;
        }

        // 2. Option text matching
        const textLower = option.text.toLowerCase();
        if (lowerValues.includes(textLower)) {
          console.log(`Matched by option text: ${option.text}`);
          return true;
        }

        // 3. Numeric ID matching - convert both to numbers and compare
        if (
          normalizedValues.some(v => {
            const numericValue = parseInt(v, 10);
            const optionNumeric = parseInt(option.value, 10);
            return !isNaN(numericValue) && !isNaN(optionNumeric) && numericValue === optionNumeric;
          })
        ) {
          console.log(`Matched by numeric conversion: ${option.value}`);
          return true;
        }

        // 4. Check if value is contained within option value or text (for partial matches)
        if (lowerValues.some(v => valueLower.includes(v) || textLower.includes(v))) {
          console.log(`Matched by partial content: Value=${option.value}, Text=${option.text}`);
          return true;
        }

        // 5. Data attribute matching
        const dataValue = option.getAttribute("data-value");
        if (dataValue && normalizedValues.includes(dataValue)) {
          console.log(`Matched by data-value attribute: ${dataValue}`);
          return true;
        }

        // 6. Try more aggressive matching: check if option text contains any of the values
        // This helps with lists where values are returned as "John Smith" but options are labeled as "Smith, John"
        if (
          lowerValues.some(v => {
            // Split the value into words and check if option contains all words in any order
            const words = v.split(/\s+/).filter(word => word.length > 2); // Only use words with 3+ chars
            return words.length > 0 && words.every(word => textLower.includes(word));
          })
        ) {
          console.log(`Matched by word presence in text: ${option.text}`);
          return true;
        }

        // 7. Try finding a substring match between the value and the option
        if (
          lowerValues.some(v => {
            // Check for at least a 3-character match that's not just digits
            if (v.length >= 3 && !/^\d+$/.test(v)) {
              return valueLower.includes(v) || textLower.includes(v);
            }
            return false;
          })
        ) {
          console.log(`Matched by significant substring: ${option.text}`);
          return true;
        }

        return false;
      };

      if (element.multiple) {
        // For multiple selects, apply the matching logic to each option
        Array.from(element.options).forEach(option => {
          if (matchAttempts(option)) {
            option.selected = true;
            matched = true;
          }
        });
      } else {
        // For single selects, find the first matching option
        const matchingOption = Array.from(element.options).find(matchAttempts);
        if (matchingOption) {
          matchingOption.selected = true;
          matched = true;
          console.log(`Selected option: value=${matchingOption.value}, text=${matchingOption.text}`);
        }
      }
    }

    // If still no match, try selecting based on option index as a last resort
    if (!matched && normalizedValues.length > 0) {
      console.log("No match found with any strategy, trying index-based selection");

      // Try to interpret the value as a numeric index
      const indexValue = parseInt(normalizedValues[0], 10);
      if (!isNaN(indexValue) && indexValue >= 0 && indexValue < element.options.length) {
        element.selectedIndex = indexValue;
        matched = true;
        console.log(`Selected by index: ${indexValue}, value=${element.options[indexValue].value}`);
      }
      // If not a valid index, select first non-placeholder option as fallback
      else if (element.options.length > 0) {
        // Skip first option if it seems like a placeholder
        const isPlaceholder = (option: HTMLOptionElement): boolean => {
          const text = option.text.toLowerCase();
          return (
            text.includes("select") ||
            text.includes("choose") ||
            text.includes("pick") ||
            text === "" ||
            option.value === "" ||
            option.disabled
          );
        };

        // Try to find the first non-placeholder option
        const firstNonPlaceholder = Array.from(element.options).findIndex(opt => !isPlaceholder(opt));
        if (firstNonPlaceholder > 0) {
          element.selectedIndex = firstNonPlaceholder;
          matched = true;
          console.log(`Selected first non-placeholder option: ${element.options[firstNonPlaceholder].value}`);
        } else {
          // Fall back to first option if no alternatives
          element.selectedIndex = 0;
          matched = true;
          console.log(`Selected first option as last resort: ${element.options[0].value}`);
        }
      }
    }

    // Dispatch events
    dispatchEvent(element, "change");

    // Log final selection state
    console.log("Final select value:", element.value);
    console.log("Selected option index:", element.selectedIndex);
    console.log("Selected option text:", element.options[element.selectedIndex]?.text || "None");

    // Handle other common select libraries
    // ----------------------------------------

    try {
      // Try to determine if it's a hidden native select with custom UI
      const isHidden =
        element.offsetParent === null ||
        getComputedStyle(element).display === "none" ||
        element.style.visibility === "hidden";

      if (isHidden) {
        console.log("Select element is hidden, trying to handle custom UI...");

        // Look for custom UI elements near the hidden select
        const container = element.parentElement;
        if (container) {
          // Try clicking any visible replacement element
          const customUi = container.querySelector<HTMLElement>(
            '[class*="select"], [class*="dropdown"], [role="listbox"], [role="combobox"]',
          );
          if (customUi && customUi !== element) {
            console.log("Found custom UI element, clicking to open dropdown");
            customUi.click();

            // Wait for dropdown to appear
            setTimeout(() => {
              // Find dropdown options
              const options = document.querySelectorAll('[role="option"], [class*="dropdown-item"], [class*="option"]');
              console.log("Found dropdown options:", options.length);

              const valueToFind = normalizedValues[0].toLowerCase();
              for (const option of Array.from(options)) {
                const optionText = option.textContent?.toLowerCase() || "";
                if (optionText.includes(valueToFind)) {
                  console.log("Clicking matching option:", optionText);
                  (option as HTMLElement).click();
                  break;
                }
              }
            }, 100);
          }
        }

        // Special handling for career application forms
        // Many career application forms use custom select UIs without clear identifiers
        try {
          // Look for form container with selects that might be part of job applications
          const isCareerForm =
            window.location.href.includes("career") ||
            window.location.href.includes("job") ||
            window.location.href.includes("application") ||
            document.querySelector('[data-component-name*="Application"]') ||
            document.querySelector('[id*="application-form"]') ||
            document.querySelector('[class*="application-form"]');

          if (isCareerForm) {
            console.log("Career application form detected, applying specialized handling");

            // Try to find interactive elements near our select
            const formFieldContainer = element.closest(
              '[class*="form-field"], [class*="form-group"], [class*="field-container"]',
            );

            if (formFieldContainer) {
              // Try to find the dropdown trigger - common in application forms
              const possibleTriggers = [
                formFieldContainer.querySelector('[class*="select__control"]'),
                formFieldContainer.querySelector('[class*="dropdown-toggle"]'),
                formFieldContainer.querySelector('[role="combobox"]'),
                formFieldContainer.querySelector("input[readonly]"),
                formFieldContainer.querySelector("button"),
                formFieldContainer.querySelector('div[tabindex="0"]'),
                formFieldContainer.querySelector('[class*="control"]'),
              ].filter(Boolean) as HTMLElement[];

              if (possibleTriggers.length > 0) {
                const trigger = possibleTriggers[0];
                console.log("Found potential dropdown trigger in career form:", trigger);

                // Click to open dropdown
                trigger.click();

                // Wait for dropdown to appear and try multiple selectors to find options
                setTimeout(() => {
                  // Common selectors for dropdown options in career forms
                  const optionSelectors = [
                    '[role="option"]',
                    '[class*="option"]',
                    '[class*="dropdown-item"]',
                    '[class*="select-option"]',
                    "li",
                    'div[role="menuitem"]',
                    // Search in portals and popups that might appear outside form
                    'body > div[role="listbox"] [role="option"]',
                    'body > div[class*="dropdown"] li',
                    'body > div[class*="popup"] [role="option"]',
                    '[id$="-list"] [role="option"]',
                    '[id$="-popup"] li',
                    '[id$="-dropdown"] [role="option"]',
                  ];

                  // Try each selector until we find options
                  let allOptions: Element[] = [];

                  for (const selector of optionSelectors) {
                    const options = document.querySelectorAll(selector);
                    if (options.length > 0) {
                      allOptions = Array.from(options);
                      console.log(`Found ${allOptions.length} dropdown options with selector: ${selector}`);
                      break;
                    }
                  }

                  if (allOptions.length > 0) {
                    // Try to match options with our value
                    const valueToFind = normalizedValues[0].toLowerCase();
                    let matched = false;

                    for (const option of allOptions) {
                      const optionText = option.textContent?.toLowerCase().trim() || "";

                      // Try multiple matching strategies
                      if (
                        optionText === valueToFind ||
                        optionText.includes(valueToFind) ||
                        valueToFind.includes(optionText) ||
                        // Match by words
                        valueToFind
                          .split(/\s+/)
                          .filter(w => w.length > 2)
                          .every(word => optionText.includes(word))
                      ) {
                        console.log("Found matching option in career form dropdown:", optionText);
                        (option as HTMLElement).click();
                        matched = true;
                        break;
                      }
                    }

                    // If no match, select non-placeholder option
                    if (!matched) {
                      const nonPlaceholders = allOptions.filter(opt => {
                        const text = opt.textContent?.toLowerCase() || "";
                        return (
                          !text.includes("select") &&
                          !text.includes("choose") &&
                          !text.includes("pick") &&
                          text.length > 0 &&
                          !text.includes("not") &&
                          !(opt as HTMLElement).hasAttribute("disabled")
                        );
                      });

                      if (nonPlaceholders.length > 0) {
                        console.log("Selecting first valid option in career form dropdown");
                        (nonPlaceholders[0] as HTMLElement).click();
                      } else {
                        // Click first option as last resort
                        console.log("No suitable option found, clicking first option");
                        (allOptions[0] as HTMLElement).click();
                      }
                    }
                  } else {
                    console.log("No dropdown options found in career form");
                    // Click outside to close dropdown
                    document.body.click();
                  }
                }, 150);
              }
            }
          }
        } catch (e) {
          console.debug("Career form handling error:", e);
        }
      }

      // Handle jQuery Select2
      if (typeof (window as unknown as Record<string, unknown>).jQuery !== "undefined") {
        const $ = (window as unknown as { jQuery: unknown }).jQuery;
        // Note: We're using any here to avoid type errors with jQuery
        // This is a necessary exception since we're integrating with external libraries
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ($ && typeof ($ as any).fn !== "undefined" && ($ as any).fn.select2) {
          console.log("Detected Select2 library, applying specialized handling");
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const $select = ($ as any)(element);
            if ($select.data && $select.data("select2")) {
              console.log("Select2 instance found, updating value");
              $select.val(normalizedValues[0]).trigger("change.select2");
            }
          } catch (e) {
            console.debug("Select2 handling error:", e);
          }
        }
      }

      // Handle Exclaimer careers site specifically
      if (window.location.href.includes("exclaimer.com") && window.location.href.includes("careers")) {
        console.log("Detected Exclaimer careers site, applying specialized handling");

        try {
          // Find all Tsselect components on the page
          const tsselectComponents = document.querySelectorAll('[data-component-name*="Tsselect"]');

          if (tsselectComponents.length > 0) {
            console.log(`Found ${tsselectComponents.length} Tsselect components on Exclaimer careers`);

            // Try to associate our element with a Tsselect component
            let targetComponent: Element | null = null;

            // Look for a component related to our field
            if (element.id) {
              // Try by ID relation
              targetComponent = document.querySelector(`[data-component-name*="Tsselect"][id*="${element.id}"]`);
            }

            // Try by label text if available
            if (!targetComponent && element.labels && element.labels.length > 0) {
              const labelText = element.labels[0].textContent?.trim().toLowerCase() || "";

              if (labelText) {
                // Find components that might be related to this label
                Array.from(tsselectComponents).forEach(comp => {
                  const compText = comp.textContent?.toLowerCase() || "";
                  if (compText.includes(labelText) || labelText.includes(compText)) {
                    targetComponent = comp;
                  }
                });
              }
            }

            // If we found a component or use the first one as fallback
            const componentToUse = targetComponent || tsselectComponents[0];

            if (componentToUse) {
              console.log("Using Tsselect component:", componentToUse);

              // Click the component to open the dropdown
              (componentToUse as HTMLElement).click();

              // Wait for dropdown to appear
              setTimeout(() => {
                // Exclaimer uses a specific structure for dropdowns
                const dropdownOptions = document.querySelectorAll('div[role="option"], [class*="ts-option"]');

                if (dropdownOptions.length > 0) {
                  console.log(`Found ${dropdownOptions.length} dropdown options`);

                  // Try to find a matching option
                  const valueToFind = normalizedValues[0].toLowerCase();
                  let matched = false;

                  for (const option of Array.from(dropdownOptions)) {
                    const optionText = option.textContent?.toLowerCase().trim() || "";

                    if (
                      optionText === valueToFind ||
                      optionText.includes(valueToFind) ||
                      valueToFind.includes(optionText)
                    ) {
                      console.log("Clicking matching option:", optionText);
                      (option as HTMLElement).click();
                      matched = true;
                      break;
                    }
                  }

                  // If no match found, select a non-placeholder
                  if (!matched) {
                    const nonPlaceholders = Array.from(dropdownOptions).filter(opt => {
                      const text = opt.textContent?.toLowerCase() || "";
                      return (
                        !text.includes("select") &&
                        !text.includes("choose") &&
                        !text.includes("prefer not") &&
                        text.length > 0
                      );
                    });

                    if (nonPlaceholders.length > 0) {
                      console.log("Selecting first non-placeholder option:", nonPlaceholders[0]);
                      (nonPlaceholders[0] as HTMLElement).click();
                    } else {
                      console.log("Falling back to first option");
                      (dropdownOptions[0] as HTMLElement).click();
                    }
                  }
                }
              }, 200);
            }
          }
        } catch (e) {
          console.debug("Exclaimer careers handling error:", e);
        }
      }

      // Handle Chosen library
      if (
        element.classList.contains("chosen-select") ||
        element.nextElementSibling?.classList.contains("chosen-container")
      ) {
        console.log("Detected Chosen library, applying specialized handling");
        try {
          // Update the native select first
          element.value = normalizedValues[0];

          // Then trigger Chosen's update event
          const event = new Event("chosen:updated", { bubbles: true });
          element.dispatchEvent(event);

          // Also try clicking if there's a visible Chosen container
          const chosenContainer = element.nextElementSibling?.classList.contains("chosen-container")
            ? (element.nextElementSibling as HTMLElement)
            : null;
          if (chosenContainer) {
            chosenContainer.click();

            // Look for dropdown items
            setTimeout(() => {
              const valueToFind = normalizedValues[0].toLowerCase();
              const items = document.querySelectorAll(".chosen-results li");
              for (const item of Array.from(items)) {
                if (item.textContent?.toLowerCase().includes(valueToFind)) {
                  (item as HTMLElement).click();
                  break;
                }
              }
            }, 100);
          }
        } catch (e) {
          console.debug("Chosen handling error:", e);
        }
      }

      // Handle Angular Material
      if (
        element.classList.contains("mat-select") ||
        element.parentElement?.classList.contains("mat-form-field") ||
        element.closest(".mat-form-field")
      ) {
        console.log("Detected Angular Material, applying specialized handling");
        try {
          // Find the clickable trigger
          const trigger =
            document.querySelector(`[aria-owns="${element.id}-panel"]`) ||
            element.parentElement?.querySelector(".mat-select-trigger");
          if (trigger) {
            (trigger as HTMLElement).click();

            // Wait for panel to open
            setTimeout(() => {
              const valueToFind = normalizedValues[0].toLowerCase();
              const options = document.querySelectorAll(".mat-option");
              for (const option of Array.from(options)) {
                if (option.textContent?.toLowerCase().includes(valueToFind)) {
                  (option as HTMLElement).click();
                  break;
                }
              }
            }, 100);
          }
        } catch (e) {
          console.debug("Angular Material handling error:", e);
        }
      }

      // Handle Semantic UI
      if (
        element.classList.contains("ui") ||
        element.parentElement?.classList.contains("ui dropdown") ||
        element.closest(".ui.dropdown")
      ) {
        console.log("Detected Semantic UI, applying specialized handling");
        try {
          const dropdown = element.closest(".ui.dropdown") as HTMLElement;
          if (dropdown) {
            // Click to open
            dropdown.click();

            // Find and click the matching item
            setTimeout(() => {
              const valueToFind = normalizedValues[0].toLowerCase();
              const items = dropdown.querySelectorAll(".item");
              for (const item of Array.from(items)) {
                if (
                  item.textContent?.toLowerCase().includes(valueToFind) ||
                  item.getAttribute("data-value") === normalizedValues[0]
                ) {
                  (item as HTMLElement).click();
                  break;
                }
              }
            }, 100);
          }
        } catch (e) {
          console.debug("Semantic UI handling error:", e);
        }
      }
    } catch (e) {
      // Ignore library handling errors - this is just additional support
      console.debug("Select library handling error:", e);
    }
  } catch (error) {
    console.error("Error updating select:", error);
  }
};

/**
 * Upload a file to a file input element with multiple fallback strategies
 */
const updateFileInput = async (element: HTMLInputElement, fileUrl: string): Promise<void> => {
  try {
    if (!fileUrl || !fileUrl.startsWith("http")) {
      console.warn("Invalid file URL:", fileUrl);
      return;
    }

    // Store original element styles for visual feedback
    const originalBorder = element.style.border;
    const originalBackground = element.style.background;

    // Data attributes for reference
    element.setAttribute("data-filliny-file-url", fileUrl);
    element.setAttribute("data-filliny-file-name", fileUrl.split("/").pop() || "file");

    // Visual indicator that we're trying to fill a file
    const addVisualFileIndicator = () => {
      // Find the label or parent element to show the filename visually
      const fileLabel = element.labels?.[0] || element.parentElement;
      if (fileLabel) {
        const indicator = document.createElement("div");
        indicator.textContent = `📎 ${fileUrl.split("/").pop() || "file"}`;
        indicator.style.cssText =
          "color: #4f46e5; margin: 5px 0; font-weight: bold; padding: 5px; border: 1px dashed #4f46e5; background: rgba(79, 70, 229, 0.1); border-radius: 4px;";
        indicator.setAttribute("data-filliny-file-indicator", "true");

        // Remove any existing indicators
        fileLabel.querySelectorAll("[data-filliny-file-indicator]").forEach(el => el.remove());

        // Add the new indicator
        fileLabel.appendChild(indicator);

        // Auto-remove after some time
        setTimeout(() => indicator.remove(), 5000);
      }
    };

    // Strategy 1: DataTransfer API (most reliable modern approach)
    let success = false;

    try {
      // Fetch the file (this may fail due to CORS)
      const response = await fetch(fileUrl, {
        mode: "cors",
        credentials: "omit",
        headers: {
          Accept: "*/*",
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const fileName = fileUrl.split("/").pop() || "file";
        const mimeType = blob.type || guessMimeTypeFromFileName(fileName) || "application/octet-stream";

        const file = new File([blob], fileName, { type: mimeType });

        if (typeof DataTransfer !== "undefined") {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          element.files = dataTransfer.files;
          success = element.files.length > 0;

          if (success) {
            dispatchEvent(element, "input");
            dispatchEvent(element, "change");
          }
        }
      }
    } catch (e) {
      console.warn("Standard file upload approach failed:", e);
    }

    // Strategy 2: Try handling common file upload libraries
    if (!success) {
      // Check for Dropzone.js
      const dropzoneEl = element.closest(".dropzone, [data-dropzone]");
      if (dropzoneEl) {
        // Set data attributes that Dropzone might check
        dropzoneEl.setAttribute("data-file-name", fileUrl.split("/").pop() || "file");
        dropzoneEl.setAttribute("data-file-url", fileUrl);

        // Dispatch custom event that Dropzone might listen for
        dropzoneEl.dispatchEvent(
          new CustomEvent("dropzone:fileadded", {
            bubbles: true,
            detail: { url: fileUrl, name: fileUrl.split("/").pop() || "file" },
          }),
        );
      }

      // Check for jQuery File Upload
      const jqueryUploadEl = element.closest(".fileupload, [data-fileupload]");
      if (jqueryUploadEl) {
        jqueryUploadEl.setAttribute("data-file-name", fileUrl.split("/").pop() || "file");
        jqueryUploadEl.setAttribute("data-file-url", fileUrl);
      }
    }

    // Strategy 3: Click the file input to prompt user action with visual guidance
    // Since browsers restrict programmatic file selection for security,
    // we'll provide visual feedback to guide the user
    addVisualFileIndicator();

    // For accessibility, focus the input to make it easier for users to interact
    element.focus();

    // Add visual feedback to the input itself
    element.style.border = "2px dashed #4f46e5";
    element.style.background = "rgba(79, 70, 229, 0.1)";

    // Restore original styles after a delay
    setTimeout(() => {
      element.style.border = originalBorder;
      element.style.background = originalBackground;
    }, 5000);
  } catch (error) {
    console.error("Error handling file input:", error);
  }
};

/**
 * Guess MIME type from filename
 */
const guessMimeTypeFromFileName = (fileName: string): string | null => {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension) return null;

  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    svg: "image/svg+xml",
    txt: "text/plain",
    csv: "text/csv",
    html: "text/html",
    css: "text/css",
    js: "application/javascript",
    json: "application/json",
    xml: "application/xml",
    zip: "application/zip",
    tar: "application/x-tar",
    gz: "application/gzip",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    wav: "audio/wav",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
  };

  return mimeTypes[extension] || null;
};

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
              // Check if the string value indicates this specific checkbox should be checked
              isChecked =
                valueToUse === checkboxValue ||
                valueToUse.toLowerCase() === "true" ||
                valueToUse.toLowerCase() === "yes" ||
                valueToUse.toLowerCase() === "on" ||
                valueToUse === "1";
            } else if (Array.isArray(valueToUse)) {
              // If array of values, check if this checkbox's value is in the array
              isChecked = valueToUse.some(v => v === checkboxValue);
            }
          } else {
            // Standard boolean conversion for simple cases
            isChecked =
              typeof valueToUse === "boolean"
                ? valueToUse
                : ["true", "yes", "on", "1"].includes(String(valueToUse).toLowerCase());
          }

          // In test mode, check the checkbox by default unless explicitly set to false
          if (isTestMode && (valueToUse === undefined || valueToUse === "")) {
            console.log("Test mode with no explicit value, checking the checkbox by default");
            isChecked = true;
          }

          console.log(`Setting checkbox to: ${isChecked}`);
          updateCheckable(element, isChecked);
          break;
        }

        case "radio": {
          // For radio buttons, we need to find the right one in the group
          const form = element.closest("form") || document;
          const name = element.name;

          if (name) {
            const radioGroup = form.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${name}"]`);
            const radioValue = String(valueToUse).toLowerCase();

            // Log radio button options for debugging
            console.log(
              `Processing radio group ${name} with value "${radioValue}"`,
              Array.from(radioGroup).map(r => ({ value: r.value, id: r.id })),
            );

            // Flag to track if we found and selected a radio
            let foundMatch = false;

            // Special case for test mode with empty value - select first option
            if (isTestMode && (!radioValue || radioValue === "")) {
              if (radioGroup.length > 0) {
                console.log("Test mode with empty value, selecting first radio option");
                updateCheckable(radioGroup[0], true);
                foundMatch = true;
              }
            }
            // Normal processing for non-empty values
            else if (radioValue && radioValue !== "") {
              // Find the matching radio button by value or label text
              for (const radio of Array.from(radioGroup)) {
                // Match by value (case-insensitive)
                const valueMatch = radio.value.toLowerCase() === radioValue;

                // Match by label text
                let labelTextMatch = false;
                const label = radio.labels?.[0] || document.querySelector(`label[for="${radio.id}"]`);
                if (label) {
                  const labelText = label.textContent?.trim().toLowerCase() || "";
                  labelTextMatch = labelText === radioValue;

                  // Log matches for debugging
                  console.log(
                    `Checking radio option: ${radio.value}, label: ${labelText}, matches: ${valueMatch || labelTextMatch}`,
                  );
                }

                // Try to match by partial text if no exact match
                let partialLabelMatch = false;
                if (!valueMatch && !labelTextMatch && label) {
                  partialLabelMatch = label.textContent?.trim().toLowerCase().includes(radioValue) || false;
                }

                // Select the matching radio
                if (valueMatch || labelTextMatch || partialLabelMatch) {
                  console.log(`Found matching radio button: ${radio.value}`);
                  updateCheckable(radio, true);
                  foundMatch = true;
                  break;
                }
              }
            }

            // If no match found, try selecting the first radio as fallback
            if (!foundMatch && radioGroup.length > 0) {
              console.warn(`No matching radio found for value "${radioValue}", selecting first option`);
              updateCheckable(radioGroup[0], true);
            }
          }
          break;
        }

        case "file":
          await updateFileInput(element, getStringValue(valueToUse));
          break;

        default:
          await simulateTyping(element, getStringValue(valueToUse));
      }
    } else if (element instanceof HTMLSelectElement) {
      // Ensure we pass a non-undefined value to updateSelect
      const selectValue = valueToUse !== undefined ? valueToUse : "";
      updateSelect(element, selectValue);
    } else if (element instanceof HTMLTextAreaElement) {
      // For textareas, make special handling for test mode to ensure visibility
      if (isTestMode) {
        // Make sure the textarea value is set directly first
        element.value = getStringValue(valueToUse);

        // For test mode, ensure the textarea is visible and has proper styles
        element.style.minHeight = "50px";

        // Force a redraw to ensure the value is displayed
        element.style.display = "none";
        element.offsetHeight; // Force reflow
        element.style.display = "";
      }

      // Then use the standard typing simulation for event handling
      await simulateTyping(element, getStringValue(valueToUse));

      // Ensure proper size adjustment if the textarea has auto-resize
      if (element.style.height === "auto" || getComputedStyle(element).resize !== "none") {
        element.style.height = "auto";
        element.style.height = `${element.scrollHeight}px`;
      }
    } else if (element instanceof HTMLButtonElement) {
      if (element.type !== "submit" && element.type !== "reset") {
        element.textContent = getStringValue(valueToUse);
      }
    } else if (element.hasAttribute("contenteditable")) {
      await simulateTyping(element, getStringValue(valueToUse));
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
        await simulateTyping(element, getStringValue(valueToUse));
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
