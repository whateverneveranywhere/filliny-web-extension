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
const MUTATION_DEBOUNCE_DELAY = 1500;
// Performance limit: Maximum number of field buttons to track
const MAX_FIELD_BUTTONS = 50;

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
 * Check if a fill operation is in progress (streaming or finalizing).
 * Used to suppress re-detection during fill operations.
 */
const isFillInProgress = (): boolean => {
  const phase = formFillStore.getState().phase;
  return phase === StreamingPhase.STREAMING || phase === StreamingPhase.FINALIZING;
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

          if (entry.isIntersecting && !visibleIds.has(fieldId)) {
            visibleIds.add(fieldId);
            changed = true;
          } else if (!entry.isIntersecting && visibleIds.has(fieldId)) {
            visibleIds.delete(fieldId);
            changed = true;
          }
        }

        if (changed) {
          setVisibleFieldIds(new Set(visibleIds));
        }
      },
      {
        // 200px margin around viewport so buttons appear just before scrolling into view
        rootMargin: '200px',
        threshold: 0,
      },
    );

    for (const fieldData of fields) {
      if (fieldData.element && fieldData.element.isConnected) {
        elementToFieldId.set(fieldData.element, fieldData.field.id);
        observer.observe(fieldData.element);
      }
    }

    intersectionObserverRef.current = observer;
  }, []);

  // Enhanced field detection using unified registry
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

      // Process containers incrementally to avoid blocking the main thread
      const allFieldButtons: FieldButtonData[] = [];

      const processContainer = async (container: HTMLElement, index: number): Promise<FieldButtonData[]> => {
        const containerId = `container-${index}`;
        try {
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

        const containerButtons = await processContainer(filteredContainers[i], i);
        allFieldButtons.push(...containerButtons);
      }

      // Multi-layer deduplication ensures exactly one button per field
      const uniqueButtons = new Map<HTMLElement, FieldButtonData>();
      const seenFieldIds = new Set<string>();
      const seenFillinyIds = new Set<string>();
      const seenFieldNames = new Set<string>();
      // Additional dedup: prevent buttons on label elements when the field itself already has a button
      const seenLabelledFields = new Set<string>();

      allFieldButtons.forEach(buttonData => {
        if (uniqueButtons.has(buttonData.element)) return;
        if (buttonData.field.id && seenFieldIds.has(buttonData.field.id)) return;

        const fillinyId = buttonData.element.getAttribute('data-filliny-id');
        if (fillinyId && seenFillinyIds.has(fillinyId)) return;

        const fieldName = buttonData.field.name;
        if (fieldName && buttonData.type !== 'grouped' && seenFieldNames.has(fieldName)) return;

        // Check if this element is a label for a field that already has a button
        const element = buttonData.element;
        if (element instanceof HTMLLabelElement) {
          const forAttr = element.getAttribute('for');
          if (forAttr && seenLabelledFields.has(forAttr)) return;
        }
        // Also check if a label for THIS field's element already has a button
        const elementId = element.id || element.getAttribute('data-filliny-id');
        if (elementId) {
          const existingLabel = document.querySelector(`label[for="${elementId}"]`);
          if (existingLabel && uniqueButtons.has(existingLabel as HTMLElement)) return;
          seenLabelledFields.add(elementId);
        }

        uniqueButtons.set(buttonData.element, buttonData);
        if (buttonData.field.id) seenFieldIds.add(buttonData.field.id);
        if (fillinyId) seenFillinyIds.add(fillinyId);
        if (fieldName && buttonData.type !== 'grouped') seenFieldNames.add(fieldName);
      });

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

  // Debounced detection helper
  const debouncedDetect = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(detectAllFields, MUTATION_DEBOUNCE_DELAY);
  }, [detectAllFields]);

  // Initialize detection on mount
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

    const observer = new MutationObserver(mutations => {
      if (document.body.dataset.fillinyUpdating === 'true' || isFillInProgress()) return;

      const isRelevantMutation = mutations.some(mutation => {
        if (mutation.type === 'attributes') {
          const attr = mutation.attributeName || '';
          if (attr.startsWith('data-filliny') || attr === 'style') return false;
          return true;
        }
        if (mutation.type === 'childList') {
          return (
            Array.from(mutation.addedNodes).some(isFormField) || Array.from(mutation.removedNodes).some(isFormField)
          );
        }
        return false;
      });

      if (isRelevantMutation) {
        debouncedDetect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'disabled', 'readonly', 'type'],
    });

    const handleBulkFillComplete = () => {
      console.debug('FieldFillManager: Bulk fill complete, re-running detection...');
      debouncedDetect();
    };

    document.addEventListener('filliny:bulkFillComplete', handleBulkFillComplete);

    return () => {
      observer.disconnect();
      document.removeEventListener('filliny:bulkFillComplete', handleBulkFillComplete);
    };
  }, [detectAllFields, isInitialDetectionDone, debouncedDetect]);

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
