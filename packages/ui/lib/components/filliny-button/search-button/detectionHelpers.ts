import { detectFields } from "./field-types";
import { unifiedFieldRegistry } from "./unifiedFieldDetection";

// --- Frame Document Utilities ---
interface DocumentWithObserver extends Document {
  __fillinyFrameObserver?: MutationObserver;
}

// Callback type for notifying about new forms
export type FormDetectionCallback = (doc: Document) => void;

export const getAllFrameDocuments = (onNewFrameLoaded?: FormDetectionCallback): Document[] => {
  const docs: Document[] = [document];
  const processedFrames = new Set<string>();
  const maxRetries = 3;
  const retryDelay = 500;

  const tryGetIframeDoc = async (iframe: HTMLIFrameElement, retryCount = 0): Promise<Document | null> => {
    try {
      // Enhanced iframe document access with better retry logic

      // Direct access attempts
      if (iframe.contentDocument) return iframe.contentDocument;
      if (iframe.contentWindow?.document) return iframe.contentWindow.document;

      // Handle loading frames with improved retry mechanism
      if (retryCount < maxRetries && iframe.src) {
        // Check if iframe is still loading
        if (iframe.contentDocument === null) {
          console.debug(`Frame still loading, will retry (${retryCount + 1}/${maxRetries}):`, iframe.src);

          // Wait for iframe to finish loading
          await new Promise(resolve => {
            const loadHandler = () => {
              iframe.removeEventListener("load", loadHandler);
              resolve(undefined);
            };

            // Set up load event listener
            iframe.addEventListener("load", loadHandler);

            // Also set up a timeout as fallback
            setTimeout(() => {
              iframe.removeEventListener("load", loadHandler);
              resolve(undefined);
            }, retryDelay);
          });

          return tryGetIframeDoc(iframe, retryCount + 1);
        }
      }

      // Enhanced same-origin detection and handling
      if (iframe.src) {
        const currentOrigin = window.location.origin;
        const iframeUrl = new URL(iframe.src, window.location.href);

        // More comprehensive same-origin check
        const isSameOrigin =
          iframeUrl.origin === currentOrigin ||
          iframe.src.startsWith("/") ||
          iframe.src === "about:blank" ||
          iframe.src.startsWith("data:") ||
          iframe.src.startsWith("blob:");

        if (isSameOrigin) {
          console.debug("Accessing same-origin frame:", iframe.src);

          // Try multiple access methods for same-origin frames
          if (iframe.contentDocument) {
            return iframe.contentDocument;
          }

          if (iframe.contentWindow?.document) {
            return iframe.contentWindow.document;
          }

          // For data/blob URLs, the document might be available after a short delay
          if (iframe.src.startsWith("data:") || iframe.src.startsWith("blob:")) {
            await new Promise(resolve => setTimeout(resolve, 100));
            return iframe.contentDocument || iframe.contentWindow?.document || null;
          }
        } else {
          // For cross-origin frames, we can't access the document directly
          // But we can still detect their presence and handle them appropriately
          console.debug("Cross-origin frame detected, cannot access content:", iframe.src);

          // Store reference to cross-origin iframe for potential future handling
          iframe.setAttribute("data-filliny-cross-origin", "true");

          return null;
        }
      }

      // Handle frameless iframes (srcdoc, etc.)
      if (iframe.srcdoc && iframe.contentDocument) {
        console.debug("Accessing srcdoc frame");
        return iframe.contentDocument;
      }
    } catch (e) {
      const error = e as Error;
      console.debug("Frame access error:", {
        src: iframe.src,
        error: error.message,
        retryCount,
        maxRetries,
      });

      // For security errors, mark as cross-origin and don't retry
      if (error.message.includes("cross-origin") || error.message.includes("Permission denied")) {
        iframe.setAttribute("data-filliny-cross-origin", "true");
        return null;
      }

      // For other errors, retry if we haven't exceeded max retries
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return tryGetIframeDoc(iframe, retryCount + 1);
      }
    }
    return null;
  };

  const processIframes = async (doc: Document) => {
    // Process regular iframes
    const iframes = Array.from(doc.getElementsByTagName("iframe"));
    for (const iframe of iframes) {
      const frameSrc = iframe.src || "about:blank";
      if (!processedFrames.has(frameSrc)) {
        processedFrames.add(frameSrc);
        // Add load event listener for dynamic content
        iframe.addEventListener("load", async () => {
          const iframeDoc = await tryGetIframeDoc(iframe);
          if (iframeDoc) {
            if (!docs.includes(iframeDoc)) {
              docs.push(iframeDoc);
              await processIframes(iframeDoc);
              observeNewFrames(iframeDoc as DocumentWithObserver);
              if (onNewFrameLoaded) onNewFrameLoaded(iframeDoc);
            }
          }
        });
        // Try to get the doc immediately (for already loaded iframes)
        const iframeDoc = await tryGetIframeDoc(iframe);
        if (iframeDoc) {
          docs.push(iframeDoc);
          await processIframes(iframeDoc);
          observeNewFrames(iframeDoc as DocumentWithObserver);
          if (onNewFrameLoaded) onNewFrameLoaded(iframeDoc);
        }
      }
    }

    // Process object elements that might contain documents
    const objects = Array.from(doc.getElementsByTagName("object"));
    for (const obj of objects) {
      try {
        const objDoc = (obj as HTMLObjectElement & { contentDocument?: Document }).contentDocument;
        if (objDoc && !processedFrames.has(obj.data || "object")) {
          processedFrames.add(obj.data || "object");
          docs.push(objDoc);
          await processIframes(objDoc);
        }
      } catch {
        // Ignore access errors for objects
      }
    }
  };

  // Set up mutation observer for dynamically added frames
  const observeNewFrames = (doc: DocumentWithObserver) => {
    const observer = new MutationObserver(async mutations => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          const newIframes = Array.from(mutation.addedNodes).filter(
            (node): node is HTMLIFrameElement => node instanceof HTMLIFrameElement,
          );

          for (const iframe of newIframes) {
            const frameSrc = iframe.src || "about:blank";
            if (!processedFrames.has(frameSrc)) {
              processedFrames.add(frameSrc);
              iframe.addEventListener("load", async () => {
                const iframeDoc = await tryGetIframeDoc(iframe);
                if (iframeDoc) {
                  if (!docs.includes(iframeDoc)) {
                    docs.push(iframeDoc);
                    await processIframes(iframeDoc);
                    observeNewFrames(iframeDoc as DocumentWithObserver);
                    if (onNewFrameLoaded) onNewFrameLoaded(iframeDoc);
                  }
                }
              });
              const iframeDoc = await tryGetIframeDoc(iframe);
              if (iframeDoc) {
                docs.push(iframeDoc);
                await processIframes(iframeDoc);
                observeNewFrames(iframeDoc as DocumentWithObserver);
                if (onNewFrameLoaded) onNewFrameLoaded(iframeDoc);
              }
            }
          }
        }
      }
    });

    observer.observe(doc.body, {
      childList: true,
      subtree: true,
    });

    // Store observer reference for cleanup
    doc.__fillinyFrameObserver = observer;
  };

  // Enhanced iframe monitoring system for better form detection
  const setupIframeMonitoring = () => {
    // Monitor all existing and future iframes for form content
    const monitorIframe = (iframe: HTMLIFrameElement) => {
      const checkIframeForForms = async () => {
        try {
          const iframeDoc = await tryGetIframeDoc(iframe);
          if (iframeDoc) {
            // Check if iframe contains forms
            const hasFormElements = getFormFieldsRobust(iframeDoc.body).length > 0;

            if (hasFormElements) {
              console.log(`📋 Detected forms in iframe: ${iframe.src || "about:blank"}`);

              // Mark iframe as containing forms
              iframe.setAttribute("data-filliny-has-forms", "true");

              // Trigger form detection callback if provided
              if (onNewFrameLoaded) {
                onNewFrameLoaded(iframeDoc);
              }

              // Set up mutation observer for dynamic content in iframe
              const iframeObserver = new MutationObserver(() => {
                // Re-check for new forms when iframe content changes
                setTimeout(checkIframeForForms, 100);
              });

              iframeObserver.observe(iframeDoc.body, {
                childList: true,
                subtree: true,
              });

              // Store observer for cleanup
              (iframe as HTMLIFrameElement & { __fillinyIframeObserver?: MutationObserver }).__fillinyIframeObserver =
                iframeObserver;
            }
          } else if (iframe.src && !iframe.hasAttribute("data-filliny-cross-origin")) {
            // If we can't access the iframe and it's not marked as cross-origin,
            // it might still be loading - set up a delayed retry
            setTimeout(checkIframeForForms, 1000);
          }
        } catch (error) {
          console.debug("Error checking iframe for forms:", error);
        }
      };

      // Initial check
      checkIframeForForms();

      // Also check when iframe loads
      iframe.addEventListener("load", checkIframeForForms);

      // For cross-origin iframes, we can at least detect their presence
      if (iframe.hasAttribute("data-filliny-cross-origin")) {
        console.log(`🔒 Cross-origin iframe detected: ${iframe.src} - forms cannot be accessed directly`);
      }
    };

    // Monitor existing iframes
    const existingIframes = Array.from(document.querySelectorAll("iframe"));
    existingIframes.forEach(monitorIframe);

    // Monitor for new iframes
    const iframeObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLIFrameElement) {
            monitorIframe(node);
          } else if (node instanceof HTMLElement) {
            // Check if added node contains iframes
            const nestedIframes = node.querySelectorAll("iframe");
            nestedIframes.forEach(monitorIframe);
          }
        });
      });
    });

    iframeObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return iframeObserver;
  };

  // Initialize processing
  const init = async () => {
    try {
      await processIframes(document);
      observeNewFrames(document as DocumentWithObserver);

      // Set up enhanced iframe monitoring
      setupIframeMonitoring();

      // Special handling for Google Forms
      if (window.location.hostname.includes("docs.google.com") && window.location.pathname.includes("/forms/")) {
        const formContainers = document.querySelectorAll(".freebirdFormviewerViewFormContent");
        if (formContainers.length > 0) {
          console.debug("Found Google Forms container, ensuring all elements are processed");
        }
      }
    } catch (e) {
      console.warn("Error processing frames:", e);
    }
  };

  init();
  return docs;
};

// --- Enhanced Form Container Detection ---

interface FormCandidate {
  element: HTMLElement;
  score: number;
  fieldCount: number;
  reasons: string[];
}

/**
 * Get the depth of an element in the DOM tree
 */
const getElementDepth = (element: HTMLElement): number => {
  let depth = 0;
  let current = element.parentElement;
  while (current && current !== document.body) {
    depth++;
    current = current.parentElement;
  }
  return depth;
};

/**
 * Enhanced form field detection with multiple strategies and robust error handling
 */
const getFormFieldsRobust = (container: HTMLElement | ShadowRoot): HTMLElement[] => {
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

  let fields: HTMLElement[] = [];

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

    const allElements = Array.from(container.querySelectorAll<HTMLElement>("*"));
    const patternElements = allElements.filter(el => {
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

      // Enhanced form-like pattern detection
      const className = el.className.toLowerCase();
      const id = el.id.toLowerCase();
      const dataAttrs = Array.from(el.attributes)
        .filter(attr => attr.name.startsWith("data-"))
        .map(attr => `${attr.name}=${attr.value}`)
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
    });

    console.log(
      `Enhanced detection: Found ${patternElements.length} additional elements through advanced pattern detection`,
    );
    fields.push(...patternElements);
    fields = Array.from(new Set(fields));
  }

  // Strategy 3: Enhanced Shadow DOM exploration
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

  // Strategy 4: Dynamic content detection (for SPAs that load content dynamically)
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

  // Enhanced filtering with better visibility detection
  return fields.filter(el => {
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
        /\b(input|field|control)\b/i.test(el.className);

      return isLikelyFormField;
    } catch (e) {
      console.debug("Error filtering element:", e);
      return false;
    }
  });
};

/**
 * Find an expanded container that might be more comprehensive
 */
const findExpandedContainer = (element: HTMLElement): HTMLElement | null => {
  let current = element.parentElement;
  let bestContainer = element;
  let maxFields = getFormFieldsRobust(element).length;

  while (current && current !== document.body && current !== document.documentElement) {
    const currentFields = getFormFieldsRobust(current);

    // If parent has significantly more fields, it might be better
    if (currentFields.length > maxFields * 1.2) {
      bestContainer = current;
      maxFields = currentFields.length;
    }

    // Don't go too high up the DOM tree
    const depth = getElementDepth(current);
    if (depth > 20) break;

    current = current.parentElement;
  }

  return bestContainer !== element ? bestContainer : null;
};

/**
 * Enhanced form container detection with improved scoring for group detection
 */
export const detectFormLikeContainers = async (): Promise<HTMLElement[]> => {
  console.log("Starting enhanced form container detection with group-focused scoring...");

  const candidates: FormCandidate[] = [];
  const documents = getAllFrameDocuments();

  for (const doc of documents) {
    try {
      console.log(`Processing document: ${doc.location?.href || "unknown"}`);

      // Strategy 1: Look for explicit form-related elements (highest priority)
      const explicitFormSelectors = [
        "form",
        "fieldset",
        '[role="form"]',
        "[data-form]",
        '[data-testid*="form"]',
        '[class*="form"]',
        '[class*="survey"]',
        '[class*="questionnaire"]',
        '[id*="form"]',
        '[id*="survey"]',
        ".freebirdFormviewerViewFormCard",
        ".freebirdFormviewerViewFormContent",
        ".freebirdFormviewerViewItemsItemItem",
      ];

      const explicitContainers = Array.from(doc.querySelectorAll<HTMLElement>(explicitFormSelectors.join(",")));
      console.log(`Found ${explicitContainers.length} explicit form containers`);

      for (const container of explicitContainers) {
        const fields = getFormFieldsRobust(container);
        if (fields.length > 0) {
          const { score, reasons } = scoreFormContainerEnhanced(container, fields);
          candidates.push({
            element: container,
            score,
            fieldCount: fields.length,
            reasons,
          });
          console.log(
            `Explicit container: ${container.tagName}.${container.className} - Score: ${score}, Fields: ${fields.length}`,
          );
        }
      }

      // Strategy 2: Find containers that group multiple field types together
      const allFields = getFormFieldsRobust(doc.body);
      console.log(`Found ${allFields.length} total form fields in document`);

      if (allFields.length > 0) {
        // Group fields by their containers with enhanced grouping logic
        const containerFieldMap = new Map<HTMLElement, HTMLElement[]>();
        const processedContainers = new Set<HTMLElement>();

        for (const field of allFields) {
          // Find the most appropriate container for this field
          const optimalContainer = findOptimalFieldContainer(field, allFields, doc);

          if (optimalContainer && !processedContainers.has(optimalContainer)) {
            // Get all fields that belong to this container
            const containerFields = allFields.filter(f => optimalContainer.contains(f));

            if (containerFields.length >= 2) {
              containerFieldMap.set(optimalContainer, containerFields);
              processedContainers.add(optimalContainer);

              // Mark fields as processed to avoid duplicate processing
              containerFields.forEach(f => f.setAttribute("data-container-processed", "true"));
            }
          }
        }

        // Evaluate each container with enhanced scoring
        for (const [container, fields] of containerFieldMap.entries()) {
          const { score, reasons } = scoreFormContainerEnhanced(container, fields);

          // Check if this container is already in candidates (avoid duplicates)
          const existingCandidate = candidates.find(c => c.element === container);
          if (!existingCandidate) {
            candidates.push({
              element: container,
              score,
              fieldCount: fields.length,
              reasons,
            });
            console.log(
              `Container candidate: ${container.tagName}.${container.className} - Score: ${score}, Fields: ${fields.length}`,
            );
          } else if (existingCandidate.score < score) {
            // Update with better score
            existingCandidate.score = score;
            existingCandidate.fieldCount = fields.length;
            existingCandidate.reasons = reasons;
          }
        }
      }

      // Strategy 3: Special handling for specific sites (framework-specific optimizations)

      // Google Forms
      if (doc.location?.hostname.includes("docs.google.com") && doc.location?.pathname.includes("/forms/")) {
        const googleFormContainer = doc.querySelector(".freebirdFormviewerViewFormCard") as HTMLElement;
        if (googleFormContainer) {
          const fields = getFormFieldsRobust(googleFormContainer);
          if (fields.length > 0) {
            const { score, reasons } = scoreFormContainerEnhanced(googleFormContainer, fields);
            candidates.push({
              element: googleFormContainer,
              score: score + 100, // Boost for known good pattern
              fieldCount: fields.length,
              reasons: [...reasons, "Google Forms special handling"],
            });
          }
        }
      }

      // Typeform
      if (doc.location?.hostname.includes("typeform.com")) {
        const typeformContainer = doc.querySelector('[data-qa="form"]') as HTMLElement;
        if (typeformContainer) {
          const fields = getFormFieldsRobust(typeformContainer);
          if (fields.length > 0) {
            const { score, reasons } = scoreFormContainerEnhanced(typeformContainer, fields);
            candidates.push({
              element: typeformContainer,
              score: score + 100,
              fieldCount: fields.length,
              reasons: [...reasons, "Typeform special handling"],
            });
          }
        }
      }

      // JotForm
      if (doc.location?.hostname.includes("jotform.com")) {
        const jotformContainer = doc.querySelector(".form-all") as HTMLElement;
        if (jotformContainer) {
          const fields = getFormFieldsRobust(jotformContainer);
          if (fields.length > 0) {
            const { score, reasons } = scoreFormContainerEnhanced(jotformContainer, fields);
            candidates.push({
              element: jotformContainer,
              score: score + 100,
              fieldCount: fields.length,
              reasons: [...reasons, "JotForm special handling"],
            });
          }
        }
      }
    } catch (e) {
      console.error("Error in form detection for document:", e);
    }
  }

  console.log(`Found ${candidates.length} total candidates`);

  // Sort candidates by score (highest first)
  candidates.sort((a, b) => b.score - a.score);

  // Log top candidates
  console.log("Top form container candidates:");
  candidates.slice(0, 5).forEach((candidate, index) => {
    console.log(
      `${index + 1}. Score: ${candidate.score}, Fields: ${candidate.fieldCount}, Element: ${candidate.element.tagName}.${candidate.element.className}, Reasons: ${candidate.reasons.join(", ")}`,
    );
  });

  // Enhanced container selection logic - more inclusive to handle multiple form containers
  const selectedContainers: HTMLElement[] = [];

  if (candidates.length > 0) {
    // Always take the highest scoring candidate
    const bestCandidate = candidates[0];
    bestCandidate.element.setAttribute("data-filliny-form-container", "true");
    selectedContainers.push(bestCandidate.element);
    console.log(
      `✅ Selected primary container: ${bestCandidate.element.tagName}.${bestCandidate.element.className} (Score: ${bestCandidate.score}, Fields: ${bestCandidate.fieldCount})`,
    );

    // More inclusive selection criteria for multiple form containers
    const primaryFieldCount = bestCandidate.fieldCount;

    // Lower the threshold to be more inclusive - include containers with at least 3 fields
    // or containers with significant scores regardless of field count
    const minAdditionalFields = Math.max(3, Math.floor(primaryFieldCount * 0.2)); // At least 3 fields or 20% of primary
    const significantScoreThreshold = Math.max(50, bestCandidate.score * 0.4); // At least 40% of best score

    // Process more candidates to find all valid form containers
    const maxCandidates = Math.min(candidates.length, 8); // Increased from 3 to 8
    for (let i = 1; i < maxCandidates; i++) {
      const candidate = candidates[i];

      let shouldInclude = false;
      let inclusionReason = "";

      // Strategy 1: Include containers with enough fields
      if (candidate.fieldCount >= minAdditionalFields) {
        // Check if it's nested within any already selected container
        const isNestedInSelected = selectedContainers.some(
          selected => selected.contains(candidate.element) || candidate.element.contains(selected),
        );

        if (!isNestedInSelected) {
          // More lenient spatial separation check
          let isSpatiallyDistinct = true;

          // Check spatial separation against all selected containers
          for (const selectedContainer of selectedContainers) {
            const candidateRect = candidate.element.getBoundingClientRect();
            const selectedRect = selectedContainer.getBoundingClientRect();

            const verticalDistance = Math.abs(candidateRect.top - selectedRect.top);
            const horizontalDistance = Math.abs(candidateRect.left - selectedRect.left);

            // More lenient separation requirements - reduced from 300px to 150px
            const hasMinimalSeparation = verticalDistance > 150 || horizontalDistance > 200;

            if (!hasMinimalSeparation) {
              isSpatiallyDistinct = false;
              break;
            }
          }

          if (isSpatiallyDistinct) {
            shouldInclude = true;
            inclusionReason = `spatially distinct with ${candidate.fieldCount} fields`;
          }
        }
      }

      // Strategy 2: Include high-scoring containers even if they have fewer fields
      if (!shouldInclude && candidate.score >= significantScoreThreshold) {
        const isNestedInSelected = selectedContainers.some(
          selected => selected.contains(candidate.element) || candidate.element.contains(selected),
        );

        if (!isNestedInSelected) {
          shouldInclude = true;
          inclusionReason = `high score (${candidate.score}) with ${candidate.fieldCount} fields`;
        }
      }

      // Strategy 3: Include semantic form containers (forms, fieldsets, role="form")
      if (!shouldInclude) {
        const isSemanticForm =
          candidate.element.tagName === "FORM" ||
          candidate.element.tagName === "FIELDSET" ||
          candidate.element.getAttribute("role") === "form" ||
          candidate.element.className.toLowerCase().includes("form");

        if (isSemanticForm && candidate.fieldCount >= 2) {
          const isNestedInSelected = selectedContainers.some(
            selected => selected.contains(candidate.element) || candidate.element.contains(selected),
          );

          if (!isNestedInSelected) {
            shouldInclude = true;
            inclusionReason = `semantic form container with ${candidate.fieldCount} fields`;
          }
        }
      }

      if (shouldInclude) {
        candidate.element.setAttribute("data-filliny-form-container", "true");
        selectedContainers.push(candidate.element);
        console.log(
          `✅ Added additional container: ${candidate.element.tagName}.${candidate.element.className} (Score: ${candidate.score}, Fields: ${candidate.fieldCount}, Reason: ${inclusionReason})`,
        );
      } else {
        console.log(
          `⚠️ Skipped container: ${candidate.element.tagName}.${candidate.element.className} (Score: ${candidate.score}, Fields: ${candidate.fieldCount}, Reason: nested or insufficient criteria)`,
        );
      }
    }

    // Post-processing: If we only have one container and it's small, try to expand it
    if (selectedContainers.length === 1 && bestCandidate.fieldCount < 8) {
      console.log("Single small container detected, looking for expansion opportunities...");

      const expandedContainer = findExpandedContainer(bestCandidate.element);
      if (expandedContainer && expandedContainer !== bestCandidate.element) {
        const expandedFields = getFormFieldsRobust(expandedContainer);
        if (expandedFields.length > bestCandidate.fieldCount * 1.3) {
          console.log(`🔄 Expanding to parent container with ${expandedFields.length} fields`);

          // Replace the original container with the expanded one
          bestCandidate.element.removeAttribute("data-filliny-form-container");
          expandedContainer.setAttribute("data-filliny-form-container", "true");
          selectedContainers[0] = expandedContainer;
        }
      }
    }
  }

  // If no good candidates found, fall back to body with fields
  if (selectedContainers.length === 0) {
    console.log("No good form containers found, checking document body...");
    for (const doc of documents) {
      const bodyFields = getFormFieldsRobust(doc.body);
      if (bodyFields.length >= 1) {
        console.log(`Using document body as fallback with ${bodyFields.length} fields`);
        doc.body.setAttribute("data-filliny-form-container", "true");
        selectedContainers.push(doc.body);
        break;
      }
    }
  }

  console.log(`Final selection: ${selectedContainers.length} form containers`);

  // Enhanced logging for multiple container detection
  console.log(
    `%c🎯 FORM CONTAINER SELECTION SUMMARY`,
    "background: #4f46e5; color: white; padding: 8px; font-weight: bold;",
  );
  console.log(`📊 Total candidates found: ${candidates.length}`);
  console.log(`✅ Selected containers: ${selectedContainers.length}`);

  selectedContainers.forEach((container, idx) => {
    const fieldCount = getFormFieldsRobust(container).length;
    console.log(`   ${idx + 1}. ${container.tagName}.${container.className} (${fieldCount} fields)`);
  });

  if (candidates.length > selectedContainers.length) {
    console.log(`⚠️ Filtered out ${candidates.length - selectedContainers.length} candidates:`);
    const rejectedCandidates = candidates.slice(selectedContainers.length);
    rejectedCandidates.forEach((candidate, idx) => {
      if (!selectedContainers.includes(candidate.element)) {
        console.log(
          `   ${idx + 1}. ${candidate.element.tagName}.${candidate.element.className} (${candidate.fieldCount} fields, score: ${candidate.score})`,
        );
      }
    });
  }

  return selectedContainers;
};

/**
 * Find the optimal container for a field considering grouping and hierarchy
 * Enhanced to find truly outermost containers
 */
const findOptimalFieldContainer = (field: HTMLElement, allFields: HTMLElement[], doc: Document): HTMLElement | null => {
  // Start from the field and work upwards to find the best container
  let currentElement = field.parentElement;
  let bestContainer: HTMLElement | null = null;
  let maxGroupScore = 0;
  let maxFieldCount = 0;

  // Track all potential containers
  const containerCandidates: Array<{ element: HTMLElement; score: number; fieldCount: number }> = [];

  while (currentElement && currentElement !== doc.body && currentElement !== doc.documentElement) {
    // Calculate how well this container groups related fields
    const containerFields = allFields.filter(f => currentElement!.contains(f));

    if (containerFields.length >= 1) {
      // Score this container based on how well it groups fields
      const groupScore = calculateContainerGroupingScore(currentElement, containerFields);

      containerCandidates.push({
        element: currentElement,
        score: groupScore,
        fieldCount: containerFields.length,
      });

      // Prefer containers with more fields and better grouping
      const shouldUpdate =
        groupScore > maxGroupScore || (groupScore >= maxGroupScore * 0.8 && containerFields.length > maxFieldCount);

      if (shouldUpdate) {
        maxGroupScore = groupScore;
        maxFieldCount = containerFields.length;
        bestContainer = currentElement;
      }
    }

    currentElement = currentElement.parentElement;
  }

  // Post-processing: Ensure we have the outermost meaningful container
  if (bestContainer && containerCandidates.length > 1) {
    // Sort by field count (descending) and then by score
    containerCandidates.sort((a, b) => {
      if (a.fieldCount !== b.fieldCount) {
        return b.fieldCount - a.fieldCount;
      }
      return b.score - a.score;
    });

    // If the top candidate has significantly more fields, prefer it
    const topCandidate = containerCandidates[0];
    if (topCandidate.fieldCount > maxFieldCount * 1.2 && topCandidate.score >= maxGroupScore * 0.5) {
      console.log(`🔄 Switching to outermost container with ${topCandidate.fieldCount} fields (was ${maxFieldCount})`);
      bestContainer = topCandidate.element;
    }
  }

  return bestContainer;
};

/**
 * Calculate how well a container groups related fields
 */
const calculateContainerGroupingScore = (container: HTMLElement, fields: HTMLElement[]): number => {
  let score = 0;

  // Base score from field count
  score += fields.length * 5;

  // Check field type diversity (good grouping should have logical field combinations)
  const fieldTypes = getFieldTypesInContainer(container);

  // Bonus for logical field type combinations
  if (fieldTypes.has("text") && fieldTypes.has("email")) score += 20; // Contact forms
  if (fieldTypes.has("radio") && fieldTypes.has("checkbox")) score += 15; // Survey forms
  if (fieldTypes.has("select") && fieldTypes.has("text")) score += 15; // Application forms
  if (fieldTypes.has("checkbox") && fieldTypes.has("text")) score += 10; // Terms + info forms

  // Bonus for semantic containers
  const tagName = container.tagName.toLowerCase();
  if (tagName === "fieldset") score += 30;
  if (tagName === "form") score += 25;
  if (container.getAttribute("role") === "group") score += 20;

  // Bonus for appropriate size (not too small or too large)
  const rect = container.getBoundingClientRect();
  if (rect.height > 100 && rect.height < 2000) score += 10;
  if (rect.width > 200 && rect.width < 1200) score += 10;

  // Penalty for excessive nesting depth
  const depth = getElementDepth(container);
  if (depth > 15) score -= Math.min(depth - 15, 30);

  return score;
};

/**
 * Get field types present in a container
 */
const getFieldTypesInContainer = (container: HTMLElement): Set<string> => {
  const types = new Set<string>();

  // Check for different input types
  const inputs = container.querySelectorAll("input");
  inputs.forEach(input => {
    if (input.type === "text" || input.type === "email" || input.type === "tel" || input.type === "url") {
      types.add("text");
    } else if (input.type === "checkbox") {
      types.add("checkbox");
    } else if (input.type === "radio") {
      types.add("radio");
    } else if (input.type === "file") {
      types.add("file");
    }
  });

  // Check for selects
  if (container.querySelector("select")) types.add("select");

  // Check for textareas
  if (container.querySelector("textarea")) types.add("textarea");

  // Check for ARIA roles
  if (container.querySelector('[role="combobox"]')) types.add("select");
  if (container.querySelector('[role="checkbox"]')) types.add("checkbox");
  if (container.querySelector('[role="radio"]')) types.add("radio");

  return types;
};

/**
 * Enhanced scoring function that considers field grouping and relationships
 * Optimized for modern web applications and SPA patterns
 */
const scoreFormContainerEnhanced = (
  element: HTMLElement,
  fields: HTMLElement[],
): { score: number; reasons: string[] } => {
  let score = 0;
  const reasons: string[] = [];

  // Enhanced base score from field count with better scaling
  const fieldCount = fields.length;
  if (fieldCount === 0) return { score: 0, reasons: ["no fields"] };

  // Progressive scoring that rewards more fields but with diminishing returns
  if (fieldCount >= 10) {
    score += 120; // High score for forms with many fields
  } else if (fieldCount >= 5) {
    score += fieldCount * 15; // Good score for medium forms
  } else {
    score += fieldCount * 10; // Base score for small forms
  }
  reasons.push(`${fieldCount} form fields`);

  // Enhanced field diversity scoring
  const fieldTypes = getFieldTypesInContainer(element);
  const diversityBonus = Math.min(fieldTypes.size * 12, 60); // Cap diversity bonus
  score += diversityBonus;
  reasons.push(`${fieldTypes.size} different field types (+${diversityBonus})`);

  // Bonus for modern form patterns and logical field combinations
  const hasTextAndEmail = fieldTypes.has("text") && fieldTypes.has("email");
  const hasSelectAndText = fieldTypes.has("select") && fieldTypes.has("text");
  const hasCheckboxAndRadio = fieldTypes.has("checkbox") && fieldTypes.has("radio");
  const hasFileInput = fieldTypes.has("file");

  if (hasTextAndEmail) {
    score += 25;
    reasons.push("contact form pattern (+25)");
  }
  if (hasSelectAndText) {
    score += 20;
    reasons.push("application form pattern (+20)");
  }
  if (hasCheckboxAndRadio) {
    score += 18;
    reasons.push("survey/preference form pattern (+18)");
  }
  if (hasFileInput) {
    score += 15;
    reasons.push("document upload form (+15)");
  }

  // Semantic HTML elements get higher scores
  const tagName = element.tagName.toLowerCase();
  if (tagName === "form") {
    score += 60;
    reasons.push("semantic <form> element");
  } else if (tagName === "fieldset") {
    score += 40;
    reasons.push("semantic <fieldset> element");
  }

  // ARIA roles
  const role = element.getAttribute("role");
  if (role === "form") {
    score += 50;
    reasons.push("ARIA form role");
  } else if (role === "group") {
    score += 30;
    reasons.push("ARIA group role");
  }

  // Enhanced class name patterns (case insensitive) - optimized for modern web apps
  const className = element.className.toLowerCase();
  const classPatterns = [
    // Core form patterns
    { pattern: /\bform\b/, score: 40, label: "form class" },
    { pattern: /\bsurvey\b/, score: 45, label: "survey class" },
    { pattern: /\bquestionnaire\b/, score: 45, label: "questionnaire class" },
    { pattern: /\bapplication\b/, score: 35, label: "application class" },

    // Business/insurance specific patterns
    { pattern: /\bprofile\b/, score: 40, label: "profile class" },
    { pattern: /\binsurance\b/, score: 42, label: "insurance class" },
    { pattern: /\bpolicy\b/, score: 38, label: "policy class" },
    { pattern: /\bcoverage\b/, score: 36, label: "coverage class" },
    { pattern: /\bquote\b/, score: 35, label: "quote class" },
    { pattern: /\bclaim\b/, score: 35, label: "claim class" },
    { pattern: /\baccount\b/, score: 32, label: "account class" },
    { pattern: /\bmember\b/, score: 30, label: "member class" },
    { pattern: /\bcustomer\b/, score: 30, label: "customer class" },

    // Authentication and user flows
    { pattern: /\bcontact\b/, score: 28, label: "contact class" },
    { pattern: /\bsignup\b/, score: 30, label: "signup class" },
    { pattern: /\blogin\b/, score: 25, label: "login class" },
    { pattern: /\bregistration\b/, score: 35, label: "registration class" },
    { pattern: /\bonboarding\b/, score: 33, label: "onboarding class" },

    // E-commerce patterns
    { pattern: /\bcheckout\b/, score: 40, label: "checkout class" },
    { pattern: /\bpayment\b/, score: 38, label: "payment class" },
    { pattern: /\bbilling\b/, score: 36, label: "billing class" },
    { pattern: /\bshipping\b/, score: 34, label: "shipping class" },

    // Multi-step form patterns
    { pattern: /\bwizard\b/, score: 30, label: "wizard class" },
    { pattern: /\bstep\b/, score: 20, label: "step class" },
    { pattern: /\bstage\b/, score: 18, label: "stage class" },
    { pattern: /\bflow\b/, score: 16, label: "flow class" },

    // Container patterns
    { pattern: /\bform-container\b/, score: 35, label: "form container class" },
    { pattern: /\bform-wrapper\b/, score: 35, label: "form wrapper class" },
    { pattern: /\bform-section\b/, score: 32, label: "form section class" },
    { pattern: /\bform-group\b/, score: 28, label: "form group class" },
    { pattern: /\bform-body\b/, score: 33, label: "form body class" },
    { pattern: /\bform-content\b/, score: 33, label: "form content class" },

    // Modern SPA patterns
    { pattern: /\bpage\b/, score: 15, label: "page class" },
    { pattern: /\bview\b/, score: 12, label: "view class" },
    { pattern: /\bcomponent\b/, score: 10, label: "component class" },
    { pattern: /\bcontainer\b/, score: 8, label: "container class" },

    // Negative patterns (reduce score)
    { pattern: /\bmodal\b/, score: -12, label: "modal (small penalty)" },
    { pattern: /\bpopup\b/, score: -12, label: "popup (small penalty)" },
    { pattern: /\btooltip\b/, score: -20, label: "tooltip (penalty)" },
    { pattern: /\bdropdown\b/, score: -15, label: "dropdown (penalty)" },
    { pattern: /\bmenu\b/, score: -18, label: "menu (penalty)" },
    { pattern: /\bnavigation\b/, score: -25, label: "navigation (penalty)" },
    { pattern: /\bheader\b/, score: -20, label: "header (penalty)" },
    { pattern: /\bfooter\b/, score: -20, label: "footer (penalty)" },
    { pattern: /\bsidebar\b/, score: -22, label: "sidebar (penalty)" },
  ];

  for (const { pattern, score: patternScore, label } of classPatterns) {
    if (pattern.test(className)) {
      score += patternScore;
      reasons.push(label);
    }
  }

  // ID patterns
  const id = element.id.toLowerCase();
  const idPatterns = [
    { pattern: /\bform\b/, score: 25, label: "form ID" },
    { pattern: /\bsurvey\b/, score: 30, label: "survey ID" },
    { pattern: /\bapplication\b/, score: 20, label: "application ID" },
    { pattern: /\bcontact\b/, score: 15, label: "contact ID" },
    { pattern: /\bwizard\b/, score: 15, label: "wizard ID" },
  ];

  for (const { pattern, score: patternScore, label } of idPatterns) {
    if (pattern.test(id)) {
      score += patternScore;
      reasons.push(label);
    }
  }

  // Data attributes
  const dataAttributes = [
    { attr: "data-form", score: 25, label: "data-form attribute" },
    { attr: "data-step", score: 15, label: "data-step attribute" },
    { attr: "data-wizard", score: 20, label: "data-wizard attribute" },
    { attr: "data-survey", score: 30, label: "data-survey attribute" },
  ];

  for (const { attr, score: attrScore, label } of dataAttributes) {
    if (element.hasAttribute(attr)) {
      score += attrScore;
      reasons.push(label);
    }
  }

  // Structural indicators
  const hasLegend = element.querySelector("legend");
  if (hasLegend) {
    score += 20;
    reasons.push("contains legend");
  }

  const hasSubmitButton = element.querySelector('input[type="submit"], button[type="submit"], button:not([type])');
  if (hasSubmitButton) {
    score += 25;
    reasons.push("contains submit button");
  }

  // Group relationship bonuses
  const hasRadioGroups = element.querySelectorAll('input[type="radio"]').length >= 2;
  const hasCheckboxGroups = element.querySelectorAll('input[type="checkbox"]').length >= 2;

  if (hasRadioGroups) {
    score += 15;
    reasons.push("contains radio button groups");
  }

  if (hasCheckboxGroups) {
    score += 15;
    reasons.push("contains checkbox groups");
  }

  // Framework-specific patterns
  const frameworkPatterns = [
    { pattern: /\bfreebirdFormviewerViewFormCard\b/, score: 50, label: "Google Forms" },
    { pattern: /\bfreebirdFormviewerViewFormContent\b/, score: 50, label: "Google Forms content" },
    { pattern: /\bform-container\b/, score: 35, label: "form container" },
    { pattern: /\binput-container\b/, score: 20, label: "input container" },
    { pattern: /\bfield-container\b/, score: 20, label: "field container" },
    { pattern: /\bform-section\b/, score: 30, label: "form section" },
    { pattern: /\bform-group\b/, score: 25, label: "form group" },
    { pattern: /\bform-wrapper\b/, score: 35, label: "form wrapper" },
    { pattern: /\bform-body\b/, score: 30, label: "form body" },
    { pattern: /\bform-content\b/, score: 30, label: "form content" },
  ];

  for (const { pattern, score: patternScore, label } of frameworkPatterns) {
    if (pattern.test(className)) {
      score += patternScore;
      reasons.push(label);
    }
  }

  // Penalty for very deep nesting (likely not a form container)
  const depth = getElementDepth(element);
  if (depth > 12) {
    const penalty = Math.min((depth - 12) * 3, 40);
    score -= penalty;
    reasons.push(`deep nesting penalty (${depth} levels, -${penalty})`);
  }

  // Bonus for reasonable size and visibility
  const rect = element.getBoundingClientRect();
  if (rect.width > 250 && rect.height > 150) {
    score += 15;
    reasons.push("reasonable size");
  }

  // Strong penalty for hidden elements
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") {
    score -= 80;
    reasons.push("hidden element penalty");
  }

  // Bonus for containers that properly group related fields
  const groupingBonus = calculateContainerGroupingScore(element, fields) * 0.3; // Scale down the grouping score
  if (groupingBonus > 5) {
    score += groupingBonus;
    reasons.push(`good field grouping (+${Math.round(groupingBonus)})`);
  }

  return { score: Math.round(score), reasons };
};

// --- Re-export shared helpers for convenience ---
export { detectFields };

/**
 * Returns true if the current window is inside a cross-origin iframe.
 */
function isInsideCrossOriginIframe(): boolean {
  try {
    // If not in an iframe, return false
    if (window.top === window.self) return false;
    // Try to access the parent document (handle possible null)
    if (window.top && window.top.document) {
      void window.top.document;
      return false; // If no error, it's same-origin
    }
    return true;
  } catch {
    return true; // Access denied: cross-origin
  }
}

/**
 * Shows a user-friendly warning that autofill cannot work in cross-origin iframes.
 */
function showCrossOriginIframeWarning() {
  // Remove any existing warning
  const existing = document.getElementById("filliny-cross-origin-warning");
  if (existing) existing.remove();

  // Create a styled overlay
  const warning = document.createElement("div");
  warning.id = "filliny-cross-origin-warning";
  warning.style.position = "fixed";
  warning.style.top = "0";
  warning.style.left = "0";
  warning.style.width = "100vw";
  warning.style.height = "100vh";
  warning.style.background = "rgba(0,0,0,0.6)";
  warning.style.color = "white";
  warning.style.display = "flex";
  warning.style.flexDirection = "column";
  warning.style.justifyContent = "center";
  warning.style.alignItems = "center";
  warning.style.zIndex = "99999";
  warning.style.fontSize = "1.5rem";
  warning.innerHTML = `
    <div style="background: #222; padding: 2rem 3rem; border-radius: 12px; box-shadow: 0 2px 16px #0008; text-align: center; max-width: 90vw;">
      <b>Autofill not available</b><br><br>
      This form is embedded from another website (cross-origin iframe), and browser security prevents autofill or overlays.<br><br>
      <span style="font-size: 1rem;">Try opening the form in a new tab or contact support if you need help.</span><br><br>
      <button id="filliny-cross-origin-warning-close" style="margin-top: 1rem; padding: 0.5rem 1.5rem; font-size: 1rem; border-radius: 6px; border: none; background: #4f46e5; color: white; cursor: pointer;">Close</button>
    </div>
  `;
  document.body.appendChild(warning);
  document.getElementById("filliny-cross-origin-warning-close")?.addEventListener("click", () => warning.remove());
}

/**
 * Detects cross-origin iframes on the page, opens their src in a new tab, and alerts the user to retry.
 */
function openCrossOriginIframeInNewTabAndAlert() {
  const iframes = Array.from(document.getElementsByTagName("iframe"));
  for (const iframe of iframes) {
    try {
      // Try to access the iframe's document
      if (iframe.contentDocument || iframe.contentWindow?.document) {
        // Same-origin, skip
        continue;
      }
    } catch {
      // Access denied: cross-origin
      if (iframe.src) {
        window.open(iframe.src, "_blank");
        alert(
          "The form is embedded from another website. We have opened it in a new tab. Please retry the autofill there.",
        );
        return;
      }
    }
  }
  // If no cross-origin iframe found, fallback alert
  alert("No cross-origin iframe with a form was found.");
}

export { isInsideCrossOriginIframe, showCrossOriginIframeWarning, openCrossOriginIframeInNewTabAndAlert };

// --- Diagnostic Functions for Debugging ---

/**
 * Enhanced diagnostic function to analyze form detection issues with grouping focus
 * This helps debug why certain forms or fields aren't being detected properly
 */
export const diagnoseFillinySystem = (): void => {
  console.log(`🔍 FILLINY SYSTEM DIAGNOSTIC REPORT (Enhanced Grouping)`);
  console.log(`=======================================================`);

  // 1. Document Analysis
  console.log(`📄 Document Analysis:`);
  console.log(`   • URL: ${window.location.href}`);
  console.log(`   • Title: ${document.title}`);
  console.log(`   • Body classes: ${document.body.className}`);
  console.log(`   • Total DOM elements: ${document.querySelectorAll("*").length}`);

  // 2. Frame Analysis
  const docs = getAllFrameDocuments();
  console.log(`🖼️ Frame Analysis:`);
  console.log(`   • Total documents: ${docs.length}`);
  docs.forEach((doc, index) => {
    console.log(`   • Document ${index}: ${doc.location?.href || "unknown"}`);
  });

  // 3. Enhanced Form Element Analysis with Grouping
  console.log(`📋 Enhanced Form Element Analysis:`);
  const allFormElements = getFormFieldsRobust(document.body);
  console.log(`   • Total form elements found: ${allFormElements.length}`);

  // Group by type for better analysis
  const elementTypes = allFormElements.reduce(
    (acc, el) => {
      const inputEl = el as HTMLInputElement;
      const type = el.tagName.toLowerCase() + (inputEl.type ? `[${inputEl.type}]` : "");
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log(`   • Element types:`, elementTypes);

  // 4. Grouping Analysis for Radio/Checkbox
  console.log(`🎯 Grouping Analysis:`);

  // Radio buttons analysis
  const radioElements = allFormElements.filter(
    el => (el instanceof HTMLInputElement && el.type === "radio") || el.getAttribute("role") === "radio",
  );
  console.log(`   • Radio elements found: ${radioElements.length}`);

  if (radioElements.length > 0) {
    const radioByName = radioElements.reduce(
      (acc, el) => {
        const name = (el as HTMLInputElement).name || "unnamed";
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    console.log(`   • Radio groups by name:`, radioByName);
  }

  // Checkbox analysis
  const checkboxElements = allFormElements.filter(
    el => (el instanceof HTMLInputElement && el.type === "checkbox") || el.getAttribute("role") === "checkbox",
  );
  console.log(`   • Checkbox elements found: ${checkboxElements.length}`);

  if (checkboxElements.length > 0) {
    const checkboxByName = checkboxElements.reduce(
      (acc, el) => {
        const name = (el as HTMLInputElement).name || "unnamed";
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    console.log(`   • Checkbox groups by name:`, checkboxByName);
  }

  // Select elements analysis
  const selectElements = allFormElements.filter(
    el =>
      el instanceof HTMLSelectElement ||
      el.getAttribute("role") === "combobox" ||
      el.getAttribute("role") === "listbox",
  );
  console.log(`   • Select elements found: ${selectElements.length}`);

  // 5. Existing Form Containers
  console.log(`🏗️ Existing Form Container Analysis:`);
  const existingContainers = document.querySelectorAll("[data-filliny-form-container]");
  console.log(`   • Registered containers: ${existingContainers.length}`);
  existingContainers.forEach((container, index) => {
    const fields = getFormFieldsRobust(container as HTMLElement);
    console.log(`   • Container ${index}: ${container.tagName}.${container.className} (${fields.length} fields)`);
  });

  // 6. Unified Registry Analysis
  console.log(`🎯 Unified Registry Analysis:`);
  try {
    // Check if we can access the registry
    const allFields = unifiedFieldRegistry.getAllFields();
    const individualFields = unifiedFieldRegistry.getIndividualFields();
    const groupedFields = unifiedFieldRegistry.getGroupedFields();

    console.log(`   • Total fields in registry: ${allFields.length}`);
    console.log(`   • Individual fields: ${individualFields.length}`);
    console.log(`   • Grouped fields: ${groupedFields.length}`);

    // Field type distribution
    const fieldTypeDistribution = allFields.reduce(
      (acc, field) => {
        acc[field.type] = (acc[field.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    console.log(`   • Field type distribution:`, fieldTypeDistribution);

    // Group analysis
    groupedFields.forEach(group => {
      console.log(`   • Group ${group.groupId}: ${group.groupType} with ${group.fields.length} fields`);
    });
  } catch (error) {
    console.log(`   • Registry not available or error:`, error);
  }

  // 7. Potential Form Containers
  console.log(`🎯 Potential Form Container Analysis:`);
  const potentialContainers = [
    "form",
    '[role="form"]',
    ".form",
    ".form-container",
    ".form-wrapper",
    '[class*="form"]',
    '[class*="profile"]',
    '[class*="insurance"]',
    '[class*="application"]',
    "fieldset",
    '[role="group"]',
    '[role="radiogroup"]',
  ];

  potentialContainers.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`   • ${selector}: ${elements.length} elements`);
        elements.forEach((el, index) => {
          const fields = getFormFieldsRobust(el as HTMLElement);
          if (fields.length > 0) {
            console.log(`     - Element ${index}: ${fields.length} fields`);
          }
        });
      }
    } catch {
      console.log(`   • ${selector}: selector failed`);
    }
  });

  // 8. Enhanced Issue Detection
  console.log(`⚠️ Potential Issues:`);
  const issues: string[] = [];

  if (allFormElements.length === 0) {
    issues.push("No form elements detected - check selectors");
  }

  if (existingContainers.length === 0) {
    issues.push("No form containers registered - detection may have failed");
  }

  // Check for hidden elements
  const hiddenElements = allFormElements.filter(el => {
    const style = window.getComputedStyle(el);
    return style.display === "none" || style.visibility === "hidden";
  });

  if (hiddenElements.length > 0) {
    issues.push(`${hiddenElements.length} form elements are hidden`);
  }

  // Check for elements without proper IDs or names
  const elementsWithoutIds = allFormElements.filter(
    el => !el.id && !el.getAttribute("name") && !el.hasAttribute("data-filliny-id"),
  );

  if (elementsWithoutIds.length > 0) {
    issues.push(`${elementsWithoutIds.length} elements lack proper identification`);
  }

  // Check for ungrouped radio buttons (potential issue)
  const ungroupedRadios = radioElements.filter(el => !(el as HTMLInputElement).name);
  if (ungroupedRadios.length > 0) {
    issues.push(`${ungroupedRadios.length} radio buttons lack name attribute (grouping may be affected)`);
  }

  if (issues.length === 0) {
    console.log(`   ✅ No obvious issues detected`);
  } else {
    issues.forEach(issue => console.log(`   ❌ ${issue}`));
  }

  // 9. Enhanced Recommendations
  console.log(`💡 Enhanced Recommendations:`);
  const recommendations: string[] = [];

  if (allFormElements.length > 10) {
    recommendations.push("Large form detected - ensure proper container detection and grouping");
  }

  if (docs.length > 1) {
    recommendations.push("Multiple frames detected - check cross-frame compatibility");
  }

  if (existingContainers.length === 0 && allFormElements.length > 0) {
    recommendations.push("Run detectFormLikeContainers() to register form containers");
  }

  if (radioElements.length > 0 && ungroupedRadios.length > 0) {
    recommendations.push("Some radio buttons lack name attributes - grouping may not work optimally");
  }

  if (selectElements.length > 0) {
    recommendations.push(`${selectElements.length} select elements detected - ensure proper option detection`);
  }

  if (recommendations.length === 0) {
    console.log(`   ✅ System appears to be working correctly with enhanced grouping`);
  } else {
    recommendations.forEach(rec => console.log(`   💡 ${rec}`));
  }

  console.log(`=======================================================`);
  console.log(`🔍 ENHANCED DIAGNOSTIC COMPLETE`);
};

// Export for testing and debugging
export { getFormFieldsRobust };
