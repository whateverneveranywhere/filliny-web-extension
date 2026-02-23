import { FieldFillButton } from './FieldFillButton';
import { handleFieldFill } from '../';
import { detectFormLikeContainers } from '../detectionHelpers';
import { formFillStore, StreamingPhase } from '../stores';
import { runTestModeFill } from '../testModeHelpers';
import { unifiedFieldRegistry } from '../unifiedFieldDetection';
import { FieldTypeEnum } from '@extension/shared';
import { useEffect, useState, useCallback, useRef } from 'react';
import type { FieldButtonData } from '../unifiedFieldDetection';
import type { Field } from '@extension/shared';
import type React from 'react';

const MAX_DETECT_ATTEMPTS = 5;
const RETRY_DELAY = 1000;
// Reduced from 1500ms since incremental changes are much cheaper than full re-scans
const INCREMENTAL_DEBOUNCE_DELAY = 300;
// Performance limit: Maximum number of field buttons to track
const MAX_FIELD_BUTTONS = 50;
// Interval for pruning disconnected fields (ms)
const PRUNE_INTERVAL = 5000;
// Adaptive throttling: if more than this many relevant mutations fire in THROTTLE_WINDOW_MS,
// increase debounce delay temporarily
const THROTTLE_MUTATION_COUNT = 10;
const THROTTLE_WINDOW_MS = 2000;
const THROTTLED_DEBOUNCE_DELAY = 1500;

const FORM_FIELD_SELECTORS =
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), select, textarea, [role="textbox"], [role="combobox"], [role="checkbox"], [role="radio"], [role="switch"], [contenteditable="true"], [contenteditable=""]';

const isFormField = (node: Node): boolean => {
  if (!(node instanceof HTMLElement)) return false;

  return (
    node instanceof HTMLInputElement ||
    node instanceof HTMLSelectElement ||
    node instanceof HTMLTextAreaElement ||
    node.getAttribute('role') === 'textbox' ||
    node.getAttribute('role') === 'combobox' ||
    node.getAttribute('role') === 'checkbox' ||
    node.getAttribute('role') === 'radio' ||
    node.getAttribute('role') === 'switch' ||
    node.hasAttribute('contenteditable')
  );
};

/**
 * Find all form field elements within a node (the node itself + descendants)
 */
const findFormFieldsInNode = (node: Node): HTMLElement[] => {
  if (!(node instanceof HTMLElement)) return [];

  const fields: HTMLElement[] = [];
  if (isFormField(node)) fields.push(node);

  try {
    const descendants = node.querySelectorAll<HTMLElement>(FORM_FIELD_SELECTORS);
    fields.push(...Array.from(descendants));
  } catch {
    // querySelectorAll may fail on some nodes
  }

  return fields;
};

/**
 * Check if a fill operation is in progress (streaming or finalizing).
 * Used to suppress re-detection during fill operations.
 */
const isFillInProgress = (): boolean => {
  const phase = formFillStore.getState().phase;
  return phase === StreamingPhase.STREAMING || phase === StreamingPhase.FINALIZING;
};

/**
 * Calculate distance from a point to the center of a DOMRect.
 */
const distanceToRect = (point: { x: number; y: number }, rect: DOMRect): number => {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return Math.sqrt((point.x - cx) ** 2 + (point.y - cy) ** 2);
};

interface FieldFillManagerProps {
  canFillForms?: boolean;
  disabledReason?: string | null;
}

export const FieldFillManager: React.FC<FieldFillManagerProps> = ({ canFillForms = true, disabledReason = null }) => {
  // All detected fields (lightweight metadata only, no React components rendered yet)
  const [allFields, setAllFields] = useState<FieldButtonData[]>([]);
  // Only fields whose elements are currently visible in the viewport get rendered
  const [visibleFieldIds, setVisibleFieldIds] = useState<Set<string>>(new Set());
  const [isInitialDetectionDone, setIsInitialDetectionDone] = useState(false);
  const detectAttempts = useRef(0);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleCallbackRef = useRef<number | null>(null);

  // Focus-area tracking refs
  const mousePositionRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  // Adaptive throttling state
  const mutationTimestampsRef = useRef<number[]>([]);

  // Ref to allFields for use in callbacks without stale closures
  const allFieldsRef = useRef<FieldButtonData[]>([]);
  allFieldsRef.current = allFields;

  // Map from element to fieldId for the IntersectionObserver
  const elementToFieldIdRef = useRef<Map<Element, string>>(new Map());
  // Ref to visible IDs maintained by the IntersectionObserver callback
  const visibleIdsRef = useRef<Set<string>>(new Set());

  // Enhanced visibility and interactivity check
  const isElementVisibleAndInteractive = useCallback((element: HTMLElement): boolean => {
    try {
      if (element.hasAttribute('disabled') || element.hasAttribute('readonly')) return false;

      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') return false;

      const rect = element.getBoundingClientRect();
      const isCheckableInput =
        element instanceof HTMLInputElement &&
        (element.type === FieldTypeEnum.CHECKBOX || element.type === FieldTypeEnum.RADIO);

      if (!isCheckableInput && (rect.width === 0 || rect.height === 0)) return false;
      if (element.getAttribute('aria-hidden') === 'true' || element.getAttribute('role') === 'presentation')
        return false;
      if (!document.body.contains(element)) return false;

      return true;
    } catch {
      return false;
    }
  }, []);

  // --- IntersectionObserver management ---
  // Set up IntersectionObserver for viewport-aware lazy rendering.
  // Only fields currently in the viewport (with 200px margin) get FieldFillButton components.
  const setupIntersectionObserver = useCallback((fields: FieldButtonData[]) => {
    // Disconnect previous observer
    intersectionObserverRef.current?.disconnect();

    const visibleIds = new Set<string>();
    const elementToFieldId = new Map<Element, string>();

    const observer = new IntersectionObserver(
      entries => {
        let changed = false;
        for (const entry of entries) {
          const fieldId = elementToFieldId.get(entry.target);
          if (!fieldId) continue;

          // Clean up disconnected elements
          if (!entry.target.isConnected) {
            elementToFieldId.delete(entry.target);
            if (visibleIds.has(fieldId)) {
              visibleIds.delete(fieldId);
              changed = true;
            }
            continue;
          }

          if (entry.isIntersecting && !visibleIds.has(fieldId)) {
            visibleIds.add(fieldId);
            changed = true;
          } else if (!entry.isIntersecting && visibleIds.has(fieldId)) {
            visibleIds.delete(fieldId);
            changed = true;
          }
        }

        if (changed) {
          visibleIdsRef.current = new Set(visibleIds);
          setVisibleFieldIds(new Set(visibleIds));
        }
      },
      {
        rootMargin: '200px',
        threshold: 0,
      },
    );

    for (const fieldData of fields) {
      if (fieldData.element?.isConnected) {
        elementToFieldId.set(fieldData.element, fieldData.field.id);
        observer.observe(fieldData.element);
      }
    }

    elementToFieldIdRef.current = elementToFieldId;
    visibleIdsRef.current = visibleIds;
    intersectionObserverRef.current = observer;
  }, []);

  // Observe a single new field element in the existing IntersectionObserver
  const observeField = useCallback((fieldData: FieldButtonData) => {
    const observer = intersectionObserverRef.current;
    if (!observer || !fieldData.element?.isConnected) return;

    elementToFieldIdRef.current.set(fieldData.element, fieldData.field.id);
    observer.observe(fieldData.element);
  }, []);

  // Unobserve a single field element from the IntersectionObserver
  const unobserveField = useCallback((element: HTMLElement, fieldId: string) => {
    const observer = intersectionObserverRef.current;
    if (observer) {
      try {
        observer.unobserve(element);
      } catch {
        // Element may already be disconnected
      }
    }
    elementToFieldIdRef.current.delete(element);
    if (visibleIdsRef.current.has(fieldId)) {
      visibleIdsRef.current.delete(fieldId);
      setVisibleFieldIds(new Set(visibleIdsRef.current));
    }
  }, []);

  // --- Full detection (initial + manual retry + post-bulk-fill) ---

  const detectAllFields = useCallback(async () => {
    if (isFillInProgress()) {
      console.debug('FieldFillManager: Skipping detection, fill in progress');
      return;
    }

    try {
      unifiedFieldRegistry.clear();

      const formContainers = await detectFormLikeContainers();

      // Remove ancestor containers when more specific descendants exist
      let filteredContainers: HTMLElement[];
      if (formContainers.length === 0) {
        filteredContainers = [document.body];
      } else {
        filteredContainers = formContainers.filter((container, i) => {
          if (container === document.body) return false;
          return !formContainers.some((other, j) => i !== j && container.contains(other) && container !== other);
        });
        if (filteredContainers.length === 0) {
          filteredContainers = formContainers;
        }
      }

      // Sort containers by proximity to current mouse/focus area
      const mousePos = mousePositionRef.current;
      filteredContainers.sort((a, b) => {
        const rectA = a.getBoundingClientRect();
        const rectB = b.getBoundingClientRect();
        return distanceToRect(mousePos, rectA) - distanceToRect(mousePos, rectB);
      });

      // Process containers incrementally to avoid blocking the main thread
      const allFieldButtons: FieldButtonData[] = [];

      const processContainer = async (container: HTMLElement, index: number): Promise<FieldButtonData[]> => {
        const containerId = `container-${index}`;
        try {
          // Early termination if we've hit the field limit
          if (unifiedFieldRegistry.getFieldCount() >= MAX_FIELD_BUTTONS) {
            console.debug('FieldFillManager: Field limit reached, skipping container');
            return [];
          }
          await unifiedFieldRegistry.registerContainer(container, containerId);
          return unifiedFieldRegistry.getFieldButtonsData(containerId);
        } catch (error) {
          console.error(`Error registering container ${containerId}:`, error);
          return [];
        }
      };

      // Yield to main thread between containers using requestIdleCallback
      const yieldToMain = (): Promise<void> =>
        new Promise(resolve => {
          if ('requestIdleCallback' in window) {
            requestIdleCallback(() => resolve(), { timeout: 100 });
          } else {
            setTimeout(resolve, 0);
          }
        });

      for (let i = 0; i < filteredContainers.length; i++) {
        // Yield between containers to keep UI responsive
        if (i > 0) await yieldToMain();

        // Check if fill started during detection
        if (isFillInProgress()) {
          console.debug('FieldFillManager: Fill started during detection, aborting');
          return;
        }

        // Early termination if we've hit the field limit
        if (allFieldButtons.length >= MAX_FIELD_BUTTONS) {
          console.debug('FieldFillManager: Field button limit reached, stopping container processing');
          break;
        }

        const containerButtons = await processContainer(filteredContainers[i], i);
        allFieldButtons.push(...containerButtons);
      }

      // Multi-layer deduplication ensures exactly one button per field
      const uniqueButtons = new Map<HTMLElement, FieldButtonData>();
      const seenFieldIds = new Set<string>();
      const seenFillinyIds = new Set<string>();
      const seenFieldNames = new Set<string>();
      const seenLabelledFields = new Set<string>();

      for (const buttonData of allFieldButtons) {
        if (uniqueButtons.has(buttonData.element)) continue;
        if (buttonData.field.id && seenFieldIds.has(buttonData.field.id)) continue;

        const fillinyId = buttonData.element.getAttribute('data-filliny-id');
        if (fillinyId && seenFillinyIds.has(fillinyId)) continue;

        const fieldName = buttonData.field.name;
        if (fieldName && buttonData.type !== 'grouped' && seenFieldNames.has(fieldName)) continue;

        // Check if this element is a label for a field that already has a button
        const element = buttonData.element;
        if (element instanceof HTMLLabelElement) {
          const forAttr = element.getAttribute('for');
          if (forAttr && seenLabelledFields.has(forAttr)) continue;
        }
        // Also check if a label for THIS field's element already has a button
        const elementId = element.id || element.getAttribute('data-filliny-id');
        if (elementId) {
          const existingLabel = document.querySelector(`label[for="${elementId}"]`);
          if (existingLabel && uniqueButtons.has(existingLabel as HTMLElement)) continue;
          seenLabelledFields.add(elementId);
        }

        uniqueButtons.set(buttonData.element, buttonData);
        if (buttonData.field.id) seenFieldIds.add(buttonData.field.id);
        if (fillinyId) seenFillinyIds.add(fillinyId);
        if (fieldName && buttonData.type !== 'grouped') seenFieldNames.add(fieldName);
      }

      const validFieldButtons = Array.from(uniqueButtons.values())
        .filter(buttonData => buttonData.element && isElementVisibleAndInteractive(buttonData.element))
        .slice(0, MAX_FIELD_BUTTONS);

      if (validFieldButtons.length > 0) {
        setAllFields(validFieldButtons);
        setupIntersectionObserver(validFieldButtons);
        setIsInitialDetectionDone(true);
      } else if (detectAttempts.current < MAX_DETECT_ATTEMPTS) {
        detectAttempts.current++;
        setTimeout(detectAllFields, RETRY_DELAY);
      }
    } catch (error) {
      console.error('Error in unified field detection:', error);
    }
  }, [isElementVisibleAndInteractive, setupIntersectionObserver]);

  // --- Incremental mutation handling ---

  /**
   * Get effective debounce delay. Uses adaptive throttling: if mutations
   * are firing very frequently, use a longer delay.
   */
  const getEffectiveDebounceDelay = useCallback((): number => {
    const now = Date.now();
    const timestamps = mutationTimestampsRef.current;

    // Add current timestamp
    timestamps.push(now);

    // Remove timestamps outside the window
    const cutoff = now - THROTTLE_WINDOW_MS;
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift();
    }

    // If too many mutations in window, use throttled delay
    if (timestamps.length > THROTTLE_MUTATION_COUNT) {
      return THROTTLED_DEBOUNCE_DELAY;
    }

    return INCREMENTAL_DEBOUNCE_DELAY;
  }, []);

  /**
   * Handle incremental additions: register new field elements discovered via mutation.
   */
  const handleIncrementalAdditions = useCallback(
    async (elements: HTMLElement[]) => {
      if (elements.length === 0) return;

      const newButtonsData: FieldButtonData[] = [];

      for (const element of elements) {
        // Skip if already registered or at capacity
        if (unifiedFieldRegistry.hasElement(element)) continue;
        if (unifiedFieldRegistry.getFieldCount() >= MAX_FIELD_BUTTONS) {
          console.debug('FieldFillManager: Field limit reached, skipping incremental registration');
          break;
        }

        // Skip hidden/disabled elements
        if (!isElementVisibleAndInteractive(element)) continue;

        try {
          await unifiedFieldRegistry.registerIncrementalField(element);
          // Get the button data for this newly registered element
          const fieldId = unifiedFieldRegistry.getFieldIdByElement(element);
          if (fieldId) {
            const fieldInfo = unifiedFieldRegistry.getField(fieldId);
            if (fieldInfo) {
              newButtonsData.push({
                field: fieldInfo.field,
                element,
                type: fieldInfo.isGrouped ? 'grouped' : 'individual',
                groupId: fieldInfo.groupId,
              });
            }
          }
        } catch (error) {
          console.debug('Failed to register incremental field:', error);
        }
      }

      if (newButtonsData.length > 0) {
        setAllFields(prev => {
          const existingIds = new Set(prev.map(f => f.field.id));
          const truly = newButtonsData.filter(b => !existingIds.has(b.field.id));
          if (truly.length === 0) return prev;

          const updated = [...prev, ...truly].slice(0, MAX_FIELD_BUTTONS);
          // Observe new fields in the IntersectionObserver
          for (const bd of truly) {
            observeField(bd);
          }
          return updated;
        });
      }
    },
    [isElementVisibleAndInteractive, observeField],
  );

  /**
   * Handle incremental removals: remove field elements that left the DOM.
   */
  const handleIncrementalRemovals = useCallback(
    (elements: HTMLElement[]) => {
      if (elements.length === 0) return;

      const removedIds: string[] = [];
      for (const element of elements) {
        const fieldId = unifiedFieldRegistry.removeFieldByElement(element);
        if (fieldId) {
          removedIds.push(fieldId);
          unobserveField(element, fieldId);
        }
      }

      if (removedIds.length > 0) {
        const removedSet = new Set(removedIds);
        setAllFields(prev => prev.filter(f => !removedSet.has(f.field.id)));
      }
    },
    [unobserveField],
  );

  // Debounced handler for batched incremental additions
  const pendingAdditionsRef = useRef<Set<HTMLElement>>(new Set());
  const pendingRemovalsRef = useRef<Set<HTMLElement>>(new Set());

  const flushPendingMutations = useCallback(() => {
    const additions = Array.from(pendingAdditionsRef.current);
    const removals = Array.from(pendingRemovalsRef.current);
    pendingAdditionsRef.current.clear();
    pendingRemovalsRef.current.clear();

    // Process removals first (synchronous)
    if (removals.length > 0) {
      handleIncrementalRemovals(removals);
    }

    // Process additions (async)
    if (additions.length > 0) {
      handleIncrementalAdditions(additions).catch(error => {
        console.debug('Error in incremental additions:', error);
      });
    }
  }, [handleIncrementalAdditions, handleIncrementalRemovals]);

  const scheduleIncrementalFlush = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const delay = getEffectiveDebounceDelay();
    debounceTimerRef.current = setTimeout(flushPendingMutations, delay);
  }, [flushPendingMutations, getEffectiveDebounceDelay]);

  // --- Focus-area tracking ---
  useEffect(() => {
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        mousePositionRef.current = { x: e.clientX, y: e.clientY };
        throttleTimer = null;
      }, 500);
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, []);

  // --- Periodic stale field pruning ---
  useEffect(() => {
    if (!isInitialDetectionDone) return;

    let pruneTimer: ReturnType<typeof setTimeout> | null = null;

    const schedulePrune = () => {
      pruneTimer = setTimeout(() => {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(
            () => {
              doPrune();
              schedulePrune();
            },
            { timeout: 2000 },
          );
        } else {
          doPrune();
          schedulePrune();
        }
      }, PRUNE_INTERVAL);
    };

    const doPrune = () => {
      const removedIds = unifiedFieldRegistry.pruneDetachedFields();
      if (removedIds.length > 0) {
        const removedSet = new Set(removedIds);
        setAllFields(prev => prev.filter(f => !removedSet.has(f.field.id)));
        // Clean up IntersectionObserver entries
        for (const [element, fieldId] of elementToFieldIdRef.current) {
          if (removedSet.has(fieldId)) {
            try {
              intersectionObserverRef.current?.unobserve(element);
            } catch {
              // Element may already be disconnected
            }
            elementToFieldIdRef.current.delete(element);
          }
        }
      }
    };

    schedulePrune();

    return () => {
      if (pruneTimer) clearTimeout(pruneTimer);
    };
  }, [isInitialDetectionDone]);

  // --- Initialize detection on mount + incremental MutationObserver ---
  useEffect(() => {
    if (!isInitialDetectionDone) {
      const handleDOMReady = () => {
        detectAllFields().then(() => {
          setIsInitialDetectionDone(true);
        });
      };

      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        handleDOMReady();
      } else {
        window.addEventListener('DOMContentLoaded', handleDOMReady, { once: true });
      }
    }

    if (!isInitialDetectionDone) return;

    // Incremental MutationObserver: handle additions and removals separately
    const observer = new MutationObserver(mutations => {
      if (document.body.dataset.fillinyUpdating === 'true' || isFillInProgress()) return;

      let hasAdditions = false;
      let hasRemovals = false;
      let hasAttributeChanges = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // Collect added form fields
          for (const addedNode of Array.from(mutation.addedNodes)) {
            const fields = findFormFieldsInNode(addedNode);
            for (const field of fields) {
              pendingAdditionsRef.current.add(field);
              hasAdditions = true;
            }
          }

          // Collect removed form fields
          for (const removedNode of Array.from(mutation.removedNodes)) {
            const fields = findFormFieldsInNode(removedNode);
            for (const field of fields) {
              pendingRemovalsRef.current.add(field);
              // Also remove from pending additions if it was just added+removed
              pendingAdditionsRef.current.delete(field);
              hasRemovals = true;
            }
          }
        }

        if (mutation.type === 'attributes') {
          const attr = mutation.attributeName || '';
          // Skip filliny's own attribute changes
          if (attr.startsWith('data-filliny')) continue;

          const target = mutation.target;
          if (target instanceof HTMLElement) {
            // If target is a tracked field and became hidden/disabled, schedule removal
            if (unifiedFieldRegistry.hasElement(target)) {
              const style = window.getComputedStyle(target);
              const isHidden =
                style.display === 'none' ||
                style.visibility === 'hidden' ||
                target.hasAttribute('disabled') ||
                target.getAttribute('aria-hidden') === 'true';
              if (isHidden) {
                pendingRemovalsRef.current.add(target);
                hasRemovals = true;
              }
            } else if (isFormField(target)) {
              // If target is a form field that's NOT tracked and is now visible, schedule addition
              pendingAdditionsRef.current.add(target);
              hasAdditions = true;
            }
            hasAttributeChanges = true;
          }
        }
      }

      if (hasAdditions || hasRemovals || hasAttributeChanges) {
        scheduleIncrementalFlush();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'disabled', 'readonly', 'type', 'aria-hidden', 'hidden'],
    });

    // Full re-detection only on bulk fill complete
    const handleBulkFillComplete = () => {
      console.debug('FieldFillManager: Bulk fill complete, re-running full detection...');
      detectAllFields();
    };

    document.addEventListener('filliny:bulkFillComplete', handleBulkFillComplete);

    return () => {
      observer.disconnect();
      document.removeEventListener('filliny:bulkFillComplete', handleBulkFillComplete);
    };
  }, [detectAllFields, isInitialDetectionDone, scheduleIncrementalFlush]);

  // Handle field fill - throws on error so FieldFillButton can show error state
  const handleFillField = useCallback(async (field: Field, useTestMode: boolean = false) => {
    console.debug(`Filling field: ${field.id} (${field.type}) in ${useTestMode ? 'test' : 'AI'} mode`);

    if (useTestMode) {
      await runTestModeFill([field]);
    } else {
      const result = await handleFieldFill(field);
      if (!result.success) {
        throw result.error || new Error(`Failed to fill field ${field.id}`);
      }
    }
  }, []);

  // Clean up when component unmounts
  useEffect(
    () => () => {
      intersectionObserverRef.current?.disconnect();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (idleCallbackRef.current && 'cancelIdleCallback' in window) {
        cancelIdleCallback(idleCallbackRef.current);
      }
      unifiedFieldRegistry.fullClear();
    },
    [],
  );

  // Only render FieldFillButton for fields currently visible in the viewport
  const visibleButtons = allFields.filter(f => visibleFieldIds.has(f.field.id));

  return (
    <>
      {visibleButtons.map(buttonData => (
        <FieldFillButton
          key={buttonData.field.id}
          fieldElement={buttonData.element}
          field={buttonData.field}
          onFill={handleFillField}
          canFillForms={canFillForms}
          disabledReason={disabledReason}
        />
      ))}
    </>
  );
};
