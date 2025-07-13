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
  // Enhanced patterns for modern job platforms
  /onlyfy.*application/i,
  /workday.*form/i,
  /bamboohr.*form/i,
  /lever.*application/i,
  /breezy.*form/i,
  /indeed.*apply/i,
  /linkedin.*application/i,
  // Next.js and React specific patterns
  /_next\/static.*form/i,
  /_next\/data.*application/i,
  /api\/trpc.*form/i,
  /graphql.*form/i,
  // Configuration and metadata patterns
  /config.*fields/i,
  /metadata.*form/i,
  /schema.*application/i,
  /definition.*fields/i,
  // Multi-step form patterns
  /steps?.*form/i,
  /wizard.*config/i,
  /flow.*definition/i,
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
 * Now includes universal dynamic content detection, progressive strategy, and multi-step form detection
 */
export const detectFormLikeContainers = async (): Promise<HTMLElement[]> => {
  console.log("Starting enhanced form container detection with progressive strategy...");

  const documents = getAllFrameDocuments();

  // Use progressive detection strategy
  const progressiveResults = await performProgressiveDetection(documents);

  // Enhanced detection for multi-step forms
  const multiStepContainers = await detectMultiStepFormContainers(documents);

  // Combine results and deduplicate
  const allContainers = [...progressiveResults, ...multiStepContainers];
  const uniqueContainers = Array.from(new Set(allContainers));

  console.log(
    `🎯 Final form container candidates: ${uniqueContainers.length} (${progressiveResults.length} progressive + ${multiStepContainers.length} multi-step)`,
  );
  return uniqueContainers;
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

          // Enhanced form definition data processing
          const processedData = processFormDefinitionData(data, url);

          // Store both raw and processed data
          monitor.interceptedResponses.set(url, { raw: data, processed: processedData });

          // Trigger form detection after a short delay to allow DOM updates
          setTimeout(() => {
            console.log(`📡 Processing form definition data from ${url}`);
            monitor.onFormDefinitionLoaded?.(processedData);
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

            // Enhanced form definition data processing
            const processedData = processFormDefinitionData(responseData, urlString);

            // Store both raw and processed data
            monitor.interceptedResponses.set(urlString, { raw: responseData, processed: processedData });

            setTimeout(() => {
              console.log(`📡 Processing form definition data from ${urlString}`);
              monitor.onFormDefinitionLoaded?.(processedData);
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

/**
 * Enhanced multi-step form detection
 * Detects forms with step-based navigation and handles them appropriately
 */
async function detectMultiStepFormContainers(documents: Document[]): Promise<HTMLElement[]> {
  console.log("🔍 Starting multi-step form detection...");

  const containers: HTMLElement[] = [];

  for (const doc of documents) {
    try {
      // Strategy 1: Look for explicit step navigation elements
      const stepNavigators = detectStepNavigationElements(doc);

      // Strategy 2: Look for step content containers
      const stepContainers = detectStepContentContainers(doc);

      // Strategy 3: Look for wizard/flow patterns
      const wizardContainers = detectWizardPatterns(doc);

      // Strategy 4: Look for progress indicators
      const progressContainers = detectProgressIndicators(doc);

      // Combine and deduplicate step-related containers
      const allStepContainers = [...stepNavigators, ...stepContainers, ...wizardContainers, ...progressContainers];

      // Find the best container for each step-based form
      const processedContainers = processMultiStepContainers(allStepContainers);
      containers.push(...processedContainers);
    } catch (error) {
      console.error("Error in multi-step form detection:", error);
    }
  }

  console.log(`📋 Multi-step detection found ${containers.length} containers`);
  return containers;
}

/**
 * Detect step navigation elements (prev/next buttons, step indicators)
 */
function detectStepNavigationElements(doc: Document): HTMLElement[] {
  const containers: HTMLElement[] = [];

  // Look for step navigation patterns
  const navigationSelectors = [
    // Button patterns
    'button[class*="next"], button[class*="prev"], button[class*="step"]',
    'button[class*="continue"], button[class*="back"]',
    '[class*="next-button"], [class*="prev-button"], [class*="step-button"]',

    // ARIA patterns
    '[role="button"][aria-label*="next"], [role="button"][aria-label*="previous"]',
    '[role="button"][aria-label*="step"], [role="button"][aria-label*="continue"]',

    // Generic navigation patterns
    '[class*="navigation"][class*="step"], [class*="step-nav"]',
    '[class*="wizard-nav"], [class*="form-nav"]',

    // Progress indicator patterns
    '[class*="progress"], [class*="stepper"], [class*="breadcrumb"]',
    '[role="progressbar"], [role="tablist"][class*="step"]',
  ];

  for (const selector of navigationSelectors) {
    try {
      const elements = Array.from(doc.querySelectorAll<HTMLElement>(selector));

      for (const element of elements) {
        // Find the container that likely contains the entire form
        const container = findMultiStepFormContainer(element);
        if (container && !containers.includes(container)) {
          containers.push(container);
          console.log(`📍 Found multi-step form via navigation: ${container.tagName}.${container.className}`);
        }
      }
    } catch (error) {
      console.debug(`Navigation selector failed: ${selector}`, error);
    }
  }

  return containers;
}

/**
 * Detect step content containers
 */
function detectStepContentContainers(doc: Document): HTMLElement[] {
  const containers: HTMLElement[] = [];

  // Look for step content patterns
  const stepContentSelectors = [
    '[class*="step-content"], [class*="step-body"], [class*="step-panel"]',
    '[class*="wizard-step"], [class*="form-step"]',
    '[role="tabpanel"][class*="step"], [class*="tab-pane"][class*="step"]',
    "[data-step], [data-step-id], [data-step-name]",
    '[id*="step"], [class*="step-"]:not([class*="stepper"])',
  ];

  for (const selector of stepContentSelectors) {
    try {
      const elements = Array.from(doc.querySelectorAll<HTMLElement>(selector));

      for (const element of elements) {
        // Check if this element contains form fields
        const fields = getFormFieldsRobust(element);
        if (fields.length > 0) {
          const container = findMultiStepFormContainer(element);
          if (container && !containers.includes(container)) {
            containers.push(container);
            console.log(`📍 Found multi-step form via step content: ${container.tagName}.${container.className}`);
          }
        }
      }
    } catch (error) {
      console.debug(`Step content selector failed: ${selector}`, error);
    }
  }

  return containers;
}

/**
 * Detect wizard/flow patterns
 */
function detectWizardPatterns(doc: Document): HTMLElement[] {
  const containers: HTMLElement[] = [];

  // Look for wizard/flow specific patterns
  const wizardSelectors = [
    '[class*="wizard"], [class*="flow"], [class*="multi-step"]',
    "[data-wizard], [data-flow], [data-multi-step]",
    '[role="application"][class*="form"]',
  ];

  for (const selector of wizardSelectors) {
    try {
      const elements = Array.from(doc.querySelectorAll<HTMLElement>(selector));

      for (const element of elements) {
        // Check if this element contains form fields or step navigation
        const fields = getFormFieldsRobust(element);
        const hasStepNavigation = element.querySelector('[class*="step"], [class*="next"], [class*="prev"]');

        if (fields.length > 0 || hasStepNavigation) {
          if (!containers.includes(element)) {
            containers.push(element);
            console.log(`📍 Found wizard/flow form: ${element.tagName}.${element.className}`);
          }
        }
      }
    } catch (error) {
      console.debug(`Wizard selector failed: ${selector}`, error);
    }
  }

  return containers;
}

/**
 * Detect progress indicators
 */
function detectProgressIndicators(doc: Document): HTMLElement[] {
  const containers: HTMLElement[] = [];

  // Look for progress indicator patterns
  const progressSelectors = [
    '[role="progressbar"]',
    '[class*="progress"][class*="step"], [class*="step-progress"]',
    '[class*="stepper"], [class*="breadcrumb"][class*="step"]',
    ".progress-bar, .progress-indicator",
  ];

  for (const selector of progressSelectors) {
    try {
      const elements = Array.from(doc.querySelectorAll<HTMLElement>(selector));

      for (const element of elements) {
        // Check if progress indicator shows multiple steps
        const stepTexts = element.textContent || "";
        const hasMultipleSteps =
          /step\s*\d+.*step\s*\d+/i.test(stepTexts) ||
          /\d+.*of.*\d+/i.test(stepTexts) ||
          element.querySelectorAll('[class*="step"], [data-step]').length > 1;

        if (hasMultipleSteps) {
          const container = findMultiStepFormContainer(element);
          if (container && !containers.includes(container)) {
            containers.push(container);
            console.log(`📍 Found multi-step form via progress indicator: ${container.tagName}.${container.className}`);
          }
        }
      }
    } catch (error) {
      console.debug(`Progress selector failed: ${selector}`, error);
    }
  }

  return containers;
}

/**
 * Find the appropriate container for a multi-step form
 */
function findMultiStepFormContainer(element: HTMLElement): HTMLElement | null {
  // Start from the element and traverse up to find the most appropriate container
  let current = element;
  let bestContainer: HTMLElement | null = null;
  let bestScore = 0;

  while (current && current !== document.body) {
    const score = scoreMultiStepContainer(current);

    if (score > bestScore) {
      bestScore = score;
      bestContainer = current;
    }

    current = current.parentElement!;
  }

  return bestContainer && bestScore > 10 ? bestContainer : null;
}

/**
 * Score a container for multi-step form likelihood
 */
function scoreMultiStepContainer(container: HTMLElement): number {
  let score = 0;

  // Check for form-related tags
  if (["FORM", "FIELDSET"].includes(container.tagName)) {
    score += 20;
  }

  // Check for semantic roles
  const role = container.getAttribute("role");
  if (role === "form" || role === "application" || role === "region") {
    score += 15;
  }

  // Check for multi-step related classes/attributes
  const className = container.className.toLowerCase();
  const hasMultiStepClass = [
    "wizard",
    "multi-step",
    "stepper",
    "flow",
    "steps",
    "form-wizard",
    "step-form",
    "application-form",
  ].some(cls => className.includes(cls));

  if (hasMultiStepClass) {
    score += 25;
  }

  // Check for step navigation elements inside
  const hasNavigation = container.querySelector(
    '[class*="next"], [class*="prev"], [class*="step-nav"], [class*="continue"], [class*="back"]',
  );
  if (hasNavigation) {
    score += 15;
  }

  // Check for progress indicators inside
  const hasProgress = container.querySelector('[role="progressbar"], [class*="progress"], [class*="stepper"]');
  if (hasProgress) {
    score += 10;
  }

  // Check for multiple step containers inside
  const stepContainers = container.querySelectorAll('[class*="step-"], [data-step], [class*="tab-pane"]');
  if (stepContainers.length > 1) {
    score += Math.min(20, stepContainers.length * 5);
  }

  // Check for form fields
  const fields = getFormFieldsRobust(container);
  if (fields.length > 0) {
    score += Math.min(15, fields.length * 2);
  }

  // Penalty for being too small (likely just a button)
  try {
    const rect = container.getBoundingClientRect();
    if (rect.width < 200 || rect.height < 100) {
      score -= 10;
    }
  } catch {
    // Ignore sizing errors
  }

  return score;
}

/**
 * Process and optimize multi-step containers
 */
function processMultiStepContainers(containers: HTMLElement[]): HTMLElement[] {
  const processed: HTMLElement[] = [];
  const processedSet = new Set<HTMLElement>();

  // Remove nested containers (keep the outermost one)
  for (const container of containers) {
    let isNested = false;

    for (const other of containers) {
      if (other !== container && other.contains(container)) {
        isNested = true;
        break;
      }
    }

    if (!isNested && !processedSet.has(container)) {
      processed.push(container);
      processedSet.add(container);
    }
  }

  return processed;
}

/**
 * Enhanced form definition data processing
 * Extracts and normalizes form configuration from various API response formats
 */
interface ProcessedFormDefinition {
  fields: ProcessedFormField[];
  steps?: ProcessedFormStep[];
  validation?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  source: string;
}

interface ProcessedFormField {
  id: string;
  name: string;
  type: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  validation?: Record<string, unknown>;
  step?: string | number;
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}

interface ProcessedFormStep {
  id: string | number;
  name: string;
  label?: string;
  fields: string[];
  order?: number;
  metadata?: Record<string, unknown>;
}

function processFormDefinitionData(data: unknown, source: string): ProcessedFormDefinition | null {
  try {
    if (!data || typeof data !== "object") {
      return null;
    }

    console.log(`🔍 Processing form definition from ${source}:`, data);

    const result: ProcessedFormDefinition = {
      fields: [],
      steps: [],
      source,
      metadata: {},
    };

    // Handle different API response formats
    const normalizedData = normalizeAPIResponse(data);

    // Extract fields from various formats
    result.fields = extractFieldsFromData(normalizedData);

    // Extract steps if present
    result.steps = extractStepsFromData(normalizedData);

    // Extract validation rules
    result.validation = extractValidationFromData(normalizedData);

    // Store original metadata
    result.metadata = normalizedData;

    console.log(`📊 Processed ${result.fields.length} fields and ${result.steps?.length || 0} steps from API response`);

    return result.fields.length > 0 ? result : null;
  } catch (error) {
    console.error("Error processing form definition data:", error);
    return null;
  }
}

/**
 * Normalize different API response formats to a common structure
 */
function normalizeAPIResponse(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object") {
    return {};
  }

  const dataObj = data as Record<string, unknown>;

  // Handle common wrapper patterns
  if (dataObj.data) {
    return normalizeAPIResponse(dataObj.data);
  }

  if (dataObj.result) {
    return normalizeAPIResponse(dataObj.result);
  }

  if (dataObj.payload) {
    return normalizeAPIResponse(dataObj.payload);
  }

  // Handle Next.js specific patterns
  if (dataObj.pageProps) {
    return normalizeAPIResponse(dataObj.pageProps);
  }

  // Handle nested form configuration
  if (dataObj.form || dataObj.formConfig || dataObj.formDefinition) {
    const formData = dataObj.form || dataObj.formConfig || dataObj.formDefinition;
    return normalizeAPIResponse(formData);
  }

  return dataObj;
}

/**
 * Extract field definitions from normalized data
 */
function extractFieldsFromData(data: Record<string, unknown>): ProcessedFormField[] {
  const fields: ProcessedFormField[] = [];

  // Strategy 1: Direct fields array
  if (Array.isArray(data.fields)) {
    fields.push(...processFieldsArray(data.fields));
  }

  // Strategy 2: Schema-based fields
  if (data.schema && typeof data.schema === "object") {
    const schema = data.schema as Record<string, unknown>;
    if (Array.isArray(schema.fields)) {
      fields.push(...processFieldsArray(schema.fields));
    }
    if (schema.properties && typeof schema.properties === "object") {
      fields.push(...processSchemaProperties(schema.properties as Record<string, unknown>));
    }
  }

  // Strategy 3: Step-based fields
  if (Array.isArray(data.steps)) {
    for (const step of data.steps) {
      if (step && typeof step === "object" && Array.isArray((step as Record<string, unknown>).fields)) {
        const stepFields = processFieldsArray((step as Record<string, unknown>).fields as unknown[]);
        stepFields.forEach(field => {
          field.step = String((step as Record<string, unknown>).id || (step as Record<string, unknown>).name || "");
        });
        fields.push(...stepFields);
      }
    }
  }

  // Strategy 4: Flat object keys as fields
  const potentialFields = Object.keys(data).filter(
    key => key.includes("field") || key.includes("input") || key.endsWith("_field") || key.startsWith("field_"),
  );

  for (const key of potentialFields) {
    const fieldData = data[key];
    if (fieldData && typeof fieldData === "object") {
      const processedField = processFieldDefinition(fieldData as Record<string, unknown>, key);
      if (processedField) {
        fields.push(processedField);
      }
    }
  }

  return fields;
}

/**
 * Process an array of field definitions
 */
function processFieldsArray(fieldsArray: unknown[]): ProcessedFormField[] {
  const fields: ProcessedFormField[] = [];

  for (const fieldData of fieldsArray) {
    if (fieldData && typeof fieldData === "object") {
      const field = processFieldDefinition(fieldData as Record<string, unknown>);
      if (field) {
        fields.push(field);
      }
    }
  }

  return fields;
}

/**
 * Process schema properties as field definitions
 */
function processSchemaProperties(properties: Record<string, unknown>): ProcessedFormField[] {
  const fields: ProcessedFormField[] = [];

  for (const [key, property] of Object.entries(properties)) {
    if (property && typeof property === "object") {
      const field = processFieldDefinition(property as Record<string, unknown>, key);
      if (field) {
        fields.push(field);
      }
    }
  }

  return fields;
}

/**
 * Process individual field definition
 */
function processFieldDefinition(fieldData: Record<string, unknown>, fallbackId?: string): ProcessedFormField | null {
  try {
    const id = (fieldData.id || fieldData.name || fieldData.key || fallbackId) as string;
    if (!id) return null;

    const field: ProcessedFormField = {
      id,
      name: (fieldData.name || id) as string,
      type: normalizeFieldType((fieldData.type || fieldData.fieldType || "text") as string),
      label: (fieldData.label || fieldData.title || fieldData.displayName) as string,
      placeholder: fieldData.placeholder as string,
      required: Boolean(fieldData.required || fieldData.isRequired),
      metadata: fieldData,
    };

    // Extract options for select/radio/checkbox fields
    if (fieldData.options && Array.isArray(fieldData.options)) {
      field.options = fieldData.options.map((option: unknown) => {
        if (typeof option === "string") {
          return { value: option, label: option };
        }
        if (option && typeof option === "object") {
          const opt = option as Record<string, unknown>;
          return {
            value: (opt.value || opt.id || opt.key) as string,
            label: (opt.label || opt.text || opt.name || opt.value) as string,
          };
        }
        return { value: String(option), label: String(option) };
      });
    }

    // Extract validation rules
    if (fieldData.validation && typeof fieldData.validation === "object") {
      field.validation = fieldData.validation as Record<string, unknown>;
    }

    // Extract dependencies
    if (fieldData.dependencies && Array.isArray(fieldData.dependencies)) {
      field.dependencies = fieldData.dependencies.map(dep => String(dep));
    }

    return field;
  } catch (error) {
    console.debug("Error processing field definition:", error);
    return null;
  }
}

/**
 * Normalize field type from various formats
 */
function normalizeFieldType(type: string): string {
  const normalizedType = type.toLowerCase().trim();

  // Map common variations to standard types
  const typeMap: Record<string, string> = {
    string: "text",
    varchar: "text",
    textarea: "textarea",
    longtext: "textarea",
    dropdown: "select",
    combobox: "select",
    checkbox: "checkbox",
    radio: "radio",
    radiobutton: "radio",
    file: "file",
    upload: "file",
    attachment: "file",
    date: "date",
    datetime: "datetime-local",
    time: "time",
    number: "number",
    integer: "number",
    decimal: "number",
    email: "email",
    url: "url",
    tel: "tel",
    phone: "tel",
    password: "password",
    hidden: "hidden",
  };

  return typeMap[normalizedType] || normalizedType;
}

/**
 * Extract steps from form definition data
 */
function extractStepsFromData(data: Record<string, unknown>): ProcessedFormStep[] {
  const steps: ProcessedFormStep[] = [];

  if (Array.isArray(data.steps)) {
    for (const stepData of data.steps) {
      if (stepData && typeof stepData === "object") {
        const step = processStepDefinition(stepData as Record<string, unknown>);
        if (step) {
          steps.push(step);
        }
      }
    }
  }

  // Also check for wizard/flow configuration
  if (data.wizard && typeof data.wizard === "object") {
    const wizard = data.wizard as Record<string, unknown>;
    if (Array.isArray(wizard.steps)) {
      for (const stepData of wizard.steps) {
        if (stepData && typeof stepData === "object") {
          const step = processStepDefinition(stepData as Record<string, unknown>);
          if (step) {
            steps.push(step);
          }
        }
      }
    }
  }

  return steps;
}

/**
 * Process individual step definition
 */
function processStepDefinition(stepData: Record<string, unknown>): ProcessedFormStep | null {
  try {
    const id = stepData.id || stepData.name || stepData.key;
    if (!id) return null;

    const step: ProcessedFormStep = {
      id: id as string | number,
      name: (stepData.name || stepData.title || id) as string,
      label: stepData.label as string,
      fields: [],
      order: stepData.order as number,
      metadata: stepData,
    };

    // Extract field IDs/names for this step
    if (Array.isArray(stepData.fields)) {
      step.fields = stepData.fields.map(field => {
        if (typeof field === "string") return field;
        if (field && typeof field === "object") {
          const fieldObj = field as Record<string, unknown>;
          return (fieldObj.id || fieldObj.name || fieldObj.key) as string;
        }
        return String(field);
      });
    }

    return step;
  } catch (error) {
    console.debug("Error processing step definition:", error);
    return null;
  }
}

/**
 * Extract validation rules from form definition data
 */
function extractValidationFromData(data: Record<string, unknown>): Record<string, unknown> {
  const validation: Record<string, unknown> = {};

  if (data.validation && typeof data.validation === "object") {
    Object.assign(validation, data.validation);
  }

  if (data.rules && typeof data.rules === "object") {
    Object.assign(validation, data.rules);
  }

  if (data.constraints && typeof data.constraints === "object") {
    Object.assign(validation, data.constraints);
  }

  return validation;
}

/**
 * Get processed form definitions for a document
 */
export function getProcessedFormDefinitions(doc: Document): ProcessedFormDefinition[] {
  const monitor = apiResponseMonitors.get(doc);
  if (!monitor) return [];

  const definitions: ProcessedFormDefinition[] = [];

  for (const [_url, responseData] of monitor.interceptedResponses) {
    if (responseData && typeof responseData === "object") {
      const data = responseData as { processed?: ProcessedFormDefinition };
      if (data.processed) {
        definitions.push(data.processed);
      }
    }
  }

  return definitions;
}
