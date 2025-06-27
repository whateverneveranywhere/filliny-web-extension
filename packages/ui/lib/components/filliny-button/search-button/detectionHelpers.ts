import { scoreFormContainerEnhanced } from "./containerDetection";
import { detectFields, getFormFieldsRobust } from "./field-types";
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
      if (iframe.contentDocument) return iframe.contentDocument;
      if (iframe.contentWindow?.document) return iframe.contentWindow.document;

      // Handle loading frames with improved retry mechanism
      if (retryCount < maxRetries && iframe.src) {
        if (iframe.contentDocument === null) {
          console.debug(`Frame still loading, will retry (${retryCount + 1}/${maxRetries}):`, iframe.src);

          await new Promise(resolve => {
            const loadHandler = () => {
              iframe.removeEventListener("load", loadHandler);
              resolve(undefined);
            };
            iframe.addEventListener("load", loadHandler);
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

        const isSameOrigin =
          iframeUrl.origin === currentOrigin ||
          iframe.src.startsWith("/") ||
          iframe.src === "about:blank" ||
          iframe.src.startsWith("data:") ||
          iframe.src.startsWith("blob:");

        if (isSameOrigin) {
          console.debug("Accessing same-origin frame:", iframe.src);
          if (iframe.contentDocument) return iframe.contentDocument;
          if (iframe.contentWindow?.document) return iframe.contentWindow.document;

          if (iframe.src.startsWith("data:") || iframe.src.startsWith("blob:")) {
            await new Promise(resolve => setTimeout(resolve, 100));
            return iframe.contentDocument || iframe.contentWindow?.document || null;
          }
        } else {
          console.debug("Cross-origin frame detected, cannot access content:", iframe.src);
          iframe.setAttribute("data-filliny-cross-origin", "true");
          return null;
        }
      }

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

      if (error.message.includes("cross-origin") || error.message.includes("Permission denied")) {
        iframe.setAttribute("data-filliny-cross-origin", "true");
        return null;
      }

      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return tryGetIframeDoc(iframe, retryCount + 1);
      }
    }
    return null;
  };

  const processIframes = async (doc: Document) => {
    const iframes = Array.from(doc.getElementsByTagName("iframe"));
    for (const iframe of iframes) {
      const frameSrc = iframe.src || "about:blank";
      if (!processedFrames.has(frameSrc)) {
        processedFrames.add(frameSrc);
        iframe.addEventListener("load", async () => {
          const iframeDoc = await tryGetIframeDoc(iframe);
          if (iframeDoc && !docs.includes(iframeDoc)) {
            docs.push(iframeDoc);
            await processIframes(iframeDoc);
            observeNewFrames(iframeDoc as DocumentWithObserver);
            if (onNewFrameLoaded) onNewFrameLoaded(iframeDoc);
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
                if (iframeDoc && !docs.includes(iframeDoc)) {
                  docs.push(iframeDoc);
                  await processIframes(iframeDoc);
                  observeNewFrames(iframeDoc as DocumentWithObserver);
                  if (onNewFrameLoaded) onNewFrameLoaded(iframeDoc);
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

    observer.observe(doc, { childList: true, subtree: true });
    doc.__fillinyFrameObserver = observer;
  };

  const init = async () => {
    await processIframes(document);
    observeNewFrames(document as DocumentWithObserver);
  };

  init().catch(console.error);
  return docs;
};

// --- Form Container Detection ---

interface FormCandidate {
  element: HTMLElement;
  score: number;
  fieldCount: number;
  reasons: string[];
}

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

      // Strategy 1: Look for explicit form-related elements
      const explicitFormSelectors = [
        "form",
        "fieldset",
        '[role="form"]',
        "[data-form]",
        "[data-testid*='form']",
        "[data-cy*='form']",
        "[id*='form']",
        "[class*='form']",
      ];

      const explicitContainers: HTMLElement[] = [];
      for (const selector of explicitFormSelectors) {
        try {
          const elements = Array.from(doc.querySelectorAll<HTMLElement>(selector));
          explicitContainers.push(...elements);
        } catch (e) {
          console.debug(`Explicit form selector failed: ${selector}`, e);
        }
      }

      console.log(`Found ${explicitContainers.length} explicit form containers`);

      // Process explicit containers
      for (const container of explicitContainers) {
        try {
          const fields = getFormFieldsRobust(container);
          if (fields.length > 0) {
            const { score, reasons } = scoreFormContainerEnhanced(container, fields);
            console.log(`Explicit container: ${container.tagName}. - Score: ${score}, Fields: ${fields.length}`);

            candidates.push({
              element: container,
              score,
              fieldCount: fields.length,
              reasons,
            });
          }
        } catch (error) {
          console.debug("Error processing explicit container:", error);
        }
      }

      // Strategy 2: Look for implicit containers with form-like patterns
      const implicitContainers = Array.from(doc.querySelectorAll<HTMLElement>("div, section, main, article"));

      for (const container of implicitContainers) {
        try {
          const fields = getFormFieldsRobust(container);
          if (fields.length >= 2) {
            const { score, reasons } = scoreFormContainerEnhanced(container, fields);
            if (score > 50) {
              candidates.push({
                element: container,
                score,
                fieldCount: fields.length,
                reasons,
              });
            }
          }
        } catch (error) {
          console.debug("Error processing implicit container:", error);
        }
      }
    } catch (error) {
      console.error("Error in form detection for document:", error);
    }
  }

  // Sort candidates by score (descending) and filter duplicates
  const sortedCandidates = candidates
    .sort((a, b) => b.score - a.score)
    .filter(
      (candidate, index, array) =>
        // Remove duplicates - keep only the highest scoring version of each element
        array.findIndex(c => c.element === candidate.element) === index,
    );

  // Return top candidates
  const topCandidates = sortedCandidates.slice(0, 10);

  console.log("🎯 Final form container candidates:", topCandidates.length);

  return topCandidates.map(c => c.element);
};

// --- Re-export shared helpers for convenience ---
export { detectFields, unifiedFieldRegistry };

// --- Cross-origin handling ---
function isInsideCrossOriginIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function showCrossOriginIframeWarning() {
  console.warn("🚨 Filliny detected it's running inside a cross-origin iframe. Form detection may be limited.");
}

export function openCrossOriginIframeInNewTabAndAlert() {
  if (isInsideCrossOriginIframe()) {
    try {
      const currentUrl = window.location.href;
      window.open(currentUrl, "_blank");
      alert(
        "This page is embedded in a cross-origin iframe which limits Filliny's functionality. We've opened it in a new tab where Filliny can work properly.",
      );
    } catch (error) {
      console.error("Could not open page in new tab:", error);
    }
  }
}

// --- System Diagnostics ---
export const diagnoseFillinySystem = async (): Promise<void> => {
  console.group("🔍 Filliny System Diagnostics");

  try {
    console.log("Environment:", {
      userAgent: navigator.userAgent,
      url: window.location.href,
      isCrossOrigin: isInsideCrossOriginIframe(),
    });

    const documents = getAllFrameDocuments();
    console.log(`📄 Documents found: ${documents.length}`);

    for (const doc of documents) {
      const forms = Array.from(doc.querySelectorAll("form"));
      const inputs = Array.from(doc.querySelectorAll("input, select, textarea"));
      console.log(`Document ${doc.location?.href || "main"}: ${forms.length} forms, ${inputs.length} inputs`);
    }

    const containers = await detectFormLikeContainers();
    console.log(`🎯 Form containers detected: ${containers.length}`);
  } catch (error) {
    console.error("Diagnostic error:", error);
  }

  console.groupEnd();
};
