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
    return Array.from(root.querySelectorAll(selector));
  } catch (e) {
    console.warn("Error querying shadow root:", e);
    return [];
  }
};

export const computeElementVisibility = (element: HTMLElement): { isVisible: boolean; hiddenReason?: string } => {
  try {
    const isHidden = (el: HTMLElement | null): boolean => {
      while (el) {
        const style = getComputedStyle(el);
        const isFormControl = ["select", "input", "textarea"].includes(el.tagName.toLowerCase());
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          (!isFormControl && parseFloat(style.opacity) === 0) ||
          el.hasAttribute("hidden") ||
          (style.position === "absolute" && (parseInt(style.left) < -9999 || parseInt(style.top) < -9999))
        ) {
          return true;
        }
        el = el.parentElement;
      }
      return false;
    };

    const rect = element.getBoundingClientRect();
    const hasZeroDimensions = !element.offsetWidth && !element.offsetHeight;
    const isOutsideViewport =
      rect.right <= 0 || rect.bottom <= 0 || rect.left >= window.innerWidth || rect.top >= window.innerHeight;

    const isFormControl = ["select", "input", "textarea"].includes(element.tagName.toLowerCase());
    if (isFormControl && isHidden(element)) return { isVisible: false, hiddenReason: "hidden-by-css" };
    if (hasZeroDimensions) return { isVisible: false, hiddenReason: "zero-dimensions" };
    if (isOutsideViewport) return { isVisible: false, hiddenReason: "outside-viewport" };
    if (isHidden(element)) return { isVisible: false, hiddenReason: "hidden-by-css" };

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
      if (iframe.contentDocument?.readyState === "complete") return iframe.contentDocument;
      if (iframe.contentWindow?.document?.readyState === "complete") return iframe.contentWindow.document;
    } catch (e) {
      console.debug("Frame access restricted:", { src: iframe.src, error: (e as Error).message });
    }
    return null;
  };

  const processIframes = (doc: Document) => {
    Array.from(doc.getElementsByTagName("iframe")).forEach(iframe => {
      if (!processedFrames.has(iframe.src)) {
        const iframeDoc = tryGetIframeDoc(iframe);
        if (iframeDoc) {
          processedFrames.add(iframe.src);
          docs.push(iframeDoc);
          processIframes(iframeDoc);
        }
      }
    });
  };

  try {
    processIframes(document);
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

  const observer = new MutationObserver(mutations => {
    const hasRelevantChanges = mutations.some(mutation =>
      Array.from(mutation.addedNodes).some(node => {
        if (node instanceof HTMLElement) {
          return node.tagName === "IFRAME" || node.tagName === "FORM" || !!node.querySelector("form, iframe");
        }
        return false;
      }),
    );
    if (hasRelevantChanges) safeDetectForms();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  safeDetectForms();
  window.addEventListener("load", safeDetectForms, { once: true });
  window.addEventListener("DOMContentLoaded", safeDetectForms, { once: true });
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
  return (
    element.hasAttribute("disabled") ||
    element.hasAttribute("readonly") ||
    element.getAttribute("data-filliny-skip") === "true" ||
    element.hasAttribute("list")
  );
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
  return Array.from(
    element.querySelectorAll<HTMLElement>(
      `input:not([type="hidden"]):not([type="submit"]),
       select, 
       textarea,
       [role="textbox"],
       [role="combobox"],
       [role="spinbutton"],
       [contenteditable="true"],
       [data-filliny-field],
       [tabindex],
       .form-control,
       [class*="input"],
       [class*="field"],
       [class*="textbox"]`,
    ),
  ).filter(el => isElementVisible(el) && !shouldSkipElement(el));
};

// Main entry point for field detection
export const detectFields = async (container: HTMLElement, isImplicitForm = false): Promise<Field[]> => {
  const fields: Field[] = [];
  let index = 0;

  const commonSelector = [
    'input:not([type="hidden"]):not([type="submit"])',
    "select",
    "textarea",
    '[role="textbox"]',
    '[role="combobox"]',
    '[role="spinbutton"]',
    '[contenteditable="true"]',
    "[data-filliny-field]",
    '[role="checkbox"]',
    '[role="switch"]',
  ].join(",");

  const elements = Array.from(container.querySelectorAll<HTMLElement>(commonSelector)).filter(
    element => !shouldSkipElement(element),
  );

  if (!elements.length) return fields;

  try {
    // Group elements by type
    const textInputs = elements.filter(
      el =>
        el instanceof HTMLInputElement &&
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
        ].includes((el as HTMLInputElement).type),
    );

    const textareaElements = elements.filter(el => el instanceof HTMLTextAreaElement);
    const selectElements = elements.filter(
      el => el instanceof HTMLSelectElement || el.getAttribute("role") === "combobox",
    );
    const checkableElements = elements.filter(
      el =>
        (el instanceof HTMLInputElement && ["checkbox", "radio"].includes((el as HTMLInputElement).type)) ||
        ["checkbox", "radio", "switch"].includes(el.getAttribute("role") || ""),
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
        const fields = await detectTextField([textarea], index, isImplicitForm);
        if (fields && fields.length > 0) {
          fields.push(fields[0]);
          index++;
        }
      }
    }

    if (selectElements.length > 0) {
      for (const select of selectElements) {
        const fields = await detectSelectFields([select], index, isImplicitForm);
        if (fields && fields.length > 0) {
          fields.push(fields[0]);
          index++;
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
        const fields = await detectFileFields([fileInput], index, isImplicitForm);
        if (fields && fields.length > 0) {
          fields.push(fields[0]);
          index++;
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
  const containers: HTMLElement[] = [];
  const documents = getAllFrameDocuments();
  for (const doc of documents) {
    try {
      const nativeForms = Array.from(doc.querySelectorAll<HTMLFormElement>("form"));
      if (nativeForms.length > 0) {
        containers.push(...nativeForms);
        continue;
      }
      const allFields = getFormFields(doc.body);
      if (allFields.length >= 2) {
        const containerFieldCounts = new Map<HTMLElement, { fields: HTMLElement[]; depth: number }>();
        allFields.forEach(field => {
          let current = field.parentElement;
          let depth = 0;
          while (current && current !== doc.body) {
            const existingData = containerFieldCounts.get(current) || { fields: [], depth };
            if (!existingData.fields.includes(field)) {
              existingData.fields.push(field);
              containerFieldCounts.set(current, existingData);
            }
            current = current.parentElement;
            depth++;
          }
        });
        const containerEntries = Array.from(containerFieldCounts.entries());
        containerEntries.sort(([containerA, dataA], [containerB, dataB]) => {
          const fieldDiff = dataB.fields.length - dataA.fields.length;
          if (fieldDiff !== 0) return fieldDiff;
          const depthDiff = dataA.depth - dataB.depth;
          if (depthDiff !== 0) return depthDiff;
          const position = containerA.compareDocumentPosition(containerB);
          if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
          if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
          return 0;
        });
        for (const [container, data] of containerEntries) {
          if (data.fields.length < 2) continue;
          if (containers.some(selected => selected.contains(container))) continue;
          const hasOverlappingFields = containers.some(selected => {
            const selectedFields = getFormFields(selected);
            const commonFields = data.fields.filter(field => selectedFields.includes(field));
            return commonFields.length >= data.fields.length * 0.5;
          });
          if (hasOverlappingFields) continue;
          container.setAttribute("data-filliny-form-container", "true");
          containers.push(container);
          break;
        }
      }
    } catch (e) {
      console.error("Error in form detection:", e);
    }
  }
  return containers;
};
