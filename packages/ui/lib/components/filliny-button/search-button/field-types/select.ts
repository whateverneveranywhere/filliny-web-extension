import {
  findSelectOptions,
  isCustomSelect,
  createBaseField,
  setNativeValue,
  dispatchPointerClickSequence,
  waitForElement,
} from './utils';
import { createDebugLogger, Framework, isHTMLElement, isHTMLSelectElement } from '@extension/shared';
import type { Field } from '@extension/shared';

const debug = createDebugLogger('Select');

/**
 * Enhanced React Select handler for all React Select variants.
 * Async to properly await dropdown rendering before selecting an option.
 */
const handleReactSelect = async (element: HTMLElement, normalizedValues: string[]): Promise<boolean> => {
  try {
    debug.log('🔍 Handling React Select component...', element);

    // Enhanced React Select detection patterns
    const isReactSelect = detectReactSelectComponent(element);

    if (!isReactSelect) {
      return false;
    }

    debug.log('✅ Confirmed React Select component detected');

    // Find the React Select container using multiple strategies
    const selectContainer = findReactSelectContainer(element);

    if (!selectContainer) {
      debug.warn('❌ Could not find React Select container');
      return false;
    }

    debug.log('🎯 Found React Select container:', selectContainer);

    // Open the dropdown
    const opened = openReactSelectDropdown(selectContainer);
    if (!opened) {
      debug.warn('❌ Could not open React Select dropdown');
      return false;
    }

    // Wait for the dropdown menu to render with retry logic.
    // React Select renders the menu asynchronously, so we need to poll for it.
    const menuSelectors = [
      '[class*="react-select__menu"]',
      '[class*="select__menu"]',
      '[class*="css-"][class*="menu"]',
      '[role="listbox"]',
      '.react-select__menu-list',
      '.select__menu-list',
    ];

    let menu: HTMLElement | null = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      for (const selector of menuSelectors) {
        const found = document.querySelector(selector);
        if (found instanceof HTMLElement && window.getComputedStyle(found).display !== 'none') {
          menu = found;
          break;
        }
      }
      if (menu) break;
    }

    if (!menu) {
      debug.warn('❌ React Select menu did not appear after waiting');
      // Close dropdown by clicking outside
      document.body.click();
      return false;
    }

    // Select the option now that the menu is visible
    selectReactSelectOption(normalizedValues[0], element);

    return true;
  } catch (error) {
    debug.error('❌ Error in handleReactSelect:', error);
    return false;
  }
};

/**
 * Detect if element is part of a React Select component
 */
const detectReactSelectComponent = (element: HTMLElement): boolean => {
  // Check element itself
  if (hasReactSelectClasses(element)) return true;

  // Check parent chain (up to 5 levels)
  let current = element.parentElement;
  let depth = 0;
  while (current && depth < 5) {
    if (hasReactSelectClasses(current)) return true;
    current = current.parentElement;
    depth++;
  }

  // Check for React Select specific attributes
  if (element.getAttribute('role') === 'combobox' && element.className.includes('select')) {
    return true;
  }

  // Check for hidden inputs with React Select patterns
  const form = element.closest('form, [role="form"]');
  if (form) {
    const hiddenInputs = form.querySelectorAll('input[type="hidden"]');
    for (const input of Array.from(hiddenInputs)) {
      if (input.getAttribute('name')?.includes('select') || input.getAttribute('id')?.includes('select')) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Check if element has React Select related classes
 */
const hasReactSelectClasses = (element: HTMLElement): boolean => {
  const className = element.className.toLowerCase();
  const reactSelectPatterns = [
    'react-select',
    'select__control',
    'select__container',
    'select__input',
    'select__value-container',
    'select__single-value',
    'select__placeholder',
    'select__dropdown-indicator',
    'css-.*-control', // Emotion CSS classes
    'css-.*-container',
    'css-.*-valuecontainer',
  ];

  return reactSelectPatterns.some(pattern => {
    if (pattern.includes('css-.*')) {
      return new RegExp(pattern).test(className);
    }
    return className.includes(pattern);
  });
};

/**
 * Find the React Select container element
 */
const findReactSelectContainer = (element: HTMLElement): HTMLElement | null => {
  // Strategy 1: Look for container in parent chain
  let current: HTMLElement | null = element;
  while (current) {
    if (
      current.className.includes('react-select') &&
      (current.className.includes('container') || current.className.includes('control'))
    ) {
      return current;
    }
    current = current.parentElement;
  }

  // Strategy 2: Look for control element
  current = element;
  while (current) {
    if (current.className.includes('select__control') || current.className.includes('control')) {
      return current;
    }
    current = current.parentElement;
  }

  // Strategy 3: Use CSS selector to find nearby React Select
  const nearbySelects = document.querySelectorAll(`
    [class*="react-select"][class*="container"],
    [class*="select__container"],
    [class*="css-"][class*="container"]
  `);

  let closest: HTMLElement | null = null;
  let closestDistance = Infinity;

  for (const select of Array.from(nearbySelects)) {
    if (isHTMLElement(select)) {
      const distance = getElementDistance(element, select);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = select;
      }
    }
  }

  return closest;
};

/**
 * Calculate distance between two elements
 */
const getElementDistance = (el1: HTMLElement, el2: HTMLElement): number => {
  const rect1 = el1.getBoundingClientRect();
  const rect2 = el2.getBoundingClientRect();

  return Math.abs(rect1.top - rect2.top) + Math.abs(rect1.left - rect2.left);
};

/**
 * Open React Select dropdown
 */
const openReactSelectDropdown = (container: HTMLElement): boolean => {
  try {
    // Try clicking the control area
    const control = container.querySelector('[class*="control"]') || container;
    if (control instanceof HTMLElement) {
      dispatchPointerClickSequence(control);

      // Also try clicking the dropdown indicator
      const indicator = container.querySelector('[class*="dropdown-indicator"], [class*="indicatorContainer"]');
      if (indicator instanceof HTMLElement) {
        dispatchPointerClickSequence(indicator);
      }

      return true;
    }

    return false;
  } catch (error) {
    debug.error('Error opening React Select dropdown:', error);
    return false;
  }
};

/**
 * Select an option in React Select dropdown
 */
const selectReactSelectOption = (value: string, originalElement: HTMLElement): void => {
  try {
    // Find dropdown menu
    const menuSelectors = [
      '[class*="react-select__menu"]',
      '[class*="select__menu"]',
      '[class*="css-"][class*="menu"]',
      '[role="listbox"]',
      '.react-select__menu-list',
      '.select__menu-list',
    ];

    let menu: HTMLElement | null = null;
    for (const selector of menuSelectors) {
      const element = document.querySelector(selector);
      if (isHTMLElement(element) && window.getComputedStyle(element).display !== 'none') {
        menu = element;
        break;
      }
    }

    if (!menu) {
      debug.warn('Could not find React Select dropdown menu');
      return;
    }

    // Find options
    const optionSelectors = [
      '[class*="react-select__option"]',
      '[class*="select__option"]',
      '[class*="css-"][class*="option"]',
      '[role="option"]',
    ];

    const options: HTMLElement[] = [];
    for (const selector of optionSelectors) {
      const foundOptions = menu.querySelectorAll(selector);
      if (foundOptions.length > 0) {
        for (const opt of Array.from(foundOptions)) {
          if (isHTMLElement(opt)) {
            options.push(opt);
          }
        }
        break;
      }
    }

    if (options.length === 0) {
      debug.warn('No options found in React Select dropdown');
      return;
    }

    // Find matching option
    const matchingOption = findMatchingReactSelectOption(options, value);

    if (matchingOption) {
      debug.log('🎯 Clicking matching React Select option:', matchingOption.textContent);
      dispatchPointerClickSequence(matchingOption);

      // Update original element
      if (originalElement instanceof HTMLInputElement) {
        originalElement.value = value;
        originalElement.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else {
      debug.warn('No matching option found for value:', value);
      // Close dropdown by clicking outside
      document.body.click();
    }
  } catch (error) {
    debug.error('Error selecting React Select option:', error);
  }
};

/**
 * Find matching option in React Select dropdown
 */
const findMatchingReactSelectOption = (options: HTMLElement[], value: string): HTMLElement | null => {
  const normalizedValue = value.toLowerCase().trim();

  // Strategy 1: Exact value match
  for (const option of options) {
    const optionValue =
      option.getAttribute('data-value') || option.getAttribute('value') || option.textContent?.trim() || '';

    if (optionValue.toLowerCase() === normalizedValue) {
      return option;
    }
  }

  // Strategy 2: Text content match
  for (const option of options) {
    const optionText = option.textContent?.toLowerCase().trim() || '';
    if (optionText === normalizedValue) {
      return option;
    }
  }

  // Strategy 3: Partial match
  for (const option of options) {
    const optionText = option.textContent?.toLowerCase().trim() || '';
    if (optionText.includes(normalizedValue) || normalizedValue.includes(optionText)) {
      return option;
    }
  }

  // Strategy 4: First non-placeholder option
  for (const option of options) {
    const optionText = option.textContent?.toLowerCase().trim() || '';
    if (
      !optionText.includes('select') &&
      !optionText.includes('choose') &&
      !optionText.includes('please') &&
      optionText.length > 0
    ) {
      return option;
    }
  }

  return null;
};

/**
 * Enhanced Material-UI Select handler.
 * Async to properly await dropdown rendering before selecting an option.
 */
const handleMaterialUISelect = async (element: HTMLElement, normalizedValues: string[]): Promise<boolean> => {
  try {
    debug.log('🔍 Handling Material-UI Select component...', element);

    // Enhanced Material-UI detection patterns
    const isMaterialUI = detectMaterialUIComponent(element);

    if (!isMaterialUI) {
      return false;
    }

    debug.log('✅ Confirmed Material-UI Select component detected');

    // Find the Material-UI select container
    const selectContainer = findMaterialUISelectContainer(element);

    if (!selectContainer) {
      debug.warn('❌ Could not find Material-UI Select container');
      return false;
    }

    debug.log('🎯 Found Material-UI Select container:', selectContainer);

    // Open the dropdown
    const opened = openMaterialUIDropdown(selectContainer);
    if (!opened) {
      debug.warn('❌ Could not open Material-UI dropdown');
      return false;
    }

    // Wait for the MUI dropdown to render (uses Popover/Menu portals).
    // MUI renders menu items in a portal at the end of document.body,
    // so we poll for it with a short timeout.
    const muiMenuSelectors = [
      '[class*="MuiMenu-paper"] [role="listbox"]',
      '[class*="MuiMenu-paper"] [role="presentation"]',
      '[class*="MuiPopover-paper"] [role="listbox"]',
      '[class*="MuiMenu-list"]',
      '[role="listbox"]',
      '[role="presentation"] [role="option"]',
    ];

    let menuFound = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      for (const selector of muiMenuSelectors) {
        const found = document.querySelector(selector);
        if (found instanceof HTMLElement && window.getComputedStyle(found).display !== 'none') {
          menuFound = true;
          break;
        }
      }
      if (menuFound) break;
    }

    if (!menuFound) {
      debug.warn('❌ Material-UI dropdown menu did not appear after waiting');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return false;
    }

    // Select the option now that the menu is visible
    selectMaterialUIOption(normalizedValues[0], element);

    return true;
  } catch (error) {
    debug.error('❌ Error in handleMaterialUISelect:', error);
    return false;
  }
};

/**
 * Detect if element is part of a Material-UI Select component
 */
const detectMaterialUIComponent = (element: HTMLElement): boolean => {
  // Check element itself
  if (hasMaterialUIClasses(element)) return true;

  // Check parent chain (up to 5 levels)
  let current = element.parentElement;
  let depth = 0;
  while (current && depth < 5) {
    if (hasMaterialUIClasses(current)) return true;
    current = current.parentElement;
    depth++;
  }

  // Check for Material-UI specific attributes
  if (element.getAttribute('role') === 'combobox' && element.className.includes('Mui')) {
    return true;
  }

  // Check for hidden native select with Material-UI patterns
  const nativeSelect = element.querySelector('select') || element.parentElement?.querySelector('select');
  if (nativeSelect && nativeSelect.parentElement && hasMaterialUIClasses(nativeSelect.parentElement)) {
    return true;
  }

  return false;
};

/**
 * Check if element has Material-UI related classes
 */
const hasMaterialUIClasses = (element: HTMLElement): boolean => {
  if (!element) return false;

  const className = element.className.toLowerCase();
  const materialUIPatterns = [
    'mui',
    'muiselect',
    'muiformcontrol',
    'muiinputbase',
    'muiinput',
    'muioutlinedinput',
    'muifilledinput',
    'css-.*-muiselect', // Emotion CSS classes
    'css-.*-muiinputbase',
    'css-.*-muiinput',
    'makeStyles', // Material-UI JSS
    'withStyles',
  ];

  return materialUIPatterns.some(pattern => {
    if (pattern.includes('css-.*')) {
      return new RegExp(pattern).test(className);
    }
    return className.includes(pattern);
  });
};

/**
 * Find the Material-UI select container element
 */
const findMaterialUISelectContainer = (element: HTMLElement): HTMLElement | null => {
  // Strategy 1: Look for FormControl in parent chain
  let current: HTMLElement | null = element;
  while (current) {
    if (current.className.includes('MuiFormControl') || current.className.includes('MuiSelect')) {
      return current;
    }
    current = current.parentElement;
  }

  // Strategy 2: Look for InputBase
  current = element;
  while (current) {
    if (current.className.includes('MuiInputBase') || current.className.includes('MuiInput')) {
      return current;
    }
    current = current.parentElement;
  }

  // Strategy 3: Use CSS selector to find nearby Material-UI select
  const nearbySelects = document.querySelectorAll(`
    [class*="MuiSelect"],
    [class*="MuiFormControl"],
    [class*="MuiInputBase"],
    [class*="css-"][class*="MuiSelect"],
    [class*="css-"][class*="MuiInputBase"]
  `);

  let closest: HTMLElement | null = null;
  let closestDistance = Infinity;

  for (const select of Array.from(nearbySelects)) {
    if (isHTMLElement(select)) {
      const distance = getElementDistance(element, select);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = select;
      }
    }
  }

  return closest;
};

/**
 * Open Material-UI dropdown
 */
const openMaterialUIDropdown = (container: HTMLElement): boolean => {
  try {
    // Try clicking the select element
    const selectElement =
      container.querySelector('[role="combobox"], [role="button"]') || container.querySelector('input') || container;

    if (selectElement instanceof HTMLElement) {
      dispatchPointerClickSequence(selectElement);

      // Also try clicking the dropdown arrow
      const arrow = container.querySelector('[class*="arrow"], [class*="icon"], [class*="dropdown"]');
      if (arrow instanceof HTMLElement) {
        dispatchPointerClickSequence(arrow);
      }

      return true;
    }

    return false;
  } catch (error) {
    debug.error('Error opening Material-UI dropdown:', error);
    return false;
  }
};

/**
 * Select an option in Material-UI dropdown
 */
const selectMaterialUIOption = (value: string, originalElement: HTMLElement): void => {
  try {
    // Find dropdown menu - Material-UI often uses Popover or Menu
    const menuSelectors = [
      '[class*="MuiMenu-list"]',
      '[class*="MuiPopover-paper"]',
      '[class*="MuiSelect-menu"]',
      '[class*="css-"][class*="MuiMenu"]',
      '[role="listbox"]',
      '[role="menu"]',
    ];

    let menu: HTMLElement | null = null;
    for (const selector of menuSelectors) {
      const element = document.querySelector(selector);
      if (isHTMLElement(element) && window.getComputedStyle(element).display !== 'none') {
        menu = element;
        break;
      }
    }

    if (!menu) {
      debug.warn('Could not find Material-UI dropdown menu');
      return;
    }

    // Find options
    const optionSelectors = [
      '[class*="MuiMenuItem"]',
      '[class*="MuiListItem"]',
      '[class*="css-"][class*="MuiMenuItem"]',
      '[role="option"]',
      '[role="menuitem"]',
    ];

    const options: HTMLElement[] = [];
    for (const selector of optionSelectors) {
      const foundOptions = menu.querySelectorAll(selector);
      if (foundOptions.length > 0) {
        for (const opt of Array.from(foundOptions)) {
          if (isHTMLElement(opt)) {
            options.push(opt);
          }
        }
        break;
      }
    }

    if (options.length === 0) {
      debug.warn('No options found in Material-UI dropdown');
      return;
    }

    // Find matching option
    const matchingOption = findMatchingMaterialUIOption(options, value);

    if (matchingOption) {
      debug.log('🎯 Clicking matching Material-UI option:', matchingOption.textContent);
      dispatchPointerClickSequence(matchingOption);

      // Update original element if it's an input
      if (originalElement instanceof HTMLInputElement) {
        originalElement.value = value;
        originalElement.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else {
      debug.warn('No matching option found for value:', value);
      // Close dropdown by pressing Escape
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    }
  } catch (error) {
    debug.error('Error selecting Material-UI option:', error);
  }
};

/**
 * Find matching option in Material-UI dropdown
 */
const findMatchingMaterialUIOption = (options: HTMLElement[], value: string): HTMLElement | null => {
  const normalizedValue = value.toLowerCase().trim();

  // Strategy 1: Exact value match
  for (const option of options) {
    const optionValue =
      option.getAttribute('data-value') || option.getAttribute('value') || option.textContent?.trim() || '';

    if (optionValue.toLowerCase() === normalizedValue) {
      return option;
    }
  }

  // Strategy 2: Text content match
  for (const option of options) {
    const optionText = option.textContent?.toLowerCase().trim() || '';
    if (optionText === normalizedValue) {
      return option;
    }
  }

  // Strategy 3: Partial match
  for (const option of options) {
    const optionText = option.textContent?.toLowerCase().trim() || '';
    if (optionText.includes(normalizedValue) || normalizedValue.includes(optionText)) {
      return option;
    }
  }

  // Strategy 4: First non-placeholder option
  for (const option of options) {
    const optionText = option.textContent?.toLowerCase().trim() || '';
    if (
      !optionText.includes('select') &&
      !optionText.includes('choose') &&
      !optionText.includes('please') &&
      optionText.length > 0
    ) {
      return option;
    }
  }

  return null;
};

/**
 * Handle Tsselect components commonly found on career sites
 */
const handleTsselect = (element: HTMLSelectElement, normalizedValues: string[]): boolean => {
  try {
    debug.log('Attempting to handle Tsselect component...');

    // Enhanced check for React-Select components used on Exclaimer careers site
    const isReactSelect =
      element.classList.contains('react-select__input') ||
      element.parentElement?.classList.contains('css-1hac4vs-dummyInput') ||
      !!element.closest('.css-26l3qy-container') ||
      !!element.closest('[class*="react-select"]') ||
      element.getAttribute('role') === 'combobox' ||
      element.getAttribute('id')?.includes('application_form');

    if (isReactSelect) {
      debug.log('Detected React-Select component...', element.id);

      // Look for both visible and hidden select elements
      // Exclaimer careers site uses a hidden native select with specific classes
      const elementId = element.id || '';
      const fieldNumber = elementId.match(/field-(\d+)/)?.[1] || '';

      // Try multiple strategies to find associated hidden selects
      const possibleHiddenSelectEl = document.querySelector(
        `select.hide-at-sm-block[id$="field-${fieldNumber}"], ` +
          `select[id$="${elementId.split('_').pop()}"], ` +
          `select[data-filliny-id="${element.getAttribute('data-filliny-id')}"]`,
      );

      if (isHTMLSelectElement(possibleHiddenSelectEl)) {
        debug.log('Found associated hidden select:', possibleHiddenSelectEl.id);

        // Try updating the hidden select directly
        try {
          possibleHiddenSelectEl.value = normalizedValues[0];
          possibleHiddenSelectEl.dispatchEvent(new Event('change', { bubbles: true }));
          debug.log('Updated hidden select value to', normalizedValues[0]);
        } catch (e) {
          debug.warn('Could not update hidden select:', e);
        }
      }

      // Find the React-Select container - try multiple approaches for Exclaimer site
      let selectContainer: HTMLElement | null = null;

      // Approach 1: Find through parent chain
      const closestContainer = element.closest('[class*="react-select"][class*="container"]');
      if (isHTMLElement(closestContainer)) {
        selectContainer = closestContainer;
      }

      // Approach 2: Find through related element IDs
      if (!selectContainer && elementId) {
        const relatedId = elementId.replace('input', 'control');
        const relatedEl = document.querySelector(
          `[id="${relatedId}"], [id*="${elementId.split('_')[0]}"][class*="container"]`,
        );
        if (isHTMLElement(relatedEl)) {
          selectContainer = relatedEl;
        }
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
            if (isHTMLElement(container)) {
              const rect1 = element.getBoundingClientRect();
              const rect2 = container.getBoundingClientRect();
              const distance = Math.abs(rect1.top - rect2.top) + Math.abs(rect1.left - rect2.left);

              if (distance < closestDistance) {
                closestDistance = distance;
                selectContainer = container;
              }
            }
          });
        }
      }

      // Approach 4: Find by looking at parent elements
      if (!selectContainer) {
        let currentElement = element.parentElement;
        while (currentElement && !selectContainer) {
          if (
            currentElement.classList.contains('react-select__control') ||
            currentElement.classList.toString().includes('react-select')
          ) {
            selectContainer = currentElement;
          }
          currentElement = currentElement.parentElement;
        }
      }

      if (!selectContainer) {
        debug.warn('Could not find React-Select container to click');
        return false;
      }

      debug.log('Found select container:', selectContainer);

      // Click to open the dropdown
      dispatchPointerClickSequence(selectContainer);
      debug.log('Clicked on select container to open dropdown');

      // Process dropdown immediately rather than using setTimeout
      const optionSelectors = [
        '.react-select__menu .react-select__option',
        '.css-26l3qy-menu .css-4ljt47-option',
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
        debug.log('No dropdown options found for React-Select');
        document.body.click(); // Close dropdown
        return true;
      }

      // Get the value we're looking for
      const valueToFind = normalizedValues[0];
      debug.log('Looking for option matching:', valueToFind);

      // First try to match numeric IDs exactly - this is critical for Exclaimer forms
      let matchedOption: Element | null = null;

      // For numeric IDs, prioritize exact matching
      if (/^\d+$/.test(valueToFind)) {
        debug.log('Detected numeric ID, using exact matching strategy');

        // Strategy 1: Match by data-value attribute
        for (const option of options) {
          const dataValue = option.getAttribute('data-value');
          if (dataValue === valueToFind) {
            matchedOption = option;
            debug.log('Found exact data-value match:', dataValue);
            break;
          }
        }

        // Strategy 2: Match by value attribute
        if (!matchedOption) {
          for (const option of options) {
            const optValue = option.getAttribute('value');
            if (optValue === valueToFind) {
              matchedOption = option;
              debug.log('Found exact value attribute match:', optValue);
              break;
            }
          }
        }

        // Strategy 3: Try to match by option text (some implementations show ID in text)
        if (!matchedOption) {
          for (const option of options) {
            const optText = option.textContent?.trim() || '';
            // Check if text contains our numeric ID
            if (optText === valueToFind || optText.includes(valueToFind)) {
              matchedOption = option;
              debug.log('Found text match containing ID:', optText);
              break;
            }
          }
        }
      }

      // If numeric matching didn't work, try text-based matching
      if (!matchedOption) {
        debug.log('Trying text-based matching strategies');

        // Try exact match
        for (const option of options) {
          const optionText = option.textContent?.toLowerCase().trim() || '';
          if (optionText === valueToFind.toLowerCase()) {
            matchedOption = option;
            debug.log('Found exact text match:', optionText);
            break;
          }
        }

        // Try partial match
        if (!matchedOption) {
          for (const option of options) {
            const optionText = option.textContent?.toLowerCase().trim() || '';
            if (optionText.includes(valueToFind.toLowerCase()) || valueToFind.toLowerCase().includes(optionText)) {
              matchedOption = option;
              debug.log('Found partial text match:', optionText);
              break;
            }
          }
        }
      }

      // If still no match, use fuzzy matching or select first non-placeholder
      if (!matchedOption && options.length > 0) {
        debug.log('No exact match found, using alternative selection strategies');

        // Skip placeholder options
        const nonPlaceholders = Array.from(options).filter(opt => {
          const text = opt.textContent?.toLowerCase().trim() || '';
          return !text.includes('select') && !text.includes('choose') && !text.includes('please') && text !== '';
        });

        if (nonPlaceholders.length > 0) {
          matchedOption = nonPlaceholders[0];
          debug.log('Using first non-placeholder option:', matchedOption.textContent);
        } else {
          matchedOption = options[0];
          debug.log('Using first available option:', options[0].textContent);
        }
      }

      if (matchedOption && isHTMLElement(matchedOption)) {
        // Click the matched option
        debug.log('Clicking on matched option:', matchedOption.textContent);

        try {
          // Click and dispatch events immediately without timeouts
          dispatchPointerClickSequence(matchedOption);

          // Dispatch events to both the option and the original element
          const changeEvent = new Event('change', { bubbles: true });
          element.dispatchEvent(changeEvent);

          // Also try to update any hidden inputs
          const hiddenInput = document.querySelector(
            `input[type="hidden"][name$="${elementId}"], ` + `input[type="hidden"][id$="${elementId}"]`,
          );

          if (hiddenInput instanceof HTMLInputElement) {
            hiddenInput.value = valueToFind;
            hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
            hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
          }

          debug.log('Successfully triggered events on the selected option');
        } catch (e) {
          debug.warn('Error clicking option:', e);
        }
      } else {
        debug.log('No matching option found');
        document.body.click(); // Close dropdown
      }

      return true;
    }

    return false;
  } catch (error) {
    debug.error('Error in handleTsselect:', error);
    return false;
  }
};

/**
 * Update a select element with the provided value
 */
const updateSelect = async (element: HTMLElement, value: string | string[] | unknown): Promise<void> => {
  try {
    const normalizedValues = normalizeSelectValue(value);

    // Enhanced framework-specific handling

    // 1. Try React Select first (most common modern pattern)
    if (await handleReactSelect(element, normalizedValues)) {
      debug.log('✅ Successfully handled as React Select');
      return;
    }

    // 2. Try Material-UI Select
    if (await handleMaterialUISelect(element, normalizedValues)) {
      debug.log('✅ Successfully handled as Material-UI Select');
      return;
    }

    // 3. Try Headless UI select
    if (element.closest('[data-headlessui-state]') || element.querySelector('[data-headlessui-state]')) {
      const result = await handleHeadlessUISelect(element, normalizedValues[0] || '');
      if (result) {
        debug.log('✅ Successfully handled as Headless UI Select');
        return;
      }
    }

    // 4. Try Radix UI select
    if (
      element.closest('[data-radix-select-trigger]') ||
      element.querySelector('[data-radix-collection-item]') ||
      element.closest('[data-radix-slot]')
    ) {
      const result = await handleRadixSelect(element, normalizedValues[0] || '');
      if (result) {
        debug.log('✅ Successfully handled as Radix UI Select');
        return;
      }
    }

    // 5. Try specialized Tsselect handler (for career sites)
    if (element instanceof HTMLSelectElement && handleTsselect(element, normalizedValues)) {
      debug.log('✅ Successfully handled as Tsselect');
      return;
    }

    // 6. Standard HTML select elements
    if (element instanceof HTMLSelectElement) {
      updateStandardSelect(element, value);
      return;
    }

    // 7. ARIA combobox/listbox elements
    if (element.getAttribute('role') === 'combobox' || element.getAttribute('role') === 'listbox') {
      updateAriaSelect(element, value);
      return;
    }

    // 8. Custom select components (fallback)
    if (isCustomSelect(element)) {
      updateCustomSelect(element, value);
      return;
    }

    // 9. Try to find associated select element
    const associatedSelect = findAssociatedSelectElement(element);
    if (associatedSelect) {
      await updateSelect(associatedSelect, value);
      return;
    }

    debug.warn('Could not determine how to update this select-like element:', element);
  } catch (error) {
    debug.error('Error updating select element:', error);
  }
};

/**
 * Normalize value to an array of strings
 */
const normalizeSelectValue = (value: string | string[] | unknown): string[] => {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.map(v => String(v));
  }

  // Handle boolean values explicitly
  if (typeof value === 'boolean') {
    return [value ? 'true' : 'false'];
  }

  // Handle numeric values explicitly - keep as exact strings
  if (typeof value === 'number') {
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
    true: ['1', 'yes', 'y', 'on', 'selected', 'checked'],
    false: ['0', 'no', 'n', 'off', 'unselected', 'unchecked'],
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
  if (valueArray.length === 0 || valueArray[0] === '') {
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
  let matchedOptionValue = '';

  // First try exact match on value
  for (let i = 0; i < element.options.length; i++) {
    const option = element.options[i];

    // Skip disabled options and placeholders
    if (option.disabled || isPlaceholderOption(option)) continue;

    if (valueArray.some(val => isValueMatch(option.value, val))) {
      option.selected = true;
      matchedOptionValue = option.value;
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
      const optionText = option.textContent?.trim() || '';

      if (valueArray.some(val => isValueMatch(optionText, val))) {
        option.selected = true;
        matchedOptionValue = option.value;
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
        matchedOptionValue = option.value;
        break;
      }
    }
  }

  // Use setNativeValue as the primary way to set the value (bypasses framework interception)
  if (matchedOptionValue && !element.multiple) {
    setNativeValue(element, matchedOptionValue);
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
    debug.warn('No options found for ARIA select:', element);
    return;
  }

  // First try to find an exact match on value
  let matchFound = false;
  for (const option of options) {
    if (valueArray.some(val => isValueMatch(option.value, val))) {
      // Select this option
      if (option.element.getAttribute('role') === 'option') {
        option.element.setAttribute('aria-selected', 'true');
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
        if (option.element.getAttribute('role') === 'option') {
          option.element.setAttribute('aria-selected', 'true');
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
  const nativeSelect = element.querySelector('select');
  if (nativeSelect instanceof HTMLSelectElement) {
    updateStandardSelect(nativeSelect, value);
    // Update the visible display element too
    const displayEl = element.querySelector('[class*="selected"], [class*="display"], [class*="value"]');
    if (displayEl instanceof HTMLElement) {
      const selectedOptions = Array.from(nativeSelect.selectedOptions);
      if (selectedOptions.length > 0) {
        displayEl.textContent = selectedOptions.map(opt => opt.textContent).join(', ');
      }
    }
    return;
  }

  // Try to click the component to open the dropdown
  const clickTarget = element.querySelector('button, [role="button"], [class*="select"]') || element;
  if (clickTarget instanceof HTMLElement) {
    dispatchPointerClickSequence(clickTarget);
  }

  // Give the dropdown time to open
  setTimeout(() => {
    // Look for option elements in dropdown
    const dropdownOptions = findDropdownOptions();

    // Try to find and click the matching option
    let optionClicked = false;
    for (const option of dropdownOptions) {
      const optionText = option.textContent?.trim() || '';
      const optionValue = option.getAttribute('data-value') || optionText;

      // Check for a match
      if (
        valueArray.some(
          val =>
            typeof val === 'string' &&
            (optionValue.toLowerCase() === val.toLowerCase() || optionText.toLowerCase().includes(val.toLowerCase())),
        )
      ) {
        // Found a match - click it
        dispatchPointerClickSequence(option);
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
    '.dropdown-menu',
    '.select-dropdown',
    '.select-options',
    '.options-list',
    '[role="listbox"]',
    '[role="menu"]',
    '.MuiMenu-list',
    '.ant-select-dropdown',
    '.select__menu',
    '.v-menu__content',
    '.ui.dropdown.active',
  ];

  const options: HTMLElement[] = [];

  // Look for dropdown containers
  for (const selector of containerSelectors) {
    const containers = document.querySelectorAll(selector);
    for (const container of Array.from(containers)) {
      // Check if the container is visible
      if (container instanceof HTMLElement) {
        const style = window.getComputedStyle(container);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
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
    element.querySelector('span, div'),
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
  if (element.tagName === 'LABEL') {
    const forAttribute = element.getAttribute('for');
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
  if (option.value === '' || option.value === '-1') return true;

  // Check common placeholder text patterns
  const text = option.textContent?.toLowerCase() || '';
  return (
    text.includes('select') ||
    text.includes('choose') ||
    text === 'please select' ||
    text === '-- select --' ||
    text.includes('pick an option') ||
    text === '' ||
    text === '-'
  );
};

/**
 * Dispatch appropriate events for select elements
 */
const dispatchSelectEvents = (element: HTMLSelectElement): void => {
  // Create and dispatch events
  const changeEvent = new Event('change', { bubbles: true });
  element.dispatchEvent(changeEvent);

  const inputEvent = new Event('input', { bubbles: true });
  element.dispatchEvent(inputEvent);
};

/**
 * Detect select fields from a set of elements
 * Handles both native selects and custom select components
 */
const detectSelectFields = async (
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
    const role = element.getAttribute('role');
    if (role === 'combobox' || role === 'listbox') {
      return true;
    }

    // Strategy 3: Popular select libraries and frameworks
    const className = element.className.toLowerCase();
    if (
      className.includes('select2-container') ||
      className.includes('chosen-container') ||
      className.includes('selectize-control') ||
      className.includes('react-select') ||
      className.includes('vue-select') ||
      className.includes('ng-select') ||
      // Material-UI patterns
      className.includes('muiselect') ||
      className.includes('muiformcontrol') ||
      className.includes('muiinputbase') ||
      // Ant Design patterns
      className.includes('ant-select') ||
      className.includes('antd-select') ||
      // Chakra UI patterns
      className.includes('chakra-select') ||
      // Bootstrap patterns
      className.includes('form-select') ||
      className.includes('form-control') ||
      // Generic modern patterns
      (className.includes('css-') && (className.includes('select') || className.includes('input'))) ||
      // Job application specific patterns
      className.includes('application-select') ||
      className.includes('job-select') ||
      className.includes('candidate-select')
    ) {
      return true;
    }

    // Strategy 4: Custom select patterns
    const hasSelectPattern =
      className.includes('select') ||
      className.includes('dropdown') ||
      className.includes('picker') ||
      element.getAttribute('data-select') !== null ||
      element.getAttribute('data-dropdown') !== null;

    // Must also have some interactive indicators
    const hasInteractiveIndicators =
      element.hasAttribute('tabindex') ||
      element.hasAttribute('onclick') ||
      element.hasAttribute('onchange') ||
      element.getAttribute('aria-expanded') !== null ||
      element.getAttribute('aria-haspopup') !== null;

    return hasSelectPattern && hasInteractiveIndicators;
  });

  console.log(`📋 Found ${selectElements.length} potential select elements`);

  for (let i = 0; i < selectElements.length; i++) {
    const element = selectElements[i];

    try {
      // Skip disabled/hidden elements
      if (
        element.hasAttribute('disabled') ||
        element.hasAttribute('readonly') ||
        element.getAttribute('aria-hidden') === 'true'
      ) {
        console.log(`⏭️ Skipping disabled/readonly select element`);
        continue;
      }

      // Enhanced visibility check
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || (style.visibility === 'hidden' && style.opacity === '0')) {
        console.log(`⏭️ Skipping hidden select element`);
        continue;
      }

      // Create the field
      const field = await createBaseField(element, baseIndex + i, 'select', testMode);

      // Detect if it's a multi-select
      let isMultiple = false;
      if (element instanceof HTMLSelectElement) {
        isMultiple = element.multiple;
      } else {
        isMultiple = element.getAttribute('aria-multiselectable') === 'true' || element.hasAttribute('multiple');
      }

      // Enhanced option detection based on element type
      let options: Array<{ value: string; text: string; selected: boolean }> = [];
      let currentValue: string | string[] = '';

      if (element instanceof HTMLSelectElement) {
        // Standard HTML select - get options directly
        options = Array.from(element.options).map(opt => ({
          value: opt.value,
          text: opt.text.trim() || opt.value,
          selected: opt.selected,
        }));

        currentValue = isMultiple ? Array.from(element.selectedOptions).map(opt => opt.value) : element.value;

        field.metadata = {
          framework: Framework.VANILLA,
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
            : '';

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
          if (!value || value === '') return false;

          // Skip common placeholder patterns
          if (
            text.includes('select') ||
            text.includes('choose') ||
            text.includes('pick') ||
            text.includes('please') ||
            text.includes('--') ||
            text.includes('...') ||
            text === 'none' ||
            text === 'n/a' ||
            value === '0' ||
            value === '-1'
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
const detectSelectFramework = (element: HTMLElement): Framework => {
  // Check for Select2
  if (
    element.classList.contains('select2-container') ||
    element.classList.contains('select2-focusser') ||
    element.closest('.select2-container')
  ) {
    return Framework.SELECT2;
  }

  // Check for React
  const reactKey = Object.keys(element).find(key => key.startsWith('__react') || key.startsWith('_reactProps'));
  if (reactKey) return Framework.REACT;

  // Check for Angular
  if (
    element.hasAttribute('ng-model') ||
    element.hasAttribute('[(ngModel)]') ||
    element.hasAttribute('formControlName')
  ) {
    return Framework.ANGULAR;
  }

  // Check for Vue
  if (element.hasAttribute('v-model') || '__vue__' in element) {
    return Framework.VUE;
  }

  return Framework.VANILLA;
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
    if (element.classList.contains('select2-container')) {
      const selectId = element.getAttribute('id')?.replace('s2id_', '');
      if (selectId) {
        const actualSelect = document.getElementById(selectId);
        if (isHTMLSelectElement(actualSelect)) {
          return Array.from(actualSelect.options).map(opt => ({
            value: opt.value,
            text: opt.text.trim() || opt.value,
            selected: opt.selected,
          }));
        }
      }
    }

    // Check for aria relationships
    const listId = element.getAttribute('aria-controls') || element.getAttribute('aria-owns');
    if (listId) {
      const listbox = document.getElementById(listId);
      if (listbox) {
        const listOptions = Array.from(listbox.querySelectorAll('[role="option"]'));
        if (listOptions.length > 0) {
          return listOptions.map(opt => ({
            value: opt.getAttribute('data-value') || opt.getAttribute('value') || opt.textContent?.trim() || '',
            text: opt.textContent?.trim() || '',
            selected: opt.getAttribute('aria-selected') === 'true' || opt.hasAttribute('selected'),
          }));
        }
      }
    }

    // Check for option-like children
    const optionElements = element.querySelectorAll('option, [role="option"]');
    if (optionElements.length > 0) {
      return Array.from(optionElements).map(opt => ({
        value: opt.getAttribute('value') || opt.textContent?.trim() || '',
        text: opt.textContent?.trim() || '',
        selected:
          opt instanceof HTMLOptionElement
            ? opt.selected
            : opt.getAttribute('aria-selected') === 'true' || opt.hasAttribute('selected'),
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
                value: String(item.value || item.id || ''),
                text: String(item.label || item.text || item.name || ''),
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
    debug.warn('Error detecting select options:', error);
  }

  return options;
};

/**
 * Handle Headless UI select components
 */
const handleHeadlessUISelect = async (element: HTMLElement, value: string): Promise<boolean> => {
  try {
    // Find the Headless UI trigger button
    const trigger =
      element.querySelector('[data-headlessui-state]') || element.closest('[data-headlessui-state]') || element;

    // Click trigger to open the listbox
    dispatchPointerClickSequence(trigger as HTMLElement);

    // Wait for the listbox portal to appear
    const listbox = await waitForElement('[role="listbox"]', 1500);
    if (!listbox) return false;

    // Find the matching option
    const options = listbox.querySelectorAll('[role="option"]');
    let matched = false;

    for (const option of Array.from(options)) {
      const optionText = (option.textContent || '').trim().toLowerCase();
      const optionValue = option.getAttribute('data-value') || option.getAttribute('aria-value') || optionText;

      if (optionValue.toLowerCase() === value.toLowerCase() || optionText === value.toLowerCase()) {
        dispatchPointerClickSequence(option as HTMLElement);
        matched = true;
        break;
      }
    }

    // Partial match fallback
    if (!matched) {
      for (const option of Array.from(options)) {
        const optionText = (option.textContent || '').trim().toLowerCase();
        if (optionText.includes(value.toLowerCase()) || value.toLowerCase().includes(optionText)) {
          dispatchPointerClickSequence(option as HTMLElement);
          matched = true;
          break;
        }
      }
    }

    return matched;
  } catch {
    return false;
  }
};

/**
 * Handle Radix UI select components
 */
const handleRadixSelect = async (element: HTMLElement, value: string): Promise<boolean> => {
  try {
    // Find Radix select trigger
    const trigger =
      element.querySelector('[data-radix-select-trigger]') ||
      element.closest('[data-radix-select-trigger]') ||
      element.querySelector('button[role="combobox"]') ||
      element;

    // Click trigger to open
    dispatchPointerClickSequence(trigger as HTMLElement);

    // Wait for the content portal
    const content = await waitForElement(
      '[data-radix-popper-content-wrapper] [role="listbox"], [data-radix-select-viewport]',
      1500,
    );
    if (!content) return false;

    // Find matching option
    const options = content.querySelectorAll('[role="option"], [data-radix-collection-item]');
    let matched = false;

    for (const option of Array.from(options)) {
      const optionText = (option.textContent || '').trim().toLowerCase();
      const optionValue = option.getAttribute('data-value') || optionText;

      if (optionValue.toLowerCase() === value.toLowerCase() || optionText === value.toLowerCase()) {
        dispatchPointerClickSequence(option as HTMLElement);
        matched = true;
        break;
      }
    }

    if (!matched) {
      for (const option of Array.from(options)) {
        const optionText = (option.textContent || '').trim().toLowerCase();
        if (optionText.includes(value.toLowerCase()) || value.toLowerCase().includes(optionText)) {
          dispatchPointerClickSequence(option as HTMLElement);
          matched = true;
          break;
        }
      }
    }

    return matched;
  } catch {
    return false;
  }
};

/**
 * Handle multi-select components (React Select multi, Choices.js, Select2 multi, standard multi-select)
 */
const handleMultiSelect = async (element: HTMLElement, values: string[]): Promise<boolean> => {
  try {
    // Handle React Select multi, Choices.js, Select2 multi
    const searchInput = element.querySelector(
      'input[role="combobox"], input[type="text"], input.select__input',
    ) as HTMLInputElement | null;

    let successCount = 0;

    for (const val of values) {
      // Type into search if available
      if (searchInput) {
        setNativeValue(searchInput, val);
        searchInput.dispatchEvent(new InputEvent('input', { bubbles: true, data: val }));

        // Wait for dropdown options
        await new Promise(resolve => setTimeout(resolve, 300));

        // Find and click matching option
        const options = document.querySelectorAll('[class*="option"], [role="option"]');
        for (const option of Array.from(options)) {
          const text = (option.textContent || '').trim().toLowerCase();
          if (text === val.toLowerCase() || text.includes(val.toLowerCase())) {
            dispatchPointerClickSequence(option as HTMLElement);
            successCount++;
            break;
          }
        }
      } else {
        // For standard multi-select
        if (element instanceof HTMLSelectElement && element.multiple) {
          const options = Array.from(element.options);
          for (const option of options) {
            if (option.value.toLowerCase() === val.toLowerCase() || option.text.toLowerCase() === val.toLowerCase()) {
              option.selected = true;
              successCount++;
              break;
            }
          }
        }
      }
    }

    // Dispatch change event
    element.dispatchEvent(new Event('change', { bubbles: true }));

    return successCount > 0;
  } catch {
    return false;
  }
};

// ============================================================================
// Exports (at end of file per ESLint import-x/exports-last rule)
// ============================================================================

export {
  handleReactSelect,
  handleMaterialUISelect,
  handleHeadlessUISelect,
  handleRadixSelect,
  handleMultiSelect,
  handleTsselect,
  updateSelect,
  detectSelectFields,
};
