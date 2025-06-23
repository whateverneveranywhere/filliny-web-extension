import { createBaseField, getFieldLabel, findRelatedRadioButtons } from "./utils";
import type { Field } from "@extension/shared";

// Extend Field type with checkable-specific properties
interface CheckableField extends Field {
  checked?: boolean;
  groupName?: string;
  groupType?: "radio" | "checkbox";
}

/**
 * Check if a value indicates a "checked" or "true" state
 * Handles various formats like true/false, 0/1, "yes"/"no", etc.
 */
export const isValueChecked = (value: unknown): boolean => {
  if (value === undefined || value === null) {
    return false;
  }

  // Direct boolean
  if (typeof value === "boolean") {
    return value;
  }

  // Numbers (0 = false, anything else = true)
  if (typeof value === "number") {
    return value !== 0;
  }

  // String representations
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    // Standard boolean strings
    if (
      normalized === "true" ||
      normalized === "yes" ||
      normalized === "on" ||
      normalized === "1" ||
      normalized === "selected" ||
      normalized === "checked"
    ) {
      return true;
    }

    // Standard false strings
    if (
      normalized === "false" ||
      normalized === "no" ||
      normalized === "off" ||
      normalized === "0" ||
      normalized === "unselected" ||
      normalized === "unchecked"
    ) {
      return false;
    }

    // Any non-empty string that doesn't explicitly indicate false is treated as true
    return normalized !== "";
  }

  // Arrays - if there are any items, consider it checked
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  // For objects, treat as true (existence implies checked)
  return true;
};

/**
 * Match checkbox values considering different formats
 * Used to determine if a checkbox should be checked when multiple values are involved
 */
export const matchesCheckboxValue = (optionValue: string, targetValue: unknown): boolean => {
  // Handle direct equality
  if (optionValue === targetValue) {
    return true;
  }

  // If target is an array, check if this value is in the array
  if (Array.isArray(targetValue)) {
    return targetValue.some(v => String(v) === optionValue);
  }

  // Handle string comparison
  if (typeof targetValue === "string") {
    const normalizedOption = optionValue.toLowerCase();
    const normalizedTarget = targetValue.toLowerCase();

    // Exact match after normalization
    if (normalizedOption === normalizedTarget) {
      return true;
    }

    // Split by commas or semicolons for multiple values in a string
    if (normalizedTarget.includes(",") || normalizedTarget.includes(";")) {
      const parts = normalizedTarget.split(/[,;]/).map(p => p.trim());
      return parts.includes(normalizedOption);
    }
  }

  return false;
};

/**
 * Update a checkbox or radio button input
 * This is the main entry point for updating checkable fields
 */
export const updateCheckable = (element: HTMLElement, checked: boolean): void => {
  try {
    // Handle both native inputs and ARIA-based custom controls
    if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
      updateNativeCheckable(element, checked);
    } else if (
      element.getAttribute("role") === "checkbox" ||
      element.getAttribute("role") === "radio" ||
      element.getAttribute("role") === "switch"
    ) {
      updateAriaCheckable(element, checked);
    } else {
      // Attempt to handle custom components by looking for common patterns
      updateCustomCheckable(element, checked);
    }

    // If this is a radio button and we're checking it, ensure that other radio buttons in the same group are unchecked
    if (
      checked &&
      ((element instanceof HTMLInputElement && element.type === "radio") || element.getAttribute("role") === "radio")
    ) {
      updateRelatedRadioButtons(element);
    }
  } catch (error) {
    console.error("Error updating checkable element:", error);
  }
};

/**
 * Update a native checkbox or radio input
 */
const updateNativeCheckable = (element: HTMLInputElement, checked: boolean): void => {
  // First check if element is already in the desired state
  if (element.checked === checked) return;

  // Update the checked state
  element.checked = checked;

  // Dispatch appropriate events to trigger any event listeners
  const changeEvent = new Event("change", { bubbles: true });
  element.dispatchEvent(changeEvent);

  const inputEvent = new Event("input", { bubbles: true });
  element.dispatchEvent(inputEvent);

  // Trigger click event only if state needs to change
  if (element.checked !== checked) {
    element.click();
  }
};

/**
 * Update an ARIA-based checkbox or radio element
 */
const updateAriaCheckable = (element: HTMLElement, checked: boolean): void => {
  // Determine the role
  const role = element.getAttribute("role");

  // Get the current state
  const currentChecked =
    role === "switch"
      ? element.getAttribute("aria-checked") === "true"
      : element.getAttribute("aria-checked") === "true";

  // If already in desired state, return
  if (currentChecked === checked) return;

  // Update the ARIA state
  element.setAttribute("aria-checked", checked ? "true" : "false");

  // Look for an actual input that might be controlled by this ARIA element
  const controlledInput = findControlledInput(element);
  if (controlledInput) {
    updateNativeCheckable(controlledInput, checked);
    return;
  }

  // If no controlled input, simulate a click to trigger any bound event handlers
  element.click();

  // Update CSS classes based on common patterns
  if (checked) {
    element.classList.add("checked", "selected", "active");
    element.classList.remove("unchecked");
  } else {
    element.classList.remove("checked", "selected", "active");
    element.classList.add("unchecked");
  }

  // Dispatch events
  const changeEvent = new Event("change", { bubbles: true });
  element.dispatchEvent(changeEvent);

  const inputEvent = new Event("input", { bubbles: true });
  element.dispatchEvent(inputEvent);
};

/**
 * Find any native input that might be controlled by an ARIA element
 */
const findControlledInput = (element: HTMLElement): HTMLInputElement | null => {
  // Check for common patterns

  // 1. Input might be a child
  const childInput = element.querySelector('input[type="checkbox"], input[type="radio"]') as HTMLInputElement;
  if (childInput) return childInput;

  // 2. Input might be a sibling
  const siblingInput = element.parentElement?.querySelector(
    'input[type="checkbox"], input[type="radio"]',
  ) as HTMLInputElement;
  if (siblingInput && siblingInput !== element) return siblingInput;

  // 3. Input might be linked by ARIA attributes
  const controlsId = element.getAttribute("aria-controls");
  if (controlsId) {
    const controlledElement = document.getElementById(controlsId);
    if (controlledElement instanceof HTMLInputElement) {
      return controlledElement;
    }
  }

  // 4. Input might be hidden in the DOM
  if (element.id) {
    const relatedInput = document.querySelector(`input[aria-labelledby="${element.id}"]`) as HTMLInputElement;
    if (relatedInput) return relatedInput;
  }

  return null;
};

/**
 * Update visual indicators for custom checkbox/radio components
 */
const updateVisualIndicators = (element: HTMLElement, checked: boolean): void => {
  // Update CSS classes based on common patterns
  if (checked) {
    element.classList.add("checked", "selected", "active");
    element.classList.remove("unchecked");
  } else {
    element.classList.remove("checked", "selected", "active");
    element.classList.add("unchecked");
  }

  // Dispatch events
  const changeEvent = new Event("change", { bubbles: true });
  element.dispatchEvent(changeEvent);

  const inputEvent = new Event("input", { bubbles: true });
  element.dispatchEvent(inputEvent);
};

/**
 * Attempt to update custom checkable components
 */
const updateCustomCheckable = (element: HTMLElement, checked: boolean): void => {
  // First, try to find a native input that might be associated with this element
  let inputFound = false;

  // Check if element contains an input
  const containedInput = element.querySelector('input[type="checkbox"], input[type="radio"]') as HTMLInputElement;
  if (containedInput) {
    updateNativeCheckable(containedInput, checked);
    inputFound = true;
  }

  // Check if element's parent contains an input
  if (!inputFound && element.parentElement) {
    const parentInput = element.parentElement.querySelector(
      'input[type="checkbox"], input[type="radio"]',
    ) as HTMLInputElement;
    if (parentInput && !parentInput.contains(element)) {
      updateNativeCheckable(parentInput, checked);
      inputFound = true;
    }
  }

  // Check for label that might be connected to an input
  if (!inputFound && element.tagName === "LABEL") {
    const labelFor = element.getAttribute("for");
    if (labelFor) {
      const linkedInput = document.getElementById(labelFor) as HTMLInputElement;
      if (linkedInput && (linkedInput.type === "checkbox" || linkedInput.type === "radio")) {
        updateNativeCheckable(linkedInput, checked);
        inputFound = true;
      }
    }
  }

  // If no input found, treat as a custom component
  if (!inputFound) {
    // Set custom data attribute to track state
    element.setAttribute("data-filliny-checked", checked ? "true" : "false");

    // Update classes based on common patterns
    if (checked) {
      element.classList.add("checked", "selected", "active");
      element.classList.remove("unchecked");
    } else {
      element.classList.remove("checked", "selected", "active");
      element.classList.add("unchecked");
    }

    // Trigger click if needed
    const currentChecked =
      element.classList.contains("checked") ||
      element.classList.contains("selected") ||
      element.classList.contains("active");

    if (currentChecked !== checked) {
      element.click();
    }
  }
};

/**
 * Find and update related radio buttons in the same group
 */
const updateRelatedRadioButtons = (element: HTMLElement): void => {
  // Find all related radio buttons
  const relatedRadios = findRelatedRadioButtons(element);

  // Uncheck all except the current one
  relatedRadios.forEach(radio => {
    if (radio !== element) {
      if (radio instanceof HTMLInputElement) {
        if (radio.checked) {
          radio.checked = false;

          // Dispatch events
          const changeEvent = new Event("change", { bubbles: true });
          radio.dispatchEvent(changeEvent);

          const inputEvent = new Event("input", { bubbles: true });
          radio.dispatchEvent(inputEvent);
        }
      } else if (radio.getAttribute("role") === "radio") {
        if (radio.getAttribute("aria-checked") === "true") {
          radio.setAttribute("aria-checked", "false");

          // Update visual indicators
          updateVisualIndicators(radio, false);
        }
      }
    }
  });
};

/**
 * Find a common container for elements
 */
const findCommonContainer = (elements: HTMLElement[]): HTMLElement | null => {
  if (elements.length === 0) return null;
  if (elements.length === 1) return elements[0].parentElement;

  // Start with the first element's ancestors
  let commonAncestor = elements[0].parentElement;

  while (commonAncestor) {
    // Check if this ancestor contains all elements
    const containsAll = elements.every(el => commonAncestor?.contains(el));
    if (containsAll) {
      // Prefer semantic containers
      if (
        commonAncestor.tagName.toLowerCase() === "fieldset" ||
        commonAncestor.getAttribute("role") === "radiogroup" ||
        commonAncestor.getAttribute("role") === "group" ||
        commonAncestor.classList.contains("radio-group") ||
        commonAncestor.classList.contains("checkbox-group") ||
        commonAncestor.querySelector("legend")
      ) {
        return commonAncestor;
      }
    }
    commonAncestor = commonAncestor.parentElement;
  }

  return null;
};

/**
 * Detect checkable fields with proper grouping
 * This is the main entry point for detecting radio and checkbox fields
 */
export const detectCheckableFields = async (
  elements: HTMLElement[],
  baseIndex: number,
  testMode: boolean = false,
): Promise<Field[]> => {
  const fields: Field[] = [];
  let fieldIndex = 0;

  console.log(
    `Detecting checkable fields from ${elements.length} elements, baseIndex: ${baseIndex}, testMode: ${testMode}`,
  );

  // Separate elements by type
  const radioElements = elements.filter(
    el => (el instanceof HTMLInputElement && el.type === "radio") || el.getAttribute("role") === "radio",
  );
  const checkboxElements = elements.filter(
    el => (el instanceof HTMLInputElement && el.type === "checkbox") || el.getAttribute("role") === "checkbox",
  );
  const switchElements = elements.filter(el => el.getAttribute("role") === "switch");

  console.log(
    `Found ${radioElements.length} radio elements, ${checkboxElements.length} checkbox elements, ${switchElements.length} switch elements`,
  );

  // Process radio buttons as groups
  if (radioElements.length > 0) {
    const radioGroups = await groupRadioElements(radioElements);
    console.log(`Created ${radioGroups.size} radio groups`);

    for (const [groupId, groupElements] of radioGroups.entries()) {
      try {
        const field = await createRadioGroupField(groupElements, baseIndex + fieldIndex, groupId, testMode);
        fields.push(field);
        fieldIndex++;
        console.log(`Created radio group field: ${field.id} with ${groupElements.length} options`);
      } catch (error) {
        console.error(`Error creating radio group field for ${groupId}:`, error);
      }
    }
  }

  // Process checkboxes - can be individual or grouped
  if (checkboxElements.length > 0) {
    const checkboxGroups = await groupCheckboxElements(checkboxElements);
    console.log(`Created ${checkboxGroups.size} checkbox groups`);

    for (const [groupId, groupElements] of checkboxGroups.entries()) {
      try {
        if (groupElements.length === 1) {
          // Single checkbox
          const field = await createCheckboxField(groupElements[0], baseIndex + fieldIndex, testMode);
          fields.push(field);
          console.log(`Created single checkbox field: ${field.id}`);
        } else {
          // Checkbox group
          const field = await createCheckboxGroupField(groupElements, baseIndex + fieldIndex, groupId, testMode);
          fields.push(field);
          console.log(`Created checkbox group field: ${field.id} with ${groupElements.length} options`);
        }
        fieldIndex++;
      } catch (error) {
        console.error(`Error creating checkbox field for ${groupId}:`, error);
      }
    }
  }

  // Process switch elements individually
  for (const switchElement of switchElements) {
    try {
      const field = await createSwitchField(switchElement, baseIndex + fieldIndex, testMode);
      fields.push(field);
      fieldIndex++;
      console.log(`Created switch field: ${field.id}`);
    } catch (error) {
      console.error(`Error creating switch field:`, error);
    }
  }

  console.log(`Detected ${fields.length} checkable fields total`);
  return fields;
};

/**
 * Enhanced grouping algorithm for radio elements with comprehensive fallback strategies
 */
const groupRadioElements = async (elements: HTMLElement[]): Promise<Map<string, HTMLElement[]>> => {
  const groups = new Map<string, HTMLElement[]>();
  const processed = new Set<HTMLElement>();

  console.log(`Grouping ${elements.length} radio elements using enhanced algorithm`);

  // Strategy 1: Group by name attribute (most reliable for radio buttons)
  const namedGroups = new Map<string, HTMLElement[]>();
  for (const element of elements) {
    if (element instanceof HTMLInputElement && element.name) {
      const name = element.name;
      if (!namedGroups.has(name)) {
        namedGroups.set(name, []);
      }
      namedGroups.get(name)!.push(element);
      processed.add(element);
    }
  }

  // Add named groups (radio buttons with same name should always be grouped)
  for (const [name, groupElements] of namedGroups.entries()) {
    if (groupElements.length >= 1) {
      // Even single radios are part of a group conceptually
      groups.set(`radio-name-${name}`, groupElements);
      console.log(`Created radio group from name "${name}" with ${groupElements.length} elements`);
    }
  }

  // Strategy 2: Group remaining elements by semantic containers and proximity
  const unprocessedElements = elements.filter(el => !processed.has(el));
  if (unprocessedElements.length > 0) {
    console.log(`Processing ${unprocessedElements.length} unnamed radio elements`);

    // First try semantic containers
    const containerGroups = await groupBySemanticContainers(unprocessedElements, "radio");
    for (const [groupId, groupElements] of containerGroups.entries()) {
      groups.set(groupId, groupElements);
      groupElements.forEach(el => processed.add(el));
      console.log(`Created radio group from container "${groupId}" with ${groupElements.length} elements`);
    }

    // Then handle any remaining elements with proximity-based grouping
    const stillUnprocessed = elements.filter(el => !processed.has(el));
    if (stillUnprocessed.length > 0) {
      console.log(`Creating individual groups for ${stillUnprocessed.length} remaining radio elements`);

      // For radio buttons, even individual ones should be treated as groups
      // This is because radio buttons are conceptually always part of a group
      stillUnprocessed.forEach((element, index) => {
        const elementId = element.id || element.getAttribute("data-filliny-id") || `radio-${Date.now()}-${index}`;
        const groupId = `radio-individual-${elementId}`;
        groups.set(groupId, [element]);
        console.log(`Created individual radio group: ${groupId}`);
      });
    }
  }

  return groups;
};

/**
 * Enhanced grouping algorithm for checkbox elements with improved logic
 */
const groupCheckboxElements = async (elements: HTMLElement[]): Promise<Map<string, HTMLElement[]>> => {
  const groups = new Map<string, HTMLElement[]>();
  const processed = new Set<HTMLElement>();

  console.log(`Grouping ${elements.length} checkbox elements using enhanced algorithm`);

  // Strategy 1: Group by name attribute (only if multiple checkboxes share the same name)
  const namedGroups = new Map<string, HTMLElement[]>();
  for (const element of elements) {
    if (element instanceof HTMLInputElement && element.name) {
      const name = element.name;
      if (!namedGroups.has(name)) {
        namedGroups.set(name, []);
      }
      namedGroups.get(name)!.push(element);
    }
  }

  // Add named groups only if they have multiple elements
  for (const [name, groupElements] of namedGroups.entries()) {
    if (groupElements.length > 1) {
      groups.set(`checkbox-name-${name}`, groupElements);
      groupElements.forEach(el => processed.add(el));
      console.log(`Created checkbox group from name "${name}" with ${groupElements.length} elements`);
    }
  }

  // Strategy 2: Group remaining elements by semantic containers
  const unprocessedElements = elements.filter(el => !processed.has(el));
  if (unprocessedElements.length > 0) {
    console.log(`Processing ${unprocessedElements.length} ungrouped checkbox elements`);

    const containerGroups = await groupBySemanticContainers(unprocessedElements, "checkbox");
    for (const [groupId, groupElements] of containerGroups.entries()) {
      if (groupElements.length > 1) {
        // Only group checkboxes if there are multiple in the same semantic container
        groups.set(groupId, groupElements);
        groupElements.forEach(el => processed.add(el));
        console.log(`Created checkbox group from container "${groupId}" with ${groupElements.length} elements`);
      }
    }
  }

  // Strategy 3: Individual checkboxes (those not grouped by above strategies)
  const stillUnprocessed = elements.filter(el => !processed.has(el));
  for (const element of stillUnprocessed) {
    // Create individual checkbox groups
    const groupId = `checkbox-individual-${element.id || element.getAttribute("data-filliny-id") || Date.now()}-${Math.random()}`;
    groups.set(groupId, [element]);
    console.log(`Created individual checkbox: ${groupId}`);
  }

  return groups;
};

/**
 * Group elements by semantic containers using multiple detection strategies
 */
const groupBySemanticContainers = async (
  elements: HTMLElement[],
  type: "radio" | "checkbox",
): Promise<Map<string, HTMLElement[]>> => {
  const groups = new Map<string, HTMLElement[]>();
  const processed = new Set<HTMLElement>();

  // Define semantic container selectors in priority order
  const semanticSelectors = [
    '[role="radiogroup"]', // ARIA radiogroup (highest priority)
    '[role="group"]', // ARIA group
    "fieldset", // HTML fieldset
    '[class*="radio-group" i]', // CSS class patterns (case insensitive)
    '[class*="radiogroup" i]',
    '[class*="checkbox-group" i]',
    '[class*="checkboxgroup" i]',
    '[class*="option-group" i]',
    '[class*="optiongroup" i]',
    '[class*="form-group" i]',
    '[class*="field-group" i]',
    "[data-group]", // Data attributes
    "[data-radio-group]",
    "[data-checkbox-group]",
  ];

  for (const element of elements) {
    if (processed.has(element)) continue;

    let bestContainer: HTMLElement | null = null;
    let bestScore = 0;

    // Find the best semantic container for this element
    for (const selector of semanticSelectors) {
      const container = element.closest(selector) as HTMLElement;
      if (container) {
        // Score this container based on how appropriate it is
        const score = scoreSemanticContainer(container, elements, type);
        if (score > bestScore) {
          bestScore = score;
          bestContainer = container;
        }
      }
    }

    if (bestContainer && bestScore > 0) {
      // Find all elements in this container
      const containerElements = elements.filter(el => bestContainer!.contains(el) && !processed.has(el));

      if (containerElements.length >= (type === "radio" ? 1 : 2)) {
        // Create group identifier
        const containerId =
          bestContainer.id ||
          bestContainer.getAttribute("data-group") ||
          bestContainer.className.split(" ")[0] ||
          "container";

        const groupId = `${type}-semantic-${containerId}-${Date.now()}`;
        groups.set(groupId, containerElements);

        containerElements.forEach(el => processed.add(el));

        console.log(
          `Grouped ${containerElements.length} ${type} elements by semantic container: ${bestContainer.tagName}.${bestContainer.className}`,
        );
      }
    }
  }

  // Handle remaining elements with proximity-based grouping
  const remainingElements = elements.filter(el => !processed.has(el));
  if (remainingElements.length > 1) {
    const proximityGroups = groupByProximity(remainingElements, type);
    for (const [groupId, groupElements] of proximityGroups.entries()) {
      groups.set(groupId, groupElements);
      console.log(`Created proximity-based ${type} group: ${groupId} with ${groupElements.length} elements`);
    }
  }

  return groups;
};

/**
 * Score a semantic container based on how well it groups the given elements
 */
const scoreSemanticContainer = (
  container: HTMLElement,
  allElements: HTMLElement[],
  type: "radio" | "checkbox",
): number => {
  let score = 0;

  // Count how many of our elements this container contains
  const containedElements = allElements.filter(el => container.contains(el));
  if (containedElements.length === 0) return 0;

  // Base score from element count
  score += containedElements.length * 10;

  // Bonus for semantic HTML and ARIA
  const tagName = container.tagName.toLowerCase();
  const role = container.getAttribute("role");

  if (role === "radiogroup" && type === "radio") score += 50;
  if (role === "group") score += 30;
  if (tagName === "fieldset") score += 40;

  // Bonus for appropriate class names
  const className = container.className.toLowerCase();
  if (className.includes(`${type}-group`)) score += 30;
  if (className.includes("form-group")) score += 20;
  if (className.includes("field-group")) score += 20;

  // Bonus for having a label (legend, aria-label, etc.)
  const hasLabel =
    container.querySelector("legend") ||
    container.getAttribute("aria-label") ||
    container.getAttribute("aria-labelledby");
  if (hasLabel) score += 15;

  // Penalty for containing too many other form elements (indicates it's too broad)
  const otherFormElements = container.querySelectorAll("input, select, textarea").length - containedElements.length;
  if (otherFormElements > containedElements.length * 2) {
    score -= 20;
  }

  // Penalty for being too deeply nested
  const depth = getContainerDepth(container);
  if (depth > 15) score -= (depth - 15) * 2;

  return Math.max(0, score);
};

/**
 * Group elements by proximity when no semantic containers are found
 */
const groupByProximity = (elements: HTMLElement[], type: "radio" | "checkbox"): Map<string, HTMLElement[]> => {
  const groups = new Map<string, HTMLElement[]>();

  if (elements.length <= 1) {
    // Single elements or empty array
    elements.forEach((el, idx) => {
      groups.set(`${type}-proximity-${idx}-${Date.now()}`, [el]);
    });
    return groups;
  }

  // Calculate distances between elements
  const elementPositions = elements.map(el => ({
    element: el,
    rect: el.getBoundingClientRect(),
  }));

  // Simple clustering based on vertical proximity
  const clusters: HTMLElement[][] = [];
  const processed = new Set<HTMLElement>();

  for (const { element, rect } of elementPositions) {
    if (processed.has(element)) continue;

    const cluster = [element];
    processed.add(element);

    // Find nearby elements
    for (const { element: otherElement, rect: otherRect } of elementPositions) {
      if (processed.has(otherElement)) continue;

      // Consider elements close if they're within 100px vertically
      const distance = Math.abs(rect.top - otherRect.top);
      if (distance <= 100) {
        cluster.push(otherElement);
        processed.add(otherElement);
      }
    }

    if (cluster.length >= (type === "radio" ? 1 : 2)) {
      clusters.push(cluster);
    }
  }

  // Convert clusters to groups
  clusters.forEach((cluster, idx) => {
    groups.set(`${type}-proximity-${idx}-${Date.now()}`, cluster);
  });

  return groups;
};

/**
 * Get the depth of a container in the DOM tree
 */
const getContainerDepth = (container: HTMLElement): number => {
  let depth = 0;
  let current = container.parentElement;
  while (current && current !== document.body) {
    depth++;
    current = current.parentElement;
  }
  return depth;
};

/**
 * Create a field for a radio group
 */
const createRadioGroupField = async (
  elements: HTMLElement[],
  index: number,
  groupId: string,
  testMode: boolean,
): Promise<CheckableField> => {
  const firstElement = elements[0];
  const field = (await createBaseField(firstElement, index, "radio", testMode)) as CheckableField;

  // Set group metadata
  field.groupName = groupId;
  field.groupType = "radio";

  // Get group label from container or fieldset
  const container = findCommonContainer(elements);
  if (container) {
    const legend = container.querySelector("legend");
    const groupLabel =
      legend?.textContent?.trim() || container.getAttribute("aria-label") || container.getAttribute("data-label");
    if (groupLabel) {
      field.label = groupLabel;
    }
  }

  // Create options from all radio buttons in the group
  field.options = await Promise.all(
    elements.map(async (el, idx) => {
      const label = await getFieldLabel(el);
      let value = "";
      let selected = false;

      if (el instanceof HTMLInputElement) {
        value = el.value || `option-${idx}`;
        selected = el.checked;
      } else {
        value = el.getAttribute("value") || el.getAttribute("data-value") || `option-${idx}`;
        selected = el.getAttribute("aria-checked") === "true";
      }

      // Add filliny-id to each radio button for later reference
      el.setAttribute("data-filliny-id", `${field.id}-option-${idx}`);

      return {
        value,
        text: label || value,
        selected,
      };
    }),
  );

  // Set current value based on selected option
  const selectedOption = field.options.find(opt => opt.selected);
  if (selectedOption) {
    field.value = selectedOption.value;
  }

  // Set test value for test mode
  if (testMode && field.options.length > 0) {
    // For gender fields, prefer female option
    const isGenderField =
      field.label?.toLowerCase().includes("gender") ||
      field.label?.toLowerCase().includes("sex") ||
      field.options.some(opt => opt.text.toLowerCase().includes("male") || opt.text.toLowerCase().includes("female"));

    if (isGenderField) {
      const femaleOption = field.options.find(
        opt =>
          opt.text.toLowerCase().includes("female") ||
          opt.text.toLowerCase().includes("frau") ||
          opt.value.toLowerCase() === "f",
      );
      field.testValue = femaleOption ? femaleOption.value : field.options[0].value;
    } else {
      // Pick a random non-placeholder option for better test variety
      const validOptions = field.options.filter(
        opt =>
          !opt.text.toLowerCase().includes("select") &&
          !opt.text.toLowerCase().includes("choose") &&
          !opt.text.toLowerCase().includes("pick") &&
          opt.text !== "" &&
          opt.value !== "",
      );

      if (validOptions.length > 0) {
        // Pick a random valid option
        const randomIndex = Math.floor(Math.random() * validOptions.length);
        field.testValue = validOptions[randomIndex].value;
        console.log(`🎯 Generated random test value for radio group ${field.id}: ${field.testValue}`);
      } else {
        // Fallback to first option
        field.testValue = field.options[0].value;
        console.log(`🎯 Using first option as test value for radio group ${field.id}: ${field.testValue}`);
      }
    }
  }

  return field;
};

/**
 * Create a field for a single checkbox
 */
const createCheckboxField = async (element: HTMLElement, index: number, testMode: boolean): Promise<CheckableField> => {
  const field = (await createBaseField(element, index, "checkbox", testMode)) as CheckableField;

  // Set current state
  if (element instanceof HTMLInputElement) {
    field.checked = element.checked;
    field.value = element.checked ? "true" : "false";
  } else {
    field.checked = element.getAttribute("aria-checked") === "true";
    field.value = field.checked ? "true" : "false";
  }

  // Set test value
  if (testMode) {
    field.testValue = Math.random() > 0.5 ? "true" : "false";
  }

  return field;
};

/**
 * Create a field for a checkbox group
 */
const createCheckboxGroupField = async (
  elements: HTMLElement[],
  index: number,
  groupId: string,
  testMode: boolean,
): Promise<CheckableField> => {
  const firstElement = elements[0];
  const field = (await createBaseField(firstElement, index, "checkbox", testMode)) as CheckableField;

  // Set group metadata
  field.groupName = groupId;
  field.groupType = "checkbox";

  // Get group label from container
  const container = findCommonContainer(elements);
  if (container) {
    const legend = container.querySelector("legend");
    const groupLabel =
      legend?.textContent?.trim() || container.getAttribute("aria-label") || container.getAttribute("data-label");
    if (groupLabel) {
      field.label = groupLabel;
    }
  }

  // Create options from all checkboxes in the group
  field.options = await Promise.all(
    elements.map(async (el, idx) => {
      const label = await getFieldLabel(el);
      let value = "";
      let selected = false;

      if (el instanceof HTMLInputElement) {
        value = el.value || `option-${idx}`;
        selected = el.checked;
      } else {
        value = el.getAttribute("value") || el.getAttribute("data-value") || `option-${idx}`;
        selected = el.getAttribute("aria-checked") === "true";
      }

      // Add filliny-id to each checkbox for later reference
      el.setAttribute("data-filliny-id", `${field.id}-option-${idx}`);

      return {
        value,
        text: label || value,
        selected,
      };
    }),
  );

  // Set current value as array of selected values
  const selectedValues = field.options.filter(opt => opt.selected).map(opt => opt.value);
  field.value = selectedValues;

  // Set test value for test mode
  if (testMode && field.options.length > 0) {
    // Select 1-2 random options
    const numToSelect = Math.min(Math.ceil(Math.random() * 2), field.options.length);
    const shuffled = [...field.options].sort(() => 0.5 - Math.random());
    field.testValue = shuffled.slice(0, numToSelect).map(opt => opt.value);
  }

  return field;
};

/**
 * Create a field for a switch element
 */
const createSwitchField = async (element: HTMLElement, index: number, testMode: boolean): Promise<CheckableField> => {
  const field = (await createBaseField(element, index, "checkbox", testMode)) as CheckableField;

  // Set current state
  field.checked = element.getAttribute("aria-checked") === "true";
  field.value = field.checked ? "true" : "false";

  // Set test value
  if (testMode) {
    field.testValue = Math.random() > 0.5 ? "true" : "false";
  }

  return field;
};

// Export for testing
export const __testing = {
  updateNativeCheckable,
  updateAriaCheckable,
  updateCustomCheckable,
  findControlledInput,
  updateVisualIndicators,
  updateRelatedRadioButtons,
  groupRadioElements,
  groupCheckboxElements,
  createRadioGroupField,
  createCheckboxField,
};
