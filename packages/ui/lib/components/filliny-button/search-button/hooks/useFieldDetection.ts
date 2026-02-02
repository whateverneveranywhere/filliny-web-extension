import { detectFormLikeContainers } from '../detectionHelpers';
import { unifiedFieldRegistry } from '../unifiedFieldDetection';
import { useEffect, useState, useCallback, useRef } from 'react';
import type { FieldButtonData } from '../unifiedFieldDetection';

const MAX_DETECT_ATTEMPTS = 5;
const RETRY_DELAY = 1000;
const MUTATION_DEBOUNCE_DELAY = 1000;

/**
 * Checks if a node is a form field element
 */
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
 * Checks if an element is visible and interactive
 */
const isElementVisibleAndInteractive = (element: HTMLElement): boolean => {
  try {
    // Skip if element is disabled or readonly
    if (element.hasAttribute('disabled') || element.hasAttribute('readonly')) {
      return false;
    }

    // Skip if element is hidden
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }

    // Check if element has dimensions or is a functional radio/checkbox
    const rect = element.getBoundingClientRect();
    const isCheckableInput =
      element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio');

    // Allow checkable inputs even if they have zero dimensions (they might be custom styled)
    if (!isCheckableInput && (rect.width === 0 || rect.height === 0)) {
      return false;
    }

    // Skip if element is marked as decorative
    if (element.getAttribute('aria-hidden') === 'true' || element.getAttribute('role') === 'presentation') {
      return false;
    }

    // Additional check: ensure element is actually in the DOM and not detached
    if (!document.body.contains(element)) {
      return false;
    }

    return true;
  } catch (error) {
    console.debug('Error checking element visibility:', error);
    return false;
  }
};

/**
 * Creates a debounced function
 */
const createDebouncedFunction = <T extends (...args: unknown[]) => void>(func: T, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

interface UseFieldDetectionReturn {
  fieldButtons: FieldButtonData[];
  isInitialDetectionDone: boolean;
  detectAllFields: () => Promise<void>;
}

/**
 * Custom hook to detect and track form fields
 * Separates field detection logic from component rendering
 */
export const useFieldDetection = (): UseFieldDetectionReturn => {
  const [fieldButtons, setFieldButtons] = useState<FieldButtonData[]>([]);
  const [isInitialDetectionDone, setIsInitialDetectionDone] = useState(false);
  const detectAttempts = useRef(0);

  // Enhanced field detection using unified registry
  const detectAllFields = useCallback(async () => {
    try {
      console.log('useFieldDetection: Starting unified field detection...');

      // Clear previous registry data
      unifiedFieldRegistry.clear();

      // First, detect form containers to ensure consistency with form overlays
      const formContainers = await detectFormLikeContainers();
      console.log(`Found ${formContainers.length} form containers`);

      if (formContainers.length === 0) {
        console.log('No form containers found, using document body as fallback');
        formContainers.push(document.body);
      }

      // Register each container and get field button data
      const allFieldButtons: FieldButtonData[] = [];

      for (let i = 0; i < formContainers.length; i++) {
        const container = formContainers[i];
        const containerId = `container-${i}`;

        try {
          console.log(
            `Registering container ${i + 1}/${formContainers.length}: ${container.tagName}${container.className ? '.' + container.className : ''}`,
          );
          const containerInfo = await unifiedFieldRegistry.registerContainer(container, containerId);
          console.log(`Container ${containerId} registered with ${containerInfo.totalFieldCount} total fields`);

          // Get field button data for this container
          const containerFieldButtons = unifiedFieldRegistry.getFieldButtonsData(containerId);
          console.log(`Container ${containerId}: ${containerFieldButtons.length} field buttons created`);

          // Debug: log field types
          const fieldTypes = containerFieldButtons.reduce(
            (acc, btn) => {
              acc[btn.field.type] = (acc[btn.field.type] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          );
          console.log(`Field button types for ${containerId}:`, fieldTypes);

          allFieldButtons.push(...containerFieldButtons);
        } catch (error) {
          console.error(`Error registering container ${containerId}:`, error);
        }
      }

      // Filter buttons to only include visible and interactive elements, and de-duplicate
      const uniqueButtons = new Map<string, FieldButtonData>();
      allFieldButtons.forEach(buttonData => {
        if (!uniqueButtons.has(buttonData.field.id)) {
          uniqueButtons.set(buttonData.field.id, buttonData);
        }
      });

      const visibleFieldButtons = Array.from(uniqueButtons.values()).filter(
        buttonData => buttonData.element && isElementVisibleAndInteractive(buttonData.element),
      );

      console.log(`Final result: ${visibleFieldButtons.length} field buttons will be created`);

      if (visibleFieldButtons.length > 0) {
        setFieldButtons(visibleFieldButtons);
        setIsInitialDetectionDone(true);
      } else if (detectAttempts.current < MAX_DETECT_ATTEMPTS) {
        detectAttempts.current++;
        console.log(`No field buttons found, retrying... (attempt ${detectAttempts.current}/${MAX_DETECT_ATTEMPTS})`);
        setTimeout(detectAllFields, RETRY_DELAY);
      }
    } catch (error) {
      console.error('Error in unified field detection:', error);
    }
  }, []);

  // Initialize detection on mount
  useEffect(() => {
    const debouncedDetectFields = createDebouncedFunction(detectAllFields, MUTATION_DEBOUNCE_DELAY);

    // Initial detection run
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

    // If initial detection is done, set up observers
    if (!isInitialDetectionDone) return;

    const observer = new MutationObserver(mutations => {
      // If filling is in progress, ignore mutations
      if (document.body.dataset.fillinyUpdating === 'true') {
        console.log('MutationObserver: Skipping detection, update in progress.');
        return;
      }

      // Check if mutations are relevant
      const isRelevantMutation = mutations.some(mutation => {
        if (mutation.type === 'attributes') {
          return mutation.attributeName !== 'data-filliny-id' && mutation.attributeName !== 'style';
        }
        if (mutation.type === 'childList') {
          return (
            Array.from(mutation.addedNodes).some(isFormField) || Array.from(mutation.removedNodes).some(isFormField)
          );
        }
        return false;
      });

      if (isRelevantMutation) {
        debouncedDetectFields();
      }
    });

    // Observe changes in the document body
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'disabled', 'readonly', 'type'],
    });

    // Set up an event listener to re-run detection after a bulk fill
    const handleBulkFillComplete = () => {
      console.log('useFieldDetection: Bulk fill complete, re-running detection...');
      debouncedDetectFields();
    };

    document.addEventListener('filliny:bulkFillComplete', handleBulkFillComplete);

    return () => {
      observer.disconnect();
      document.removeEventListener('filliny:bulkFillComplete', handleBulkFillComplete);
    };
  }, [detectAllFields, isInitialDetectionDone]);

  // Clean up when unmounts
  useEffect(
    () => () => {
      document.querySelectorAll('[data-filliny-element="true"]').forEach(element => {
        if (element.getAttribute('data-filliny-element') === 'true' && element.tagName === 'BUTTON') {
          element.remove();
        }
      });
    },
    [],
  );

  return {
    fieldButtons,
    isInitialDetectionDone,
    detectAllFields,
  };
};

export { isFormField, isElementVisibleAndInteractive };
