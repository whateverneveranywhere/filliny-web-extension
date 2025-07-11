// Export all field type handlers
import { detectCheckableFields } from "./checkable";
import { detectFileFields } from "./file";
import { detectSelectFields } from "./select";
import { detectTextField } from "./text";
import type { Field } from "@extension/shared";

/**
 * Universal field detection with multiple strategies and robust error handling
 * Now supports dynamic content, behavioral analysis, and adaptive learning
 */
const getFormElementsRobust = (container: HTMLElement | ShadowRoot): HTMLElement[] => {
  console.log(`🔍 Starting universal field detection in container: ${container.constructor.name}`);

  // Strategy 1: Direct selector matching with universal patterns
  let elements = applyUniversalSelectorMatching(container);
  console.log(`📋 Direct selector matching found ${elements.length} elements`);

  // Strategy 2: Behavioral pattern detection for interactive elements
  if (elements.length < 3) {
    elements = enhanceWithBehavioralPatternDetection(container, elements);
    console.log(`🎯 Behavioral detection enhanced to ${elements.length} elements`);
  }

  // Strategy 3: Shadow DOM and custom component exploration
  elements = enhanceWithAdvancedShadowDOMDetection(container, elements);
  console.log(`🔍 Shadow DOM detection enhanced to ${elements.length} elements`);

  // Strategy 4: Semantic analysis for accessibility-compliant elements
  elements = enhanceWithSemanticAnalysis(container, elements);
  console.log(`📊 Semantic analysis enhanced to ${elements.length} elements`);

  // Strategy 5: Visual layout analysis for form-like structures
  elements = enhanceWithVisualAnalysis(container, elements);
  console.log(`👁️ Visual analysis enhanced to ${elements.length} elements`);

  // Final filtering with confidence scoring
  const filteredElements = applyUniversalFieldFiltering(elements);
  console.log(`✅ Final filtered result: ${filteredElements.length} elements`);

  return filteredElements;
};

/**
 * Create universal form element selectors with confidence scoring
 * Each selector has a confidence score indicating reliability
 */
interface SelectorWithConfidence {
  selector: string;
  confidence: number;
  description: string;
}

const createUniversalFormElementSelectors = (): SelectorWithConfidence[] => [
  // Standard form fields (highest confidence)
  {
    selector:
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"])',
    confidence: 0.95,
    description: "Standard HTML input elements",
  },
  {
    selector: "select",
    confidence: 0.95,
    description: "Standard HTML select elements",
  },
  {
    selector: "textarea",
    confidence: 0.95,
    description: "Standard HTML textarea elements",
  },

  // ARIA form fields (high confidence)
  {
    selector: '[role="textbox"]',
    confidence: 0.9,
    description: "ARIA textbox elements",
  },
  {
    selector: '[role="combobox"]',
    confidence: 0.9,
    description: "ARIA combobox elements",
  },
  {
    selector: '[role="spinbutton"]',
    confidence: 0.9,
    description: "ARIA spinbutton elements",
  },
  {
    selector: '[role="checkbox"]',
    confidence: 0.9,
    description: "ARIA checkbox elements",
  },
  {
    selector: '[role="switch"]',
    confidence: 0.9,
    description: "ARIA switch elements",
  },
  {
    selector: '[role="radio"]',
    confidence: 0.9,
    description: "ARIA radio elements",
  },
  {
    selector: '[role="searchbox"]',
    confidence: 0.9,
    description: "ARIA searchbox elements",
  },
  {
    selector: '[role="listbox"]',
    confidence: 0.85,
    description: "ARIA listbox elements",
  },
  {
    selector: '[role="slider"]',
    confidence: 0.85,
    description: "ARIA slider elements",
  },

  // Content editable (high confidence)
  {
    selector: '[contenteditable="true"]',
    confidence: 0.85,
    description: "Content editable elements",
  },
  {
    selector: '[contenteditable=""]',
    confidence: 0.8,
    description: "Content editable elements (empty value)",
  },

  // File upload fields (enhanced universal detection)
  {
    selector: 'input[type="file"]',
    confidence: 0.95,
    description: "Standard file input elements",
  },
  {
    selector: "[accept]",
    confidence: 0.7,
    description: "Elements with accept attribute",
  },
  {
    selector: "[data-file-upload]",
    confidence: 0.8,
    description: "Elements with file upload data attribute",
  },
  {
    selector: "[data-upload]",
    confidence: 0.75,
    description: "Elements with upload data attribute",
  },
  {
    selector: '[class*="upload"][role="button"]',
    confidence: 0.8,
    description: "Upload buttons with ARIA role",
  },
  {
    selector: '[class*="file"][role="button"]',
    confidence: 0.75,
    description: "File buttons with ARIA role",
  },
  {
    selector: '[class*="dropzone"]',
    confidence: 0.8,
    description: "Dropzone elements",
  },
  {
    selector: '[class*="file-drop"]',
    confidence: 0.8,
    description: "File drop elements",
  },
  {
    selector: '[draggable="true"][class*="upload"]',
    confidence: 0.75,
    description: "Draggable upload elements",
  },
  {
    selector: '[ondrop][class*="upload"]',
    confidence: 0.75,
    description: "Elements with drop handlers for uploads",
  },

  // Universal patterns for modern applications (medium confidence)
  {
    selector: '[class*="attach"]',
    confidence: 0.65,
    description: "Elements with attachment-related classes",
  },
  {
    selector: '[class*="document"]',
    confidence: 0.6,
    description: "Elements with document-related classes",
  },
  {
    selector: '[class*="resume"]',
    confidence: 0.7,
    description: "Elements with resume-related classes",
  },
  {
    selector: '[class*="cv"]',
    confidence: 0.7,
    description: "Elements with CV-related classes",
  },
  {
    selector: '[data-field-type="file"]',
    confidence: 0.8,
    description: "Elements with file field type",
  },
  {
    selector: '[data-field-type="upload"]',
    confidence: 0.8,
    description: "Elements with upload field type",
  },
  {
    selector: '[data-input-type="file"]',
    confidence: 0.8,
    description: "Elements with file input type",
  },

  // Interactive elements that might trigger file uploads
  {
    selector: 'button[class*="upload"]',
    confidence: 0.75,
    description: "Upload buttons",
  },
  {
    selector: 'button[class*="file"]',
    confidence: 0.7,
    description: "File buttons",
  },
  {
    selector: 'button[class*="attach"]',
    confidence: 0.7,
    description: "Attachment buttons",
  },
  {
    selector: 'button[class*="browse"]',
    confidence: 0.7,
    description: "Browse buttons",
  },
  {
    selector: '[role="button"][class*="upload"]',
    confidence: 0.7,
    description: "Upload elements with button role",
  },
  {
    selector: '[role="button"][class*="file"]',
    confidence: 0.65,
    description: "File elements with button role",
  },

  // Hidden file input patterns (common in custom upload components)
  {
    selector: 'input[type="file"][style*="display: none"] + *',
    confidence: 0.8,
    description: "Elements following hidden file inputs",
  },
  {
    selector: 'input[type="file"][class*="hidden"] + *',
    confidence: 0.8,
    description: "Elements following hidden file inputs (class)",
  },
  {
    selector: 'input[type="file"][class*="sr-only"] + *',
    confidence: 0.8,
    description: "Elements following screen reader only file inputs",
  },
  {
    selector: 'label[for] input[type="file"][style*="display: none"]',
    confidence: 0.85,
    description: "Labels for hidden file inputs",
  },

  // Custom data attributes (universal patterns)
  {
    selector: "[data-field]",
    confidence: 0.8,
    description: "Elements with data-field attribute",
  },
  {
    selector: "[data-input]",
    confidence: 0.8,
    description: "Elements with data-input attribute",
  },
  {
    selector: "[data-form-field]",
    confidence: 0.85,
    description: "Elements with data-form-field attribute",
  },
  {
    selector: "[data-form-control]",
    confidence: 0.85,
    description: "Elements with data-form-control attribute",
  },
  {
    selector: '[data-testid*="input"]',
    confidence: 0.75,
    description: "Elements with input-related test IDs",
  },
  {
    selector: '[data-testid*="field"]',
    confidence: 0.75,
    description: "Elements with field-related test IDs",
  },
  {
    selector: '[data-testid*="select"]',
    confidence: 0.75,
    description: "Elements with select-related test IDs",
  },
  {
    selector: '[data-cy*="input"]',
    confidence: 0.75,
    description: "Cypress test elements for inputs",
  },
  {
    selector: '[data-cy*="field"]',
    confidence: 0.75,
    description: "Cypress test elements for fields",
  },

  // Common CSS class patterns (medium confidence)
  {
    selector: ".form-control",
    confidence: 0.8,
    description: "Bootstrap form control elements",
  },
  {
    selector: ".form-input",
    confidence: 0.8,
    description: "Form input elements",
  },
  {
    selector: ".form-field",
    confidence: 0.8,
    description: "Form field elements",
  },
  {
    selector: ".input-field",
    confidence: 0.75,
    description: "Input field elements",
  },
  {
    selector: ".text-field",
    confidence: 0.75,
    description: "Text field elements",
  },
  {
    selector: ".select-field",
    confidence: 0.75,
    description: "Select field elements",
  },
  {
    selector: ".checkbox-field",
    confidence: 0.75,
    description: "Checkbox field elements",
  },
  {
    selector: ".radio-field",
    confidence: 0.75,
    description: "Radio field elements",
  },

  // Framework-specific patterns (medium confidence)
  {
    selector: ".MuiTextField-root input",
    confidence: 0.85,
    description: "Material-UI text field inputs",
  },
  {
    selector: ".MuiTextField-root textarea",
    confidence: 0.85,
    description: "Material-UI text field textareas",
  },
  {
    selector: ".MuiSelect-root",
    confidence: 0.85,
    description: "Material-UI select components",
  },
  {
    selector: ".MuiCheckbox-root input",
    confidence: 0.85,
    description: "Material-UI checkbox inputs",
  },
  {
    selector: ".ant-input",
    confidence: 0.85,
    description: "Ant Design input components",
  },
  {
    selector: ".ant-select",
    confidence: 0.85,
    description: "Ant Design select components",
  },
  {
    selector: ".ant-checkbox-input",
    confidence: 0.85,
    description: "Ant Design checkbox inputs",
  },
  {
    selector: ".ant-upload",
    confidence: 0.85,
    description: "Ant Design upload components",
  },
  {
    selector: ".chakra-input",
    confidence: 0.8,
    description: "Chakra UI input components",
  },
  {
    selector: ".chakra-select",
    confidence: 0.8,
    description: "Chakra UI select components",
  },

  // Bootstrap and common UI frameworks (high confidence)
  {
    selector: ".form-select",
    confidence: 0.9,
    description: "Bootstrap form select elements",
  },
  {
    selector: ".form-check-input",
    confidence: 0.9,
    description: "Bootstrap form check inputs",
  },
  {
    selector: ".form-range",
    confidence: 0.9,
    description: "Bootstrap form range inputs",
  },

  // Universal interactive patterns (lower confidence, broader matching)
  {
    selector: 'input[class*="input"]',
    confidence: 0.6,
    description: "Input elements with input-related classes",
  },
  {
    selector: 'select[class*="select"]',
    confidence: 0.6,
    description: "Select elements with select-related classes",
  },
  {
    selector: 'textarea[class*="textarea"]',
    confidence: 0.6,
    description: "Textarea elements with textarea-related classes",
  },
  {
    selector: '[class*="input"][type]',
    confidence: 0.55,
    description: "Elements with input classes and type attribute",
  },
  {
    selector: '[class*="field"][role]',
    confidence: 0.55,
    description: "Elements with field classes and ARIA roles",
  },
  {
    selector: '[class*="control"][aria-label]',
    confidence: 0.55,
    description: "Elements with control classes and ARIA labels",
  },

  // Universal accessibility patterns
  {
    selector: '[aria-required="true"]',
    confidence: 0.8,
    description: "Elements marked as required via ARIA",
  },
  {
    selector: "[aria-invalid]",
    confidence: 0.75,
    description: "Elements with ARIA invalid state",
  },
  {
    selector: "[aria-describedby]",
    confidence: 0.7,
    description: "Elements with ARIA descriptions",
  },
  {
    selector: "[aria-labelledby]",
    confidence: 0.7,
    description: "Elements with ARIA label references",
  },

  // Universal interaction patterns
  {
    selector: '[tabindex]:not([tabindex="-1"])',
    confidence: 0.6,
    description: "Focusable elements with tabindex",
  },
  {
    selector: "[onfocus]",
    confidence: 0.65,
    description: "Elements with focus event handlers",
  },
  {
    selector: "[onchange]",
    confidence: 0.7,
    description: "Elements with change event handlers",
  },
  {
    selector: "[oninput]",
    confidence: 0.7,
    description: "Elements with input event handlers",
  },

  // Universal custom web components
  {
    selector: '*[is*="input"]',
    confidence: 0.6,
    description: "Custom elements extending input",
  },
  {
    selector: '*[is*="select"]',
    confidence: 0.6,
    description: "Custom elements extending select",
  },
  {
    selector: '*[is*="field"]',
    confidence: 0.6,
    description: "Custom elements extending field",
  },

  // Custom elements with hyphenated names (Web Components)
  {
    selector: '*[class*="-input"]',
    confidence: 0.5,
    description: "Elements with hyphenated input classes",
  },
  {
    selector: '*[class*="-field"]',
    confidence: 0.5,
    description: "Elements with hyphenated field classes",
  },
  {
    selector: '*[class*="-control"]',
    confidence: 0.5,
    description: "Elements with hyphenated control classes",
  },
];

/**
 * Apply universal CSS selector matching for form elements
 * Enhanced with confidence scoring and multiple detection strategies
 */
const applyUniversalSelectorMatching = (container: HTMLElement | ShadowRoot): HTMLElement[] => {
  const fieldSelectors = createUniversalFormElementSelectors();
  const elements: HTMLElement[] = [];
  const elementConfidence = new Map<HTMLElement, number>();

  // Strategy 1: High-confidence selectors (standard form elements)
  const highConfidenceSelectors = fieldSelectors.filter(s => s.confidence >= 0.9);
  for (const selectorObj of highConfidenceSelectors) {
    try {
      const found = Array.from(container.querySelectorAll<HTMLElement>(selectorObj.selector));
      found.forEach(el => {
        elements.push(el);
        elementConfidence.set(el, selectorObj.confidence);
      });
    } catch (e) {
      console.debug(`High-confidence selector failed: ${selectorObj.selector}`, e);
    }
  }

  // Strategy 2: Medium-confidence selectors (ARIA and semantic elements)
  const mediumConfidenceSelectors = fieldSelectors.filter(s => s.confidence >= 0.7 && s.confidence < 0.9);
  for (const selectorObj of mediumConfidenceSelectors) {
    try {
      const found = Array.from(container.querySelectorAll<HTMLElement>(selectorObj.selector));
      found.forEach(el => {
        if (!elements.includes(el)) {
          elements.push(el);
          elementConfidence.set(el, selectorObj.confidence);
        }
      });
    } catch (e) {
      console.debug(`Medium-confidence selector failed: ${selectorObj.selector}`, e);
    }
  }

  // Strategy 3: Low-confidence selectors (pattern-based detection)
  const lowConfidenceSelectors = fieldSelectors.filter(s => s.confidence < 0.7);
  for (const selectorObj of lowConfidenceSelectors) {
    try {
      const found = Array.from(container.querySelectorAll<HTMLElement>(selectorObj.selector));
      found.forEach(el => {
        if (!elements.includes(el)) {
          elements.push(el);
          elementConfidence.set(el, selectorObj.confidence);
        }
      });
    } catch (e) {
      console.debug(`Low-confidence selector failed: ${selectorObj.selector}`, e);
    }
  }

  // Store confidence scores for later use
  elements.forEach(el => {
    const confidence = elementConfidence.get(el) || 0.5;
    el.setAttribute("data-filliny-confidence", confidence.toString());
  });

  return Array.from(new Set(elements));
};

/**
 * Enhance with behavioral pattern detection for interactive elements
 * Uses behavioral analysis to identify form-like elements
 */
const enhanceWithBehavioralPatternDetection = (
  container: HTMLElement | ShadowRoot,
  existingElements: HTMLElement[],
): HTMLElement[] => {
  console.log("🎯 Enhancing with behavioral pattern detection...");

  const allElements = Array.from(container.querySelectorAll<HTMLElement>("*"));
  const behavioralElements = allElements.filter(el => isInteractiveFormFieldByBehavior(el, existingElements));

  console.log(`🎯 Found ${behavioralElements.length} additional elements through behavioral analysis`);
  const combinedElements = [...existingElements, ...behavioralElements];
  return Array.from(new Set(combinedElements));
};

/**
 * Check if element is a form field using behavioral analysis
 * Analyzes interaction patterns, accessibility features, and user behavior expectations
 */
const isInteractiveFormFieldByBehavior = (el: HTMLElement, existingElements: HTMLElement[]): boolean => {
  // Skip if already found
  if (existingElements.includes(el)) return false;

  // Skip non-interactive elements
  if (["SCRIPT", "STYLE", "META", "LINK", "TITLE", "HEAD", "NOSCRIPT"].includes(el.tagName)) {
    return false;
  }

  // Use advanced behavioral scoring
  const behavioralScore = calculateBehavioralFormFieldScore(el);
  const confidenceThreshold = getDynamicConfidenceThreshold(el);

  return behavioralScore >= confidenceThreshold;
};

/**
 * Calculate behavioral score for form field likelihood using advanced analysis
 * Enhanced with framework detection, pattern recognition, and adaptive scoring
 */
const calculateBehavioralFormFieldScore = (el: HTMLElement): number => {
  let score = 0;

  // 1. Interaction capability analysis (25 points max)
  score += analyzeInteractionCapability(el);

  // 2. Accessibility implementation (20 points max)
  score += analyzeAccessibilityImplementation(el);

  // 3. Semantic meaning analysis (20 points max)
  score += analyzeSemanticMeaning(el);

  // 4. User experience patterns (15 points max)
  score += analyzeUserExperiencePatterns(el);

  // 5. Context clues analysis (10 points max)
  score += analyzeContextClues(el);

  // 6. Framework-specific patterns (10 points max)
  score += analyzeFrameworkPatterns(el);

  // 7. Advanced interaction patterns (10 points max)
  score += analyzeAdvancedInteractionPatterns(el);

  // 8. Visual characteristics analysis (5 points max)
  score += analyzeVisualCharacteristics(el);

  // Apply framework-specific boosters
  score = applyFrameworkBoosters(el, score);

  // Apply contextual multipliers
  score = applyContextualMultipliers(el, score);

  return Math.min(100, Math.round(score));
};

/**
 * Analyze interaction capability of an element with enhanced detection
 */
const analyzeInteractionCapability = (el: HTMLElement): number => {
  let score = 0;

  // Standard form elements get high score
  if (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(el.tagName)) {
    score += 20;

    // Additional scoring for input types
    if (el instanceof HTMLInputElement) {
      const inputType = el.type;
      if (["text", "email", "password", "tel", "url", "search", "number"].includes(inputType)) {
        score += 5;
      }
    }
  }

  // Focusable elements with enhanced detection
  if (el.tabIndex >= 0 || el.hasAttribute("tabindex")) {
    score += 8;

    // Bonus for non-negative tabindex (properly focusable)
    if (el.tabIndex >= 0) {
      score += 2;
    }
  }

  // Content editable with type detection
  if (el.hasAttribute("contenteditable") && el.getAttribute("contenteditable") !== "false") {
    score += 12;

    // Bonus for rich text editor patterns
    if (el.closest('[class*="editor"], [class*="wysiwyg"], [class*="rich-text"]')) {
      score += 3;
    }
  }

  // Event handlers suggest interactivity (enhanced)
  const interactiveEvents = [
    "onclick",
    "onchange",
    "oninput",
    "onfocus",
    "onblur",
    "onkeydown",
    "onkeyup",
    "onkeypress",
    "onsubmit",
    "onreset",
  ];
  const eventHandlerCount = interactiveEvents.filter(event => el.hasAttribute(event)).length;
  score += Math.min(8, eventHandlerCount * 1.5);

  // ARIA roles that indicate interactivity (enhanced)
  const interactiveRoles = [
    "textbox",
    "combobox",
    "checkbox",
    "radio",
    "switch",
    "button",
    "slider",
    "spinbutton",
    "searchbox",
    "listbox",
    "option",
  ];
  const role = el.getAttribute("role");
  if (role && interactiveRoles.includes(role)) {
    score += 15;

    // Bonus for composite roles
    if (["combobox", "listbox"].includes(role)) {
      score += 3;
    }
  }

  // Check for modern input patterns
  if (el.hasAttribute("data-testid") || el.hasAttribute("data-cy")) {
    score += 2;
  }

  return Math.min(25, score);
};

/**
 * Analyze accessibility implementation with enhanced ARIA detection
 */
const analyzeAccessibilityImplementation = (el: HTMLElement): number => {
  let score = 0;

  // ARIA labels and descriptions (enhanced)
  if (el.hasAttribute("aria-label")) {
    score += 6;
    // Bonus for descriptive labels
    const label = el.getAttribute("aria-label");
    if (label && label.length > 3) {
      score += 2;
    }
  }

  if (el.hasAttribute("aria-labelledby")) {
    score += 5;
    // Verify the referenced element exists
    const labelId = el.getAttribute("aria-labelledby");
    if (labelId && document.getElementById(labelId)) {
      score += 2;
    }
  }

  if (el.hasAttribute("aria-describedby")) {
    score += 4;
    // Verify the referenced element exists
    const descId = el.getAttribute("aria-describedby");
    if (descId && document.getElementById(descId)) {
      score += 1;
    }
  }

  // Form-specific ARIA attributes (enhanced)
  if (el.hasAttribute("aria-required")) {
    score += 5;
  }

  if (el.hasAttribute("aria-invalid")) {
    score += 3;
  }

  // Additional form-specific ARIA attributes
  if (el.hasAttribute("aria-readonly")) {
    score += 2;
  }

  if (el.hasAttribute("aria-disabled")) {
    score += 2;
  }

  // ARIA states that indicate form fields (enhanced)
  const formAriaStates = [
    "aria-expanded",
    "aria-checked",
    "aria-selected",
    "aria-pressed",
    "aria-multiselectable",
    "aria-autocomplete",
    "aria-haspopup",
  ];
  const ariaStateCount = formAriaStates.filter(state => el.hasAttribute(state)).length;
  score += Math.min(6, ariaStateCount * 1.5);

  // Proper labeling via labels (enhanced)
  const id = el.id;
  if (id) {
    const associatedLabel = document.querySelector(`label[for="${id}"]`);
    if (associatedLabel) {
      score += 8;
      // Bonus for descriptive label text
      const labelText = associatedLabel.textContent?.trim();
      if (labelText && labelText.length > 3) {
        score += 1;
      }
    }
  }

  // Check for parent label
  const parentLabel = el.closest("label");
  if (parentLabel && !el.closest("label")?.querySelector("label")) {
    score += 6;
  }

  return Math.min(20, score);
};

/**
 * Analyze semantic meaning through naming and context with enhanced patterns
 */
const analyzeSemanticMeaning = (el: HTMLElement): number => {
  let score = 0;

  const className = el.className?.toLowerCase() || "";
  const id = el.id?.toLowerCase() || "";
  const name = el.getAttribute("name")?.toLowerCase() || "";
  const placeholder = el.getAttribute("placeholder")?.toLowerCase() || "";
  const type = el.getAttribute("type")?.toLowerCase() || "";
  const role = el.getAttribute("role")?.toLowerCase() || "";
  const ariaLabel = el.getAttribute("aria-label")?.toLowerCase() || "";

  const allText = `${className} ${id} ${name} ${placeholder} ${type} ${role} ${ariaLabel}`;

  // Strong form field indicators (enhanced)
  const strongIndicators = [
    /\b(input|field|control|widget|editor|form-control)\b/,
    /\b(text|email|password|number|tel|url|search|textarea)\b/,
    /\b(select|choice|option|dropdown|combo|combobox)\b/,
    /\b(checkbox|radio|switch|toggle|button)\b/,
    /\b(upload|file|attach|document|browse)\b/,
    /\b(date|time|calendar|picker|datepicker)\b/,
    /\b(range|slider|spin|number|stepper)\b/,
  ];

  const strongMatches = strongIndicators.filter(pattern => pattern.test(allText)).length;
  score += Math.min(12, strongMatches * 2.5);

  // Form context indicators (enhanced)
  const formContextIndicators = [
    /\b(form|application|registration|profile|account)\b/,
    /\b(name|email|phone|address|company|organization)\b/,
    /\b(first|last|middle|full|given|family)\b/,
    /\b(city|state|country|zip|postal|region)\b/,
    /\b(birth|age|gender|title|position)\b/,
    /\b(username|password|login|signin|signup)\b/,
  ];

  const contextMatches = formContextIndicators.filter(pattern => pattern.test(allText)).length;
  score += Math.min(6, contextMatches * 1.5);

  // Job application specific patterns
  const jobApplicationIndicators = [
    /\b(resume|cv|portfolio|experience|education)\b/,
    /\b(skill|qualification|certification|degree)\b/,
    /\b(position|role|job|career|employment)\b/,
    /\b(salary|compensation|availability|location)\b/,
  ];

  const jobMatches = jobApplicationIndicators.filter(pattern => pattern.test(allText)).length;
  score += Math.min(4, jobMatches * 2);

  // Framework-specific class patterns
  const frameworkIndicators = [
    /\b(form-field|form-group|form-item|form-element)\b/,
    /\b(input-field|input-group|input-wrapper)\b/,
    /\b(field-wrapper|field-container|field-group)\b/,
    /\b(control-group|control-wrapper)\b/,
  ];

  const frameworkMatches = frameworkIndicators.filter(pattern => pattern.test(allText)).length;
  score += Math.min(3, frameworkMatches * 1.5);

  return Math.min(20, score);
};

/**
 * Analyze user experience patterns with enhanced UX detection
 */
const analyzeUserExperiencePatterns = (el: HTMLElement): number => {
  let score = 0;

  // Has placeholder text (common UX pattern)
  if (el.hasAttribute("placeholder") && el.getAttribute("placeholder")?.trim()) {
    score += 4;

    // Bonus for descriptive placeholders
    const placeholder = el.getAttribute("placeholder");
    if (placeholder && placeholder.length > 5) {
      score += 1;
    }
  }

  // Has validation attributes (enhanced)
  const validationAttrs = [
    "required",
    "pattern",
    "min",
    "max",
    "minlength",
    "maxlength",
    "step",
    "novalidate",
    "formnovalidate",
  ];
  const validationCount = validationAttrs.filter(attr => el.hasAttribute(attr)).length;
  score += Math.min(5, validationCount * 1);

  // Has autocomplete attribute (modern form UX)
  if (el.hasAttribute("autocomplete")) {
    score += 3;

    // Bonus for specific autocomplete values
    const autocomplete = el.getAttribute("autocomplete");
    if (autocomplete && !["off", "on"].includes(autocomplete)) {
      score += 1;
    }
  }

  // Modern input attributes
  const modernAttrs = ["spellcheck", "inputmode", "enterkeyhint", "autocapitalize"];
  const modernCount = modernAttrs.filter(attr => el.hasAttribute(attr)).length;
  score += Math.min(2, modernCount * 0.5);

  // Visual styling suggests input field (enhanced)
  try {
    const style = window.getComputedStyle(el);
    const hasBorder = style.borderWidth !== "0px" && style.borderStyle !== "none";
    const hasBackground = style.backgroundColor !== "rgba(0, 0, 0, 0)" && style.backgroundColor !== "transparent";
    const hasRoundedCorners = style.borderRadius !== "0px";
    const hasPadding = style.padding !== "0px";

    let visualScore = 0;
    if (hasBorder) visualScore += 1;
    if (hasBackground) visualScore += 1;
    if (hasRoundedCorners) visualScore += 0.5;
    if (hasPadding) visualScore += 0.5;

    score += Math.min(3, visualScore);
  } catch {
    // Ignore styling errors
  }

  // Check for error/success states
  const hasStateClasses = el.className?.toLowerCase().match(/\b(error|invalid|success|valid|warning)\b/);
  if (hasStateClasses) {
    score += 1;
  }

  return Math.min(15, score);
};

/**
 * Analyze context clues from surrounding elements with enhanced detection
 */
const analyzeContextClues = (el: HTMLElement): number => {
  let score = 0;

  // Inside form-like containers (enhanced)
  const formLikeContainers = el.closest(
    'form, fieldset, [role="form"], [role="group"], [class*="form"], [class*="application"]',
  );
  if (formLikeContainers) {
    score += 4;

    // Bonus for being in a direct form
    if (formLikeContainers.tagName === "FORM") {
      score += 2;
    }
  }

  // Has associated label (enhanced)
  const parentLabel = el.closest("label");
  if (parentLabel) {
    score += 3;
  }

  // Check for adjacent labels
  const adjacentLabel = el.previousElementSibling || el.nextElementSibling;
  if (adjacentLabel && adjacentLabel.tagName === "LABEL") {
    score += 2;
  }

  // Surrounded by other likely form elements (enhanced)
  const parent = el.parentElement;
  if (parent) {
    const siblingFormElements = parent.querySelectorAll(
      'input, select, textarea, [role="textbox"], [role="combobox"], [role="checkbox"], [role="radio"]',
    );
    if (siblingFormElements.length > 1) {
      score += 2;
    }

    // Bonus for being in a form row or group
    if (parent.matches('[class*="row"], [class*="group"], [class*="field"]')) {
      score += 1;
    }
  }

  // Check for form validation context
  const hasValidationContext = el.closest('[class*="validation"], [class*="error"], [class*="invalid"]');
  if (hasValidationContext) {
    score += 1;
  }

  return Math.min(10, score);
};

/**
 * Analyze framework-specific patterns
 */
const analyzeFrameworkPatterns = (el: HTMLElement): number => {
  let score = 0;

  // React patterns
  const reactPatterns = [
    /\b(react-select|react-input|react-form)\b/,
    /\b(mui-|material-ui|ant-design)\b/,
    /\b(chakra-|mantine-)\b/,
  ];

  const className = el.className?.toLowerCase() || "";
  const reactMatches = reactPatterns.filter(pattern => pattern.test(className)).length;
  score += Math.min(4, reactMatches * 2);

  // Vue patterns
  const vuePatterns = [/\b(v-model|v-bind|vuetify)\b/, /\b(el-input|el-select|element-ui)\b/];

  const vueMatches = vuePatterns.filter(pattern => pattern.test(className)).length;
  score += Math.min(4, vueMatches * 2);

  // Angular patterns
  const angularPatterns = [/\b(mat-|angular-material)\b/, /\b(ng-|ngx-)\b/, /\b(p-|primeng)\b/];

  const angularMatches = angularPatterns.filter(pattern => pattern.test(className)).length;
  score += Math.min(4, angularMatches * 2);

  // Bootstrap patterns
  const bootstrapPatterns = [/\b(form-control|form-select|form-check)\b/, /\b(input-group|form-floating)\b/];

  const bootstrapMatches = bootstrapPatterns.filter(pattern => pattern.test(className)).length;
  score += Math.min(3, bootstrapMatches * 1.5);

  // Tailwind patterns
  const tailwindPatterns = [/\b(focus:ring|focus:border|border-gray)\b/, /\b(rounded-md|shadow-sm|px-3|py-2)\b/];

  const tailwindMatches = tailwindPatterns.filter(pattern => pattern.test(className)).length;
  score += Math.min(2, tailwindMatches * 1);

  return Math.min(10, score);
};

/**
 * Analyze advanced interaction patterns
 */
const analyzeAdvancedInteractionPatterns = (el: HTMLElement): number => {
  let score = 0;

  // Check for modern event listeners (not just inline handlers)
  // Note: getEventListeners is a Chrome DevTools API, may not be available in all contexts
  try {
    const listeners = (el as unknown as { getEventListeners?: () => Record<string, unknown[]> }).getEventListeners?.();
    if (listeners && Object.keys(listeners).length > 0) {
      score += 3;
    }
  } catch {
    // Ignore if not available
  }

  // Check for CSS pseudo-class support
  try {
    const style = window.getComputedStyle(el);
    const hasFocusStyle = style.getPropertyValue("outline") !== "none" || style.getPropertyValue("border") !== "none";
    if (hasFocusStyle) {
      score += 2;
    }
  } catch {
    // Ignore styling errors
  }

  // Check for data attributes that suggest form handling
  const formDataAttributes = [
    "data-validate",
    "data-required",
    "data-mask",
    "data-format",
    "data-field",
    "data-input",
    "data-form",
    "data-control",
  ];

  const dataAttrCount = formDataAttributes.filter(attr => el.hasAttribute(attr)).length;
  score += Math.min(3, dataAttrCount * 1);

  // Check for custom properties or methods
  const customProperties = ["value", "checked", "selectedOptions", "validity"];
  const hasCustomProps = customProperties.some(prop => prop in el);
  if (hasCustomProps) {
    score += 2;
  }

  return Math.min(10, score);
};

/**
 * Analyze visual characteristics that suggest form fields
 */
const analyzeVisualCharacteristics = (el: HTMLElement): number => {
  let score = 0;

  try {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();

    // Check for typical form field dimensions
    const hasTypicalDimensions = rect.width > 50 && rect.width < 800 && rect.height > 20 && rect.height < 200;

    if (hasTypicalDimensions) {
      score += 2;
    }

    // Check for form field styling
    const hasBorder = style.borderWidth !== "0px";
    const hasBackground = style.backgroundColor !== "rgba(0, 0, 0, 0)" && style.backgroundColor !== "transparent";
    const hasPadding = style.padding !== "0px";

    if (hasBorder) score += 1;
    if (hasBackground) score += 1;
    if (hasPadding) score += 1;

    // Check for focus indicators
    const hasOutline = style.outline !== "none";
    if (hasOutline) {
      score += 1;
    }
  } catch {
    // Ignore styling errors
  }

  return Math.min(5, score);
};

/**
 * Apply framework-specific score boosters
 */
const applyFrameworkBoosters = (el: HTMLElement, score: number): number => {
  const className = el.className?.toLowerCase() || "";
  let booster = 1;

  // Material-UI/MUI boost
  if (className.includes("mui-") || className.includes("material-ui")) {
    booster = 1.1;
  }

  // Ant Design boost
  if (className.includes("ant-")) {
    booster = 1.1;
  }

  // React Select boost
  if (className.includes("react-select")) {
    booster = 1.15;
  }

  // Bootstrap boost
  if (className.includes("form-control") || className.includes("form-select")) {
    booster = 1.1;
  }

  return score * booster;
};

/**
 * Apply contextual multipliers based on page context
 */
const applyContextualMultipliers = (_el: HTMLElement, score: number): number => {
  let multiplier = 1;

  // Job application context multiplier
  const pageContent = document.body.textContent?.toLowerCase() || "";
  const jobKeywords = ["apply", "application", "career", "job", "position", "resume", "cv"];
  const hasJobContext = jobKeywords.some(keyword => pageContent.includes(keyword));

  if (hasJobContext) {
    multiplier += 0.05;
  }

  // Form-dense page multiplier
  const formElementsCount = document.querySelectorAll("input, select, textarea").length;
  if (formElementsCount > 10) {
    multiplier += 0.05;
  }

  // Dynamic content multiplier (for SPAs)
  const hasDynamicContent = document.querySelector("[data-reactroot], [ng-app], [data-v-]");
  if (hasDynamicContent) {
    multiplier += 0.03;
  }

  return score * multiplier;
};

/**
 * Get dynamic confidence threshold based on element characteristics with adaptive logic
 */
const getDynamicConfidenceThreshold = (el: HTMLElement): number => {
  // Very low threshold for standard form elements
  if (["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) {
    return 35;
  }

  // Low threshold for ARIA form elements
  const role = el.getAttribute("role");
  if (role && ["textbox", "combobox", "checkbox", "radio", "switch", "slider", "spinbutton"].includes(role)) {
    return 45;
  }

  // Medium threshold for content editable
  if (el.hasAttribute("contenteditable") && el.getAttribute("contenteditable") !== "false") {
    return 50;
  }

  // Context-aware threshold adjustment
  const contextBonus = analyzeContextualRelevance();
  let threshold = 65;

  // Lower threshold if element is in a form context
  if (el.closest('form, fieldset, [role="form"], [role="group"]')) {
    threshold -= 5;
  }

  // Lower threshold for elements with form-like attributes
  const formAttributes = ["name", "placeholder", "required", "disabled", "readonly"];
  const hasFormAttrs = formAttributes.some(attr => el.hasAttribute(attr));
  if (hasFormAttrs) {
    threshold -= 5;
  }

  // Apply context bonus
  threshold -= contextBonus;

  return Math.max(35, Math.round(threshold));
};

/**
 * Analyze contextual relevance for threshold adjustment
 */
const analyzeContextualRelevance = (): number => {
  let bonus = 0;

  // Check if we're in a job application context
  const pageContent = document.body.textContent?.toLowerCase() || "";
  const jobKeywords = ["apply", "application", "career", "job", "position", "resume", "cv"];
  const hasJobContext = jobKeywords.some(keyword => pageContent.includes(keyword));

  if (hasJobContext) {
    bonus += 3;
  }

  // Check for form-heavy pages
  const formElementsCount = document.querySelectorAll("input, select, textarea").length;
  if (formElementsCount > 5) {
    bonus += 2;
  }

  return bonus;
};

/**
 * Enhance with advanced Shadow DOM detection and custom component analysis
 */
const enhanceWithAdvancedShadowDOMDetection = (
  container: HTMLElement | ShadowRoot,
  existingElements: HTMLElement[],
): HTMLElement[] => {
  console.log("🔍 Enhancing with advanced Shadow DOM detection...");

  const shadowElements: HTMLElement[] = [];

  // Strategy 1: Direct Shadow DOM access
  const shadowHosts = Array.from(container.querySelectorAll("*")).filter(
    el => (el as HTMLElement & { shadowRoot?: ShadowRoot }).shadowRoot,
  );

  for (const host of shadowHosts) {
    try {
      const shadowRoot = (host as HTMLElement & { shadowRoot?: ShadowRoot }).shadowRoot;
      if (shadowRoot) {
        const elements = getFormElementsRobust(shadowRoot);
        shadowElements.push(...elements);
        console.log(`🔍 Found ${elements.length} elements in shadow DOM of ${host.tagName}`);
      }
    } catch (e) {
      console.debug("Shadow DOM access failed:", e);
    }
  }

  // Strategy 2: Custom element detection (Web Components)
  const customElements = Array.from(container.querySelectorAll("*")).filter(
    el => el.tagName.includes("-") && !el.tagName.startsWith("WEBKIT-"),
  );

  for (const customEl of customElements) {
    try {
      // Check if custom element has form-like behavior
      if (isCustomElementFormLike(customEl as HTMLElement)) {
        shadowElements.push(customEl as HTMLElement);
        console.log(`🔍 Found form-like custom element: ${customEl.tagName}`);
      }
    } catch (e) {
      console.debug("Custom element analysis failed:", e);
    }
  }

  // Strategy 3: Slotted content detection
  const slots = Array.from(container.querySelectorAll("slot"));
  for (const slot of slots) {
    try {
      const assignedElements = slot.assignedElements ? slot.assignedElements() : [];
      for (const assigned of assignedElements) {
        if (assigned instanceof HTMLElement) {
          const elements = getFormElementsRobust(assigned);
          shadowElements.push(...elements);
        }
      }
    } catch (e) {
      console.debug("Slot content analysis failed:", e);
    }
  }

  console.log(`🔍 Shadow DOM detection found ${shadowElements.length} additional elements`);
  return [...existingElements, ...shadowElements];
};

/**
 * Check if a custom element behaves like a form field
 */
const isCustomElementFormLike = (el: HTMLElement): boolean => {
  // Check for form-like attributes
  const formLikeAttrs = ["value", "name", "required", "disabled", "readonly", "placeholder"];
  const hasFormAttrs = formLikeAttrs.some(attr => el.hasAttribute(attr));

  // Check for form-like methods
  const formLikeMethods = ["focus", "blur", "click", "select"];
  const hasFormMethods = formLikeMethods.some(
    method => typeof (el as unknown as Record<string, unknown>)[method] === "function",
  );

  // Check for form-like events
  const formLikeEvents = ["onchange", "oninput", "onfocus", "onblur"];
  const hasFormEvents = formLikeEvents.some(event => el.hasAttribute(event));

  // Check for ARIA roles
  const role = el.getAttribute("role");
  const hasFormRole = role && ["textbox", "combobox", "checkbox", "radio", "switch", "slider"].includes(role);

  return Boolean(hasFormAttrs || hasFormMethods || hasFormEvents || hasFormRole);
};

/**
 * Enhance with semantic analysis for accessibility-compliant elements
 */
const enhanceWithSemanticAnalysis = (
  container: HTMLElement | ShadowRoot,
  existingElements: HTMLElement[],
): HTMLElement[] => {
  console.log("📊 Enhancing with semantic analysis...");

  const semanticElements: HTMLElement[] = [];

  // Strategy 1: ARIA relationship traversal
  const ariaElements = Array.from(
    container.querySelectorAll("[aria-labelledby], [aria-describedby], [aria-controls], [aria-owns]"),
  );

  for (const el of ariaElements) {
    try {
      const htmlEl = el as HTMLElement;

      // Check if this element or its ARIA-related elements are form fields
      const relatedIds = [
        htmlEl.getAttribute("aria-labelledby"),
        htmlEl.getAttribute("aria-describedby"),
        htmlEl.getAttribute("aria-controls"),
        htmlEl.getAttribute("aria-owns"),
      ]
        .filter(Boolean)
        .join(" ")
        .split(" ");

      for (const id of relatedIds) {
        const relatedEl = document.getElementById(id);
        if (relatedEl && isUniversalFormFieldElement(relatedEl)) {
          if (!existingElements.includes(relatedEl)) {
            semanticElements.push(relatedEl);
          }
        }
      }

      // Check if the element itself is a form field
      if (isUniversalFormFieldElement(htmlEl) && !existingElements.includes(htmlEl)) {
        semanticElements.push(htmlEl);
      }
    } catch (e) {
      console.debug("ARIA relationship analysis failed:", e);
    }
  }

  // Strategy 2: Label association discovery
  const labels = Array.from(container.querySelectorAll("label"));
  for (const label of labels) {
    try {
      const forAttr = label.getAttribute("for");
      if (forAttr) {
        const associatedEl = document.getElementById(forAttr);
        if (associatedEl && isUniversalFormFieldElement(associatedEl) && !existingElements.includes(associatedEl)) {
          semanticElements.push(associatedEl);
        }
      }

      // Check for nested form elements
      const nestedElements = label.querySelectorAll('input, select, textarea, [role="textbox"], [role="combobox"]');
      for (const nested of Array.from(nestedElements)) {
        const nestedEl = nested as HTMLElement;
        if (isUniversalFormFieldElement(nestedEl) && !existingElements.includes(nestedEl)) {
          semanticElements.push(nestedEl);
        }
      }
    } catch (e) {
      console.debug("Label association analysis failed:", e);
    }
  }

  console.log(`📊 Semantic analysis found ${semanticElements.length} additional elements`);
  return [...existingElements, ...semanticElements];
};

/**
 * Enhance with visual layout analysis for form-like structures
 */
const enhanceWithVisualAnalysis = (
  container: HTMLElement | ShadowRoot,
  existingElements: HTMLElement[],
): HTMLElement[] => {
  console.log("👁️ Enhancing with visual analysis...");

  const visualElements: HTMLElement[] = [];

  try {
    // Strategy 1: Find elements in form-like visual arrangements
    const potentialElements = Array.from(container.querySelectorAll("*")).filter(el => {
      const htmlEl = el as HTMLElement;
      return (
        !existingElements.includes(htmlEl) &&
        !["SCRIPT", "STYLE", "META", "LINK", "TITLE", "HEAD", "NOSCRIPT"].includes(htmlEl.tagName)
      );
    });

    for (const el of potentialElements) {
      const htmlEl = el as HTMLElement;

      // Check if element is in a form-like visual arrangement
      if (isInFormLikeVisualArrangement(htmlEl)) {
        const behavioralScore = calculateBehavioralFormFieldScore(htmlEl);
        if (behavioralScore >= 45) {
          // Lower threshold for visually arranged elements
          visualElements.push(htmlEl);
        }
      }
    }
  } catch (e) {
    console.debug("Visual analysis failed:", e);
  }

  console.log(`👁️ Visual analysis found ${visualElements.length} additional elements`);
  return [...existingElements, ...visualElements];
};

/**
 * Check if an element is in a form-like visual arrangement
 */
const isInFormLikeVisualArrangement = (el: HTMLElement): boolean => {
  try {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;

    // Look for nearby elements that might be form fields
    const parent = el.parentElement;
    if (!parent) return false;

    const siblings = Array.from(parent.children).filter(child => {
      const childRect = child.getBoundingClientRect();
      return childRect.width > 0 && childRect.height > 0;
    });

    // Check if there are other potentially interactive elements nearby
    const nearbyInteractiveElements = siblings.filter(sibling => {
      const siblingEl = sibling as HTMLElement;
      return (
        siblingEl !== el &&
        (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(siblingEl.tagName) ||
          siblingEl.hasAttribute("contenteditable") ||
          siblingEl.hasAttribute("tabindex") ||
          siblingEl.hasAttribute("role") ||
          /\b(input|field|control|button)\b/i.test(siblingEl.className))
      );
    });

    // If there are 2+ interactive elements in the same container, it's likely a form
    if (nearbyInteractiveElements.length >= 1) {
      return true;
    }

    // Check for form-like vertical or horizontal alignment
    const elementPositions = siblings.map(sibling => {
      const siblingRect = sibling.getBoundingClientRect();
      return {
        element: sibling,
        top: siblingRect.top,
        left: siblingRect.left,
        width: siblingRect.width,
        height: siblingRect.height,
      };
    });

    // Check for vertical alignment (common in forms)
    const verticallyAligned = elementPositions.filter(pos => Math.abs(pos.left - rect.left) < 50 && pos.element !== el);

    if (verticallyAligned.length >= 2) {
      return true;
    }

    // Check for horizontal alignment (also common in forms)
    const horizontallyAligned = elementPositions.filter(pos => Math.abs(pos.top - rect.top) < 50 && pos.element !== el);

    if (horizontallyAligned.length >= 2) {
      return true;
    }

    return false;
  } catch (e) {
    console.debug("Visual arrangement analysis failed:", e);
    return false;
  }
};

/**
 * Apply universal filtering with confidence-based scoring
 */
const applyUniversalFieldFiltering = (elements: HTMLElement[]): HTMLElement[] => {
  console.log(`🔍 Applying universal filtering to ${elements.length} elements...`);

  const filteredElements = elements.filter(el => {
    try {
      // Basic visibility and accessibility checks
      if (!isUniversalElementVisible(el)) return false;
      if (isElementDisabledOrReadonly(el)) return false;
      if (isElementDecorative(el)) return false;

      // Advanced form field validation
      if (!isUniversalFormFieldElement(el)) return false;

      // Check minimum confidence threshold
      const confidence = parseFloat(el.getAttribute("data-filliny-confidence") || "0.5");
      if (confidence < 0.4) return false;

      return true;
    } catch (e) {
      console.debug("Error filtering element:", e);
      return false;
    }
  });

  // Sort by confidence score (highest first)
  filteredElements.sort((a, b) => {
    const confidenceA = parseFloat(a.getAttribute("data-filliny-confidence") || "0.5");
    const confidenceB = parseFloat(b.getAttribute("data-filliny-confidence") || "0.5");
    return confidenceB - confidenceA;
  });

  console.log(`✅ Universal filtering result: ${filteredElements.length} elements`);
  return filteredElements;
};

/**
 * Universal visibility check with advanced heuristics
 */
const isUniversalElementVisible = (el: HTMLElement): boolean => {
  try {
    const style = window.getComputedStyle(el);

    // Skip completely hidden fields (but allow temporarily hidden ones like in modals)
    if (style.display === "none" && style.visibility === "hidden" && style.opacity === "0") {
      return false;
    }

    // Skip elements with zero dimensions that aren't special cases
    const rect = el.getBoundingClientRect();
    const isCheckableField =
      (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) ||
      ["checkbox", "radio", "switch"].includes(el.getAttribute("role") || "");

    // Allow zero-dimension elements if they're checkable or have special roles
    const hasSpecialRole = ["textbox", "combobox", "listbox", "slider", "spinbutton"].includes(
      el.getAttribute("role") || "",
    );
    const isCustomFormElement = el.tagName.includes("-") && isCustomElementFormLike(el);

    if (!isCheckableField && !hasSpecialRole && !isCustomFormElement && rect.width === 0 && rect.height === 0) {
      return false;
    }

    // Check for elements that are visually hidden but still functional
    // (e.g., hidden file inputs with visible labels)
    if (
      style.position === "absolute" &&
      (style.left === "-9999px" || style.top === "-9999px" || style.left === "-999em" || style.top === "-999em")
    ) {
      // Check if there's a visible label or button associated with this element
      const id = el.id;
      if (id) {
        const associatedLabel = document.querySelector(`label[for="${id}"]`);
        if (associatedLabel && window.getComputedStyle(associatedLabel).display !== "none") {
          return true; // Hidden element with visible label
        }
      }
      return false;
    }

    // Check if element is inside a hidden container but might become visible
    if (style.display === "none" || style.visibility === "hidden") {
      // Check if it's in a modal, tab, or accordion that might be shown
      const hiddenContainer = el.closest('[style*="display: none"], [style*="visibility: hidden"], [hidden]');
      if (hiddenContainer) {
        const isInModal = hiddenContainer.closest('[role="dialog"], [role="alertdialog"], .modal, .popup');
        const isInTab = hiddenContainer.closest('[role="tabpanel"], .tab-pane, .tab-content');
        const isInAccordion = hiddenContainer.closest('[role="region"], .accordion, .collapsible');

        if (isInModal || isInTab || isInAccordion) {
          return true; // Temporarily hidden but potentially visible
        }
      }
      return false;
    }

    return true;
  } catch (e) {
    console.debug("Visibility check error:", e);
    return true; // Default to visible if we can't determine
  }
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
 * Universal form field element validation with comprehensive analysis
 */
const isUniversalFormFieldElement = (el: HTMLElement): boolean => {
  // Always include standard form elements
  if (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(el.tagName)) {
    return true;
  }

  // Include elements with form-related ARIA roles
  const role = el.getAttribute("role");
  if (
    role &&
    ["textbox", "combobox", "checkbox", "radio", "switch", "slider", "spinbutton", "searchbox", "listbox"].includes(
      role,
    )
  ) {
    return true;
  }

  // Include content editable elements
  if (el.hasAttribute("contenteditable") && el.getAttribute("contenteditable") !== "false") {
    return true;
  }

  // Include custom form elements (Web Components)
  if (el.tagName.includes("-") && isCustomElementFormLike(el)) {
    return true;
  }

  // Include elements with form-like behavior indicators
  const hasFormBehavior =
    el.hasAttribute("name") ||
    el.hasAttribute("value") ||
    el.hasAttribute("placeholder") ||
    el.hasAttribute("required") ||
    el.hasAttribute("pattern") ||
    el.hasAttribute("autocomplete") ||
    el.hasAttribute("aria-required") ||
    el.hasAttribute("aria-invalid");

  if (hasFormBehavior) {
    return true;
  }

  // Include elements with form-like event handlers
  const hasFormEvents =
    el.hasAttribute("onchange") ||
    el.hasAttribute("oninput") ||
    el.hasAttribute("onfocus") ||
    el.hasAttribute("onblur");

  if (hasFormEvents) {
    return true;
  }

  // Include elements with high confidence scores from semantic analysis
  const confidence = parseFloat(el.getAttribute("data-filliny-confidence") || "0");
  if (confidence >= 0.7) {
    return true;
  }

  // Advanced pattern matching for modern web apps
  const className = el.className?.toLowerCase() || "";
  const id = el.id?.toLowerCase() || "";
  const dataAttrs = Array.from(el.attributes)
    .filter(attr => attr.name.startsWith("data-"))
    .map(attr => attr.name + "=" + attr.value)
    .join(" ")
    .toLowerCase();

  const allText = `${className} ${id} ${dataAttrs}`;

  // Check for form-related patterns
  const formPatterns = [
    /\b(input|field|control|widget|editor|picker)\b/,
    /\b(form|application|registration|profile)\b/,
    /\b(text|email|password|number|tel|url|search)\b/,
    /\b(select|choice|option|dropdown|combo)\b/,
    /\b(checkbox|radio|switch|toggle)\b/,
    /\b(upload|file|attach|document)\b/,
    /\b(date|time|calendar)\b/,
    /\b(range|slider|spin)\b/,
  ];

  const hasFormPattern = formPatterns.some(pattern => pattern.test(allText));

  // Only include DIV and SPAN elements if they have strong form indicators
  if (["DIV", "SPAN"].includes(el.tagName)) {
    return hasFormPattern && (confidence >= 0.6 || hasFormBehavior || hasFormEvents);
  }

  // Include other elements with form patterns
  return hasFormPattern;
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
    // Use the enhanced detection pipeline
    return getFormElementsRobust(container);
  } catch (error) {
    console.error("Critical error in getFormFieldsRobust, falling back to basic detection:", error);
    return fallbackToBasicDetection(container);
  }
};

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

// Export all field type handlers
export * from "./utils";
export * from "./text";
export * from "./checkable";
export * from "./file";
export * from "./select";
