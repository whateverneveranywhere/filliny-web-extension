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
  const fieldSelectors = [
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

    // Generic component patterns (be more specific to avoid false positives)
    'input[class*="input"]',
    'select[class*="select"]',
    'textarea[class*="textarea"]',
    '[class*="input"][type]',
    '[class*="field"][role]',
    '[class*="control"][aria-label]',
  ];

  let elements: HTMLElement[] = [];

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
  elements = Array.from(new Set(elements));

  // Strategy 2: Pattern-based detection for custom components
  if (elements.length < 2) {
    console.log("Few elements found with direct selectors, trying pattern-based detection...");

    const allElements = Array.from(container.querySelectorAll<HTMLElement>("*"));
    const patternElements = allElements.filter(el => {
      // Skip if already found
      if (elements.includes(el)) return false;

      // Skip non-interactive elements
      if (["SCRIPT", "STYLE", "META", "LINK", "TITLE", "HEAD"].includes(el.tagName)) {
        return false;
      }

      // Check for interactive attributes
      const hasInteractiveAttrs =
        el.hasAttribute("tabindex") ||
        el.hasAttribute("onclick") ||
        el.hasAttribute("onchange") ||
        el.hasAttribute("oninput") ||
        el.hasAttribute("onfocus") ||
        el.hasAttribute("onblur");

      // Check for form-like classes or IDs
      const className = el?.className?.toLowerCase();
      const id = el.id.toLowerCase();
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
        el.getAttribute("onclick") !== null ||
        el.getAttribute("onchange") !== null ||
        el.getAttribute("oninput") !== null;

      // Must have at least 2 indicators to be considered a form field
      const indicators = [hasInteractiveAttrs, hasFormLikeNames, hasAriaAttrs, isFocusable, hasEventListeners];
      const indicatorCount = indicators.filter(Boolean).length;

      return indicatorCount >= 2;
    });

    console.log(`Found ${patternElements.length} additional elements through pattern detection`);
    elements.push(...patternElements);
    elements = Array.from(new Set(elements));
  }

  // Strategy 3: Shadow DOM exploration
  const shadowHosts = Array.from(container.querySelectorAll("*")).filter(
    el => (el as HTMLElement & { shadowRoot?: ShadowRoot }).shadowRoot,
  );

  for (const host of shadowHosts) {
    try {
      const shadowRoot = (host as HTMLElement & { shadowRoot?: ShadowRoot }).shadowRoot;
      if (shadowRoot) {
        const shadowElements = getFormElementsRobust(shadowRoot);
        elements.push(...shadowElements);
      }
    } catch (e) {
      console.debug("Shadow DOM access failed:", e);
    }
  }

  // Filter out elements that shouldn't be processed
  return elements.filter(el => {
    try {
      const style = window.getComputedStyle(el);

      // Skip clearly disabled or readonly fields
      if (el.hasAttribute("disabled") || el.hasAttribute("readonly")) {
        return false;
      }

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

      // Skip decorative elements
      const isDecorative =
        el.getAttribute("aria-hidden") === "true" ||
        el.getAttribute("role") === "presentation" ||
        el.getAttribute("role") === "none";

      if (isDecorative) {
        return false;
      }

      // Skip elements that are clearly not form fields
      const isNotFormField =
        el.tagName === "DIV" &&
        !el.hasAttribute("role") &&
        !el.hasAttribute("contenteditable") &&
        !el.hasAttribute("tabindex") &&
        !/\b(input|field|select|control)\b/i.test(el.className + " " + el.id);

      return !isNotFormField;
    } catch (e) {
      console.debug("Error filtering element:", e);
      return false;
    }
  });
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

  let fields: HTMLElement[] = [];

  try {
    const fieldSelectors = [
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

      // Modern SPA patterns (React, Vue, Angular)
      '[class*="input-"]',
      '[class*="field-"]',
      '[class*="form-"]',
      '[class*="Input"]',
      '[class*="Field"]',
      '[class*="FormControl"]',
      '[class*="TextInput"]',
      '[class*="Select"]',
      '[class*="Checkbox"]',
      '[class*="Radio"]',

      // Insurance/business form specific patterns
      '[class*="profile"]',
      '[class*="insurance"]',
      '[class*="policy"]',
      '[class*="coverage"]',
      '[class*="quote"]',
      '[class*="application"]',
    ];

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
    fields = Array.from(new Set(fields));

    // Strategy 2: Enhanced pattern-based detection for modern SPAs
    if (fields.length < 3) {
      console.log("Enhanced detection: Few elements found with direct selectors, trying advanced pattern detection...");

      try {
        const allElements = Array.from(container.querySelectorAll<HTMLElement>("*"));
        const patternElements = allElements.filter(el => {
          try {
            // Skip if already found
            if (fields.includes(el)) return false;

            // Skip non-interactive elements
            if (["SCRIPT", "STYLE", "META", "LINK", "TITLE", "HEAD", "NOSCRIPT"].includes(el.tagName)) {
              return false;
            }

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

            // More comprehensive pattern matching
            const formPatterns = [
              /\b(input|field|select|checkbox|radio|textarea|control|form|widget|picker|slider|range)\b/,
              /\b(text|email|phone|number|date|time|password|search|url)\b/,
              /\b(name|address|city|state|zip|postal|country)\b/,
              /\b(first|last|full|middle|title|prefix|suffix)\b/,
              /\b(company|organization|business|employer)\b/,
              /\b(profile|account|user|member|customer)\b/,
              /\b(insurance|policy|coverage|premium|deductible|claim)\b/,
              /\b(application|quote|form|survey|questionnaire)\b/,
            ];

            const hasFormLikeNames = formPatterns.some(pattern => pattern.test(className + " " + id + " " + dataAttrs));

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
              el.getAttribute("role") === "button" ||
              el.getAttribute("role") === "textbox" ||
              el.getAttribute("role") === "combobox";

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

            // Enhanced scoring system - need at least 2 strong indicators
            const indicators = [
              hasInteractiveAttrs,
              hasFormLikeNames,
              hasAriaAttrs,
              isFocusable,
              hasFrameworkAttrs,
              hasInputBehavior,
            ];
            const strongIndicators = indicators.filter(Boolean).length;

            return strongIndicators >= 2;
          } catch (elementError) {
            console.debug("Error processing element in pattern detection:", elementError);
            return false;
          }
        });

        console.log(
          `Enhanced detection: Found ${patternElements.length} additional elements through advanced pattern detection`,
        );
        fields.push(...patternElements);
        fields = Array.from(new Set(fields));
      } catch (patternError) {
        console.warn("Enhanced pattern detection failed, continuing with basic detection:", patternError);
      }
    }

    // Strategy 3: Enhanced Shadow DOM exploration
    try {
      const shadowHosts = Array.from(container.querySelectorAll("*")).filter(
        el => (el as HTMLElement & { shadowRoot?: ShadowRoot }).shadowRoot,
      );

      for (const host of shadowHosts) {
        try {
          const shadowRoot = (host as HTMLElement & { shadowRoot?: ShadowRoot }).shadowRoot;
          if (shadowRoot) {
            const shadowFields = getFormFieldsRobust(shadowRoot);
            fields.push(...shadowFields);
          }
        } catch (e) {
          console.debug("Shadow DOM access failed:", e);
        }
      }
    } catch (shadowError) {
      console.debug("Shadow DOM exploration failed:", shadowError);
    }

    // Strategy 4: Dynamic content detection (for SPAs that load content dynamically)
    try {
      const dynamicContainers = Array.from(
        container.querySelectorAll<HTMLElement>(
          '[data-reactroot], [data-vue-app], [ng-app], [class*="app"], [id*="app"], [class*="root"], [id*="root"]',
        ),
      );

      for (const dynamicContainer of dynamicContainers) {
        try {
          // Look for fields that might be loaded dynamically
          const dynamicFields = Array.from(
            dynamicContainer.querySelectorAll<HTMLElement>(
              'div[role="textbox"], div[contenteditable], span[role="textbox"], div[tabindex], span[tabindex]',
            ),
          );

          fields.push(...dynamicFields.filter(el => !fields.includes(el)));
        } catch (e) {
          console.debug("Dynamic content detection failed:", e);
        }
      }
    } catch (dynamicError) {
      console.debug("Dynamic content detection failed:", dynamicError);
    }

    // Enhanced filtering with better visibility detection
    const filteredFields = fields.filter(el => {
      try {
        const style = window.getComputedStyle(el);

        // Skip clearly disabled or readonly fields
        if (el.hasAttribute("disabled") || el.hasAttribute("readonly")) {
          return false;
        }

        // Enhanced visibility check - allow for modern CSS patterns
        const isCompletelyHidden = style.display === "none" && style.visibility === "hidden" && style.opacity === "0";

        if (isCompletelyHidden) {
          return false;
        }

        // Enhanced dimension check for modern UI patterns
        const rect = el.getBoundingClientRect();
        const isCheckableField = el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio");
        const hasAriaRole = ["checkbox", "radio", "switch", "textbox", "combobox"].includes(
          el.getAttribute("role") || "",
        );
        const isCustomInput = el.hasAttribute("contenteditable") || el.getAttribute("role") === "textbox";

        // Allow zero-dimension elements if they're functional inputs or have proper ARIA roles
        if (!isCheckableField && !hasAriaRole && !isCustomInput && rect.width === 0 && rect.height === 0) {
          return false;
        }

        // Skip decorative elements
        const isDecorative =
          el.getAttribute("aria-hidden") === "true" ||
          el.getAttribute("role") === "presentation" ||
          el.getAttribute("role") === "none";

        if (isDecorative) {
          return false;
        }

        // Enhanced check for actual form fields vs decorative elements
        const isLikelyFormField =
          el.tagName === "INPUT" ||
          el.tagName === "SELECT" ||
          el.tagName === "TEXTAREA" ||
          el.hasAttribute("contenteditable") ||
          ["textbox", "combobox", "checkbox", "radio", "switch"].includes(el.getAttribute("role") || "") ||
          /\b(input|field|control)\b/i.test(el.className || "");

        return isLikelyFormField;
      } catch (e) {
        console.debug("Error filtering element:", e);
        return false;
      }
    });

    return filteredFields;
  } catch (error) {
    console.error("Critical error in getFormFieldsRobust, falling back to basic detection:", error);

    // Fallback: Basic form field detection
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
  }
};
