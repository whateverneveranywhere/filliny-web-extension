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
  console.log("[Filliny] Documents to scan:", documents.length);
  for (const doc of documents) {
    try {
      let bestContainer: HTMLElement | null = null;
      let maxFieldCount = 0;
      const formContainers = Array.from(doc.querySelectorAll<HTMLElement>(formContainerSelectors.join(",")));
      console.log("[Filliny] Found form-like containers:", formContainers.length, formContainers);
      if (formContainers.length > 0) {
        for (const container of formContainers) {
          const fields = getFormFields(container);
          console.log("[Filliny] Fields in container:", fields.length, container);
          if (fields.length > maxFieldCount) {
            maxFieldCount = fields.length;
            bestContainer = container;
          }
        }
      }
      if (!bestContainer || maxFieldCount === 0) {
        const allFields = getFormFields(doc.body);
        console.log("[Filliny] Fallback: fields in body:", allFields.length);
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
            console.log("[Filliny] Shadow root", host, "selector", selector, "found", shadowForms.length);
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
  console.log("[Filliny] Final bestContainers:", bestContainers.length, bestContainers);
  return bestContainers;
};

// --- Re-export shared helpers for convenience ---
export { detectFields };

// --- Local Helper Definitions ---
// Returns all form-like fields within a container
function getFormFields(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  const all = Array.from(
    container.querySelectorAll(
      `input:not([type="hidden"]):not([type="submit"]), select, textarea, [role="textbox"], [role="combobox"], [role="spinbutton"], [contenteditable="true"], [data-filliny-field], [role="checkbox"], [role="switch"], [role="radio"]`,
    ),
  ).filter((el): el is HTMLElement => el instanceof HTMLElement);
  console.log("[Filliny] getFormFields found", all.length, "fields in", container);
  return all.filter(el => {
    const style = window.getComputedStyle(el);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      !el.hasAttribute("disabled") &&
      !el.hasAttribute("readonly")
    );
  });
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
