import { detectFields } from "./field-types";

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
      // Direct access attempts
      if (iframe.contentDocument) return iframe.contentDocument;
      if (iframe.contentWindow?.document) return iframe.contentWindow.document;

      // Handle loading frames
      if (retryCount < maxRetries && iframe.src) {
        if (!iframe.contentDocument) {
          console.debug("Frame still loading, will retry:", iframe.src);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return tryGetIframeDoc(iframe, retryCount + 1);
        }
      }

      // Special handling for same-origin frames
      if (iframe.src) {
        const isSameOrigin =
          iframe.src.startsWith(window.location.origin) || iframe.src.startsWith("/") || iframe.src === "about:blank";

        if (isSameOrigin && iframe.contentDocument) {
          console.debug("Accessing same-origin frame:", iframe.src);
          return iframe.contentDocument;
        }
      }
    } catch (e) {
      const error = e as Error;
      console.debug("Frame access restricted:", {
        src: iframe.src,
        error: error.message,
        isSameOrigin: iframe.src.startsWith(window.location.origin),
      });
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

  // Initialize processing
  const init = async () => {
    try {
      await processIframes(document);
      observeNewFrames(document as DocumentWithObserver);

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

// --- Form Container Detection ---
export const detectFormLikeContainers = async (): Promise<HTMLElement[]> => {
  const bestContainers: HTMLElement[] = [];
  const documents = getAllFrameDocuments();
  const formContainerSelectors = [
    "form",
    "fieldset",
    '[role="form"]',
    '[class*="form"]',
    '[class*="survey"]',
    '[class*="questionnaire"]',
    '[id*="form"]',
    '[id*="survey"]',
    ".freebirdFormviewerViewFormCard",
    ".freebirdFormviewerViewFormContent",
    ".freebirdFormviewerViewItemsItemItem",
    ".form-container",
    ".input-container",
    ".field-container",
    ".form-section",
    ".form-group",
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
      const formContainers = Array.from(doc.querySelectorAll<HTMLElement>(formContainerSelectors.join(",")));
      if (formContainers.length > 0) {
        for (const container of formContainers) {
          const fields = getFormFields(container);
          if (fields.length > maxFieldCount) {
            maxFieldCount = fields.length;
            bestContainer = container;
          }
        }
      }
      if (!bestContainer || maxFieldCount === 0) {
        const allFields = getFormFields(doc.body);
        if (allFields.length >= 1) {
          const fieldParentMap = new Map<HTMLElement, HTMLElement[]>();
          allFields.forEach((field: HTMLElement) => {
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
          for (const [container, fields] of fieldParentMap.entries()) {
            if (fields.length > maxFieldCount) {
              maxFieldCount = fields.length;
              bestContainer = container;
            }
          }
        }
      }
      const shadowRootElements = findAllShadowRoots(doc.body);
      for (const host of shadowRootElements) {
        if (host.shadowRoot) {
          for (const selector of formContainerSelectors) {
            const shadowForms = queryShadowRoot(host.shadowRoot, selector);
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
      const isGoogleForm =
        window.location.hostname.includes("docs.google.com") && window.location.pathname.includes("/forms/");
      if (isGoogleForm) {
        const googleFormContainer = doc.querySelector(".freebirdFormviewerViewFormCard");
        if (googleFormContainer) {
          const fields = getFormFields(googleFormContainer as HTMLElement);
          if (fields.length > maxFieldCount) {
            maxFieldCount = fields.length;
            bestContainer = googleFormContainer as HTMLElement;
          }
        }
      }
      if (bestContainer && maxFieldCount > 0) {
        let outerContainer = bestContainer;
        let current = bestContainer.parentElement;
        while (current && current !== doc.body) {
          const parentFields = getFormFields(current);
          if (parentFields.length === maxFieldCount) {
            outerContainer = current;
            current = current.parentElement;
          } else {
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
  if (bestContainers.length > 1) {
    const containerWithMostFields = bestContainers.reduce((best, current) => {
      const bestFields = getFormFields(best).length;
      const currentFields = getFormFields(current).length;
      return currentFields > bestFields ? current : best;
    }, bestContainers[0]);
    bestContainers.forEach(container => {
      if (container !== containerWithMostFields) {
        container.removeAttribute("data-filliny-form-container");
      }
    });
    return [containerWithMostFields];
  }
  return bestContainers;
};

// --- Re-export shared helpers for convenience ---
export { detectFields };

// --- Local Helper Definitions ---
// --- Enhanced Recursive Field Detection ---
/**
 * Recursively finds all form-like fields within a container, including shadow roots and custom elements.
 * @param container HTMLElement or ShadowRoot to search within
 * @returns HTMLElement[]
 */
function getFormFieldsDeep(container: HTMLElement | ShadowRoot | null): HTMLElement[] {
  if (!container) return [];
  const fieldSelectors = [
    // Standard fields
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
    '[role="radio"]',
    // Common custom field selectors (expand as needed)
    '[class*="ashby-"]',
    '[data-qa="input"]',
    '[data-qa="select"]',
    '[class*="custom-field"]',
    '[class*="form-field"]',
    '[class*="input-field"]',
    '[class*="select-field"]',
    '[class*="field-input"]',
    '[class*="field-select"]',
  ];
  // Find all matching elements in this container
  let fields: HTMLElement[] = Array.from(container.querySelectorAll(fieldSelectors.join(","))).filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  );

  // Filter out hidden, disabled, or readonly fields
  fields = fields.filter(el => {
    const style = window.getComputedStyle(el);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      !el.hasAttribute("disabled") &&
      !el.hasAttribute("readonly")
    );
  });

  // Recursively search shadow roots of children
  const children = (
    container instanceof ShadowRoot ? Array.from(container.children) : Array.from(container.childNodes)
  ) as Element[];
  for (const child of children) {
    // If the child has a shadow root, search inside it
    if ((child as HTMLElement).shadowRoot) {
      fields.push(...getFormFieldsDeep((child as HTMLElement).shadowRoot!));
    }
    // If the child is a custom element (tag includes a dash), search inside its shadow root if present
    if (child.tagName && child.tagName.includes("-") && (child as HTMLElement).shadowRoot) {
      fields.push(...getFormFieldsDeep((child as HTMLElement).shadowRoot!));
    }
  }
  return fields;
}

// Returns all form-like fields within a container (now using the deep version)
function getFormFields(container: HTMLElement | null): HTMLElement[] {
  return getFormFieldsDeep(container);
}

// Recursively finds all elements in the tree with a shadowRoot
function findAllShadowRoots(root: HTMLElement | null): HTMLElement[] {
  const hosts: HTMLElement[] = [];
  if (!root) return hosts;
  const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let currentNode = treeWalker.currentNode as HTMLElement | null;
  while (currentNode) {
    if (currentNode.shadowRoot) hosts.push(currentNode);
    currentNode = treeWalker.nextNode() as HTMLElement | null;
  }
  return hosts;
}

// Queries a shadow root for elements matching a selector
function queryShadowRoot(shadowRoot: ShadowRoot, selector: string): HTMLElement[] {
  return Array.from(shadowRoot.querySelectorAll(selector)).filter((el): el is HTMLElement => el instanceof HTMLElement);
}

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
