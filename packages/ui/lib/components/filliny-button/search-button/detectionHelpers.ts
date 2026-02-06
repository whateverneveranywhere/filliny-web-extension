import { scoreFormContainerEnhanced } from './containerDetection';
import { detectFields, getFormFieldsRobust } from './field-types';
import { unifiedFieldRegistry } from './unifiedFieldDetection';
import {
  DetectionPass,
  DETECTION_DELAYS,
  DETECTION_PASS_CONFIDENCE,
  ConfidenceLevel,
  TIMING_CONSTANTS,
  createDebugLogger,
  Framework,
  detectFrameworkForElement,
  detectVue,
  detectReact,
  detectAngular,
  detectSvelte,
  detectQwik,
  initializeShadowDOMObservation,
  cleanupShadowDOMObservation,
  querySelectorAllDeep,
  isInShadowDOM as _isInShadowDOM, // Available for future use
  hasProperty,
} from '@extension/shared';
import { z } from 'zod';

const debug = createDebugLogger('Detection');

// Shadow DOM roots registry for form detection
const observedShadowRoots = new Set<ShadowRoot>();

/**
 * Type guard to check if a node is an Element
 */
const isElement = (node: Node): node is Element => node.nodeType === Node.ELEMENT_NODE;

// --- Frame Document Utilities ---

// ============================================================================
// Zod Schemas for Detection Helper Types
// ============================================================================

/**
 * Schema for document with observer extension
 * Note: Document is a native type, so we define the extension properties
 */
// Zod schema for type inference - not used at runtime

const _DocumentWithObserverPropsSchema = z.object({
  __fillinyFrameObserver: z.custom<MutationObserver>(val => val instanceof MutationObserver).optional(),
});

type DocumentWithObserverProps = z.infer<typeof _DocumentWithObserverPropsSchema>;
type DocumentWithObserver = Document & DocumentWithObserverProps;

/**
 * Type guard to check if a document has the observer extension
 * This allows safely accessing the __fillinyFrameObserver property
 */

const _isDocumentWithObserver = (doc: Document): doc is DocumentWithObserver =>
  '__fillinyFrameObserver' in doc || doc instanceof Document;

/**
 * Safely attach observer to document
 */
const attachObserverToDocument = (doc: Document, observer: MutationObserver): void => {
  (doc as DocumentWithObserver).__fillinyFrameObserver = observer;
};

// Callback type for notifying about new forms
export type FormDetectionCallback = (doc: Document) => void;

/**
 * Schema for dynamic content detector
 */

const _DynamicContentDetectorSchema = z.object({
  observer: z.custom<MutationObserver>(val => val instanceof MutationObserver, {
    message: 'Expected MutationObserver',
  }),
  confidence: z.number(),
  lastDetectionTime: z.number(),
  stableStateTimeout: z.number(),
  onStableCallback: z.function().returns(z.void()).optional(),
});

type DynamicContentDetector = z.infer<typeof _DynamicContentDetectorSchema>;

// Global registry for dynamic content detection
const dynamicDetectors = new Map<Document, DynamicContentDetector>();

/**
 * Schema for API response monitor
 */

const _APIResponseMonitorSchema = z.object({
  originalFetch: z.custom<typeof fetch>(val => typeof val === 'function', { message: 'Expected fetch function' }),
  originalXHROpen: z.custom<typeof XMLHttpRequest.prototype.open>(val => typeof val === 'function', {
    message: 'Expected XHR open function',
  }),
  interceptedResponses: z.custom<Map<string, unknown>>(val => val instanceof Map, {
    message: 'Expected Map<string, unknown>',
  }),
  formDefinitionPatterns: z.array(z.custom<RegExp>(val => val instanceof RegExp, { message: 'Expected RegExp' })),
  onFormDefinitionLoaded: z.function().args(z.unknown()).returns(z.void()).optional(),
});

type APIResponseMonitor = z.infer<typeof _APIResponseMonitorSchema>;

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
  '[data-defer]',
];

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
  'select',
  'textarea',
  'button:not([disabled])',
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

  // Initialize Shadow DOM observation for form detection
  initializeShadowDOMObservation(document, (shadowRoot, host) => {
    debug.log('🔮 New Shadow DOM detected:', {
      host: host.tagName,
      hostId: host.id,
      hostClass: host.className,
    });

    // Store the shadow root for later traversal
    observedShadowRoots.add(shadowRoot);

    // Check if shadow root contains form elements
    const formElements = shadowRoot.querySelectorAll('form, input, select, textarea, [role="form"]');
    if (formElements.length > 0) {
      debug.log(`📋 Shadow DOM contains ${formElements.length} form elements, triggering detection`);
      if (onNewFrameLoaded) {
        onNewFrameLoaded(document);
      }
    }
  });

  // Start API response monitoring for the main document
  initializeAPIResponseMonitoring(document, () => {
    debug.log('🔄 Form definition API detected, triggering form detection');
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
          debug.log(`Frame still loading, will retry (${retryCount + 1}/${maxRetries}):`, iframe.src);

          await new Promise(resolve => {
            const loadHandler = () => {
              iframe.removeEventListener('load', loadHandler);
              resolve(undefined);
            };
            iframe.addEventListener('load', loadHandler);
            setTimeout(() => {
              iframe.removeEventListener('load', loadHandler);
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
          iframe.src.startsWith('/') ||
          iframe.src === 'about:blank' ||
          iframe.src.startsWith('data:') ||
          iframe.src.startsWith('blob:');

        if (isSameOrigin) {
          debug.log('Accessing same-origin frame:', iframe.src);
          if (iframe.contentDocument) return iframe.contentDocument;
          if (iframe.contentWindow?.document) return iframe.contentWindow.document;

          if (iframe.src.startsWith('data:') || iframe.src.startsWith('blob:')) {
            await new Promise(resolve => setTimeout(resolve, 100));
            return iframe.contentDocument || iframe.contentWindow?.document || null;
          }
        } else {
          debug.log('Cross-origin frame detected, cannot access content:', iframe.src);
          iframe.setAttribute('data-filliny-cross-origin', 'true');
          return null;
        }
      }

      if (iframe.srcdoc && iframe.contentDocument) {
        debug.log('Accessing srcdoc frame');
        return iframe.contentDocument;
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      debug.log('Frame access error:', {
        src: iframe.src,
        error: errorMessage,
        retryCount,
        maxRetries,
      });

      if (errorMessage.includes('cross-origin') || errorMessage.includes('Permission denied')) {
        iframe.setAttribute('data-filliny-cross-origin', 'true');
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
    const iframes = Array.from(doc.getElementsByTagName('iframe'));
    for (const iframe of iframes) {
      const frameSrc = iframe.src || 'about:blank';
      if (!processedFrames.has(frameSrc)) {
        processedFrames.add(frameSrc);
        iframe.addEventListener('load', async () => {
          const iframeDoc = await tryGetIframeDoc(iframe);
          if (iframeDoc && !docs.includes(iframeDoc)) {
            docs.push(iframeDoc);
            await processIframes(iframeDoc);
            observeNewFrames(iframeDoc);

            // Initialize API monitoring for this iframe too
            initializeAPIResponseMonitoring(iframeDoc, () => {
              debug.log('🔄 Form definition API detected in iframe, triggering form detection');
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
          observeNewFrames(iframeDoc);
          if (onNewFrameLoaded) onNewFrameLoaded(iframeDoc);
        }
      }
    }

    const objects = Array.from(doc.getElementsByTagName('object'));
    for (const obj of objects) {
      try {
        // HTMLObjectElement has contentDocument property
        const objDoc = obj.contentDocument;
        if (objDoc && !processedFrames.has(obj.data || 'object')) {
          processedFrames.add(obj.data || 'object');
          docs.push(objDoc);
          await processIframes(objDoc);
        }
      } catch {
        // Ignore access errors for objects
      }
    }
  };

  const observeNewFrames = (doc: Document) => {
    const observer = new MutationObserver(async mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const newIframes = Array.from(mutation.addedNodes).filter(
            (node): node is HTMLIFrameElement => node instanceof HTMLIFrameElement,
          );

          for (const iframe of newIframes) {
            const frameSrc = iframe.src || 'about:blank';
            if (!processedFrames.has(frameSrc)) {
              processedFrames.add(frameSrc);
              iframe.addEventListener('load', async () => {
                const iframeDoc = await tryGetIframeDoc(iframe);
                if (iframeDoc && !docs.includes(iframeDoc)) {
                  docs.push(iframeDoc);
                  await processIframes(iframeDoc);
                  observeNewFrames(iframeDoc);

                  // Initialize API monitoring for this iframe too
                  initializeAPIResponseMonitoring(iframeDoc, () => {
                    debug.log('🔄 Form definition API detected in iframe, triggering form detection');
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
                observeNewFrames(iframeDoc);
                if (onNewFrameLoaded) onNewFrameLoaded(iframeDoc);
              }
            }
          }
        }
      }
    });

    observer.observe(doc, { childList: true, subtree: true });
    attachObserverToDocument(doc, observer);
  };

  const init = async () => {
    await processIframes(document);
    observeNewFrames(document);
  };

  init().catch(console.error);
  return docs;
};

// --- Form Container Detection ---

/**
 * Schema for form candidate detection results
 */

const _FormCandidateSchema = z.object({
  element: z.custom<HTMLElement>(val => val instanceof HTMLElement, { message: 'Expected HTMLElement' }),
  score: z.number(),
  fieldCount: z.number(),
  reasons: z.array(z.string()),
});

type FormCandidate = z.infer<typeof _FormCandidateSchema>;

/**
 * Gets all form containers from the unified registry.
 * This avoids re-running detection and ensures consistency.
 */
export const getAllFormContainersFromRegistry = (): HTMLElement[] => unifiedFieldRegistry.getRegisteredContainers();

/**
 * Progressive detection strategy with multiple passes and intelligent timing
 */
const performProgressiveDetection = async (documents: Document[]): Promise<HTMLElement[]> => {
  debug.log('🔄 Starting progressive form detection strategy...');

  // Use enum-based detection passes for better maintainability
  const detectionPasses = [
    {
      name: DetectionPass.IMMEDIATE,
      delay: DETECTION_DELAYS[DetectionPass.IMMEDIATE],
      confidence: DETECTION_PASS_CONFIDENCE[DetectionPass.IMMEDIATE],
    },
    {
      name: DetectionPass.FAST,
      delay: DETECTION_DELAYS[DetectionPass.FAST],
      confidence: DETECTION_PASS_CONFIDENCE[DetectionPass.FAST],
    },
    {
      name: DetectionPass.MEDIUM,
      delay: DETECTION_DELAYS[DetectionPass.MEDIUM],
      confidence: DETECTION_PASS_CONFIDENCE[DetectionPass.MEDIUM],
    },
    {
      name: DetectionPass.THOROUGH,
      delay: DETECTION_DELAYS[DetectionPass.THOROUGH],
      confidence: DETECTION_PASS_CONFIDENCE[DetectionPass.THOROUGH],
    },
    {
      name: DetectionPass.FINAL,
      delay: DETECTION_DELAYS[DetectionPass.FINAL],
      confidence: DETECTION_PASS_CONFIDENCE[DetectionPass.FINAL],
    },
  ];

  let bestResults: HTMLElement[] = [];
  let bestScore = 0;

  for (const pass of detectionPasses) {
    debug.log(`🔍 Detection pass: ${pass.name} (delay: ${pass.delay}ms, confidence: ${pass.confidence})`);

    // Wait for the specified delay
    if (pass.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, pass.delay));
    }

    // Check if API responses have been received
    const hasAPIData = documents.some(doc => hasFormDefinitionAPIsLoaded(doc));
    if (hasAPIData) {
      debug.log('📡 API data detected, proceeding with enhanced detection');
    }

    // Wait for content stability for this pass
    await waitForContentStability(documents, Math.min(2000, pass.delay + 1000));

    // Perform detection for this pass
    const passCandidates = await performSingleDetectionPass(documents, pass.confidence);

    // Calculate overall score for this pass
    const passScore = calculatePassScore(passCandidates);
    debug.log(`📊 Pass ${pass.name} found ${passCandidates.length} containers, score: ${passScore}`);

    // If this pass found significantly better results, use them
    if (passScore > bestScore + 10 || passCandidates.length > bestResults.length * 1.5) {
      bestResults = passCandidates.map(c => c.element);
      bestScore = passScore;
      debug.log(`✅ New best results from ${pass.name} pass: ${bestResults.length} containers`);
    }

    // Early termination conditions
    if (shouldTerminateEarly(passCandidates, pass, hasAPIData)) {
      debug.log(`🎯 Early termination after ${pass.name} pass`);
      break;
    }
  }

  debug.log(`🏁 Progressive detection completed. Final result: ${bestResults.length} containers`);
  return bestResults;
};

/**
 * Perform a single detection pass with specified confidence threshold
 * Now includes Shadow DOM support using deep query selectors
 */
const performSingleDetectionPass = async (
  documents: Document[],
  confidenceThreshold: number,
): Promise<FormCandidate[]> => {
  const candidates: FormCandidate[] = [];

  for (const doc of documents) {
    try {
      debug.log(`Processing document: ${doc.location?.href || 'unknown'}`);

      // Strategy 1: Look for explicit form-related elements (including Shadow DOM)
      const explicitFormSelectors = [
        'form',
        'fieldset',
        '[role="form"]',
        '[data-form]',
        "[data-testid*='form']",
        "[data-cy*='form']",
        "[id*='form']",
        "[class*='form']",
      ];

      const explicitContainers: HTMLElement[] = [];
      for (const selector of explicitFormSelectors) {
        try {
          // Use deep query to search within Shadow DOM as well
          const elements = querySelectorAllDeep<HTMLElement>(selector, doc);
          explicitContainers.push(...elements);
        } catch (e) {
          debug.log(`Explicit form selector failed: ${selector}`, e);
        }
      }

      // Also search within observed shadow roots directly
      for (const shadowRoot of observedShadowRoots) {
        for (const selector of explicitFormSelectors) {
          try {
            const elements = Array.from(shadowRoot.querySelectorAll<HTMLElement>(selector));
            explicitContainers.push(...elements);
          } catch {
            // Continue on selector errors
          }
        }
      }

      debug.log(`Found ${explicitContainers.length} explicit form containers`);

      // Process explicit containers
      for (const container of explicitContainers) {
        try {
          const fields = getFormFieldsRobust(container);
          if (fields.length > 0) {
            const { score, reasons } = scoreFormContainerEnhanced(container, fields);

            // Apply confidence threshold
            if (score >= confidenceThreshold * 100) {
              debug.log(`Explicit container: ${container.tagName}. - Score: ${score}, Fields: ${fields.length}`);

              candidates.push({
                element: container,
                score,
                fieldCount: fields.length,
                reasons,
              });
            }
          }
        } catch (error) {
          debug.log('Error processing explicit container:', error);
        }
      }

      // Strategy 2: Look for implicit containers with form-like patterns
      const implicitContainers = Array.from(doc.querySelectorAll<HTMLElement>('div, section, main, article'));

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
          debug.log('Error processing implicit container:', error);
        }
      }
    } catch (error) {
      debug.error('Error in form detection for document:', error);
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
};

/**
 * Calculate overall score for a detection pass
 */
const calculatePassScore = (candidates: FormCandidate[]): number => {
  if (candidates.length === 0) return 0;

  const totalScore = candidates.reduce((sum, candidate) => sum + candidate.score, 0);
  const avgScore = totalScore / candidates.length;
  const fieldCount = candidates.reduce((sum, candidate) => sum + candidate.fieldCount, 0);

  // Combine average score, field count, and number of containers
  return avgScore + fieldCount * 2 + candidates.length * 5;
};

/**
 * Determine if we should terminate progressive detection early
 */
const shouldTerminateEarly = (
  candidates: FormCandidate[],
  pass: { name: string; delay: number; confidence: number },
  hasAPIData: boolean,
): boolean => {
  // If we have API data and found good results, we can terminate early
  if (hasAPIData && candidates.length > 0 && pass.name !== 'immediate') {
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
  if (pass.name === 'thorough' && candidates.length >= 2) {
    const avgScore = candidates.reduce((sum, c) => sum + c.score, 0) / candidates.length;
    if (avgScore > 60) {
      return true;
    }
  }

  return false;
};

/**
 * Enhanced form container detection with improved scoring for group detection
 * Now includes universal dynamic content detection, progressive strategy, and multi-step form detection
 */
export const detectFormLikeContainers = async (): Promise<HTMLElement[]> => {
  debug.log('Starting enhanced form container detection with progressive strategy...');

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
const isInsideCrossOriginIframe = (): boolean => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

// Remove unused function
// function showCrossOriginIframeWarning() {
//   debug.warn("🚨 Filliny detected it's running inside a cross-origin iframe. Form detection may be limited.");
// }

export const openCrossOriginIframeInNewTabAndAlert = (): void => {
  if (isInsideCrossOriginIframe()) {
    try {
      const currentUrl = window.location.href;
      window.open(currentUrl, '_blank');
      alert(
        "This page is embedded in a cross-origin iframe which limits Filliny's functionality. We've opened it in a new tab where Filliny can work properly.",
      );
    } catch (error) {
      debug.error('Could not open page in new tab:', error);
    }
  }
};

// --- System Diagnostics ---
export const diagnoseFillinySystem = async (): Promise<void> => {
  debug.group('Filliny System Diagnostics');

  try {
    debug.log('Environment:', {
      userAgent: navigator.userAgent,
      url: window.location.href,
      isCrossOrigin: isInsideCrossOriginIframe(),
    });

    const documents = getAllFrameDocuments();
    debug.log(`Documents found: ${documents.length}`);

    for (const doc of documents) {
      const forms = Array.from(doc.querySelectorAll('form'));
      const inputs = Array.from(doc.querySelectorAll('input, select, textarea'));
      debug.log(`Document ${doc.location?.href || 'main'}: ${forms.length} forms, ${inputs.length} inputs`);
    }

    const containers = await detectFormLikeContainers();
    debug.log(`Form containers detected: ${containers.length}`);
  } catch (error) {
    debug.error('Diagnostic error:', error);
  }

  debug.groupEnd();
};

/**
 * Initialize universal dynamic content detection for a document
 */
const initializeDynamicContentDetection = (doc: Document, onNewFormLoaded?: FormDetectionCallback): void => {
  // Skip if already initialized
  if (dynamicDetectors.has(doc)) {
    return;
  }

  let stableStateTimeout: number;
  let lastMutationTime = Date.now();
  const STABILITY_THRESHOLD = TIMING_CONSTANTS.STABILITY_THRESHOLD; // ms of no mutations = stable

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
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes);
          const removedNodes = Array.from(mutation.removedNodes);

          // Check for form-related additions with enhanced detection
          const hasFormAdditions = addedNodes.some(node => {
            if (isElement(node)) {
              const element = node;

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
            if (isElement(node)) {
              const element = node;

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
            if (isElement(node)) {
              return ['DIV', 'SECTION', 'FORM', 'FIELDSET'].includes(node.tagName);
            }
            return false;
          });

          return hasFormAdditions || hasLoadingRemovals || (hasStructuralChanges && hasContainerChanges);
        }

        // Enhanced attribute change detection
        if (mutation.type === 'attributes' && isElement(mutation.target)) {
          const target = mutation.target;
          const attributeName = mutation.attributeName;

          // Standard readiness indicators
          if (attributeName === 'aria-busy' && target.getAttribute('aria-busy') === 'false') {
            return true;
          }

          if (attributeName === 'data-loading' && target.getAttribute('data-loading') === 'false') {
            return true;
          }

          // Disabled -> enabled transitions
          if (attributeName === 'disabled' && !target.hasAttribute('disabled')) {
            return true;
          }

          // Class changes that might indicate form readiness
          if (attributeName === 'class') {
            const newClasses = target.getAttribute('class') || '';
            const hasReadyClass = ['loaded', 'ready', 'initialized', 'rendered'].some(cls => newClasses.includes(cls));
            const removedLoadingClass = ['loading', 'skeleton', 'pending'].some(cls => !newClasses.includes(cls));

            if (hasReadyClass || removedLoadingClass) {
              return true;
            }
          }

          // Style changes that might indicate visibility
          if (attributeName === 'style') {
            const style = target.getAttribute('style') || '';
            const becameVisible = !style.includes('display: none') && !style.includes('visibility: hidden');
            if (becameVisible) {
              return true;
            }
          }

          // Data attribute changes that might indicate form state
          if (attributeName?.startsWith('data-')) {
            const dataValue = target.getAttribute(attributeName);
            if (attributeName.includes('state') && dataValue === 'ready') {
              return true;
            }
            if (attributeName.includes('initialized') && dataValue === 'true') {
              return true;
            }
          }
        }

        return false;
      });

      if (hasFormRelevantChanges) {
        detector.confidence = Math.min(1.0, detector.confidence + 0.1);
        debug.log(`📈 Dynamic content detected, confidence: ${detector.confidence.toFixed(2)}`);
      }

      // Set new stability timeout
      stableStateTimeout = window.setTimeout(() => {
        if (Date.now() - lastMutationTime >= STABILITY_THRESHOLD) {
          debug.log(`🎯 Content stable for ${STABILITY_THRESHOLD}ms, triggering form detection`);
          detector.onStableCallback?.();
          if (onNewFormLoaded) {
            onNewFormLoaded(doc);
          }
        }
      }, STABILITY_THRESHOLD);
    }),
    confidence: ConfidenceLevel.LOW,
    lastDetectionTime: Date.now(),
    stableStateTimeout: 0,
    onStableCallback: undefined,
  };

  // Start observing
  detector.observer.observe(doc, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-busy', 'data-loading', 'disabled', 'class'],
  });

  dynamicDetectors.set(doc, detector);

  debug.log(`🔍 Dynamic content detection initialized for ${doc.location?.href || 'document'}`);
};

/**
 * Wait for content to stabilize across all documents
 */
const waitForContentStability = async (documents: Document[], maxWaitTime = 5000): Promise<void> => {
  const startTime = Date.now();
  const checkInterval = 200;

  return new Promise(resolve => {
    const checkStability = () => {
      const now = Date.now();

      // Check if we've exceeded max wait time
      if (now - startTime > maxWaitTime) {
        debug.log(`⏱️ Content stability timeout reached (${maxWaitTime}ms)`);
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
        debug.log(`✅ All documents stable after ${now - startTime}ms`);
        resolve();
      } else {
        setTimeout(checkStability, checkInterval);
      }
    };

    checkStability();
  });
};

/**
 * Enhanced form container detection with universal behavioral analysis
 */
export const detectUniversalFormContainers = async (): Promise<HTMLElement[]> => {
  debug.log('🔍 Starting universal form container detection...');

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
      debug.error(`❌ Error in universal form detection for document:`, error);
    }
  }

  // Deduplicate and sort by confidence
  const uniqueCandidates = Array.from(new Map(candidates.map(c => [c.element, c])).values()).sort(
    (a, b) => b.score - a.score,
  );

  debug.log(`🎯 Universal detection found ${uniqueCandidates.length} form containers`);

  return uniqueCandidates.slice(0, 20).map(c => c.element); // Return top 20
};

/**
 * Detect form containers using semantic analysis
 */
const detectSemanticFormContainers = async (doc: Document): Promise<FormCandidate[]> => {
  const candidates: FormCandidate[] = [];

  // Look for elements with form-related semantic meaning
  const semanticSelectors = [
    'form',
    'fieldset',
    '[role="form"]',
    '[role="group"]',
    '[role="region"][aria-labelledby]',
    '[role="region"][aria-label]',
    // Elements with form-indicating attributes
    '[autocomplete]',
    '[novalidate]',
    '[accept-charset]',
    // Elements with form-like ARIA relationships
    '[aria-labelledby]',
    '[aria-describedby]',
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
            reasons: ['semantic', ...reasons],
          });
        }
      }
    } catch (error) {
      debug.log(`Semantic selector failed: ${selector}`, error);
    }
  }

  return candidates;
};

/**
 * Detect form containers using behavioral analysis
 */
const detectBehavioralFormContainers = async (doc: Document): Promise<FormCandidate[]> => {
  const candidates: FormCandidate[] = [];

  // Look for containers with interactive behavior patterns
  const interactiveElements = Array.from(doc.querySelectorAll<HTMLElement>('*')).filter(el => {
    // Check for interactive indicators
    const hasInteractiveEvents = ['onchange', 'oninput', 'onsubmit', 'onreset', 'onfocus', 'onblur', 'onclick'].some(
      event => el.hasAttribute(event),
    );

    const hasInteractiveAttributes = ['tabindex', 'contenteditable', 'draggable'].some(attr => el.hasAttribute(attr));

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
          reasons: ['behavioral', ...reasons],
        });
      }
    }
  }

  return candidates;
};

/**
 * Detect form containers using visual layout analysis
 */
const detectVisualFormContainers = async (doc: Document): Promise<FormCandidate[]> => {
  const candidates: FormCandidate[] = [];

  // Look for containers with form-like visual patterns
  const potentialContainers = Array.from(doc.querySelectorAll<HTMLElement>('div, section, article, main, aside, nav'));

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
          reasons: ['visual', ...reasons],
        });
      }
    } catch (error) {
      debug.log('Visual analysis error:', error);
    }
  }

  return candidates;
};

/**
 * Analyze visual patterns that suggest form-like layout
 */
const analyzeVisualFormPattern = (_container: HTMLElement, fields: HTMLElement[]): number => {
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
    debug.log('Visual pattern analysis error:', error);
  }

  return score;
};

/**
 * Clean up dynamic content detection when no longer needed
 */
export const cleanupDynamicContentDetection = (doc?: Document): void => {
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

    // Cleanup Shadow DOM observation for this document
    cleanupShadowDOMObservation(doc);
  } else {
    // Clean up all detectors
    for (const [, detector] of dynamicDetectors) {
      detector.observer.disconnect();
      if (detector.stableStateTimeout) {
        clearTimeout(detector.stableStateTimeout);
      }
    }
    dynamicDetectors.clear();

    // Cleanup all API monitoring
    cleanupAPIResponseMonitoring();

    // Cleanup all Shadow DOM observation
    cleanupShadowDOMObservation();
    observedShadowRoots.clear();
  }
};

/**
 * Initialize API response monitoring for form definition detection
 */
export const initializeAPIResponseMonitoring = (
  doc: Document,
  onFormDefinitionLoaded?: (data: unknown) => void,
): void => {
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
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    try {
      const response = await originalFetch(input, init);

      // Check if this might be a form definition response
      const isFormDefinitionAPI = monitor.formDefinitionPatterns.some(pattern => pattern.test(url));

      if (isFormDefinitionAPI && response.ok) {
        // Clone the response to avoid consuming the stream
        const clonedResponse = response.clone();

        try {
          const data = await clonedResponse.json();
          debug.log(`🔍 Detected form definition API response from: ${url}`);

          // Enhanced form definition data processing
          const processedData = processFormDefinitionData(data, url);

          // Store both raw and processed data
          monitor.interceptedResponses.set(url, { raw: data, processed: processedData });

          // Trigger form detection after a short delay to allow DOM updates
          setTimeout(() => {
            debug.log(`📡 Processing form definition data from ${url}`);
            monitor.onFormDefinitionLoaded?.(processedData);
          }, 100);
        } catch (parseError) {
          debug.log('Failed to parse potential form definition response:', parseError);
        }
      }

      return response;
    } catch (error) {
      debug.log('Fetch interceptor error:', error);
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
    const urlString = typeof url === 'string' ? url : url.href;
    const isFormDefinitionAPI = monitor.formDefinitionPatterns.some(pattern => pattern.test(urlString));

    if (isFormDefinitionAPI) {
      // Store reference to track this request
      const originalOnLoad = this.onload;
      const originalOnReadyStateChange = this.onreadystatechange;

      this.onreadystatechange = function () {
        if (this.readyState === 4 && this.status >= 200 && this.status < 300) {
          try {
            const responseData = JSON.parse(this.responseText);
            debug.log(`🔍 Detected form definition XHR response from: ${urlString}`);

            // Enhanced form definition data processing
            const processedData = processFormDefinitionData(responseData, urlString);

            // Store both raw and processed data
            monitor.interceptedResponses.set(urlString, { raw: responseData, processed: processedData });

            setTimeout(() => {
              debug.log(`📡 Processing form definition data from ${urlString}`);
              monitor.onFormDefinitionLoaded?.(processedData);
            }, 100);
          } catch (parseError) {
            debug.log('Failed to parse XHR form definition response:', parseError);
          }
        }

        // Call original handler if it exists
        if (originalOnReadyStateChange) {
          // Create a synthetic event for the handler
          const syntheticEvent = new Event('readystatechange');
          originalOnReadyStateChange.call(this, syntheticEvent);
        }
      };

      // Also handle onload for compatibility
      this.onload = function () {
        // onreadystatechange will handle the response parsing
        if (originalOnLoad) {
          // Create a synthetic progress event for the handler
          const syntheticEvent = new ProgressEvent('load');
          originalOnLoad.call(this, syntheticEvent);
        }
      };
    }

    return originalXHROpen.call(this, method, url, async ?? true, user ?? null, password ?? null);
  };

  apiResponseMonitors.set(doc, monitor);
  debug.log(`📡 API response monitoring initialized for ${doc.location?.href || 'document'}`);
};

/**
 * Cleanup API response monitoring
 */
const cleanupAPIResponseMonitoring = (doc?: Document): void => {
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
};

/**
 * Check if form definition APIs have been detected and processed
 */
export const hasFormDefinitionAPIsLoaded = (doc: Document): boolean => {
  const monitor = apiResponseMonitors.get(doc);
  return monitor ? monitor.interceptedResponses.size > 0 : false;
};

/**
 * Get intercepted form definition data
 */
export const getInterceptedFormDefinitions = (doc: Document): Map<string, unknown> => {
  const monitor = apiResponseMonitors.get(doc);
  return monitor?.interceptedResponses || new Map();
};

/**
 * Detect custom form components that might not be standard HTML elements
 */
const detectCustomFormComponent = (element: Element): boolean => {
  const tagName = element.tagName.toLowerCase();
  const className = element.className?.toLowerCase() || '';
  const dataAttrs = Array.from(element.attributes)
    .filter(attr => attr.name.startsWith('data-'))
    .map(attr => `${attr.name}=${attr.value}`)
    .join(' ')
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
};

/**
 * Detect React/Vue/Angular/Svelte/Qwik component mounting patterns
 * Uses the centralized framework detection module
 */
const detectFrameworkFormComponent = (element: Element): boolean => {
  // Use centralized framework detection
  const framework = detectFrameworkForElement(element);

  // Check if it's a known framework
  const isKnownFramework = framework !== Framework.VANILLA;

  // Also check for React-specific patterns for backward compatibility
  const hasReactProps = detectReact(element) || element.querySelector('[data-reactroot]') !== null;

  // Check for Vue-specific patterns using centralized detection
  const hasVueProps = detectVue(element);

  // Check for Angular-specific patterns using centralized detection
  const hasAngularProps = detectAngular(element);

  // Check for Svelte-specific patterns using centralized detection
  const hasSvelteProps = detectSvelte(element);

  // Check for Qwik-specific patterns using centralized detection
  const hasQwikProps = detectQwik(element);

  // Check for modern framework indicators
  const hasModernFramework =
    element.hasAttribute('data-testid') ||
    element.hasAttribute('data-cy') ||
    element.hasAttribute('data-automation-id');

  // Check if element contains form-like attributes
  const hasFormAttributes =
    element.hasAttribute('name') ||
    element.hasAttribute('placeholder') ||
    element.hasAttribute('required') ||
    element.hasAttribute('aria-label') ||
    element.hasAttribute('aria-required');

  return (
    (isKnownFramework ||
      hasReactProps ||
      hasVueProps ||
      hasAngularProps ||
      hasSvelteProps ||
      hasQwikProps ||
      hasModernFramework) &&
    hasFormAttributes
  );
};

/**
 * Detect job application specific form elements
 */
const detectJobApplicationElement = (element: Element): boolean => {
  const textContent = element.textContent?.toLowerCase() || '';
  const className = element.className?.toLowerCase() || '';
  const id = element.id?.toLowerCase() || '';
  const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';

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
};

/**
 * Enhanced multi-step form detection
 * Detects forms with step-based navigation and handles them appropriately
 */
const detectMultiStepFormContainers = async (documents: Document[]): Promise<HTMLElement[]> => {
  debug.log('🔍 Starting multi-step form detection...');

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
      debug.error('Error in multi-step form detection:', error);
    }
  }

  debug.log(`📋 Multi-step detection found ${containers.length} containers`);
  return containers;
};

/**
 * Detect step navigation elements (prev/next buttons, step indicators)
 */
const detectStepNavigationElements = (doc: Document): HTMLElement[] => {
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
          debug.log(`📍 Found multi-step form via navigation: ${container.tagName}.${container.className}`);
        }
      }
    } catch (error) {
      debug.log(`Navigation selector failed: ${selector}`, error);
    }
  }

  return containers;
};

/**
 * Detect step content containers
 */
const detectStepContentContainers = (doc: Document): HTMLElement[] => {
  const containers: HTMLElement[] = [];

  // Look for step content patterns
  const stepContentSelectors = [
    '[class*="step-content"], [class*="step-body"], [class*="step-panel"]',
    '[class*="wizard-step"], [class*="form-step"]',
    '[role="tabpanel"][class*="step"], [class*="tab-pane"][class*="step"]',
    '[data-step], [data-step-id], [data-step-name]',
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
            debug.log(`📍 Found multi-step form via step content: ${container.tagName}.${container.className}`);
          }
        }
      }
    } catch (error) {
      debug.log(`Step content selector failed: ${selector}`, error);
    }
  }

  return containers;
};

/**
 * Detect wizard/flow patterns
 */
const detectWizardPatterns = (doc: Document): HTMLElement[] => {
  const containers: HTMLElement[] = [];

  // Look for wizard/flow specific patterns
  const wizardSelectors = [
    '[class*="wizard"], [class*="flow"], [class*="multi-step"]',
    '[data-wizard], [data-flow], [data-multi-step]',
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
            debug.log(`📍 Found wizard/flow form: ${element.tagName}.${element.className}`);
          }
        }
      }
    } catch (error) {
      debug.log(`Wizard selector failed: ${selector}`, error);
    }
  }

  return containers;
};

/**
 * Detect progress indicators
 */
const detectProgressIndicators = (doc: Document): HTMLElement[] => {
  const containers: HTMLElement[] = [];

  // Look for progress indicator patterns
  const progressSelectors = [
    '[role="progressbar"]',
    '[class*="progress"][class*="step"], [class*="step-progress"]',
    '[class*="stepper"], [class*="breadcrumb"][class*="step"]',
    '.progress-bar, .progress-indicator',
  ];

  for (const selector of progressSelectors) {
    try {
      const elements = Array.from(doc.querySelectorAll<HTMLElement>(selector));

      for (const element of elements) {
        // Check if progress indicator shows multiple steps
        const stepTexts = element.textContent || '';
        const hasMultipleSteps =
          /step\s*\d+.*step\s*\d+/i.test(stepTexts) ||
          /\d+.*of.*\d+/i.test(stepTexts) ||
          element.querySelectorAll('[class*="step"], [data-step]').length > 1;

        if (hasMultipleSteps) {
          const container = findMultiStepFormContainer(element);
          if (container && !containers.includes(container)) {
            containers.push(container);
            debug.log(`📍 Found multi-step form via progress indicator: ${container.tagName}.${container.className}`);
          }
        }
      }
    } catch (error) {
      debug.log(`Progress selector failed: ${selector}`, error);
    }
  }

  return containers;
};

/**
 * Find the appropriate container for a multi-step form
 */
const findMultiStepFormContainer = (element: HTMLElement): HTMLElement | null => {
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
};

/**
 * Score a container for multi-step form likelihood
 */
const scoreMultiStepContainer = (container: HTMLElement): number => {
  let score = 0;

  // Check for form-related tags
  if (['FORM', 'FIELDSET'].includes(container.tagName)) {
    score += 20;
  }

  // Check for semantic roles
  const role = container.getAttribute('role');
  if (role === 'form' || role === 'application' || role === 'region') {
    score += 15;
  }

  // Check for multi-step related classes/attributes
  const className = container.className.toLowerCase();
  const hasMultiStepClass = [
    'wizard',
    'multi-step',
    'stepper',
    'flow',
    'steps',
    'form-wizard',
    'step-form',
    'application-form',
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
};

/**
 * Process and optimize multi-step containers
 */
const processMultiStepContainers = (containers: HTMLElement[]): HTMLElement[] => {
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
};

/**
 * Enhanced form definition data processing
 * Extracts and normalizes form configuration from various API response formats
 */

// Zod schemas for form definition data types

// Validation rule schema for form fields
const ValidationRuleSchema = z.object({
  type: z.string().optional(),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  message: z.string().optional(),
  pattern: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  required: z.boolean().optional(),
});
// Type alias used in ValidationRulesSchema union type

type _ValidationRule = z.infer<typeof ValidationRuleSchema>;

const ValidationRulesSchema = z.record(
  z.string(),
  z.union([ValidationRuleSchema, z.string(), z.number(), z.boolean()]),
);
type ValidationRules = z.infer<typeof ValidationRulesSchema>;

// Field option schema
const FieldOptionSchema = z.object({
  value: z.union([z.string(), z.number()]).optional(),
  id: z.union([z.string(), z.number()]).optional(),
  key: z.string().optional(),
  label: z.string().optional(),
  text: z.string().optional(),
  name: z.string().optional(),
});
type FieldOption = z.infer<typeof FieldOptionSchema>;

// Raw field data schema from API
const RawFieldDataSchema: z.ZodType<{
  id?: string | number;
  name?: string;
  key?: string;
  type?: string;
  fieldType?: string;
  label?: string;
  title?: string;
  displayName?: string;
  placeholder?: string;
  required?: boolean;
  isRequired?: boolean;
  options?: Array<z.infer<typeof FieldOptionSchema> | string>;
  validation?: z.infer<typeof ValidationRulesSchema>;
  dependencies?: string[];
}> = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string().optional(),
  key: z.string().optional(),
  type: z.string().optional(),
  fieldType: z.string().optional(),
  label: z.string().optional(),
  title: z.string().optional(),
  displayName: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  isRequired: z.boolean().optional(),
  options: z.array(z.union([FieldOptionSchema, z.string()])).optional(),
  validation: ValidationRulesSchema.optional(),
  dependencies: z.array(z.string()).optional(),
});
type RawFieldData = z.infer<typeof RawFieldDataSchema>;

// Raw step data schema from API
const RawStepDataSchema: z.ZodType<{
  id?: string | number;
  name?: string;
  title?: string;
  key?: string;
  label?: string;
  fields?: Array<string | z.infer<typeof RawFieldDataSchema>>;
  order?: number;
}> = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  key: z.string().optional(),
  label: z.string().optional(),
  fields: z.array(z.union([z.string(), RawFieldDataSchema])).optional(),
  order: z.number().optional(),
});
type RawStepData = z.infer<typeof RawStepDataSchema>;

// Processed form field schema
const ProcessedFormFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  label: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  validation: ValidationRulesSchema.optional(),
  step: z.union([z.string(), z.number()]).optional(),
  dependencies: z.array(z.string()).optional(),
  metadata: RawFieldDataSchema.optional(),
});
type ProcessedFormField = z.infer<typeof ProcessedFormFieldSchema>;

// Processed form step schema
const ProcessedFormStepSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  label: z.string().optional(),
  fields: z.array(z.string()),
  order: z.number().optional(),
  metadata: RawStepDataSchema.optional(),
});
type ProcessedFormStep = z.infer<typeof ProcessedFormStepSchema>;

// Normalized API response schema (recursive, using lazy for self-reference)
const NormalizedAPIDataSchema: z.ZodType<{
  fields?: RawFieldData[];
  schema?: {
    fields?: RawFieldData[];
    properties?: Record<string, RawFieldData>;
  };
  steps?: RawStepData[];
  wizard?: {
    steps?: RawStepData[];
  };
  validation?: ValidationRules;
  rules?: ValidationRules;
  constraints?: ValidationRules;
  data?: unknown;
  result?: unknown;
  payload?: unknown;
  pageProps?: unknown;
  form?: unknown;
  formConfig?: unknown;
  formDefinition?: unknown;
}> = z.object({
  fields: z.array(RawFieldDataSchema).optional(),
  schema: z
    .object({
      fields: z.array(RawFieldDataSchema).optional(),
      properties: z.record(z.string(), RawFieldDataSchema).optional(),
    })
    .optional(),
  steps: z.array(RawStepDataSchema).optional(),
  wizard: z
    .object({
      steps: z.array(RawStepDataSchema).optional(),
    })
    .optional(),
  validation: ValidationRulesSchema.optional(),
  rules: ValidationRulesSchema.optional(),
  constraints: ValidationRulesSchema.optional(),
  // Self-referential fields use z.unknown() for simplicity, validated at runtime
  data: z.unknown().optional(),
  result: z.unknown().optional(),
  payload: z.unknown().optional(),
  pageProps: z.unknown().optional(),
  form: z.unknown().optional(),
  formConfig: z.unknown().optional(),
  formDefinition: z.unknown().optional(),
});
type NormalizedAPIData = z.infer<typeof NormalizedAPIDataSchema>;

// Processed form definition schema
const ProcessedFormDefinitionSchema = z.object({
  fields: z.array(ProcessedFormFieldSchema),
  steps: z.array(ProcessedFormStepSchema).optional(),
  validation: ValidationRulesSchema.optional(),
  metadata: NormalizedAPIDataSchema.optional(),
  source: z.string(),
});
type ProcessedFormDefinition = z.infer<typeof ProcessedFormDefinitionSchema>;

/**
 * Type guard for ProcessedFormDefinition using Zod validation
 */
const isProcessedFormDefinition = (value: unknown): value is ProcessedFormDefinition =>
  ProcessedFormDefinitionSchema.safeParse(value).success;

const processFormDefinitionData = (data: unknown, source: string): ProcessedFormDefinition | null => {
  try {
    if (!data || typeof data !== 'object') {
      return null;
    }

    debug.log(`🔍 Processing form definition from ${source}:`, data);

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

    debug.log(`📊 Processed ${result.fields.length} fields and ${result.steps?.length || 0} steps from API response`);

    return result.fields.length > 0 ? result : null;
  } catch (error) {
    debug.error('Error processing form definition data:', error);
    return null;
  }
};

// Schema for plain objects
const PlainObjectSchema = z.record(z.string(), z.unknown());

/**
 * Type guard for objects using Zod validation
 */
const isObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || Array.isArray(value)) return false;
  return PlainObjectSchema.safeParse(value).success;
};

/**
 * Type guard for NormalizedAPIData using Zod validation
 * Checks if the object has any of the expected form definition properties
 */
const isNormalizedAPIData = (value: unknown): value is NormalizedAPIData => {
  // First check if it's a valid object
  if (!isObject(value)) {
    return false;
  }
  // Check if it has any known form definition properties or is empty (valid for normalization)
  const knownProps = ['fields', 'schema', 'steps', 'wizard', 'validation', 'rules', 'constraints'];
  const hasKnownProps = knownProps.some(prop => prop in value) || Object.keys(value).length === 0;
  if (!hasKnownProps) return false;
  // Validate against schema for more strict checking
  return NormalizedAPIDataSchema.safeParse(value).success;
};

/**
 * Normalize different API response formats to a common structure
 */
const normalizeAPIResponse = (data: unknown): NormalizedAPIData => {
  if (!isObject(data)) {
    return {};
  }

  // Handle common wrapper patterns
  if ('data' in data && isObject(data.data)) {
    return normalizeAPIResponse(data.data);
  }

  if ('result' in data && isObject(data.result)) {
    return normalizeAPIResponse(data.result);
  }

  if ('payload' in data && isObject(data.payload)) {
    return normalizeAPIResponse(data.payload);
  }

  // Handle Next.js specific patterns
  if ('pageProps' in data && isObject(data.pageProps)) {
    return normalizeAPIResponse(data.pageProps);
  }

  // Handle nested form configuration
  const formData = data.form || data.formConfig || data.formDefinition;
  if (isObject(formData)) {
    return normalizeAPIResponse(formData);
  }

  // Validate and return the normalized data
  if (isNormalizedAPIData(data)) {
    return data;
  }

  // Return empty object if data doesn't match expected structure
  return {};
};

/**
 * Type guard for RawFieldData using Zod validation
 */
const isRawFieldData = (value: unknown): value is RawFieldData => RawFieldDataSchema.safeParse(value).success;

/**
 * Type guard for RawStepData using Zod validation
 */
const isRawStepData = (value: unknown): value is RawStepData => RawStepDataSchema.safeParse(value).success;

/**
 * Extract field definitions from normalized data
 */
const extractFieldsFromData = (data: NormalizedAPIData): ProcessedFormField[] => {
  const fields: ProcessedFormField[] = [];

  // Strategy 1: Direct fields array
  if (Array.isArray(data.fields)) {
    fields.push(...processFieldsArray(data.fields));
  }

  // Strategy 2: Schema-based fields
  if (data.schema && typeof data.schema === 'object') {
    const schema = data.schema;
    if (Array.isArray(schema.fields)) {
      fields.push(...processFieldsArray(schema.fields));
    }
    if (schema.properties && typeof schema.properties === 'object') {
      fields.push(...processSchemaProperties(schema.properties));
    }
  }

  // Strategy 3: Step-based fields
  if (Array.isArray(data.steps)) {
    for (const step of data.steps) {
      if (isRawStepData(step) && Array.isArray(step.fields)) {
        const rawFields = step.fields.filter((f): f is RawFieldData => isRawFieldData(f));
        const stepFields = processFieldsArray(rawFields);
        stepFields.forEach(field => {
          field.step = String(step.id ?? step.name ?? '');
        });
        fields.push(...stepFields);
      }
    }
  }

  return fields;
};

/**
 * Process an array of field definitions
 */
const processFieldsArray = (fieldsArray: RawFieldData[]): ProcessedFormField[] => {
  const fields: ProcessedFormField[] = [];

  for (const fieldData of fieldsArray) {
    if (isRawFieldData(fieldData)) {
      const field = processFieldDefinition(fieldData);
      if (field) {
        fields.push(field);
      }
    }
  }

  return fields;
};

/**
 * Process schema properties as field definitions
 */
const processSchemaProperties = (properties: Record<string, RawFieldData>): ProcessedFormField[] => {
  const fields: ProcessedFormField[] = [];

  for (const [key, property] of Object.entries(properties)) {
    if (isRawFieldData(property)) {
      const field = processFieldDefinition(property, key);
      if (field) {
        fields.push(field);
      }
    }
  }

  return fields;
};

/**
 * Type guard for FieldOption using Zod validation
 */
const isFieldOption = (value: unknown): value is FieldOption => FieldOptionSchema.safeParse(value).success;

/**
 * Process individual field definition
 */
const processFieldDefinition = (fieldData: RawFieldData, fallbackId?: string): ProcessedFormField | null => {
  try {
    const id = String(fieldData.id ?? fieldData.name ?? fieldData.key ?? fallbackId ?? '');
    if (!id) return null;

    const field: ProcessedFormField = {
      id,
      name: String(fieldData.name ?? id),
      type: normalizeFieldType(String(fieldData.type ?? fieldData.fieldType ?? 'text')),
      label: fieldData.label ?? fieldData.title ?? fieldData.displayName,
      placeholder: fieldData.placeholder,
      required: Boolean(fieldData.required || fieldData.isRequired),
      metadata: fieldData,
    };

    // Extract options for select/radio/checkbox fields
    if (fieldData.options && Array.isArray(fieldData.options)) {
      field.options = fieldData.options.map(option => {
        if (typeof option === 'string') {
          return { value: option, label: option };
        }
        if (isFieldOption(option)) {
          return {
            value: String(option.value ?? option.id ?? option.key ?? ''),
            label: String(option.label ?? option.text ?? option.name ?? option.value ?? ''),
          };
        }
        return { value: String(option), label: String(option) };
      });
    }

    // Extract validation rules
    if (fieldData.validation && typeof fieldData.validation === 'object') {
      field.validation = fieldData.validation;
    }

    // Extract dependencies
    if (fieldData.dependencies && Array.isArray(fieldData.dependencies)) {
      field.dependencies = fieldData.dependencies.map(dep => String(dep));
    }

    return field;
  } catch (error) {
    debug.log('Error processing field definition:', error);
    return null;
  }
};

/**
 * Normalize field type from various formats
 */
const normalizeFieldType = (type: string): string => {
  const normalizedType = type.toLowerCase().trim();

  // Map common variations to standard types
  const typeMap: Record<string, string> = {
    string: 'text',
    varchar: 'text',
    textarea: 'textarea',
    longtext: 'textarea',
    dropdown: 'select',
    combobox: 'select',
    checkbox: 'checkbox',
    radio: 'radio',
    radiobutton: 'radio',
    file: 'file',
    upload: 'file',
    attachment: 'file',
    date: 'date',
    datetime: 'datetime-local',
    time: 'time',
    number: 'number',
    integer: 'number',
    decimal: 'number',
    email: 'email',
    url: 'url',
    tel: 'tel',
    phone: 'tel',
    password: 'password',
    hidden: 'hidden',
  };

  return typeMap[normalizedType] || normalizedType;
};

/**
 * Extract steps from form definition data
 */
const extractStepsFromData = (data: NormalizedAPIData): ProcessedFormStep[] => {
  const steps: ProcessedFormStep[] = [];

  if (Array.isArray(data.steps)) {
    for (const stepData of data.steps) {
      if (isRawStepData(stepData)) {
        const step = processStepDefinition(stepData);
        if (step) {
          steps.push(step);
        }
      }
    }
  }

  // Also check for wizard/flow configuration
  if (data.wizard && typeof data.wizard === 'object') {
    const wizard = data.wizard;
    if (Array.isArray(wizard.steps)) {
      for (const stepData of wizard.steps) {
        if (isRawStepData(stepData)) {
          const step = processStepDefinition(stepData);
          if (step) {
            steps.push(step);
          }
        }
      }
    }
  }

  return steps;
};

/**
 * Process individual step definition
 */
const processStepDefinition = (stepData: RawStepData): ProcessedFormStep | null => {
  try {
    const id = stepData.id ?? stepData.name ?? stepData.key;
    if (id === undefined) return null;

    const step: ProcessedFormStep = {
      id: id,
      name: String(stepData.name ?? stepData.title ?? id),
      label: stepData.label,
      fields: [],
      order: stepData.order,
      metadata: stepData,
    };

    // Extract field IDs/names for this step
    if (Array.isArray(stepData.fields)) {
      step.fields = stepData.fields.map(field => {
        if (typeof field === 'string') return field;
        if (isRawFieldData(field)) {
          return String(field.id ?? field.name ?? field.key ?? '');
        }
        return String(field);
      });
    }

    return step;
  } catch (error) {
    debug.log('Error processing step definition:', error);
    return null;
  }
};

/**
 * Extract validation rules from form definition data
 */
const extractValidationFromData = (data: NormalizedAPIData): ValidationRules => {
  const validation: ValidationRules = {};

  if (data.validation && typeof data.validation === 'object') {
    Object.assign(validation, data.validation);
  }

  if (data.rules && typeof data.rules === 'object') {
    Object.assign(validation, data.rules);
  }

  if (data.constraints && typeof data.constraints === 'object') {
    Object.assign(validation, data.constraints);
  }

  return validation;
};

/**
 * Get processed form definitions for a document
 */
export const getProcessedFormDefinitions = (doc: Document): ProcessedFormDefinition[] => {
  const monitor = apiResponseMonitors.get(doc);
  if (!monitor) return [];

  const definitions: ProcessedFormDefinition[] = [];

  for (const [_url, responseData] of monitor.interceptedResponses) {
    if (
      responseData &&
      typeof responseData === 'object' &&
      hasProperty(responseData, 'processed') &&
      responseData.processed &&
      isProcessedFormDefinition(responseData.processed)
    ) {
      definitions.push(responseData.processed);
    }
  }

  return definitions;
};

/**
 * Enhance detected fields with API response data.
 * Correlates API-defined form fields to detected DOM elements, finding
 * any fields that were missed during DOM-based detection.
 */
const enhanceDetectionWithAPIData = (
  fields: HTMLElement[],
  container: HTMLElement,
  doc: Document = document,
): HTMLElement[] => {
  try {
    const apiDefinitions = getProcessedFormDefinitions(doc);
    if (!apiDefinitions || apiDefinitions.length === 0) return fields;

    const fieldSet = new Set(fields);

    // Match API-defined fields to detected DOM elements
    for (const definition of apiDefinitions) {
      if (definition.fields) {
        for (const apiField of definition.fields) {
          // Check if we already have this field
          const alreadyDetected = fields.some(el => {
            const name = el.getAttribute('name') || el.getAttribute('id') || '';
            const label = el.getAttribute('aria-label') || '';
            return name === apiField.name || name === apiField.id || label === apiField.label;
          });

          if (!alreadyDetected) {
            // Try to find the element in DOM by name/id/label
            const selectors = [
              apiField.name ? `[name="${apiField.name}"]` : null,
              apiField.id ? `#${CSS.escape(apiField.id)}` : null,
              apiField.id ? `[id="${apiField.id}"]` : null,
              apiField.label ? `[aria-label="${apiField.label}"]` : null,
            ].filter(Boolean);

            for (const selector of selectors) {
              try {
                const el = container.querySelector(selector as string);
                if (el instanceof HTMLElement && !fieldSet.has(el)) {
                  fieldSet.add(el);
                  fields.push(el);
                  break;
                }
              } catch {
                // Invalid selector, skip
              }
            }
          }
        }
      }
    }

    return fields;
  } catch {
    return fields;
  }
};

/**
 * Listen for HTMX content swaps and re-trigger detection.
 * Returns a cleanup function to remove the event listeners.
 */
const initializeHTMXSwapListener = (onSwap: (target: HTMLElement) => void): (() => void) => {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent;
    const target = customEvent.detail?.target || customEvent.target;
    if (target instanceof HTMLElement) {
      onSwap(target);
    }
  };

  document.addEventListener('htmx:afterSwap', handler);
  document.addEventListener('htmx:afterSettle', handler);

  return () => {
    document.removeEventListener('htmx:afterSwap', handler);
    document.removeEventListener('htmx:afterSettle', handler);
  };
};

/**
 * Watch for conditionally rendered form fields via MutationObserver.
 * Observes the given container for new form field elements added to the DOM.
 * After the specified duration, the observer disconnects and reports any new fields found.
 * Returns a cleanup function to stop observation early.
 */
const watchForConditionalFields = (
  container: HTMLElement,
  onNewFields: (elements: HTMLElement[]) => void,
  duration: number = 500,
): (() => void) => {
  const newElements: HTMLElement[] = [];

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node instanceof HTMLElement) {
          // Check if the added node contains form fields
          const inputs = node.querySelectorAll(
            'input, select, textarea, [role="textbox"], [role="combobox"], [role="checkbox"], [role="radio"]',
          );
          inputs.forEach(el => {
            if (el instanceof HTMLElement && !el.hasAttribute('data-filliny-id')) {
              newElements.push(el);
            }
          });
          // Check the node itself
          if (
            node.matches('input, select, textarea, [role="textbox"], [role="combobox"]') &&
            !node.hasAttribute('data-filliny-id')
          ) {
            newElements.push(node);
          }
        }
      }
    }
  });

  observer.observe(container, { childList: true, subtree: true });

  const timer = window.setTimeout(() => {
    observer.disconnect();
    if (newElements.length > 0) {
      onNewFields(newElements);
    }
  }, duration);

  return () => {
    observer.disconnect();
    clearTimeout(timer);
  };
};

/**
 * Detect form containers inside open dialogs, popovers, and modal elements.
 * These containers may hold forms that are not part of the main document flow.
 */
const detectFormsInDialogsAndPopovers = (doc: Document = document): HTMLElement[] => {
  const containers: HTMLElement[] = [];

  try {
    // Open dialogs
    const dialogs = doc.querySelectorAll('dialog[open]');
    dialogs.forEach(dialog => {
      if (dialog instanceof HTMLElement) containers.push(dialog);
    });

    // Popover elements (HTML Popover API)
    try {
      const popovers = doc.querySelectorAll('[popover]:popover-open');
      popovers.forEach(popover => {
        if (popover instanceof HTMLElement) containers.push(popover);
      });
    } catch {
      // :popover-open may not be supported in all browsers
    }

    // Modal elements
    const modals = doc.querySelectorAll('[role="dialog"][aria-modal="true"]');
    modals.forEach(modal => {
      if (modal instanceof HTMLElement) {
        const style = window.getComputedStyle(modal);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          containers.push(modal);
        }
      }
    });
  } catch {
    // Detection failed, return empty
  }

  return containers;
};

export {
  enhanceDetectionWithAPIData,
  initializeHTMXSwapListener,
  watchForConditionalFields,
  detectFormsInDialogsAndPopovers,
};
