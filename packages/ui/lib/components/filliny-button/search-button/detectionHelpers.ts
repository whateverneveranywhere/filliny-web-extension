import { scoreFormContainerEnhanced } from "./containerDetection";
import { detectFields, getFormFieldsRobust } from "./field-types";
import { unifiedFieldRegistry } from "./unifiedFieldDetection";

// --- Frame Document Utilities ---
interface DocumentWithObserver extends Document {
  __fillinyFrameObserver?: MutationObserver;
}

// Callback type for notifying about new forms
export type FormDetectionCallback = (doc: Document) => void;

// Universal dynamic content detection system
interface DynamicContentDetector {
  observer: MutationObserver;
  confidence: number;
  lastDetectionTime: number;
  stableStateTimeout: number;
  onStableCallback?: () => void;
}

// Global registry for dynamic content detection
const dynamicDetectors = new Map<Document, DynamicContentDetector>();

// API response monitoring registry
const apiResponseMonitors = new Map<Document, APIResponseMonitor>();

// Universal patterns that indicate form content loading
const FORM_LOADING_INDICATORS = [
  // Loading states
  '[class*="loading"]',
  '[class*="spinner"]',
  '[class*="skeleton"]',
  '[aria-busy="true"]',
  '[data-loading="true"]',
  // Placeholder states
  '[class*="placeholder"]',
  '[class*="empty"]',
  '[class*="pending"]',
  // Progressive enhancement
  '[class*="progressive"]',
  '[class*="lazy"]',
  "[data-defer]",
];

// API response monitoring interface
interface APIResponseMonitor {
  originalFetch: typeof fetch;
  originalXHROpen: typeof XMLHttpRequest.prototype.open;
  interceptedResponses: Map<string, unknown>;
  formDefinitionPatterns: RegExp[];
  onFormDefinitionLoaded?: (data: unknown) => void;
}

// Patterns that indicate form definition API responses
const FORM_DEFINITION_API_PATTERNS = [
  /\/api\/.*forms?/i,
  /\/api\/.*fields?/i,
  /\/api\/.*application/i,
  /\/api\/.*schema/i,
  /\/forms?\/.*definition/i,
  /\/forms?\/.*config/i,
  /\/jobs?\/.*form/i,
  /\/jobs?\/.*application/i,
  /greenhouse.*application/i,
  /ashby.*form/i,
  /smartrecruiters.*form/i,
  /personio.*form/i,
  /\.json.*form/i,
  /form.*\.json/i,
];

// Universal patterns that indicate form content is ready
const FORM_READY_INDICATORS = [
  // Interactive elements
  'input:not([type="hidden"])',
  "select",
  "textarea",
  "button:not([disabled])",
  // ARIA form elements
  '[role="textbox"]',
  '[role="combobox"]',
  '[role="checkbox"]',
  '[role="radio"]',
  // Custom interactive elements
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
];

export const getAllFrameDocuments = (onNewFrameLoaded?: FormDetectionCallback): Document[] => {
  const docs: Document[] = [document];
  const processedFrames = new Set<string>();
  const maxRetries = 3;
  const retryDelay = 500;

  // Start dynamic content detection for the main document
  initializeDynamicContentDetection(document, onNewFrameLoaded);

  // Start API response monitoring for the main document
  initializeAPIResponseMonitoring(document, () => {
    console.log("🔄 Form definition API detected, triggering form detection");
    if (onNewFrameLoaded) {
      onNewFrameLoaded(document);
    }
  });

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

            // Initialize API monitoring for this iframe too
            initializeAPIResponseMonitoring(iframeDoc, () => {
              console.log("🔄 Form definition API detected in iframe, triggering form detection");
              if (onNewFrameLoaded) {
                onNewFrameLoaded(iframeDoc);
              }
            });

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

                  // Initialize API monitoring for this iframe too
                  initializeAPIResponseMonitoring(iframeDoc, () => {
                    console.log("🔄 Form definition API detected in iframe, triggering form detection");
                    if (onNewFrameLoaded) {
                      onNewFrameLoaded(iframeDoc);
                    }
                  });

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
 * Gets all form containers from the unified registry.
 * This avoids re-running detection and ensures consistency.
 */
export const getAllFormContainersFromRegistry = (): HTMLElement[] => unifiedFieldRegistry.getRegisteredContainers();

/**
 * Progressive detection strategy with multiple passes and intelligent timing
 */
async function performProgressiveDetection(documents: Document[]): Promise<HTMLElement[]> {
  console.log("🔄 Starting progressive form detection strategy...");

  // Remove unused variable
  // const allCandidates: FormCandidate[] = [];
  const detectionPasses = [
    { name: "immediate", delay: 0, confidence: 0.8 },
    { name: "fast", delay: 500, confidence: 0.7 },
    { name: "medium", delay: 1500, confidence: 0.6 },
    { name: "thorough", delay: 3000, confidence: 0.5 },
    { name: "final", delay: 5000, confidence: 0.4 },
  ];

  let bestResults: HTMLElement[] = [];
  let bestScore = 0;

  for (const pass of detectionPasses) {
    console.log(`🔍 Detection pass: ${pass.name} (delay: ${pass.delay}ms, confidence: ${pass.confidence})`);

    // Wait for the specified delay
    if (pass.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, pass.delay));
    }

    // Check if API responses have been received
    const hasAPIData = documents.some(doc => hasFormDefinitionAPIsLoaded(doc));
    if (hasAPIData) {
      console.log("📡 API data detected, proceeding with enhanced detection");
    }

    // Wait for content stability for this pass
    await waitForContentStability(documents, Math.min(2000, pass.delay + 1000));

    // Perform detection for this pass
    const passCandidates = await performSingleDetectionPass(documents, pass.confidence);

    // Calculate overall score for this pass
    const passScore = calculatePassScore(passCandidates);
    console.log(`📊 Pass ${pass.name} found ${passCandidates.length} containers, score: ${passScore}`);

    // If this pass found significantly better results, use them
    if (passScore > bestScore + 10 || passCandidates.length > bestResults.length * 1.5) {
      bestResults = passCandidates.map(c => c.element);
      bestScore = passScore;
      console.log(`✅ New best results from ${pass.name} pass: ${bestResults.length} containers`);
    }

    // Early termination conditions
    if (shouldTerminateEarly(passCandidates, pass, hasAPIData)) {
      console.log(`🎯 Early termination after ${pass.name} pass`);
      break;
    }
  }

  console.log(`🏁 Progressive detection completed. Final result: ${bestResults.length} containers`);
  return bestResults;
}

/**
 * Perform a single detection pass with specified confidence threshold
 */
async function performSingleDetectionPass(
  documents: Document[],
  confidenceThreshold: number,
): Promise<FormCandidate[]> {
  const candidates: FormCandidate[] = [];

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

            // Apply confidence threshold
            if (score >= confidenceThreshold * 100) {
              console.log(`Explicit container: ${container.tagName}. - Score: ${score}, Fields: ${fields.length}`);

              candidates.push({
                element: container,
                score,
                fieldCount: fields.length,
                reasons,
              });
            }
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

            // Apply confidence threshold for implicit containers (slightly higher bar)
            if (score >= Math.max(50, confidenceThreshold * 120)) {
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

  return sortedCandidates.slice(0, 10); // Return top 10 candidates
}

/**
 * Calculate overall score for a detection pass
 */
function calculatePassScore(candidates: FormCandidate[]): number {
  if (candidates.length === 0) return 0;

  const totalScore = candidates.reduce((sum, candidate) => sum + candidate.score, 0);
  const avgScore = totalScore / candidates.length;
  const fieldCount = candidates.reduce((sum, candidate) => sum + candidate.fieldCount, 0);

  // Combine average score, field count, and number of containers
  return avgScore + fieldCount * 2 + candidates.length * 5;
}

/**
 * Determine if we should terminate progressive detection early
 */
function shouldTerminateEarly(
  candidates: FormCandidate[],
  pass: { name: string; delay: number; confidence: number },
  hasAPIData: boolean,
): boolean {
  // If we have API data and found good results, we can terminate early
  if (hasAPIData && candidates.length > 0 && pass.name !== "immediate") {
    const avgScore = candidates.reduce((sum, c) => sum + c.score, 0) / candidates.length;
    if (avgScore > 70) {
      return true;
    }
  }

  // If we found many high-quality containers, we can terminate
  if (candidates.length >= 5) {
    const highQualityCount = candidates.filter(c => c.score > 80).length;
    if (highQualityCount >= 3) {
      return true;
    }
  }

  // If we're past the medium pass and have decent results, consider terminating
  if (pass.name === "thorough" && candidates.length >= 2) {
    const avgScore = candidates.reduce((sum, c) => sum + c.score, 0) / candidates.length;
    if (avgScore > 60) {
      return true;
    }
  }

  return false;
}

/**
 * Enhanced form container detection with improved scoring for group detection
 * Now includes universal dynamic content detection and progressive strategy
 */
export const detectFormLikeContainers = async (): Promise<HTMLElement[]> => {
  console.log("Starting enhanced form container detection with progressive strategy...");

  const documents = getAllFrameDocuments();

  // Use progressive detection strategy
  const progressiveResults = await performProgressiveDetection(documents);

  console.log("🎯 Final form container candidates:", progressiveResults.length);
  return progressiveResults;
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

// Remove unused function
// function showCrossOriginIframeWarning() {
//   console.warn("🚨 Filliny detected it's running inside a cross-origin iframe. Form detection may be limited.");
// }

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

/**
 * Initialize universal dynamic content detection for a document
 */
function initializeDynamicContentDetection(doc: Document, onNewFormLoaded?: FormDetectionCallback): void {
  // Skip if already initialized
  if (dynamicDetectors.has(doc)) {
    return;
  }

  let stableStateTimeout: number;
  let lastMutationTime = Date.now();
  const STABILITY_THRESHOLD = 1000; // ms of no mutations = stable

  const detector: DynamicContentDetector = {
    observer: new MutationObserver(mutations => {
      const now = Date.now();
      lastMutationTime = now;
      detector.lastDetectionTime = now;

      // Clear existing stability timeout
      if (stableStateTimeout) {
        clearTimeout(stableStateTimeout);
      }

      // Enhanced form content change detection
      const hasFormRelevantChanges = mutations.some(mutation => {
        if (mutation.type === "childList") {
          const addedNodes = Array.from(mutation.addedNodes);
          const removedNodes = Array.from(mutation.removedNodes);

          // Check for form-related additions with enhanced detection
          const hasFormAdditions = addedNodes.some(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;

              // Direct form field detection
              const isFormField = FORM_READY_INDICATORS.some(selector => {
                try {
                  return element.matches?.(selector) || element.querySelector?.(selector);
                } catch {
                  return false;
                }
              });

              if (isFormField) return true;

              // Check for custom component patterns
              const isCustomFormComponent = detectCustomFormComponent(element);
              if (isCustomFormComponent) return true;

              // Check for React/Vue component mounting patterns
              const isFrameworkComponent = detectFrameworkFormComponent(element);
              if (isFrameworkComponent) return true;

              // Check for job application specific patterns
              const isJobApplicationElement = detectJobApplicationElement(element);
              if (isJobApplicationElement) return true;

              return false;
            }
            return false;
          });

          // Enhanced loading indicator removal detection
          const hasLoadingRemovals = removedNodes.some(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;

              // Standard loading indicators
              const isLoadingIndicator = FORM_LOADING_INDICATORS.some(selector => {
                try {
                  return element.matches?.(selector);
                } catch {
                  return false;
                }
              });

              if (isLoadingIndicator) return true;

              // Job application specific loading patterns
              const isJobLoadingPattern = [
                '[class*="skeleton"]',
                '[class*="shimmer"]',
                '[class*="placeholder"]',
                '[data-testid*="loading"]',
                '[aria-label*="loading"]',
                '[aria-label*="Loading"]',
              ].some(selector => {
                try {
                  return element.matches?.(selector);
                } catch {
                  return false;
                }
              });

              return isJobLoadingPattern;
            }
            return false;
          });

          // Check for significant DOM restructuring (common in SPAs)
          const hasStructuralChanges = addedNodes.length > 5 || removedNodes.length > 5;
          const hasContainerChanges = addedNodes.some(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              return ["DIV", "SECTION", "FORM", "FIELDSET"].includes(element.tagName);
            }
            return false;
          });

          return hasFormAdditions || hasLoadingRemovals || (hasStructuralChanges && hasContainerChanges);
        }

        // Enhanced attribute change detection
        if (mutation.type === "attributes") {
          const target = mutation.target as Element;
          const attributeName = mutation.attributeName;

          // Standard readiness indicators
          if (attributeName === "aria-busy" && target.getAttribute("aria-busy") === "false") {
            return true;
          }

          if (attributeName === "data-loading" && target.getAttribute("data-loading") === "false") {
            return true;
          }

          // Disabled -> enabled transitions
          if (attributeName === "disabled" && !target.hasAttribute("disabled")) {
            return true;
          }

          // Class changes that might indicate form readiness
          if (attributeName === "class") {
            const newClasses = target.getAttribute("class") || "";
            const hasReadyClass = ["loaded", "ready", "initialized", "rendered"].some(cls => newClasses.includes(cls));
            const removedLoadingClass = ["loading", "skeleton", "pending"].some(cls => !newClasses.includes(cls));

            if (hasReadyClass || removedLoadingClass) {
              return true;
            }
          }

          // Style changes that might indicate visibility
          if (attributeName === "style") {
            const style = target.getAttribute("style") || "";
            const becameVisible = !style.includes("display: none") && !style.includes("visibility: hidden");
            if (becameVisible) {
              return true;
            }
          }

          // Data attribute changes that might indicate form state
          if (attributeName?.startsWith("data-")) {
            const dataValue = target.getAttribute(attributeName);
            if (attributeName.includes("state") && dataValue === "ready") {
              return true;
            }
            if (attributeName.includes("initialized") && dataValue === "true") {
              return true;
            }
          }
        }

        return false;
      });

      if (hasFormRelevantChanges) {
        detector.confidence = Math.min(1.0, detector.confidence + 0.1);
        console.log(`📈 Dynamic content detected, confidence: ${detector.confidence.toFixed(2)}`);
      }

      // Set new stability timeout
      stableStateTimeout = window.setTimeout(() => {
        if (Date.now() - lastMutationTime >= STABILITY_THRESHOLD) {
          console.log(`🎯 Content stable for ${STABILITY_THRESHOLD}ms, triggering form detection`);
          detector.onStableCallback?.();
          if (onNewFormLoaded) {
            onNewFormLoaded(doc);
          }
        }
      }, STABILITY_THRESHOLD);
    }),
    confidence: 0.5,
    lastDetectionTime: Date.now(),
    stableStateTimeout: 0,
    onStableCallback: undefined,
  };

  // Start observing
  detector.observer.observe(doc, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-busy", "data-loading", "disabled", "class"],
  });

  dynamicDetectors.set(doc, detector);

  console.log(`🔍 Dynamic content detection initialized for ${doc.location?.href || "document"}`);
}

/**
 * Wait for content to stabilize across all documents
 */
async function waitForContentStability(documents: Document[], maxWaitTime = 5000): Promise<void> {
  const startTime = Date.now();
  const checkInterval = 200;

  return new Promise(resolve => {
    const checkStability = () => {
      const now = Date.now();

      // Check if we've exceeded max wait time
      if (now - startTime > maxWaitTime) {
        console.log(`⏱️ Content stability timeout reached (${maxWaitTime}ms)`);
        resolve();
        return;
      }

      // Check if all documents are stable
      const allStable = documents.every(doc => {
        const detector = dynamicDetectors.get(doc);
        if (!detector) return true; // No detector = assume stable

        const timeSinceLastMutation = now - detector.lastDetectionTime;
        return timeSinceLastMutation > 1000; // 1 second of stability
      });

      if (allStable) {
        console.log(`✅ All documents stable after ${now - startTime}ms`);
        resolve();
      } else {
        setTimeout(checkStability, checkInterval);
      }
    };

    checkStability();
  });
}

/**
 * Enhanced form container detection with universal behavioral analysis
 */
export const detectUniversalFormContainers = async (): Promise<HTMLElement[]> => {
  console.log("🔍 Starting universal form container detection...");

  const candidates: FormCandidate[] = [];
  const documents = getAllFrameDocuments();

  for (const doc of documents) {
    try {
      // Strategy 1: Semantic analysis - look for form-like structures
      const semanticContainers = await detectSemanticFormContainers(doc);
      candidates.push(...semanticContainers);

      // Strategy 2: Behavioral analysis - look for interactive patterns
      const behavioralContainers = await detectBehavioralFormContainers(doc);
      candidates.push(...behavioralContainers);

      // Strategy 3: Visual analysis - look for form-like layouts
      const visualContainers = await detectVisualFormContainers(doc);
      candidates.push(...visualContainers);
    } catch (error) {
      console.error(`❌ Error in universal form detection for document:`, error);
    }
  }

  // Deduplicate and sort by confidence
  const uniqueCandidates = Array.from(new Map(candidates.map(c => [c.element, c])).values()).sort(
    (a, b) => b.score - a.score,
  );

  console.log(`🎯 Universal detection found ${uniqueCandidates.length} form containers`);

  return uniqueCandidates.slice(0, 20).map(c => c.element); // Return top 20
};

/**
 * Detect form containers using semantic analysis
 */
async function detectSemanticFormContainers(doc: Document): Promise<FormCandidate[]> {
  const candidates: FormCandidate[] = [];

  // Look for elements with form-related semantic meaning
  const semanticSelectors = [
    "form",
    "fieldset",
    '[role="form"]',
    '[role="group"]',
    '[role="region"][aria-labelledby]',
    '[role="region"][aria-label]',
    // Elements with form-indicating attributes
    "[autocomplete]",
    "[novalidate]",
    "[accept-charset]",
    // Elements with form-like ARIA relationships
    "[aria-labelledby]",
    "[aria-describedby]",
  ];

  for (const selector of semanticSelectors) {
    try {
      const elements = Array.from(doc.querySelectorAll<HTMLElement>(selector));

      for (const element of elements) {
        const fields = getFormFieldsRobust(element);
        if (fields.length > 0) {
          const { score, reasons } = scoreFormContainerEnhanced(element, fields);
          candidates.push({
            element,
            score: score + 20, // Bonus for semantic meaning
            fieldCount: fields.length,
            reasons: ["semantic", ...reasons],
          });
        }
      }
    } catch (error) {
      console.debug(`Semantic selector failed: ${selector}`, error);
    }
  }

  return candidates;
}

/**
 * Detect form containers using behavioral analysis
 */
async function detectBehavioralFormContainers(doc: Document): Promise<FormCandidate[]> {
  const candidates: FormCandidate[] = [];

  // Look for containers with interactive behavior patterns
  const interactiveElements = Array.from(doc.querySelectorAll<HTMLElement>("*")).filter(el => {
    // Check for interactive indicators
    const hasInteractiveEvents = ["onchange", "oninput", "onsubmit", "onreset", "onfocus", "onblur", "onclick"].some(
      event => el.hasAttribute(event),
    );

    const hasInteractiveAttributes = ["tabindex", "contenteditable", "draggable"].some(attr => el.hasAttribute(attr));

    const hasFormRelatedClasses = el.className
      .toLowerCase()
      .match(/\b(form|input|field|control|widget|editor|picker)\b/);

    return hasInteractiveEvents || hasInteractiveAttributes || hasFormRelatedClasses;
  });

  // Group interactive elements by their containers
  const containerGroups = new Map<HTMLElement, HTMLElement[]>();

  for (const element of interactiveElements) {
    let container = element.parentElement;
    while (container && container !== doc.body) {
      if (!containerGroups.has(container)) {
        containerGroups.set(container, []);
      }
      containerGroups.get(container)!.push(element);
      container = container.parentElement;
    }
  }

  // Evaluate containers based on their interactive element density
  for (const [container, elements] of containerGroups) {
    if (elements.length >= 2) {
      // At least 2 interactive elements
      const fields = getFormFieldsRobust(container);
      if (fields.length > 0) {
        const { score, reasons } = scoreFormContainerEnhanced(container, fields);
        const behavioralScore = Math.min(30, elements.length * 5); // Bonus for interactive density

        candidates.push({
          element: container,
          score: score + behavioralScore,
          fieldCount: fields.length,
          reasons: ["behavioral", ...reasons],
        });
      }
    }
  }

  return candidates;
}

/**
 * Detect form containers using visual layout analysis
 */
async function detectVisualFormContainers(doc: Document): Promise<FormCandidate[]> {
  const candidates: FormCandidate[] = [];

  // Look for containers with form-like visual patterns
  const potentialContainers = Array.from(doc.querySelectorAll<HTMLElement>("div, section, article, main, aside, nav"));

  for (const container of potentialContainers) {
    try {
      const fields = getFormFieldsRobust(container);
      if (fields.length < 2) continue;

      // Analyze visual patterns
      const visualScore = analyzeVisualFormPattern(container, fields);
      if (visualScore > 0) {
        const { score, reasons } = scoreFormContainerEnhanced(container, fields);

        candidates.push({
          element: container,
          score: score + visualScore,
          fieldCount: fields.length,
          reasons: ["visual", ...reasons],
        });
      }
    } catch (error) {
      console.debug("Visual analysis error:", error);
    }
  }

  return candidates;
}

/**
 * Analyze visual patterns that suggest form-like layout
 */
function analyzeVisualFormPattern(_container: HTMLElement, fields: HTMLElement[]): number {
  let score = 0;

  try {
    // Check for vertical stacking (common form pattern)
    const positions = fields
      .map(field => {
        const rect = field.getBoundingClientRect();
        return { top: rect.top, left: rect.left, width: rect.width };
      })
      .filter(pos => pos.width > 0); // Filter out hidden fields

    if (positions.length < 2) return 0;

    // Sort by vertical position
    positions.sort((a, b) => a.top - b.top);

    // Check for consistent vertical spacing
    const verticalGaps = [];
    for (let i = 1; i < positions.length; i++) {
      verticalGaps.push(positions[i].top - positions[i - 1].top);
    }

    if (verticalGaps.length > 0) {
      const avgGap = verticalGaps.reduce((a, b) => a + b) / verticalGaps.length;
      const gapVariation = Math.sqrt(
        verticalGaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / verticalGaps.length,
      );

      // Consistent spacing indicates intentional form layout
      if (gapVariation < avgGap * 0.5) {
        score += 15;
      }
    }

    // Check for left alignment (common form pattern)
    const leftPositions = positions.map(pos => pos.left);
    const uniqueLeftPositions = [...new Set(leftPositions)];
    if (uniqueLeftPositions.length <= 2) {
      // Most fields align to 1-2 positions
      score += 10;
    }

    // Check for similar widths (common form pattern)
    const widths = positions.map(pos => pos.width);
    const avgWidth = widths.reduce((a, b) => a + b) / widths.length;
    const widthVariation = Math.sqrt(
      widths.reduce((sum, width) => sum + Math.pow(width - avgWidth, 2), 0) / widths.length,
    );

    if (widthVariation < avgWidth * 0.3) {
      // Similar widths
      score += 10;
    }
  } catch (error) {
    console.debug("Visual pattern analysis error:", error);
  }

  return score;
}

/**
 * Clean up dynamic content detection when no longer needed
 */
export function cleanupDynamicContentDetection(doc?: Document): void {
  if (doc) {
    const detector = dynamicDetectors.get(doc);
    if (detector) {
      detector.observer.disconnect();
      if (detector.stableStateTimeout) {
        clearTimeout(detector.stableStateTimeout);
      }
      dynamicDetectors.delete(doc);
    }

    // Also cleanup API monitoring for this document
    cleanupAPIResponseMonitoring(doc);
  } else {
    // Clean up all detectors
    for (const [document, detector] of dynamicDetectors) {
      detector.observer.disconnect();
      if (detector.stableStateTimeout) {
        clearTimeout(detector.stableStateTimeout);
      }
    }
    dynamicDetectors.clear();

    // Cleanup all API monitoring
    cleanupAPIResponseMonitoring();
  }
}

/**
 * Initialize API response monitoring for form definition detection
 */
export function initializeAPIResponseMonitoring(doc: Document, onFormDefinitionLoaded?: (data: unknown) => void): void {
  // Skip if already initialized
  if (apiResponseMonitors.has(doc)) {
    return;
  }

  const windowObj = doc.defaultView;
  if (!windowObj) return;

  // Store original methods
  const originalFetch = windowObj.fetch.bind(windowObj);
  const originalXHROpen = XMLHttpRequest.prototype.open;

  const monitor: APIResponseMonitor = {
    originalFetch,
    originalXHROpen,
    interceptedResponses: new Map(),
    formDefinitionPatterns: FORM_DEFINITION_API_PATTERNS,
    onFormDefinitionLoaded,
  };

  // Intercept fetch API
  windowObj.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    try {
      const response = await originalFetch(input, init);

      // Check if this might be a form definition response
      const isFormDefinitionAPI = monitor.formDefinitionPatterns.some(pattern => pattern.test(url));

      if (isFormDefinitionAPI && response.ok) {
        // Clone the response to avoid consuming the stream
        const clonedResponse = response.clone();

        try {
          const data = await clonedResponse.json();
          console.log(`🔍 Detected form definition API response from: ${url}`);

          // Store the response data
          monitor.interceptedResponses.set(url, data);

          // Trigger form detection after a short delay to allow DOM updates
          setTimeout(() => {
            console.log(`📡 Processing form definition data from ${url}`);
            monitor.onFormDefinitionLoaded?.(data);
          }, 100);
        } catch (parseError) {
          console.debug("Failed to parse potential form definition response:", parseError);
        }
      }

      return response;
    } catch (error) {
      console.debug("Fetch interceptor error:", error);
      return originalFetch(input, init);
    }
  };

  // Intercept XMLHttpRequest
  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async?: boolean,
    user?: string | null,
    password?: string | null,
  ) {
    const urlString = typeof url === "string" ? url : url.href;
    const isFormDefinitionAPI = monitor.formDefinitionPatterns.some(pattern => pattern.test(urlString));

    if (isFormDefinitionAPI) {
      // Store reference to track this request
      const originalOnLoad = this.onload;
      const originalOnReadyStateChange = this.onreadystatechange;

      this.onreadystatechange = function () {
        if (this.readyState === 4 && this.status >= 200 && this.status < 300) {
          try {
            const responseData = JSON.parse(this.responseText);
            console.log(`🔍 Detected form definition XHR response from: ${urlString}`);

            monitor.interceptedResponses.set(urlString, responseData);

            setTimeout(() => {
              console.log(`📡 Processing form definition data from ${urlString}`);
              monitor.onFormDefinitionLoaded?.(responseData);
            }, 100);
          } catch (parseError) {
            console.debug("Failed to parse XHR form definition response:", parseError);
          }
        }

        // Call original handler if it exists
        if (originalOnReadyStateChange) {
          originalOnReadyStateChange.call(this, null as unknown as Event);
        }
      };

      // Also handle onload for compatibility
      this.onload = function () {
        // onreadystatechange will handle the response parsing
        if (originalOnLoad) {
          originalOnLoad.call(this, null as unknown as ProgressEvent<EventTarget>);
        }
      };
    }

    return originalXHROpen.call(this, method, url, async ?? true, user ?? null, password ?? null);
  };

  apiResponseMonitors.set(doc, monitor);
  console.log(`📡 API response monitoring initialized for ${doc.location?.href || "document"}`);
}

/**
 * Cleanup API response monitoring
 */
function cleanupAPIResponseMonitoring(doc?: Document): void {
  if (doc) {
    const monitor = apiResponseMonitors.get(doc);
    if (monitor) {
      const windowObj = doc.defaultView;
      if (windowObj) {
        // Restore original methods
        windowObj.fetch = monitor.originalFetch;
        XMLHttpRequest.prototype.open = monitor.originalXHROpen;
      }
      apiResponseMonitors.delete(doc);
    }
  } else {
    // Cleanup all monitoring
    for (const [doc, monitor] of apiResponseMonitors) {
      const windowObj = doc.defaultView;
      if (windowObj) {
        windowObj.fetch = monitor.originalFetch;
        XMLHttpRequest.prototype.open = monitor.originalXHROpen;
      }
    }
    apiResponseMonitors.clear();
  }
}

/**
 * Check if form definition APIs have been detected and processed
 */
export function hasFormDefinitionAPIsLoaded(doc: Document): boolean {
  const monitor = apiResponseMonitors.get(doc);
  return monitor ? monitor.interceptedResponses.size > 0 : false;
}

/**
 * Get intercepted form definition data
 */
export function getInterceptedFormDefinitions(doc: Document): Map<string, unknown> {
  const monitor = apiResponseMonitors.get(doc);
  return monitor?.interceptedResponses || new Map();
}

/**
 * Detect custom form components that might not be standard HTML elements
 */
function detectCustomFormComponent(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  const className = element.className?.toLowerCase() || "";
  const dataAttrs = Array.from(element.attributes)
    .filter(attr => attr.name.startsWith("data-"))
    .map(attr => `${attr.name}=${attr.value}`)
    .join(" ")
    .toLowerCase();

  // Custom component patterns
  const customComponentPatterns = [
    // Generic form component patterns
    /input-component|field-component|form-element/,
    /custom-input|custom-select|custom-field/,
    /ui-input|ui-field|ui-control/,

    // Framework-specific patterns
    /react-select|vue-select|ng-select/,
    /material-input|material-field|mui-/,
    /ant-input|ant-select|antd-/,
    /chakra-input|chakra-field/,

    // Job application specific patterns
    /application-field|job-field|candidate-input/,
    /resume-upload|cv-upload|portfolio-field/,
    /personal-info|contact-info|experience-field/,

    // File upload patterns
    /file-drop|dropzone|upload-area/,
    /attach-file|document-upload|file-picker/,
  ];

  const allText = `${tagName} ${className} ${dataAttrs}`;
  return customComponentPatterns.some(pattern => pattern.test(allText));
}

/**
 * Detect React/Vue/Angular component mounting patterns
 */
function detectFrameworkFormComponent(element: Element): boolean {
  // Check for React component patterns
  const hasReactProps =
    element.hasAttribute("data-reactid") ||
    element.className?.includes("react-") ||
    element.querySelector("[data-reactroot]") !== null;

  // Check for Vue component patterns
  const hasVueProps =
    element.hasAttribute("v-model") ||
    element.hasAttribute("v-bind") ||
    element.className?.includes("vue-") ||
    element.hasAttribute("data-v-");

  // Check for Angular component patterns
  const hasAngularProps =
    element.hasAttribute("ng-model") ||
    element.hasAttribute("[(ngModel)]") ||
    element.hasAttribute("formControlName") ||
    element.className?.includes("ng-");

  // Check for modern framework indicators
  const hasModernFramework =
    element.hasAttribute("data-testid") ||
    element.hasAttribute("data-cy") ||
    element.hasAttribute("data-automation-id");

  // Check if element contains form-like attributes
  const hasFormAttributes =
    element.hasAttribute("name") ||
    element.hasAttribute("placeholder") ||
    element.hasAttribute("required") ||
    element.hasAttribute("aria-label") ||
    element.hasAttribute("aria-required");

  return (hasReactProps || hasVueProps || hasAngularProps || hasModernFramework) && hasFormAttributes;
}

/**
 * Detect job application specific form elements
 */
function detectJobApplicationElement(element: Element): boolean {
  const textContent = element.textContent?.toLowerCase() || "";
  const className = element.className?.toLowerCase() || "";
  const id = element.id?.toLowerCase() || "";
  const ariaLabel = element.getAttribute("aria-label")?.toLowerCase() || "";

  const allText = `${textContent} ${className} ${id} ${ariaLabel}`;

  // Job application specific patterns
  const jobPatterns = [
    // Personal information
    /first.?name|last.?name|full.?name|given.?name|family.?name/,
    /email|phone|telephone|mobile|address/,
    /city|state|country|zip|postal|region/,

    // Professional information
    /resume|cv|portfolio|linkedin|website|github/,
    /experience|education|skills|qualification/,
    /position|role|job.?title|current.?title/,
    /company|organization|employer|workplace/,
    /salary|compensation|rate|availability/,

    // Application specific
    /cover.?letter|motivation|why.?interested/,
    /references|recommendation|contact.?person/,
    /start.?date|notice.?period|available/,
    /work.?authorization|visa|eligible/,

    // Form sections
    /personal.?info|contact.?info|professional.?info/,
    /application.?form|candidate.?info|job.?application/,
    /upload.?resume|attach.?cv|document.?upload/,
  ];

  return jobPatterns.some(pattern => pattern.test(allText));
}
