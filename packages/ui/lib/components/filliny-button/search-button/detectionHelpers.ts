import type { Field } from "@extension/shared";
// Import field type detection functions
import { detectTextField, detectInputField } from "./field-types/text";
import { detectCheckableFields } from "./field-types/checkable";
import { detectSelectFields } from "./field-types/select";
import { detectFileFields } from "./field-types/file";
import { createBaseField } from "./field-types/utils";

interface ReactElementProps {
  onSubmit?: () => void;
  onChange?: () => void;
  onClick?: () => void;
  [key: string]: (() => void) | undefined;
}

interface VueElement extends HTMLElement {
  __vue__?: unknown;
}

// --- Visibility and DOM Utilities ---
export const queryShadowRoot = (root: ShadowRoot, selector: string): HTMLElement[] => {
  try {
    // First, get direct matches in this shadow root
    const directMatches = Array.from(root.querySelectorAll<HTMLElement>(selector));

    // Then, find all elements with shadow roots within this shadow root
    const elementsWithShadowRoots = Array.from(root.querySelectorAll("*")).filter(
      el => !!(el as HTMLElement).shadowRoot,
    ) as HTMLElement[];

    // Recursively query each nested shadow root
    const nestedMatches = elementsWithShadowRoots.flatMap(el => {
      if (el.shadowRoot) {
        return queryShadowRoot(el.shadowRoot, selector);
      }
      return [];
    });

    // Combine direct and nested matches
    return [...directMatches, ...nestedMatches];
  } catch (e) {
    console.warn("Error querying shadow root:", e);
    return [];
  }
};

export const computeElementVisibility = (element: HTMLElement): { isVisible: boolean; hiddenReason?: string } => {
  try {
    // Helper function to check if an element is hidden by CSS
    const isHidden = (el: HTMLElement | null): boolean => {
      let currentEl = el;
      while (currentEl) {
        const style = getComputedStyle(currentEl);
        const isFormControl = ["select", "input", "textarea"].includes(currentEl.tagName.toLowerCase());

        // Check various CSS properties that could hide an element
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          (!isFormControl && parseFloat(style.opacity) === 0) ||
          currentEl.hasAttribute("hidden") ||
          currentEl.getAttribute("aria-hidden") === "true" ||
          (style.position === "absolute" && (parseInt(style.left) < -9999 || parseInt(style.top) < -9999))
        ) {
          return true;
        }
        currentEl = currentEl.parentElement;
      }
      return false;
    };

    // Support for custom form elements like Google Forms
    const isCustomFormControl = (el: HTMLElement): boolean => {
      // Check for role attributes that indicate form controls
      const hasFormRole = ["checkbox", "radio", "textbox", "combobox", "option"].includes(
        el.getAttribute("role") || "",
      );

      // Check for common form control classes
      const hasFormClass =
        el.className.toLowerCase().match(/(input|field|control|select|checkbox|radio|textarea)/) !== null;

      // Check for Google Forms specific classes
      const isGoogleFormsElement = el.className.toLowerCase().match(/(freebird|quantum|docs-material)/) !== null;

      return hasFormRole || hasFormClass || isGoogleFormsElement;
    };

    const rect = element.getBoundingClientRect();

    // Consider dimensions - allow very small dimensions for custom elements
    const isCustomControl = isCustomFormControl(element);
    const hasZeroDimensions = !isCustomControl && rect.width === 0 && rect.height === 0;

    // Check if element is outside viewport
    const isOutsideViewport =
      rect.right <= 0 || rect.bottom <= 0 || rect.left >= window.innerWidth || rect.top >= window.innerHeight;

    const isFormControl = ["select", "input", "textarea"].includes(element.tagName.toLowerCase()) || isCustomControl;

    // Check various conditions that might make an element invisible
    if (isFormControl && isHidden(element)) return { isVisible: false, hiddenReason: "hidden-by-css" };
    if (hasZeroDimensions) return { isVisible: false, hiddenReason: "zero-dimensions" };
    if (isOutsideViewport) return { isVisible: false, hiddenReason: "outside-viewport" };
    if (isHidden(element)) return { isVisible: false, hiddenReason: "hidden-by-css" };

    // Special case for elements that might be covered by other elements
    if (!isCustomControl) {
      // Check if element has at least minimal dimensions to be interactive
      const hasSufficientDimensions = rect.width >= 5 && rect.height >= 5;
      if (!hasSufficientDimensions) {
        return { isVisible: false, hiddenReason: "insufficient-dimensions" };
      }
    }

    // For custom elements like Google Forms, we need to be less strict
    if (isCustomControl) {
      // Custom controls might not need to be visible in the traditional sense
      // as long as they're part of the accessible DOM
      return { isVisible: true };
    }

    return { isVisible: true };
  } catch (error) {
    console.error("Error computing visibility:", error);
    return { isVisible: false, hiddenReason: "error-computing" };
  }
};

export const isElementVisible = (element: HTMLElement): boolean => computeElementVisibility(element).isVisible;

// --- Frame Document Utilities ---
export const getAllFrameDocuments = (): Document[] => {
  const docs: Document[] = [document];
  const processedFrames = new Set<string>();

  const tryGetIframeDoc = (iframe: HTMLIFrameElement): Document | null => {
    try {
      // Try different methods to access the iframe document
      if (iframe.contentDocument?.readyState === "complete") return iframe.contentDocument;
      if (iframe.contentWindow?.document?.readyState === "complete") return iframe.contentWindow.document;

      // Some iframes might load lazily, check if they have a src but no content yet
      if (iframe.src && !iframe.contentDocument) {
        console.debug("Frame might be loading:", iframe.src);
      }
    } catch (e) {
      // This could be a cross-origin frame - we can't access its content
      // Log the error but don't block the process
      console.debug("Frame access restricted:", { src: iframe.src, error: (e as Error).message });

      // If it's a same-origin frame that has loading issues, we might want to retry later
      if (iframe.src && (iframe.src.startsWith(window.location.origin) || iframe.src.startsWith("/"))) {
        console.debug("Same-origin frame may be still loading:", iframe.src);
      }
    }
    return null;
  };

  const processIframes = (doc: Document) => {
    // Process all iframes in this document
    Array.from(doc.getElementsByTagName("iframe")).forEach(iframe => {
      // Skip already processed frames (by src URL)
      // Also handle empty/blank src values
      const frameSrc = iframe.src || "about:blank";
      if (!processedFrames.has(frameSrc)) {
        // Mark this frame as processed
        processedFrames.add(frameSrc);

        // Try to get the document
        const iframeDoc = tryGetIframeDoc(iframe);
        if (iframeDoc) {
          docs.push(iframeDoc);
          // Recursively process nested frames
          processIframes(iframeDoc);
        }
      }
    });

    // Also look for object/embed elements that might contain documents
    Array.from(doc.getElementsByTagName("object")).forEach(obj => {
      try {
        // Access contentDocument with proper type
        const objDoc = (obj as HTMLObjectElement & { contentDocument?: Document }).contentDocument;
        if (objDoc && !processedFrames.has(obj.data || "object")) {
          processedFrames.add(obj.data || "object");
          docs.push(objDoc);
          processIframes(objDoc);
        }
      } catch {
        // Ignore access errors
      }
    });
  };

  try {
    processIframes(document);

    // Special case for Google Forms - sometimes they use complex iframe structures
    if (window.location.hostname.includes("docs.google.com") && window.location.pathname.includes("/forms/")) {
      // Look for specific form containers
      const formContainers = document.querySelectorAll(".freebirdFormviewerViewFormContent");
      if (formContainers.length > 0) {
        console.debug("Found Google Forms container, ensuring all elements are processed");
      }
    }
  } catch (e) {
    console.warn("Error processing frames:", e);
  }
  return docs;
};

export const initializeIframeDetection = (): void => {
  let detectingForms = false;
  const safeDetectForms = () => {
    if (detectingForms) return;
    detectingForms = true;
    setTimeout(() => {
      detectFormLikeContainers();
      detectingForms = false;
    }, 0);
  };

  // Set up mutation observer to watch for new iframes or forms
  const observer = new MutationObserver(mutations => {
    const hasRelevantChanges = mutations.some(mutation =>
      Array.from(mutation.addedNodes).some(node => {
        if (node instanceof HTMLElement) {
          // Look for new iframes, forms, or containers that might contain them
          return (
            node.tagName === "IFRAME" ||
            node.tagName === "FORM" ||
            !!node.querySelector("form, iframe") ||
            node.classList.contains("freebirdFormviewerViewFormCard") || // Google Forms
            node.classList.contains("freebirdFormviewerViewItemsItemItem") // Google Forms question
          );
        }
        return false;
      }),
    );
    if (hasRelevantChanges) safeDetectForms();
  });

  // Observe the entire document for changes
  observer.observe(document.body, { childList: true, subtree: true });

  // Initial detection
  safeDetectForms();

  // Also detect on page load and DOM content loaded
  window.addEventListener("load", safeDetectForms, { once: true });
  window.addEventListener("DOMContentLoaded", safeDetectForms, { once: true });

  // For SPAs, also check when URL changes
  let lastUrl = window.location.href;
  setInterval(() => {
    if (lastUrl !== window.location.href) {
      lastUrl = window.location.href;
      console.debug("URL changed, re-detecting forms");
      safeDetectForms();
    }
  }, 1000);
};

export const querySelectorAllFrames = (selector: string): Element[] => {
  const results: Element[] = [];
  const documents = getAllFrameDocuments();
  for (const doc of documents) {
    try {
      results.push(...Array.from(doc.querySelectorAll(selector)));
      // Also search in any shadow roots
      Array.from(doc.querySelectorAll("*")).forEach(el => {
        if (el.shadowRoot) {
          results.push(...queryShadowRoot(el.shadowRoot, selector));
        }
      });
    } catch (e) {
      console.warn("Error querying in frame:", e);
    }
  }
  return results;
};

// --- Element Location and Context Utilities ---
export const isNearbyElement = (element1: HTMLElement, element2: HTMLElement): boolean => {
  try {
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();
    const threshold = 50;
    const isHorizontallyNear =
      Math.abs(rect1.left - rect2.left) < threshold || Math.abs(rect1.right - rect2.right) < threshold;
    const isVerticallyNear =
      Math.abs(rect1.top - rect2.top) < threshold || Math.abs(rect1.bottom - rect2.bottom) < threshold;
    return isHorizontallyNear || isVerticallyNear;
  } catch (error) {
    console.warn("Error in isNearbyElement:", error);
    return false;
  }
};

export const findFormContainer = (element: HTMLElement): HTMLElement | null => {
  try {
    const formContainer = element.closest('[data-filliny-form-container="true"]');
    if (formContainer) return formContainer as HTMLElement;
    const formLikeContainer = element.closest('form, fieldset, [role="form"], [class*="form"], [class*="form-group"]');
    if (formLikeContainer) return formLikeContainer as HTMLElement;
    let currentElement = element.parentElement;
    while (currentElement) {
      const fields = getFormFields(currentElement);
      if (fields.length >= 2) return currentElement;
      currentElement = currentElement.parentElement;
    }
  } catch (error) {
    console.warn("Error in findFormContainer:", error);
  }
  return null;
};

export const findNearbyLabelText = async (element: HTMLElement): Promise<string> => {
  try {
    const rect = element.getBoundingClientRect();
    const container = findFormContainer(element);
    if (!container) return "";
    const searchRegions = {
      above: { top: rect.top - 100, bottom: rect.top, left: rect.left - 50, right: rect.right + 50 },
      left: { top: rect.top - 20, bottom: rect.bottom + 20, left: Math.max(0, rect.left - 300), right: rect.left },
    };

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode: node => {
        if (
          node.parentElement?.closest("input, select, textarea, [placeholder]") ||
          node.parentElement?.getAttribute("role") === "option" ||
          node.parentElement?.matches("[class*='placeholder']")
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        const txt = node.textContent?.trim();
        return txt && txt.length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });

    let bestText = "";
    let bestScore = Infinity;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const range = document.createRange();
      range.selectNodeContents(node);
      const textRect = range.getBoundingClientRect();
      for (const [region, bounds] of Object.entries(searchRegions)) {
        if (
          textRect.right >= bounds.left &&
          textRect.left <= bounds.right &&
          textRect.bottom >= bounds.top &&
          textRect.top <= bounds.bottom
        ) {
          const distance = region === "above" ? rect.top - textRect.bottom : rect.left - textRect.right;
          if (distance < 0) continue;
          let score = distance;
          if (region === "above" && Math.abs(textRect.left - rect.left) < 20) score -= 50;
          if (region === "left" && Math.abs(textRect.top - rect.top) < 20) score -= 30;
          const wordCount = (node.textContent || "").trim().split(/\s+/).length;
          if (wordCount > 10) score -= 20;
          if (score < bestScore) {
            const candidate = node.textContent?.trim() || "";
            if (candidate.length > 0 && !(element instanceof HTMLInputElement && candidate.includes(element.value))) {
              bestScore = score;
              bestText = candidate;
            }
          }
        }
      }
    }
    return bestText;
  } catch (error) {
    console.warn("Error in findNearbyLabelText:", error);
    return "";
  }
};

// --- Framework and Element Type Detection ---
export const shouldSkipElement = (element: HTMLElement): boolean => {
  // Skip elements that are explicitly disabled
  if (element.hasAttribute("disabled")) return true;

  // Skip read-only elements only if they're not selectable like radio/checkbox
  if (element.hasAttribute("readonly") || element.getAttribute("aria-readonly") === "true") {
    // Don't skip checkboxes and radio buttons even if readonly
    const isCheckable =
      (element instanceof HTMLInputElement && ["checkbox", "radio"].includes(element.type)) ||
      ["checkbox", "radio", "option"].includes(element.getAttribute("role") || "");

    // Don't skip selects even if readonly
    const isSelectable =
      element instanceof HTMLSelectElement ||
      element.getAttribute("role") === "combobox" ||
      element.getAttribute("role") === "listbox";

    if (!isCheckable && !isSelectable) return true;
  }

  // Skip elements marked to be skipped
  if (element.getAttribute("data-filliny-skip") === "true") return true;

  // Skip elements with datalist (they're just suggestion sources)
  if (element.hasAttribute("list")) return true;

  // Skip submit, reset, and button inputs
  if (element instanceof HTMLInputElement && ["submit", "reset", "button", "image"].includes(element.type)) return true;

  // Skip buttons that aren't part of a form control
  if (
    element instanceof HTMLButtonElement &&
    ["submit", "reset"].includes(element.type) &&
    !element.hasAttribute("role")
  )
    return true;

  // Skip hidden inputs
  if (element instanceof HTMLInputElement && element.type === "hidden") return true;

  // Don't skip elements that explicitly have interaction focus capability
  if (element.tabIndex >= 0) return false;

  // Keep elements with explicit roles even if they might otherwise be skipped
  const role = element.getAttribute("role");
  if (role && ["checkbox", "radio", "textbox", "combobox", "option", "switch"].includes(role)) {
    return false;
  }

  // Check for Google Forms specific elements we should never skip
  if (
    element.classList.contains("freebirdThemedRadio") ||
    element.classList.contains("freebirdThemedCheckbox") ||
    element.classList.contains("quantumWizTextinputPaperinputInput") ||
    element.classList.contains("quantumWizTextinputPaperinputElement")
  ) {
    return false;
  }

  return false;
};

export const detectFramework = (
  element: HTMLElement,
): { framework: "react" | "angular" | "vue" | "vanilla"; props?: ReactElementProps } => {
  const reactKey = Object.keys(element).find(key => key.startsWith("__react") || key.startsWith("_reactProps"));
  if (reactKey) {
    return {
      framework: "react",
      props: (element as unknown as { [key: string]: ReactElementProps })[reactKey],
    };
  }
  if (element.hasAttribute("ng-model") || element.hasAttribute("[(ngModel)]")) return { framework: "angular" };
  if (element.hasAttribute("v-model") || (element as VueElement).__vue__) return { framework: "vue" };
  return { framework: "vanilla" };
};

// --- XPath and Selector Utilities ---
export const findElementByXPath = (xpath: string): HTMLElement | null => {
  for (const doc of getAllFrameDocuments()) {
    try {
      const result = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      const element = result.singleNodeValue as HTMLElement;
      if (element) return element;
    } catch (e) {
      console.warn("XPath evaluation failed:", e);
    }
  }
  const elements = querySelectorAllFrames("[data-filliny-id]");
  return (elements[0] as HTMLElement) || null;
};

export const getElementXPath = (element: HTMLElement): string => {
  if (!element.parentElement) return "";
  const idx =
    Array.from(element.parentElement.children)
      .filter(child => child.tagName === element.tagName)
      .indexOf(element) + 1;
  return `${getElementXPath(element.parentElement)}/${element.tagName.toLowerCase()}[${idx}]`;
};

export const generateUniqueSelectors = (element: HTMLElement): string[] => {
  const selectors: string[] = [];
  if (element.id) selectors.push(`#${CSS.escape(element.id)}`);
  if (element.className) {
    const classSelector = Array.from(element.classList)
      .map(c => `.${CSS.escape(c)}`)
      .join("");
    if (classSelector) selectors.push(classSelector);
  }
  ["name", "type", "role", "aria-label"].forEach(attr => {
    if (element.hasAttribute(attr)) {
      selectors.push(`[${attr}="${CSS.escape(element.getAttribute(attr)!)}"]`);
    }
  });
  return selectors;
};

// --- Main Field Detection Entry Point ---
export type DetectionStrategy = "dom";

export const getFormFields = (element: HTMLElement): HTMLElement[] => {
  // Enhanced selector list to detect more form field types, including custom implementations
  const selectors = [
    // Standard HTML form elements
    `input:not([type="hidden"]):not([type="submit"]):not([type="reset"]):not([type="button"])`,
    `select`,
    `textarea`,

    // ARIA role-based elements (expanded list)
    `[role="textbox"]`,
    `[role="combobox"]`,
    `[role="spinbutton"]`,
    `[role="checkbox"]`,
    `[role="radio"]`,
    `[role="switch"]`,
    `[role="slider"]`,
    `[role="menuitemcheckbox"]`,
    `[role="menuitemradio"]`,
    `[role="option"]`,
    `[role="searchbox"]`,

    // Editable content
    `[contenteditable="true"]`,

    // Custom data attributes
    `[data-filliny-field]`,

    // Elements with interaction attributes
    `[tabindex]:not([tabindex="-1"])`,

    // Common class-based selectors
    `.form-control`,
    `[class*="input"]`,
    `[class*="field"]`,
    `[class*="textbox"]`,
    `[class*="checkbox"]`,
    `[class*="radio"]`,
    `[class*="select"]`,
    `[class*="dropdown"]`,
    `[class*="form-input"]`,

    // Google Forms specific selectors
    `.freebirdFormviewerViewItemsItemItem`,
    `.freebirdThemedRadio`,
    `.freebirdThemedCheckbox`,
    `.quantumWizTextinputPaperinputInput`,
    `.quantumWizMenuPaperselectContent`,

    // Common containers that might contain fields
    `div.radio-container`,
    `div.checkbox-container`,
    `div.input-container`,
    `div[class*="form-group"]`,
    `div[class*="form-field"]`,
    `div[class*="form-control"]`,
  ].join(", ");

  // First gather all direct matches
  let fields: HTMLElement[] = Array.from(element.querySelectorAll<HTMLElement>(selectors));

  // Then process Shadow DOM
  const shadowRootElements = findAllShadowRoots(element);
  shadowRootElements.forEach(host => {
    if (host.shadowRoot) {
      const shadowFields = queryShadowRoot(host.shadowRoot, selectors);
      fields = fields.concat(shadowFields);
    }
  });

  // Process all custom and framework-specific patterns
  const customElements = detectCustomFormElements(element);
  fields = fields.concat(customElements);

  // Filter out invisible or disabled elements
  return fields.filter(el => isElementVisible(el) && !shouldSkipElement(el));
};

/**
 * Find all elements with shadow roots in a container
 */
export const findAllShadowRoots = (root: HTMLElement): HTMLElement[] => {
  const hosts: HTMLElement[] = [];

  // Use a TreeWalker for efficient DOM traversal
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: node => {
      // Check if node has a shadow root
      if ((node as HTMLElement).shadowRoot) {
        return NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_SKIP;
    },
  });

  let currentNode: Node | null = walker.nextNode();
  while (currentNode) {
    hosts.push(currentNode as HTMLElement);
    currentNode = walker.nextNode();
  }

  return hosts;
};

/**
 * Detect custom form elements that might not match standard selectors
 */
export const detectCustomFormElements = (container: HTMLElement): HTMLElement[] => {
  const customElements: HTMLElement[] = [];

  // Look for Google Forms specific patterns
  const googleFormsContainers = container.querySelectorAll(".freebirdFormviewerViewItemsItemItem");
  if (googleFormsContainers.length > 0) {
    googleFormsContainers.forEach(formItem => {
      // Find the actual input elements within each form item
      const radioGroups = formItem.querySelectorAll('[role="radiogroup"]');
      radioGroups.forEach(group => {
        const radioOptions = group.querySelectorAll('[role="radio"]');
        customElements.push(...(Array.from(radioOptions) as HTMLElement[]));
      });

      // Find checkbox elements
      const checkboxes = formItem.querySelectorAll('[role="checkbox"]');
      customElements.push(...(Array.from(checkboxes) as HTMLElement[]));

      // Find text inputs (might be inside divs)
      const textInputContainers = formItem.querySelectorAll(".quantumWizTextinputPaperinputMainContent");
      textInputContainers.forEach(container => {
        const input = container.querySelector("input");
        if (input) customElements.push(input as HTMLElement);
      });
    });
  }

  // Look for elements with click handlers that might be custom inputs
  const clickableElements = container.querySelectorAll('[onclick], [class*="clickable"], [class*="selectable"]');
  clickableElements.forEach(element => {
    const el = element as HTMLElement;
    // Check if this might be a custom form control
    if (
      el.getAttribute("aria-selected") !== null ||
      el.getAttribute("aria-checked") !== null ||
      el.classList.toString().match(/\b(radio|checkbox|select|option|input)\b/i)
    ) {
      customElements.push(el);
    }
  });

  return customElements;
};

// Main entry point for field detection
export const detectFields = async (container: HTMLElement, isImplicitForm = false): Promise<Field[]> => {
  const fields: Field[] = [];
  let index = 0;

  // Enhanced selector for better coverage
  const commonSelector = [
    // Standard inputs
    'input:not([type="hidden"]):not([type="submit"]):not([type="reset"]):not([type="button"])',
    "select",
    "textarea",

    // ARIA roles
    '[role="textbox"]',
    '[role="combobox"]',
    '[role="spinbutton"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="switch"]',
    '[role="slider"]',
    '[role="option"]',
    '[role="searchbox"]',

    // Editable elements
    '[contenteditable="true"]',

    // Custom attributes
    "[data-filliny-field]",

    // Common class patterns
    ".form-control",
    "[class*='input']",
    "[class*='field']",
    "[class*='form-control']",

    // Google Forms specific
    ".freebirdThemedRadio",
    ".freebirdThemedCheckbox",
    ".quantumWizTextinputPaperinputInput",
  ].join(",");

  // Get all visible elements matching our selectors
  let elements = Array.from(container.querySelectorAll<HTMLElement>(commonSelector)).filter(
    element => !shouldSkipElement(element),
  );

  // Check for shadow DOM elements
  const shadowHosts = findAllShadowRoots(container);
  shadowHosts.forEach(host => {
    if (host.shadowRoot) {
      const shadowElements = queryShadowRoot(host.shadowRoot, commonSelector);
      elements = elements.concat(shadowElements.filter(el => !shouldSkipElement(el)));
    }
  });

  // Add custom form elements
  const customElements = detectCustomFormElements(container);
  elements = elements.concat(customElements.filter(el => !shouldSkipElement(el)));

  // Remove duplicates
  elements = Array.from(new Set(elements));

  if (!elements.length) {
    // If no elements found with standard selectors, try a more aggressive approach
    console.log("No fields found with standard selectors, trying aggressive detection");
    elements = getFormFields(container);

    if (!elements.length) {
      // As a last resort, look for anything that looks interactive
      const potentialInteractiveElements = container.querySelectorAll<HTMLElement>(
        'div[tabindex], span[tabindex], div[class*="input"], div[class*="field"], div[class*="select"]',
      );
      elements = Array.from(potentialInteractiveElements).filter(el => isElementVisible(el) && !shouldSkipElement(el));
    }
  }

  if (!elements.length) return fields;

  try {
    // Group elements by type
    const textInputs = elements.filter(
      el =>
        (el instanceof HTMLInputElement &&
          [
            "text",
            "email",
            "password",
            "search",
            "tel",
            "url",
            "number",
            "date",
            "datetime-local",
            "month",
            "week",
            "time",
          ].includes((el as HTMLInputElement).type)) ||
        el.getAttribute("role") === "textbox" ||
        el.getAttribute("role") === "searchbox",
    );

    const textareaElements = elements.filter(
      el =>
        el instanceof HTMLTextAreaElement ||
        (el.getAttribute("role") === "textbox" && el.hasAttribute("aria-multiline")),
    );

    const selectElements = elements.filter(
      el =>
        el instanceof HTMLSelectElement ||
        el.getAttribute("role") === "combobox" ||
        el.getAttribute("role") === "listbox" ||
        el.classList.contains("select") ||
        el.classList.contains("dropdown"),
    );

    const checkableElements = elements.filter(
      el =>
        (el instanceof HTMLInputElement && ["checkbox", "radio"].includes((el as HTMLInputElement).type)) ||
        ["checkbox", "radio", "switch", "menuitemcheckbox", "menuitemradio"].includes(el.getAttribute("role") || "") ||
        el.classList.contains("checkbox") ||
        el.classList.contains("radio"),
    );

    const fileInputs = elements.filter(
      el => el instanceof HTMLInputElement && (el as HTMLInputElement).type === "file",
    );

    const contentEditableElements = elements.filter(
      el =>
        el.isContentEditable &&
        !el.querySelector("input, textarea, select") &&
        !(el.textContent || "").includes("\n\n\n"),
    );

    // Detect each type of field
    if (textInputs.length > 0) {
      const textFields = await detectInputField(textInputs, index, isImplicitForm);
      fields.push(...textFields);
      index += textFields.length;
    }

    if (textareaElements.length > 0) {
      for (const textarea of textareaElements) {
        const detectedFields = await detectTextField([textarea], index, isImplicitForm);
        if (detectedFields && detectedFields.length > 0) {
          fields.push(...detectedFields);
          index += detectedFields.length;
        }
      }
    }

    if (selectElements.length > 0) {
      for (const select of selectElements) {
        const detectedFields = await detectSelectFields([select], index, isImplicitForm);
        if (detectedFields && detectedFields.length > 0) {
          fields.push(...detectedFields);
          index += detectedFields.length;
        }
      }
    }

    if (checkableElements.length > 0) {
      const checkableFields = await detectCheckableFields(checkableElements, index, isImplicitForm);
      fields.push(...checkableFields);
      index += checkableFields.length;
    }

    if (fileInputs.length > 0) {
      for (const fileInput of fileInputs) {
        const detectedFields = await detectFileFields([fileInput], index, isImplicitForm);
        if (detectedFields && detectedFields.length > 0) {
          fields.push(...detectedFields);
          index += detectedFields.length;
        }
      }
    }

    if (contentEditableElements.length > 0) {
      for (const editable of contentEditableElements) {
        const field = await createBaseField(editable, index, "contentEditable", isImplicitForm);
        field.name = editable.getAttribute("aria-label") || editable.id || "";
        fields.push(field);
        index++;
      }
    }
  } catch (e) {
    console.warn("Error detecting fields:", e);
  }

  return fields;
};

// --- Form Container Detection ---
export const detectFormLikeContainers = async (): Promise<HTMLElement[]> => {
  // Initialize result container
  const bestContainers: HTMLElement[] = [];
  const documents = getAllFrameDocuments();

  // Define known form container patterns
  const formContainerSelectors = [
    // Standard form elements
    "form",
    "fieldset",
    '[role="form"]',

    // Common class patterns for forms
    '[class*="form"]',
    '[class*="survey"]',
    '[class*="questionnaire"]',
    '[id*="form"]',
    '[id*="survey"]',

    // Google Forms specific
    ".freebirdFormviewerViewFormCard",
    ".freebirdFormviewerViewFormContent",
    ".freebirdFormviewerViewItemsItemItem",

    // Common form containers
    ".form-container",
    ".input-container",
    ".field-container",
    ".form-section",
    ".form-group",

    // Applications and surveys
    '[class*="application-form"]',
    '[class*="contact-form"]',
    '[class*="signup-form"]',
    '[class*="login-form"]',
    '[class*="registration"]',
  ];

  for (const doc of documents) {
    try {
      let bestContainer: HTMLElement | null = null;
      let maxFieldCount = 0;

      // First check for native forms and obvious form containers
      const formContainers = Array.from(doc.querySelectorAll<HTMLElement>(formContainerSelectors.join(",")));

      if (formContainers.length > 0) {
        // For each container found, count the form fields
        for (const container of formContainers) {
          const fields = getFormFields(container);

          // Keep track of the container with the most fields
          if (fields.length > maxFieldCount) {
            maxFieldCount = fields.length;
            bestContainer = container;
          }
        }
      }

      // If no standard forms found with fields, look for other containers
      if (!bestContainer || maxFieldCount === 0) {
        // Get all visible interactive elements
        const allFields = getFormFields(doc.body);

        if (allFields.length >= 1) {
          // Find common parent elements that might be form containers
          const fieldParentMap = new Map<HTMLElement, HTMLElement[]>();

          allFields.forEach(field => {
            let current = field.parentElement;
            while (current && current !== doc.body) {
              const existingFields = fieldParentMap.get(current) || [];
              if (!existingFields.includes(field)) {
                existingFields.push(field);
                fieldParentMap.set(current, existingFields);
              }
              current = current.parentElement;
            }
          });

          // Find the container with the most fields
          for (const [container, fields] of fieldParentMap.entries()) {
            if (fields.length > maxFieldCount) {
              maxFieldCount = fields.length;
              bestContainer = container;
            }
          }
        }
      }

      // Check shadow DOM for forms with more fields
      const shadowRootElements = findAllShadowRoots(doc.body);
      for (const host of shadowRootElements) {
        if (host.shadowRoot) {
          for (const selector of formContainerSelectors) {
            const shadowForms = queryShadowRoot(host.shadowRoot, selector);

            // Find the shadow DOM container with the most fields
            for (const form of shadowForms) {
              const fields = getFormFields(form);
              if (fields.length > maxFieldCount) {
                maxFieldCount = fields.length;
                bestContainer = form;
              }
            }
          }
        }
      }

      // Special case for Google Forms
      const isGoogleForm =
        window.location.hostname.includes("docs.google.com") && window.location.pathname.includes("/forms/");

      if (isGoogleForm) {
        // Look specifically for the main form content container
        const googleFormContainer = doc.querySelector(".freebirdFormviewerViewFormCard");
        if (googleFormContainer) {
          const fields = getFormFields(googleFormContainer as HTMLElement);
          if (fields.length > maxFieldCount) {
            maxFieldCount = fields.length;
            bestContainer = googleFormContainer as HTMLElement;
          }
        }
      }

      // Make sure we only add a container that has fields
      if (bestContainer && maxFieldCount > 0) {
        // Ensure we get the outermost container with same field count
        let outerContainer = bestContainer;
        let current = bestContainer.parentElement;

        // Look for parent containers that contain exactly the same fields
        while (current && current !== doc.body) {
          const parentFields = getFormFields(current);
          if (parentFields.length === maxFieldCount) {
            // This parent has the same number of fields, so it's likely a wrapper
            outerContainer = current;
            current = current.parentElement;
          } else {
            // Parent has different field count, stop here
            break;
          }
        }

        outerContainer.setAttribute("data-filliny-form-container", "true");
        bestContainers.push(outerContainer);
      }
    } catch (e) {
      console.error("Error in form detection:", e);
    }
  }

  // If we somehow found multiple containers, only keep the one with the most fields
  if (bestContainers.length > 1) {
    const containerWithMostFields = bestContainers.reduce((best, current) => {
      const bestFields = getFormFields(best).length;
      const currentFields = getFormFields(current).length;
      return currentFields > bestFields ? current : best;
    }, bestContainers[0]);

    // Remove the attribute from other containers
    bestContainers.forEach(container => {
      if (container !== containerWithMostFields) {
        container.removeAttribute("data-filliny-form-container");
      }
    });

    return [containerWithMostFields];
  }

  return bestContainers;
};
