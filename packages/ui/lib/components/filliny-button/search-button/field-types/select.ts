import { findSelectOptions, isCustomSelect, createBaseField } from "./utils";
import type { Field } from "@extension/shared";

/**
 * React Select handler for specialized React Select components
 */
export const handleReactSelect = (): boolean => {
  // This is a placeholder for now, can be expanded with proper implementation
  return false;
};

/**
 * Handle Tsselect components commonly found on career sites
 */
export const handleTsselect = (element: HTMLSelectElement, normalizedValues: string[]): boolean => {
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

/**
 * Update a select element with the provided value
 */
export const updateSelect = (element: HTMLElement, value: string | string[] | unknown): void => {
  try {
    // Handle standard HTML select elements
    if (element instanceof HTMLSelectElement) {
      updateStandardSelect(element, value);
    }
    // Handle ARIA combobox/listbox elements
    else if (element.getAttribute("role") === "combobox" || element.getAttribute("role") === "listbox") {
      updateAriaSelect(element, value);
    }
    // Handle custom select components
    else if (isCustomSelect(element)) {
      updateCustomSelect(element, value);
    }
    // Handle other elements that might be part of a select component
    else {
      // Try to find the actual select element that might be associated with this element
      const associatedSelect = findAssociatedSelectElement(element);
      if (associatedSelect) {
        updateSelect(associatedSelect, value);
      } else {
        console.warn("Could not determine how to update this select-like element:", element);
      }
    }
  } catch (error) {
    console.error("Error updating select element:", error);
  }
};

/**
 * Normalize value to an array of strings
 */
const normalizeSelectValue = (value: string | string[] | unknown): string[] => {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.map(v => String(v));
  }

  // Handle boolean values explicitly
  if (typeof value === "boolean") {
    return [value ? "true" : "false"];
  }

  // Handle numeric values explicitly - keep as exact strings
  if (typeof value === "number") {
    return [String(value)];
  }

  return [String(value)];
};

/**
 * Match a value against an option, considering different formats
 * This handles different representations of the same value (0/1, true/false, etc.)
 */
const isValueMatch = (optionValue: string, targetValue: string): boolean => {
  // First try exact match (most reliable)
  if (optionValue === targetValue) {
    return true;
  }

  // Then try normalized string comparisons (case insensitive)
  const normalizedOption = optionValue.toLowerCase();
  const normalizedTarget = targetValue.toLowerCase();

  if (normalizedOption === normalizedTarget) {
    return true;
  }

  // Handle boolean-like values
  const booleanEquivalents = {
    true: ["1", "yes", "y", "on", "selected", "checked"],
    false: ["0", "no", "n", "off", "unselected", "unchecked"],
  };

  // Check if option is a boolean-equivalent of target
  if (booleanEquivalents.true.includes(normalizedOption) && booleanEquivalents.true.includes(normalizedTarget)) {
    return true;
  }

  if (booleanEquivalents.false.includes(normalizedOption) && booleanEquivalents.false.includes(normalizedTarget)) {
    return true;
  }

  // Check for substring match as a last resort
  return normalizedOption.includes(normalizedTarget) || normalizedTarget.includes(normalizedOption);
};

/**
 * Update a standard HTML select element
 */
const updateStandardSelect = (element: HTMLSelectElement, value: string | string[] | unknown): void => {
  const valueArray = normalizeSelectValue(value);

  // For empty values, select the first option
  if (valueArray.length === 0 || valueArray[0] === "") {
    // Only select first option if it's not a placeholder
    const firstOption = element.options[0];
    if (firstOption && !isPlaceholderOption(firstOption)) {
      element.selectedIndex = 0;
    }

    // Dispatch events to notify of change
    dispatchSelectEvents(element);
    return;
  }

  // Reset all selections
  if (!element.multiple) {
    for (let i = 0; i < element.options.length; i++) {
      element.options[i].selected = false;
    }
  }

  // Track if we've made a successful selection
  let selectionMade = false;

  // First try exact match on value
  for (let i = 0; i < element.options.length; i++) {
    const option = element.options[i];

    // Skip disabled options and placeholders
    if (option.disabled || isPlaceholderOption(option)) continue;

    if (valueArray.some(val => isValueMatch(option.value, val))) {
      option.selected = true;
      selectionMade = true;

      // For single selects, we're done after finding the first match
      if (!element.multiple) break;
    }
  }

  // If no match found, try matching on text content
  if (!selectionMade) {
    for (let i = 0; i < element.options.length; i++) {
      const option = element.options[i];

      // Skip disabled options and placeholders
      if (option.disabled || isPlaceholderOption(option)) continue;

      // Use text content if no exact value match
      const optionText = option.textContent?.trim() || "";

      if (valueArray.some(val => isValueMatch(optionText, val))) {
        option.selected = true;
        selectionMade = true;

        // For single selects, we're done after finding the first match
        if (!element.multiple) break;
      }
    }
  }

  // If still no match found and there's no placeholder, select the first non-placeholder option
  if (!selectionMade && !element.multiple) {
    for (let i = 0; i < element.options.length; i++) {
      const option = element.options[i];
      if (!option.disabled && !isPlaceholderOption(option)) {
        option.selected = true;
        break;
      }
    }
  }

  // Dispatch events to notify of change
  dispatchSelectEvents(element);
};

/**
 * Update an ARIA select element (combobox or listbox)
 */
const updateAriaSelect = (element: HTMLElement, value: string | string[] | unknown): void => {
  const valueArray = normalizeSelectValue(value);
  if (valueArray.length === 0) return;

  // Get options using the helper function
  const options = findSelectOptions(element);

  // No options found
  if (options.length === 0) {
    console.warn("No options found for ARIA select:", element);
    return;
  }

  // First try to find an exact match on value
  let matchFound = false;
  for (const option of options) {
    if (valueArray.some(val => isValueMatch(option.value, val))) {
      // Select this option
      if (option.element.getAttribute("role") === "option") {
        option.element.setAttribute("aria-selected", "true");
        // Update any visible representation of the selection
        updateSelectDisplay(element, option.text);
      }

      matchFound = true;
      break;
    }
  }

  // If no exact match, try matching on text
  if (!matchFound) {
    for (const option of options) {
      if (valueArray.some(val => isValueMatch(option.text, String(val)))) {
        // Select this option
        if (option.element.getAttribute("role") === "option") {
          option.element.setAttribute("aria-selected", "true");
          // Update any visible representation of the selection
          updateSelectDisplay(element, option.text);
        }

        matchFound = true;
        break;
      }
    }
  }

  // If we found a match, trigger a click on the element to ensure any listeners are notified
  if (matchFound) {
    // Find and click any "done" or "apply" buttons if this is an expanded listbox
    const doneButton = document.querySelector('button[aria-label="Done"], button[aria-label="Apply"]');
    if (doneButton instanceof HTMLElement) {
      doneButton.click();
    } else {
      // Just click the element itself to close dropdown, etc.
      element.click();
    }
  }
};

/**
 * Update a custom select component
 */
const updateCustomSelect = (element: HTMLElement, value: string | string[] | unknown): void => {
  const valueArray = normalizeSelectValue(value);
  if (valueArray.length === 0) return;

  // Try to find an associated native select element that might be hidden
  const nativeSelect = element.querySelector("select");
  if (nativeSelect instanceof HTMLSelectElement) {
    updateStandardSelect(nativeSelect, value);
    // Update the visible display element too
    const displayEl = element.querySelector('[class*="selected"], [class*="display"], [class*="value"]');
    if (displayEl instanceof HTMLElement) {
      const selectedOptions = Array.from(nativeSelect.selectedOptions);
      if (selectedOptions.length > 0) {
        displayEl.textContent = selectedOptions.map(opt => opt.textContent).join(", ");
      }
    }
    return;
  }

  // Try to click the component to open the dropdown
  const clickTarget = element.querySelector('button, [role="button"], [class*="select"]') || element;
  if (clickTarget instanceof HTMLElement) {
    clickTarget.click();
  }

  // Give the dropdown time to open
  setTimeout(() => {
    // Look for option elements in dropdown
    const dropdownOptions = findDropdownOptions();

    // Try to find and click the matching option
    let optionClicked = false;
    for (const option of dropdownOptions) {
      const optionText = option.textContent?.trim() || "";
      const optionValue = option.getAttribute("data-value") || optionText;

      // Check for a match
      if (
        valueArray.some(val => {
          return (
            typeof val === "string" &&
            (optionValue.toLowerCase() === val.toLowerCase() || optionText.toLowerCase().includes(val.toLowerCase()))
          );
        })
      ) {
        // Found a match - click it
        option.click();
        optionClicked = true;
        break;
      }
    }

    // If no option was clicked, close the dropdown by clicking outside
    if (!optionClicked) {
      document.body.click();
    }
  }, 100);
};

/**
 * Find options in dropdowns that might be appended to the body
 */
const findDropdownOptions = (): HTMLElement[] => {
  // Common dropdown container selectors
  const containerSelectors = [
    ".dropdown-menu",
    ".select-dropdown",
    ".select-options",
    ".options-list",
    '[role="listbox"]',
    '[role="menu"]',
    ".MuiMenu-list",
    ".ant-select-dropdown",
    ".select__menu",
    ".v-menu__content",
    ".ui.dropdown.active",
  ];

  const options: HTMLElement[] = [];

  // Look for dropdown containers
  for (const selector of containerSelectors) {
    const containers = document.querySelectorAll(selector);
    for (const container of Array.from(containers)) {
      // Check if the container is visible
      if (container instanceof HTMLElement) {
        const style = window.getComputedStyle(container);
        if (style.display !== "none" && style.visibility !== "hidden") {
          // Find option elements within this container
          const containerOptions = container.querySelectorAll(
            'li, [role="option"], .dropdown-item, .select-option, [class*="option"], .item',
          );
          containerOptions.forEach(option => {
            if (option instanceof HTMLElement) {
              options.push(option);
            }
          });
        }
      }
    }
  }

  return options;
};

/**
 * Update the visible display of a select component
 */
const updateSelectDisplay = (element: HTMLElement, text: string): void => {
  // Find any visible text that represents the selection
  const displayElements = [
    element.querySelector('[class*="selected-text"]'),
    element.querySelector('[class*="selected-option"]'),
    element.querySelector('[class*="selected-value"]'),
    element.querySelector('[class*="value"]'),
    element.querySelector('[class*="display"]'),
    element.querySelector("span, div"),
  ].filter(Boolean);

  // Update the first display element found
  for (const display of displayElements) {
    if (display instanceof HTMLElement) {
      display.textContent = text;
      break;
    }
  }
};

/**
 * Find a select element associated with the given element
 */
const findAssociatedSelectElement = (element: HTMLElement): HTMLElement | null => {
  // Check if element is a label that points to a select
  if (element.tagName === "LABEL") {
    const forAttribute = element.getAttribute("for");
    if (forAttribute) {
      const linkedElement = document.getElementById(forAttribute);
      if (linkedElement instanceof HTMLSelectElement) {
        return linkedElement;
      }
    }
  }

  // Check if element contains a select
  const containedSelect = element.querySelector('select, [role="listbox"], [role="combobox"]');
  if (containedSelect instanceof HTMLElement) {
    return containedSelect;
  }

  // Check if element's parent contains a select
  if (element.parentElement) {
    const parentSelect = element.parentElement.querySelector('select, [role="listbox"], [role="combobox"]');
    if (parentSelect instanceof HTMLElement && !parentSelect.contains(element)) {
      return parentSelect;
    }
  }

  // Check if element is part of a custom select component
  let current = element.parentElement;
  while (current) {
    if (isCustomSelect(current)) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
};

/**
 * Check if an option is a placeholder
 */
const isPlaceholderOption = (option: HTMLOptionElement): boolean => {
  // Check common placeholder attributes
  if (option.disabled && option.selected) return true;
  if (option.value === "" || option.value === "-1") return true;

  // Check common placeholder text patterns
  const text = option.textContent?.toLowerCase() || "";
  return (
    text.includes("select") ||
    text.includes("choose") ||
    text === "please select" ||
    text === "-- select --" ||
    text.includes("pick an option") ||
    text === "" ||
    text === "-"
  );
};

/**
 * Dispatch appropriate events for select elements
 */
const dispatchSelectEvents = (element: HTMLSelectElement): void => {
  // Create and dispatch events
  const changeEvent = new Event("change", { bubbles: true });
  element.dispatchEvent(changeEvent);

  const inputEvent = new Event("input", { bubbles: true });
  element.dispatchEvent(inputEvent);
};

/**
 * Detect select fields from a set of elements
 * Handles both native selects and custom select components
 */
export const detectSelectFields = async (
  elements: HTMLElement[],
  baseIndex: number,
  testMode: boolean = false,
): Promise<Field[]> => {
  const fields: Field[] = [];

  console.log(`🔍 Detecting select fields from ${elements.length} elements, testMode: ${testMode}`);

  // Enhanced select element detection with multiple strategies
  const selectElements = elements.filter(element => {
    // Strategy 1: Standard HTML select elements
    if (element instanceof HTMLSelectElement) {
      return true;
    }

    // Strategy 2: ARIA-based select elements
    const role = element.getAttribute("role");
    if (role === "combobox" || role === "listbox") {
      return true;
    }

    // Strategy 3: Popular select libraries
    const className = element.className.toLowerCase();
    if (
      className.includes("select2-container") ||
      className.includes("chosen-container") ||
      className.includes("selectize-control") ||
      className.includes("react-select") ||
      className.includes("vue-select") ||
      className.includes("ng-select")
    ) {
      return true;
    }

    // Strategy 4: Custom select patterns
    const hasSelectPattern =
      className.includes("select") ||
      className.includes("dropdown") ||
      className.includes("picker") ||
      element.getAttribute("data-select") !== null ||
      element.getAttribute("data-dropdown") !== null;

    // Must also have some interactive indicators
    const hasInteractiveIndicators =
      element.hasAttribute("tabindex") ||
      element.hasAttribute("onclick") ||
      element.hasAttribute("onchange") ||
      element.getAttribute("aria-expanded") !== null ||
      element.getAttribute("aria-haspopup") !== null;

    return hasSelectPattern && hasInteractiveIndicators;
  });

  console.log(`📋 Found ${selectElements.length} potential select elements`);

  for (let i = 0; i < selectElements.length; i++) {
    const element = selectElements[i];

    try {
      // Skip disabled/hidden elements
      if (
        element.hasAttribute("disabled") ||
        element.hasAttribute("readonly") ||
        element.getAttribute("aria-hidden") === "true"
      ) {
        console.log(`⏭️ Skipping disabled/readonly select element`);
        continue;
      }

      // Enhanced visibility check
      const style = window.getComputedStyle(element);
      if (style.display === "none" || (style.visibility === "hidden" && style.opacity === "0")) {
        console.log(`⏭️ Skipping hidden select element`);
        continue;
      }

      // Create the field
      const field = await createBaseField(element, baseIndex + i, "select", testMode);

      // Detect if it's a multi-select
      let isMultiple = false;
      if (element instanceof HTMLSelectElement) {
        isMultiple = element.multiple;
      } else {
        isMultiple = element.getAttribute("aria-multiselectable") === "true" || element.hasAttribute("multiple");
      }

      // Enhanced option detection based on element type
      let options: Array<{ value: string; text: string; selected: boolean }> = [];
      let currentValue: string | string[] = "";

      if (element instanceof HTMLSelectElement) {
        // Standard HTML select - get options directly
        options = Array.from(element.options).map(opt => ({
          value: opt.value,
          text: opt.text.trim() || opt.value,
          selected: opt.selected,
        }));

        currentValue = isMultiple ? Array.from(element.selectedOptions).map(opt => opt.value) : element.value;

        field.metadata = {
          framework: "vanilla",
          visibility: { isVisible: true },
          isMultiple,
        };
      } else {
        // Custom select implementation - use enhanced option detection
        options = await detectDynamicSelectOptions(element);

        // Set current value based on selected options
        const selectedOptions = options.filter(opt => opt.selected);
        currentValue = isMultiple
          ? selectedOptions.map(opt => opt.value)
          : selectedOptions.length > 0
            ? selectedOptions[0].value
            : "";

        // Try to detect the framework
        const framework = detectSelectFramework(element);
        field.metadata = {
          framework: framework,
          visibility: { isVisible: true },
          isMultiple,
        };
      }

      // Set the field options and value
      field.options = options;
      field.value = currentValue;

      // Enhanced test value generation for test mode
      if (testMode && options.length > 0) {
        // Filter out placeholder options with better detection
        const validOptions = options.filter(opt => {
          const text = opt.text.toLowerCase().trim();
          const value = opt.value.trim();

          // Skip empty values
          if (!value || value === "") return false;

          // Skip common placeholder patterns
          if (
            text.includes("select") ||
            text.includes("choose") ||
            text.includes("pick") ||
            text.includes("please") ||
            text.includes("--") ||
            text.includes("...") ||
            text === "none" ||
            text === "n/a" ||
            value === "0" ||
            value === "-1"
          ) {
            return false;
          }

          return true;
        });

        console.log(
          `🎯 Select field ${field.id}: Found ${validOptions.length} valid options out of ${options.length} total`,
        );

        if (validOptions.length > 0) {
          if (isMultiple) {
            // For multi-select, pick 1-2 random valid options
            const count = Math.min(1 + Math.floor(Math.random() * 2), validOptions.length);
            const shuffled = [...validOptions].sort(() => 0.5 - Math.random());
            field.testValue = shuffled.slice(0, count).map(opt => opt.value);
            console.log(`🎯 Generated multi-select test value:`, field.testValue);
          } else {
            // For single select, pick a random valid option
            const randomIndex = Math.floor(Math.random() * validOptions.length);
            const randomOption = validOptions[randomIndex];
            field.testValue = randomOption.value;
            console.log(`🎯 Generated single-select test value: ${field.testValue} (${randomOption.text})`);
          }
        } else {
          console.log(`⚠️ No valid options found for select field ${field.id}, using first option as fallback`);
          if (options.length > 0) {
            field.testValue = isMultiple ? [options[0].value] : options[0].value;
          }
        }
      }

      fields.push(field);
      console.log(`✅ Created select field: ${field.id} with ${options.length} options (multiple: ${isMultiple})`);
    } catch (error) {
      console.error(`❌ Error processing select element ${i}:`, error);
    }
  }

  console.log(`📊 Select field detection complete: ${fields.length} fields created`);
  return fields;
};

/**
 * Detect framework for select element
 */
const detectSelectFramework = (element: HTMLElement): "react" | "angular" | "vue" | "vanilla" | "select2" => {
  // Check for Select2
  if (
    element.classList.contains("select2-container") ||
    element.classList.contains("select2-focusser") ||
    element.closest(".select2-container")
  ) {
    return "select2";
  }

  // Check for React
  const reactKey = Object.keys(element).find(key => key.startsWith("__react") || key.startsWith("_reactProps"));
  if (reactKey) return "react";

  // Check for Angular
  if (
    element.hasAttribute("ng-model") ||
    element.hasAttribute("[(ngModel)]") ||
    element.hasAttribute("formControlName")
  ) {
    return "angular";
  }

  // Check for Vue
  if (element.hasAttribute("v-model") || "__vue__" in element) {
    return "vue";
  }

  return "vanilla";
};

/**
 * Detect options for dynamic/custom select components
 */
const detectDynamicSelectOptions = async (
  element: HTMLElement,
): Promise<Array<{ value: string; text: string; selected: boolean }>> => {
  const options: Array<{ value: string; text: string; selected: boolean }> = [];

  try {
    // For Select2, look for the actual select element
    if (element.classList.contains("select2-container")) {
      const selectId = element.getAttribute("id")?.replace("s2id_", "");
      if (selectId) {
        const actualSelect = document.getElementById(selectId) as HTMLSelectElement;
        if (actualSelect && actualSelect instanceof HTMLSelectElement) {
          return Array.from(actualSelect.options).map(opt => ({
            value: opt.value,
            text: opt.text.trim() || opt.value,
            selected: opt.selected,
          }));
        }
      }
    }

    // Check for aria relationships
    const listId = element.getAttribute("aria-controls") || element.getAttribute("aria-owns");
    if (listId) {
      const listbox = document.getElementById(listId);
      if (listbox) {
        const listOptions = Array.from(listbox.querySelectorAll('[role="option"]'));
        if (listOptions.length > 0) {
          return listOptions.map(opt => ({
            value: opt.getAttribute("data-value") || opt.getAttribute("value") || opt.textContent?.trim() || "",
            text: opt.textContent?.trim() || "",
            selected: opt.getAttribute("aria-selected") === "true" || opt.hasAttribute("selected"),
          }));
        }
      }
    }

    // Check for option-like children
    const optionElements = element.querySelectorAll('option, [role="option"]');
    if (optionElements.length > 0) {
      return Array.from(optionElements).map(opt => ({
        value: opt.getAttribute("value") || opt.textContent?.trim() || "",
        text: opt.textContent?.trim() || "",
        selected:
          opt instanceof HTMLOptionElement
            ? opt.selected
            : opt.getAttribute("aria-selected") === "true" || opt.hasAttribute("selected"),
      }));
    }

    // Look for hidden input with JSON data
    const hiddenInputs = element.querySelectorAll('input[type="hidden"]');
    for (const input of Array.from(hiddenInputs)) {
      if (input instanceof HTMLInputElement && input.value) {
        try {
          const parsed = JSON.parse(input.value);
          if (Array.isArray(parsed)) {
            const parsedOptions = parsed
              .map(item => ({
                value: String(item.value || item.id || ""),
                text: String(item.label || item.text || item.name || ""),
                selected: Boolean(item.selected),
              }))
              .filter(opt => opt.value || opt.text);

            if (parsedOptions.length > 0) {
              return parsedOptions;
            }
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
    }
  } catch (error) {
    console.warn("Error detecting select options:", error);
  }

  return options;
};
