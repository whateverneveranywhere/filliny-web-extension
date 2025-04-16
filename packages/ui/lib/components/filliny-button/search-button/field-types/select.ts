import { dispatchEvent, createBaseField } from "./utils";
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
 * Update a select element with the provided value(s)
 */
export const updateSelect = (element: HTMLSelectElement, value: string | string[]): void => {
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
 * Detect select fields from a set of elements
 * Handles both native selects and custom select components
 */
export const detectSelectFields = async (
  elements: HTMLElement[],
  baseIndex: number,
  testMode: boolean = false,
): Promise<Field[]> => {
  const fields: Field[] = [];

  // Get all select elements and custom select elements
  const selectElements = elements.filter(
    element =>
      element instanceof HTMLSelectElement ||
      element.getAttribute("role") === "combobox" ||
      element.getAttribute("role") === "listbox" ||
      element.classList.contains("select2-container") ||
      element.classList.contains("chosen-container"),
  );

  for (let i = 0; i < selectElements.length; i++) {
    const element = selectElements[i];

    // Skip disabled/hidden elements
    if (
      element.hasAttribute("disabled") ||
      element.hasAttribute("readonly") ||
      element.getAttribute("aria-hidden") === "true" ||
      window.getComputedStyle(element).display === "none" ||
      window.getComputedStyle(element).visibility === "hidden"
    ) {
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

    // Handle different select implementations
    if (element instanceof HTMLSelectElement) {
      // Standard HTML select - get options directly
      field.options = Array.from(element.options).map(opt => ({
        value: opt.value,
        text: opt.text.trim() || opt.value,
        selected: opt.selected,
      }));

      field.value = isMultiple ? Array.from(element.selectedOptions).map(opt => opt.value) : element.value;

      field.metadata = {
        framework: "vanilla",
        visibility: { isVisible: true },
        isMultiple,
      };
    } else {
      // Custom select implementation - need to find options
      field.options = await detectDynamicSelectOptions(element);

      // Set current value based on selected options
      const selectedOptions = field.options.filter(opt => opt.selected);
      field.value = isMultiple
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

    // Set test value for test mode
    if (testMode && field.options && field.options.length > 0) {
      // Skip placeholder options like "Select one", "--", etc.
      const validOptions = field.options.filter(
        opt =>
          opt.value &&
          !opt.text.toLowerCase().includes("select") &&
          !opt.text.includes("--") &&
          !opt.text.toLowerCase().includes("please select"),
      );

      if (validOptions.length > 0) {
        if (isMultiple) {
          // For multi-select, pick first two valid options
          field.testValue = validOptions.slice(0, 2).map(opt => opt.value);
        } else {
          // For single select, pick first valid option
          field.testValue = validOptions[0].value;
        }
      }
    }

    fields.push(field);
  }

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
