// Export all field type handlers
import { detectCheckableFields } from "./checkable";
import { detectFileFields } from "./file";
import { detectSelectFields } from "./select";
import { detectTextField, detectInputField, updateTextField, updateContentEditable } from "./text";
import { safeGetString, safeGetLowerString, safeGetAttributes } from "./utils";
import type { Field } from "@extension/shared";

export * from "./utils";
export * from "./text";
export * from "./checkable";
export * from "./file";
export * from "./select";

/**
 * Enhanced field detection with multiple strategies and robust error handling
 */
const getFormElementsRobust = (container: HTMLElement | ShadowRoot): HTMLElement[] => {
  // Strategy 1: Direct selector matching
  let elements = applyBasicSelectorMatching(container);

  // Strategy 2: Pattern-based detection for custom components
  if (elements.length < 2) {
    elements = enhanceWithBasicPatternDetection(container, elements);
  }

  // Strategy 3: Shadow DOM exploration
  elements = enhanceWithBasicShadowDOMDetection(container, elements);

  // Final filtering step
  return applyBasicFieldFiltering(elements);
};

/**
 * Apply basic CSS selector matching for form elements
 */
const applyBasicSelectorMatching = (container: HTMLElement | ShadowRoot): HTMLElement[] => {
  const fieldSelectors = createBasicFormElementSelectors();
  const elements: HTMLElement[] = [];

  // Strategy 1: Direct selector matching
  for (const selector of fieldSelectors) {
    try {
      const found = Array.from(container.querySelectorAll<HTMLElement>(selector));
      elements.push(...found);
    } catch (e) {
      console.debug(`Selector failed: ${selector}`, e);
    }
  }

  // Remove duplicates
  return Array.from(new Set(elements));
};

/**
 * Create basic form element selectors (includes file upload specific selectors)
 */
const createBasicFormElementSelectors = (): string[] => [
  // Standard form fields (highest priority)
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"])',
  "select",
  "textarea",

  // ARIA form fields
  '[role="textbox"]',
  '[role="combobox"]',
  '[role="spinbutton"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="radio"]',
  '[role="searchbox"]',
  '[role="listbox"]',
  '[role="slider"]',

  // Content editable
  '[contenteditable="true"]',

  // File upload fields (enhanced detection)
  'input[type="file"]',
  "[accept]", // Elements with accept attribute often indicate file uploads
  "[data-file-upload]",
  "[data-upload]",
  "[data-file-input]",
  ".file-upload",
  ".file-input",
  ".upload-area",
  ".dropzone",
  ".file-drop",
  ".upload-dropzone",
  ".file-picker",
  '.upload-button[type="button"]',
  '[class*="upload"][role="button"]',
  '[class*="file-upload"]',
  '[class*="file-input"]',
  '[data-testid*="upload"]',
  '[data-testid*="file"]',
  '[data-cy*="upload"]',
  '[data-cy*="file"]',
  '[data-qa*="upload"]',
  '[data-qa*="file"]',

  // Enhanced patterns for modern job application sites
  '[class*="attach"]',
  '[class*="attachment"]',
  '[class*="document"]',
  '[class*="file-field"]',
  '[class*="upload-field"]',
  '[class*="drop-zone"]',
  '[class*="drag-drop"]',
  '[class*="file-browser"]',
  '[class*="file-chooser"]',
  '[class*="file-selector"]',

  // Personio-style patterns
  '[class*="personio"]',
  "[data-personio]",
  '[class*="resume"]',
  '[class*="cv"]',

  // Ashby-style patterns
  '[class*="ashby"]',
  "[data-ashby]",
  '[class*="_systemfield_resume"]',

  // Generic job application patterns
  '[class*="application"]',
  '[data-field-type="file"]',
  '[data-field-type="upload"]',
  '[data-input-type="file"]',

  // Button elements that might trigger file uploads
  'button[class*="upload"]',
  'button[class*="file"]',
  'button[class*="attach"]',
  'button[class*="browse"]',
  'div[class*="upload"][role="button"]',
  'div[class*="file"][role="button"]',
  'span[class*="upload"][role="button"]',

  // Hidden file input patterns (common in custom upload components)
  'input[type="file"][style*="display: none"] + *',
  'input[type="file"][style*="visibility: hidden"] + *',
  'input[type="file"][class*="hidden"] + *',
  'input[type="file"][class*="sr-only"] + *',

  // Custom data attributes (common patterns)
  "[data-field]",
  "[data-input]",
  "[data-form-field]",
  "[data-form-control]",
  '[data-testid*="input"]',
  '[data-testid*="field"]',
  '[data-testid*="select"]',
  '[data-qa*="input"]',
  '[data-qa*="field"]',
  '[data-qa*="select"]',
  '[data-cy*="input"]',
  '[data-cy*="field"]',
  '[data-cy*="select"]',

  // Common CSS class patterns
  ".form-control",
  ".form-input",
  ".form-field",
  ".input-field",
  ".text-field",
  ".select-field",
  ".checkbox-field",
  ".radio-field",
  ".field-input",
  ".field-select",
  ".custom-field",
  ".custom-input",
  ".custom-select",

  // Framework-specific patterns
  ".MuiTextField-root input",
  ".MuiTextField-root textarea",
  ".MuiSelect-root",
  ".MuiCheckbox-root input",
  ".MuiRadio-root input",
  ".MuiSlider-root",
  ".ant-input",
  ".ant-select",
  ".ant-checkbox-input",
  ".ant-radio-input",
  ".ant-textarea",
  ".ant-slider",
  ".ant-upload",
  ".ant-upload-wrapper",
  ".chakra-input",
  ".chakra-select",
  ".chakra-checkbox__input",
  ".chakra-radio__input",
  ".chakra-slider",

  // Bootstrap and common UI frameworks
  ".form-control",
  ".form-select",
  ".form-check-input",
  ".form-range",

  // Generic component patterns (be more specific to avoid false positives)
  'input[class*="input"]',
  'select[class*="select"]',
  'textarea[class*="textarea"]',
  '[class*="input"][type]',
  '[class*="field"][role]',
  '[class*="control"][aria-label]',
];

/**
 * Enhance with basic pattern detection for custom components
 */
const enhanceWithBasicPatternDetection = (
  container: HTMLElement | ShadowRoot,
  existingElements: HTMLElement[],
): HTMLElement[] => {
  console.log("Few elements found with direct selectors, trying pattern-based detection...");

  const allElements = Array.from(container.querySelectorAll<HTMLElement>("*"));
  const patternElements = allElements.filter(el => isBasicFormFieldByPatterns(el, existingElements));

  console.log(`Found ${patternElements.length} additional elements through pattern detection`);
  const combinedElements = [...existingElements, ...patternElements];
  return Array.from(new Set(combinedElements));
};

/**
 * Check if element is a form field using basic pattern detection
 */
const isBasicFormFieldByPatterns = (el: HTMLElement, existingElements: HTMLElement[]): boolean => {
  // Skip if already found
  if (existingElements.includes(el)) return false;

  // Skip non-interactive elements
  if (["SCRIPT", "STYLE", "META", "LINK", "TITLE", "HEAD"].includes(el.tagName)) {
    return false;
  }

  const indicators = gatherBasicElementIndicators(el);
  const indicatorCount = indicators.filter(Boolean).length;

  // Must have at least 2 indicators to be considered a form field
  return indicatorCount >= 2;
};

/**
 * Gather basic indicators for form field detection
 */
const gatherBasicElementIndicators = (el: HTMLElement): boolean[] => {
  // Check for interactive attributes
  const hasInteractiveAttrs =
    el.hasAttribute("tabindex") ||
    el.hasAttribute("onclick") ||
    el.hasAttribute("onchange") ||
    el.hasAttribute("oninput") ||
    el.hasAttribute("onfocus") ||
    el.hasAttribute("onblur");

  // Check for form-like classes or IDs
  const className = el?.className?.toLowerCase() || "";
  const id = el.id.toLowerCase() || "";
  const hasFormLikeNames =
    /\b(input|field|select|checkbox|radio|textarea|control|form|widget|picker|slider|range)\b/.test(
      className + " " + id,
    );

  // Check for ARIA attributes that suggest interactivity
  const hasAriaAttrs =
    el.hasAttribute("aria-label") ||
    el.hasAttribute("aria-labelledby") ||
    el.hasAttribute("aria-describedby") ||
    el.hasAttribute("aria-required") ||
    el.hasAttribute("aria-invalid");

  // Check if it's focusable
  const isFocusable =
    el.tabIndex >= 0 ||
    ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(el.tagName) ||
    el.hasAttribute("contenteditable");

  // Check for event listeners (heuristic)
  const hasEventListeners =
    el.getAttribute("onclick") !== null || el.getAttribute("onchange") !== null || el.getAttribute("oninput") !== null;

  return [hasInteractiveAttrs, hasFormLikeNames, hasAriaAttrs, isFocusable, hasEventListeners];
};

/**
 * Enhance with basic Shadow DOM detection
 */
const enhanceWithBasicShadowDOMDetection = (
  container: HTMLElement | ShadowRoot,
  existingElements: HTMLElement[],
): HTMLElement[] => {
  const shadowHosts = Array.from(container.querySelectorAll("*")).filter(
    el => (el as HTMLElement & { shadowRoot?: ShadowRoot }).shadowRoot,
  );

  const shadowElements: HTMLElement[] = [];
  for (const host of shadowHosts) {
    try {
      const shadowRoot = (host as HTMLElement & { shadowRoot?: ShadowRoot }).shadowRoot;
      if (shadowRoot) {
        const elements = getFormElementsRobust(shadowRoot);
        shadowElements.push(...elements);
      }
    } catch (e) {
      console.debug("Shadow DOM access failed:", e);
    }
  }

  return [...existingElements, ...shadowElements];
};

/**
 * Apply basic filtering to remove invalid elements
 */
const applyBasicFieldFiltering = (elements: HTMLElement[]): HTMLElement[] =>
  elements.filter(el => {
    try {
      if (!isBasicElementVisible(el)) return false;
      if (isElementDisabledOrReadonly(el)) return false;
      if (isElementDecorative(el)) return false;
      if (!isBasicFormFieldElement(el)) return false;

      return true;
    } catch (e) {
      console.debug("Error filtering element:", e);
      return false;
    }
  });

/**
 * Basic visibility check for elements
 */
const isBasicElementVisible = (el: HTMLElement): boolean => {
  const style = window.getComputedStyle(el);

  // Skip completely hidden fields (but allow temporarily hidden ones like in modals)
  if (style.display === "none" && style.visibility === "hidden" && style.opacity === "0") {
    return false;
  }

  // Skip elements with zero dimensions that aren't radio/checkbox (which can be hidden but still functional)
  const rect = el.getBoundingClientRect();
  const isCheckableField = el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio");
  const hasAriaRole = ["checkbox", "radio", "switch"].includes(el.getAttribute("role") || "");

  if (!isCheckableField && !hasAriaRole && rect.width === 0 && rect.height === 0) {
    return false;
  }

  return true;
};

/**
 * Basic check for form field elements
 */
const isBasicFormFieldElement = (el: HTMLElement): boolean => {
  // Skip elements that are clearly not form fields
  const isNotFormField =
    el.tagName === "DIV" &&
    !el.hasAttribute("role") &&
    !el.hasAttribute("contenteditable") &&
    !el.hasAttribute("tabindex") &&
    !/\b(input|field|select|control)\b/i.test(el.className + " " + el.id);

  return !isNotFormField;
};

/**
 * Main field detection function that processes all field types
 *
 * @param container The container element to detect fields within
 * @param testMode Whether to generate test values for fields
 * @returns An array of detected fields
 */
export const detectFields = async (container: HTMLElement, testMode: boolean = false): Promise<Field[]> => {
  console.log(
    `🔍 Starting enhanced field detection in container: ${container.tagName}${container.className ? "." + container.className : ""}, testMode: ${testMode}`,
  );
  const fields: Field[] = [];
  let baseIndex = 0;

  try {
    // Get all form elements with enhanced detection
    const formElements = getFormElementsRobust(container);
    console.log(`📋 Found ${formElements.length} potential form elements after filtering`);

    if (formElements.length === 0) {
      console.log("⚠️ No form elements found, trying fallback detection strategies...");

      // Fallback 1: Look for any interactive elements
      const interactiveElements = Array.from(
        container.querySelectorAll<HTMLElement>("button, a[href], [tabindex], [onclick], [onchange], [oninput]"),
      ).filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden";
      });

      console.log(`Found ${interactiveElements.length} interactive elements as fallback`);

      if (interactiveElements.length === 0) {
        console.log("❌ No interactive elements found, returning empty array");
        return fields;
      }
    }

    // Process each field type with enhanced error handling
    const detectionTasks = [
      { name: "text fields", fn: () => detectTextField(formElements, baseIndex, testMode) },
      { name: "select fields", fn: () => detectSelectFields(formElements, baseIndex, testMode) },
      { name: "checkable fields", fn: () => detectCheckableFields(formElements, baseIndex, testMode) },
      { name: "file fields", fn: () => detectFileFields(formElements, baseIndex, testMode) },
    ];

    for (const task of detectionTasks) {
      try {
        console.log(`🔍 Processing ${task.name} from ${formElements.length} elements`);
        const detectedFields = await task.fn();
        console.log(`✅ Detected ${detectedFields.length} ${task.name}`);

        fields.push(...detectedFields);
        baseIndex += detectedFields.length;
      } catch (error) {
        console.error(`❌ Error detecting ${task.name}:`, error);
        // Continue with other field types even if one fails
      }
    }

    // Add data attributes to help identify detected fields
    fields.forEach(field => {
      try {
        // Find the element for this field
        const selector =
          field.uniqueSelectors && field.uniqueSelectors.length > 0
            ? field.uniqueSelectors[0]
            : `[data-filliny-id="${field.id}"]`;

        const element = container.querySelector<HTMLElement>(selector);
        if (element) {
          element.setAttribute("data-filliny-detected", "true");
          element.setAttribute("data-filliny-type", field.type);
          // Store the detected label for debugging
          if (field.label) {
            element.setAttribute("data-filliny-label", field.label);
          }

          // Add detection timestamp for debugging
          element.setAttribute("data-filliny-detected-at", Date.now().toString());
        }
      } catch (e) {
        console.error("Error adding data attributes to field:", e);
      }
    });

    console.log(
      `🎯 Final result: Detected ${fields.length} total fields`,
      fields.map(f => ({
        id: f.id,
        type: f.type,
        label: f.label?.substring(0, 30) + (f.label && f.label.length > 30 ? "..." : ""),
        options: f.options?.length,
        hasTestValue: !!f.testValue,
      })),
    );

    // Validate field distribution
    const fieldTypes = fields.reduce(
      (acc, field) => {
        acc[field.type] = (acc[field.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    console.log(`📊 Field type distribution:`, fieldTypes);

    return fields;
  } catch (error) {
    console.error("❌ Error in main field detection:", error);
    return fields; // Return whatever we managed to detect
  }
};

/**
 * Enhanced form field detection with multiple strategies and robust error handling
 * Moved from detectionHelpers.ts to follow proper module organization
 */
export const getFormFieldsRobust = (container: HTMLElement | ShadowRoot): HTMLElement[] => {
  // Defensive programming: ensure container is valid
  if (!container) {
    console.warn("getFormFieldsRobust: Invalid container provided");
    return [];
  }

  try {
    // Strategy 1: Direct selector matching
    let fields = applyDirectSelectorMatching(container);

    // Strategy 2: Pattern-based detection for modern SPAs
    if (fields.length < 3) {
      fields = enhanceWithPatternDetection(container, fields);
    }

    // Strategy 3: Shadow DOM exploration
    fields = enhanceWithShadowDOMDetection(container, fields);

    // Strategy 4: Dynamic content detection
    fields = enhanceWithDynamicContentDetection(container, fields);

    // Final filtering step
    return applyAdvancedFieldFiltering(fields);
  } catch (error) {
    console.error("Critical error in getFormFieldsRobust, falling back to basic detection:", error);
    return fallbackToBasicDetection(container);
  }
};

/**
 * Apply direct CSS selector matching to find form fields
 */
const applyDirectSelectorMatching = (container: HTMLElement | ShadowRoot): HTMLElement[] => {
  const fieldSelectors = createFormFieldSelectors();
  const fields: HTMLElement[] = [];

  // Strategy 1: Direct selector matching with enhanced error handling
  for (const selector of fieldSelectors) {
    try {
      const elements = Array.from(container.querySelectorAll<HTMLElement>(selector));
      fields.push(...elements);
    } catch (e) {
      console.debug(`Selector failed: ${selector}`, e);
    }
  }

  // Remove duplicates
  return Array.from(new Set(fields));
};

/**
 * Create comprehensive list of form field selectors
 */
const createFormFieldSelectors = (): string[] => [
  // Standard form fields (highest priority)
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"])',
  "select",
  "textarea",

  // ARIA form fields
  '[role="textbox"]',
  '[role="combobox"]',
  '[role="spinbutton"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="radio"]',
  '[role="searchbox"]',
  '[role="listbox"]',
  '[role="slider"]',

  // Content editable
  '[contenteditable="true"]',

  // Custom data attributes (common patterns)
  "[data-field]",
  "[data-input]",
  "[data-form-field]",
  "[data-form-control]",
  '[data-testid*="input"]',
  '[data-testid*="field"]',
  '[data-testid*="select"]',
  '[data-qa*="input"]',
  '[data-qa*="field"]',
  '[data-qa*="select"]',
  '[data-cy*="input"]',
  '[data-cy*="field"]',
  '[data-cy*="select"]',

  // Common CSS class patterns
  ".form-control",
  ".form-input",
  ".form-field",
  ".input-field",
  ".text-field",
  ".select-field",
  ".checkbox-field",
  ".radio-field",
  ".field-input",
  ".field-select",
  ".custom-field",
  ".custom-input",
  ".custom-select",

  // Framework-specific patterns
  ".MuiTextField-root input",
  ".MuiTextField-root textarea",
  ".MuiSelect-root",
  ".MuiCheckbox-root input",
  ".MuiRadio-root input",
  ".MuiSlider-root",
  ".ant-input",
  ".ant-select",
  ".ant-checkbox-input",
  ".ant-radio-input",
  ".ant-textarea",
  ".ant-slider",
  ".chakra-input",
  ".chakra-select",
  ".chakra-checkbox__input",
  ".chakra-radio__input",
  ".chakra-slider",

  // Bootstrap and common UI frameworks
  ".form-control",
  ".form-select",
  ".form-check-input",
  ".form-range",

  // Modern SPA patterns (React, Vue, Angular) - highly targeted selectors
  'input[class*="Input"]',
  'textarea[class*="Input"]',
  'input[class*="Field"]',
  'textarea[class*="Field"]',
  'select[class*="Field"]',
  'input[class*="FormControl"]',
  'select[class*="FormControl"]',
  'textarea[class*="FormControl"]',
  'input[class*="TextInput"]',
  'textarea[class*="TextInput"]',
  'select[class*="Select"]',
  'input[class*="input-"]',
  'input[class*="field-"]',
  'select[class*="select-"]',
  'textarea[class*="textarea-"]',

  // Business form specific patterns (highly targeted)
  'input[class*="profile"][type]:not([type="hidden"]):not([type="submit"])',
  'input[class*="insurance"][type]:not([type="hidden"]):not([type="submit"])',
  'input[class*="policy"][type]:not([type="hidden"]):not([type="submit"])',
  'select[class*="coverage"]',
  'input[class*="quote"][type]:not([type="hidden"]):not([type="submit"])',
  'input[class*="application"][type]:not([type="hidden"]):not([type="submit"])',

  // Custom web components with form semantics
  "custom-input",
  "custom-select",
  "custom-textarea",
  "web-input",
  "web-select",
  "form-input",
  "form-select",
  "form-field",
  "ui-input",
  "ui-select",
  "ui-textarea",
  '[is^="input-"]',
  '[is^="select-"]',
  '[is^="field-"]',
  '[data-component*="input"]',
  '[data-component*="select"]',
  '[data-component*="field"]',
];

/**
 * Enhance field detection with pattern-based matching for modern SPAs
 */
const enhanceWithPatternDetection = (
  container: HTMLElement | ShadowRoot,
  existingFields: HTMLElement[],
): HTMLElement[] => {
  console.log("Enhanced detection: Few elements found with direct selectors, trying advanced pattern detection...");

  try {
    const allElements = Array.from(container.querySelectorAll<HTMLElement>("*"));
    const patternElements = allElements.filter(el => isLikelyFormFieldByPatterns(el, existingFields));

    console.log(
      `Enhanced detection: Found ${patternElements.length} additional elements through advanced pattern detection`,
    );
    const combinedFields = [...existingFields, ...patternElements];
    return Array.from(new Set(combinedFields));
  } catch (patternError) {
    console.warn("Enhanced pattern detection failed, continuing with basic detection:", patternError);
    return existingFields;
  }
};

/**
 * Check if element is likely a form field based on various patterns
 */
const isLikelyFormFieldByPatterns = (el: HTMLElement, existingFields: HTMLElement[]): boolean => {
  try {
    // Skip if already found
    if (existingFields.includes(el)) return false;

    // Skip non-interactive elements
    if (["SCRIPT", "STYLE", "META", "LINK", "TITLE", "HEAD", "NOSCRIPT"].includes(el.tagName)) {
      return false;
    }

    // Use weighted scoring system instead of simple counting
    const score = calculateElementFormFieldScore(el);

    // Dynamic threshold based on element type and context
    const threshold = getDynamicThreshold(el);

    return score >= threshold;
  } catch (elementError) {
    console.debug("Error processing element in pattern detection:", elementError);
    return false;
  }
};

/**
 * Calculate weighted score for form field likelihood
 */
const calculateElementFormFieldScore = (el: HTMLElement): number => {
  let score = 0;

  // High-confidence indicators (worth more points)
  if (isFocusableElement(el)) score += 30;
  if (hasFormLikeAttributes(el)) score += 25;
  if (hasAriaFormAttributes(el)) score += 20;
  if (isCustomWebComponent(el)) score += 35; // Custom components get high score
  if (isFileUploadElement(el)) score += 40; // File upload elements get very high score

  // Medium-confidence indicators
  if (hasInteractiveEventHandlers(el)) score += 15;
  if (hasFormLikeNaming(el)) score += 15;
  if (hasFrameworkTestingAttributes(el)) score += 10;
  if (hasCustomElementSemantics(el)) score += 12;
  if (hasFileUploadIndicators(el)) score += 18; // File upload specific patterns

  // Low-confidence indicators (context clues)
  if (hasInputLikeBehavior(el)) score += 8;
  if (isInFormContext(el)) score += 5;
  if (hasFormLikePosition(el)) score += 5;
  if (hasWebComponentPatterns(el)) score += 7;
  if (hasFileUploadContext(el)) score += 12; // File upload context clues

  // Bonus points for multiple confirmatory signals
  const indicators = [
    isFocusableElement(el),
    hasFormLikeAttributes(el),
    hasAriaFormAttributes(el),
    hasInteractiveEventHandlers(el),
    hasFormLikeNaming(el),
    hasFrameworkTestingAttributes(el),
    isCustomWebComponent(el),
    hasCustomElementSemantics(el),
    isFileUploadElement(el),
    hasFileUploadIndicators(el),
    hasFileUploadContext(el),
  ];
  const indicatorCount = indicators.filter(Boolean).length;

  if (indicatorCount >= 3) score += 10; // Bonus for multiple confirmatory signals
  if (indicatorCount >= 4) score += 15; // Higher bonus for very strong signals

  return score;
};

/**
 * Get dynamic threshold based on element type and context
 */
const getDynamicThreshold = (el: HTMLElement): number => {
  // Standard HTML form elements need lower threshold (they're likely form fields)
  if (["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) {
    return 25;
  }

  // Elements with contenteditable or form roles need medium threshold
  if (
    el.hasAttribute("contenteditable") ||
    ["textbox", "combobox", "checkbox", "radio", "switch"].includes(el.getAttribute("role") || "")
  ) {
    return 35;
  }

  // Other elements need higher threshold to avoid false positives
  return 45;
};

/**
 * Check if element is focusable (high-confidence indicator)
 */
const isFocusableElement = (el: HTMLElement): boolean =>
  el.tabIndex >= 0 ||
  ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(el.tagName) ||
  el.hasAttribute("contenteditable") ||
  ["button", "textbox", "combobox"].includes(el.getAttribute("role") || "");

/**
 * Check for form-like attributes (high-confidence indicator)
 */
const hasFormLikeAttributes = (el: HTMLElement): boolean =>
  el.hasAttribute("name") ||
  el.hasAttribute("value") ||
  el.hasAttribute("placeholder") ||
  el.hasAttribute("required") ||
  el.hasAttribute("pattern") ||
  el.hasAttribute("minlength") ||
  el.hasAttribute("maxlength");

/**
 * Check for ARIA form attributes (high-confidence indicator)
 */
const hasAriaFormAttributes = (el: HTMLElement): boolean =>
  el.hasAttribute("aria-label") ||
  el.hasAttribute("aria-labelledby") ||
  el.hasAttribute("aria-describedby") ||
  el.hasAttribute("aria-required") ||
  el.hasAttribute("aria-invalid") ||
  el.hasAttribute("aria-expanded") ||
  el.hasAttribute("aria-controls");

/**
 * Check for interactive event handlers (medium-confidence indicator)
 */
const hasInteractiveEventHandlers = (el: HTMLElement): boolean =>
  el.hasAttribute("tabindex") ||
  el.hasAttribute("onclick") ||
  el.hasAttribute("onchange") ||
  el.hasAttribute("oninput") ||
  el.hasAttribute("onfocus") ||
  el.hasAttribute("onblur") ||
  el.hasAttribute("onkeydown") ||
  el.hasAttribute("onkeyup");

/**
 * Check for form-like naming patterns (medium-confidence indicator)
 */
const hasFormLikeNaming = (el: HTMLElement): boolean => {
  const className = safeGetLowerString(el?.className);
  const id = safeGetLowerString(el?.id);
  const dataAttrs = safeGetAttributes(el)
    .filter(attr => attr.name.startsWith("data-"))
    .map(attr => `${attr.name}=${safeGetString(attr.value)}`)
    .join(" ")
    .toLowerCase();

  return createFormPatterns().some(pattern => pattern.test(className + " " + id + " " + dataAttrs));
};

/**
 * Check for framework testing attributes (medium-confidence indicator)
 */
const hasFrameworkTestingAttributes = (el: HTMLElement): boolean =>
  el.hasAttribute("data-testid") ||
  el.hasAttribute("data-cy") ||
  el.hasAttribute("data-qa") ||
  Object.keys(el).some(key => key.startsWith("__react") || key.startsWith("_vue") || key.startsWith("ng-"));

/**
 * Check for input-like behavior (low-confidence indicator)
 */
const hasInputLikeBehavior = (el: HTMLElement): boolean => {
  const className = safeGetLowerString(el?.className);
  return (
    el.addEventListener !== undefined &&
    (className.includes("editable") ||
      className.includes("input") ||
      className.includes("field") ||
      el.getAttribute("contenteditable") === "true")
  );
};

/**
 * Check if element is within a form context (low-confidence indicator)
 */
const isInFormContext = (el: HTMLElement): boolean =>
  !!el.closest('form, fieldset, [role="form"], [class*="form"], [id*="form"]');

/**
 * Check if element has form-like positioning (low-confidence indicator)
 */
const hasFormLikePosition = (el: HTMLElement): boolean => {
  // Look for associated labels or form-like containers
  const id = el.id;
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) return true;
  }

  // Check if element is in a container that suggests form fields
  const container = el.closest('[class*="field"], [class*="input"], [class*="form-group"], .row, .column');
  return !!container;
};

/**
 * Check if element is a custom web component (high-confidence indicator)
 */
const isCustomWebComponent = (el: HTMLElement): boolean => {
  const tagName = el.tagName.toLowerCase();

  // Custom elements must contain a hyphen
  if (!tagName.includes("-")) return false;

  // Check for common form-related custom element naming patterns
  const formComponentPatterns = [
    /^(custom|web|ui|form|app)-(input|select|textarea|field|control)/,
    /(input|select|textarea|field|control)-(custom|web|ui|component)/,
    /^(input|select|textarea|field|control)-/,
    /-(input|select|textarea|field|control)$/,
  ];

  return formComponentPatterns.some(pattern => pattern.test(tagName));
};

/**
 * Check for custom element semantics (medium-confidence indicator)
 */
const hasCustomElementSemantics = (el: HTMLElement): boolean => {
  // Check for Web Components standard attributes
  const hasCustomElementAttrs =
    el.hasAttribute("is") || el.hasAttribute("part") || el.hasAttribute("slot") || el.hasAttribute("exportparts");

  // Check for form-related custom attributes
  const hasFormCustomAttrs =
    el.hasAttribute("form-control") ||
    el.hasAttribute("form-field") ||
    el.hasAttribute("input-type") ||
    el.hasAttribute("field-type") ||
    el.hasAttribute("validation") ||
    el.hasAttribute("validators");

  return hasCustomElementAttrs || hasFormCustomAttrs;
};

/**
 * Check for web component patterns (low-confidence indicator)
 */
const hasWebComponentPatterns = (el: HTMLElement): boolean => {
  const className = safeGetLowerString(el?.className);
  const dataAttrs = safeGetAttributes(el)
    .filter(attr => attr.name.startsWith("data-"))
    .map(attr => attr.name)
    .join(" ")
    .toLowerCase();

  // Check for component-related patterns in class and data attributes
  const componentPatterns = [
    /\b(component|widget|control|element)\b/,
    /\b(custom|web|ui|app)-(.*)/,
    /\b(.*)-(component|widget|control|element)\b/,
  ];

  return componentPatterns.some(pattern => pattern.test(className + " " + dataAttrs));
};

/**
 * Gather various indicators that suggest an element is a form field
 */
const gatherElementIndicators = (el: HTMLElement): boolean[] => {
  // Enhanced interactive attribute detection
  const hasInteractiveAttrs =
    el.hasAttribute("tabindex") ||
    el.hasAttribute("onclick") ||
    el.hasAttribute("onchange") ||
    el.hasAttribute("oninput") ||
    el.hasAttribute("onfocus") ||
    el.hasAttribute("onblur") ||
    el.hasAttribute("onkeydown") ||
    el.hasAttribute("onkeyup");

  // Enhanced form-like pattern detection with safe utility functions
  const className = safeGetLowerString(el?.className);
  const id = safeGetLowerString(el?.id);
  const dataAttrs = safeGetAttributes(el)
    .filter(attr => attr.name.startsWith("data-"))
    .map(attr => `${attr.name}=${safeGetString(attr.value)}`)
    .join(" ")
    .toLowerCase();

  const hasFormLikeNames = createFormPatterns().some(pattern => pattern.test(className + " " + id + " " + dataAttrs));

  // Enhanced ARIA detection
  const hasAriaAttrs =
    el.hasAttribute("aria-label") ||
    el.hasAttribute("aria-labelledby") ||
    el.hasAttribute("aria-describedby") ||
    el.hasAttribute("aria-required") ||
    el.hasAttribute("aria-invalid") ||
    el.hasAttribute("aria-expanded") ||
    el.hasAttribute("aria-controls");

  // Enhanced focusability check
  const isFocusable =
    el.tabIndex >= 0 ||
    ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(el.tagName) ||
    el.hasAttribute("contenteditable") ||
    ["button", "textbox", "combobox"].includes(el.getAttribute("role") || "");

  // Check for modern framework patterns (React, Vue, Angular)
  const hasFrameworkAttrs =
    el.hasAttribute("data-testid") ||
    el.hasAttribute("data-cy") ||
    el.hasAttribute("data-qa") ||
    Object.keys(el).some(key => key.startsWith("__react") || key.startsWith("_vue") || key.startsWith("ng-"));

  // Check for custom input-like behavior
  const hasInputBehavior =
    el.addEventListener !== undefined &&
    (className.includes("editable") ||
      className.includes("input") ||
      className.includes("field") ||
      el.getAttribute("contenteditable") === "true");

  return [hasInteractiveAttrs, hasFormLikeNames, hasAriaAttrs, isFocusable, hasFrameworkAttrs, hasInputBehavior];
};

/**
 * Create comprehensive form-related regex patterns
 */
const createFormPatterns = (): RegExp[] => [
  /\b(input|field|select|checkbox|radio|textarea|control|form|widget|picker|slider|range)\b/,
  /\b(text|email|phone|number|date|time|password|search|url)\b/,
  /\b(name|address|city|state|zip|postal|country)\b/,
  /\b(first|last|full|middle|title|prefix|suffix)\b/,
  /\b(company|organization|business|employer)\b/,
  /\b(profile|account|user|member|customer)\b/,
  /\b(insurance|policy|coverage|premium|deductible|claim)\b/,
  /\b(application|quote|form|survey|questionnaire)\b/,
  /\b(upload|file|attachment|document|photo|image|video|audio)\b/,
  /\b(dropzone|drop-zone|file-drop|file-upload|browse)\b/,
  /\b(choose-file|select-file|attach|browse-files)\b/,
];

/**
 * Check if element is a file upload element (direct input type="file")
 */
const isFileUploadElement = (el: HTMLElement): boolean => el instanceof HTMLInputElement && el.type === "file";

/**
 * Check if element has file upload specific indicators
 */
const hasFileUploadIndicators = (el: HTMLElement): boolean => {
  const className = el.className?.toLowerCase() || "";
  const id = el.id?.toLowerCase() || "";
  const dataAttrs = Array.from(el.attributes)
    .filter(attr => attr.name.startsWith("data-"))
    .map(attr => attr.name + "=" + attr.value)
    .join(" ")
    .toLowerCase();

  // File upload class patterns
  const hasFileUploadClasses =
    className.includes("upload") ||
    className.includes("file") ||
    className.includes("dropzone") ||
    className.includes("drop-zone") ||
    className.includes("file-drop") ||
    className.includes("attach") ||
    className.includes("browse") ||
    className.includes("file-picker") ||
    className.includes("file-input") ||
    className.includes("file-field") ||
    className.includes("drag-drop") ||
    className.includes("document");

  // File upload ID patterns
  const hasFileUploadIds =
    id.includes("upload") ||
    id.includes("file") ||
    id.includes("attach") ||
    id.includes("browse") ||
    id.includes("resume") ||
    id.includes("cv") ||
    id.includes("document");

  // File upload data attributes
  const hasFileUploadData =
    dataAttrs.includes("upload") ||
    dataAttrs.includes("file") ||
    dataAttrs.includes("attach") ||
    dataAttrs.includes("resume") ||
    dataAttrs.includes("cv") ||
    dataAttrs.includes("document") ||
    el.hasAttribute("accept") ||
    el.hasAttribute("data-file-upload") ||
    el.hasAttribute("data-upload") ||
    el.hasAttribute("data-file-input");

  // ARIA patterns for file upload
  const role = el.getAttribute("role");
  const ariaLabel = el.getAttribute("aria-label")?.toLowerCase() || "";
  const hasFileUploadAria =
    (role === "button" &&
      (ariaLabel.includes("upload") || ariaLabel.includes("file") || ariaLabel.includes("attach"))) ||
    ariaLabel.includes("choose file") ||
    ariaLabel.includes("select file") ||
    ariaLabel.includes("browse");

  return hasFileUploadClasses || hasFileUploadIds || hasFileUploadData || hasFileUploadAria;
};

/**
 * Check if element has file upload context clues (surrounding content or parent/child elements)
 */
const hasFileUploadContext = (el: HTMLElement): boolean => {
  // Check text content of element and nearby elements
  const textContent = el.textContent?.toLowerCase() || "";
  const parentText = el.parentElement?.textContent?.toLowerCase() || "";

  // File upload text patterns
  const hasFileUploadText =
    textContent.includes("upload") ||
    textContent.includes("attach") ||
    textContent.includes("browse") ||
    textContent.includes("choose file") ||
    textContent.includes("select file") ||
    textContent.includes("drag") ||
    textContent.includes("drop") ||
    textContent.includes("cv") ||
    textContent.includes("resume") ||
    textContent.includes("document") ||
    parentText.includes("upload file") ||
    parentText.includes("attach file") ||
    parentText.includes("choose file");

  // Check for hidden file inputs in vicinity (common pattern for custom upload components)
  const nearbyFileInput =
    el.querySelector('input[type="file"]') ||
    el.parentElement?.querySelector('input[type="file"]') ||
    document.querySelector('input[type="file"][style*="display: none"]');

  // Check for drag and drop event handlers
  const hasDragDropHandlers =
    el.ondragover !== null ||
    el.ondrop !== null ||
    el.ondragenter !== null ||
    el.ondragleave !== null ||
    el.getAttribute("draggable") === "true";

  return hasFileUploadText || !!nearbyFileInput || hasDragDropHandlers;
};

/**
 * Enhance field detection with Shadow DOM exploration
 */
const enhanceWithShadowDOMDetection = (
  container: HTMLElement | ShadowRoot,
  existingFields: HTMLElement[],
): HTMLElement[] => {
  try {
    const shadowHosts = Array.from(container.querySelectorAll("*")).filter(
      el => (el as HTMLElement & { shadowRoot?: ShadowRoot }).shadowRoot,
    );

    const shadowFields: HTMLElement[] = [];
    for (const host of shadowHosts) {
      try {
        const shadowRoot = (host as HTMLElement & { shadowRoot?: ShadowRoot }).shadowRoot;
        if (shadowRoot) {
          const fields = getFormFieldsRobust(shadowRoot);
          shadowFields.push(...fields);
        }
      } catch (e) {
        console.debug("Shadow DOM access failed:", e);
      }
    }

    return [...existingFields, ...shadowFields];
  } catch (shadowError) {
    console.debug("Shadow DOM exploration failed:", shadowError);
    return existingFields;
  }
};

/**
 * Enhance field detection with dynamic content detection for SPAs
 */
const enhanceWithDynamicContentDetection = (
  container: HTMLElement | ShadowRoot,
  existingFields: HTMLElement[],
): HTMLElement[] => {
  try {
    const dynamicContainers = Array.from(
      container.querySelectorAll<HTMLElement>(
        '[data-reactroot], [data-vue-app], [ng-app], [class*="app"], [id*="app"], [class*="root"], [id*="root"]',
      ),
    );

    const dynamicFields: HTMLElement[] = [];
    for (const dynamicContainer of dynamicContainers) {
      try {
        // Look for fields that might be loaded dynamically
        const fields = Array.from(
          dynamicContainer.querySelectorAll<HTMLElement>(
            'div[role="textbox"], div[contenteditable], span[role="textbox"], div[tabindex], span[tabindex]',
          ),
        );

        dynamicFields.push(...fields.filter(el => !existingFields.includes(el)));
      } catch (e) {
        console.debug("Dynamic content detection failed:", e);
      }
    }

    return [...existingFields, ...dynamicFields];
  } catch (dynamicError) {
    console.debug("Dynamic content detection failed:", dynamicError);
    return existingFields;
  }
};

/**
 * Apply advanced filtering to remove non-form elements and hidden fields
 */
const applyAdvancedFieldFiltering = (fields: HTMLElement[]): HTMLElement[] =>
  fields.filter(el => {
    try {
      if (!isElementVisible(el)) return false;
      if (isElementDisabledOrReadonly(el)) return false;
      if (isElementDecorative(el)) return false;
      if (!isElementLikelyFormField(el)) return false;

      return true;
    } catch (e) {
      console.debug("Error filtering element:", e);
      return false;
    }
  });

/**
 * Check if element is visible and interactive
 */
const isElementVisible = (el: HTMLElement): boolean => {
  const style = window.getComputedStyle(el);

  // Enhanced visibility check - allow for modern CSS patterns
  const isCompletelyHidden = style.display === "none" && style.visibility === "hidden" && style.opacity === "0";
  if (isCompletelyHidden) return false;

  // Enhanced dimension check for modern UI patterns
  const rect = el.getBoundingClientRect();
  const isCheckableField = el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio");
  const hasAriaRole = ["checkbox", "radio", "switch", "textbox", "combobox"].includes(el.getAttribute("role") || "");
  const isCustomInput = el.hasAttribute("contenteditable") || el.getAttribute("role") === "textbox";

  // Allow zero-dimension elements if they're functional inputs or have proper ARIA roles
  if (!isCheckableField && !hasAriaRole && !isCustomInput && rect.width === 0 && rect.height === 0) {
    return false;
  }

  return true;
};

/**
 * Check if element is disabled or readonly
 */
const isElementDisabledOrReadonly = (el: HTMLElement): boolean =>
  el.hasAttribute("disabled") || el.hasAttribute("readonly");

/**
 * Check if element is decorative (not interactive)
 */
const isElementDecorative = (el: HTMLElement): boolean =>
  el.getAttribute("aria-hidden") === "true" ||
  el.getAttribute("role") === "presentation" ||
  el.getAttribute("role") === "none";

/**
 * Check if element is likely a form field vs decorative element
 */
const isElementLikelyFormField = (el: HTMLElement): boolean =>
  el.tagName === "INPUT" ||
  el.tagName === "SELECT" ||
  el.tagName === "TEXTAREA" ||
  el.hasAttribute("contenteditable") ||
  ["textbox", "combobox", "checkbox", "radio", "switch"].includes(el.getAttribute("role") || "") ||
  /\b(input|field|control)\b/i.test(el.className || "");

/**
 * Fallback to basic form field detection when enhanced methods fail
 */
const fallbackToBasicDetection = (container: HTMLElement | ShadowRoot): HTMLElement[] => {
  try {
    const basicSelectors = ["input", "select", "textarea"];
    const basicFields: HTMLElement[] = [];

    for (const selector of basicSelectors) {
      try {
        const elements = Array.from(container.querySelectorAll<HTMLElement>(selector));
        basicFields.push(...elements);
      } catch (e) {
        console.debug(`Basic selector failed: ${selector}`, e);
      }
    }

    return Array.from(new Set(basicFields));
  } catch (fallbackError) {
    console.error("Even basic fallback detection failed:", fallbackError);
    return [];
  }
};
