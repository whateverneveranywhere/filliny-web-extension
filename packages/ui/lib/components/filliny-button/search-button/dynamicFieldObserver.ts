/**
 * Dynamic field detection observer module
 *
 * Watches form containers for dynamic changes using MutationObserver:
 * - New elements added that are form fields
 * - Elements becoming visible (style changes)
 * - aria-hidden being removed
 * - disabled being removed
 *
 * When new fields are detected, they are registered in the unified registry.
 */

import { isHoneypotField } from './field-types/utils';
import { registerIncrementalField } from './unifiedFieldDetection';

/**
 * Selectors that identify form field elements
 */
const FORM_FIELD_SELECTORS = [
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"])',
  'select',
  'textarea',
  '[role="textbox"]',
  '[role="combobox"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="listbox"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="searchbox"]',
  '[contenteditable="true"]',
  '[contenteditable=""]',
].join(', ');

/**
 * Attribute names that, when changed, may reveal new form fields
 */
const WATCHED_ATTRIBUTES = ['aria-hidden', 'disabled', 'style', 'class', 'hidden'];

/**
 * Managed observer instance for a container
 */
interface DynamicFieldObserverInstance {
  observer: MutationObserver | null;
  containerId: string;
  processedElements: WeakSet<HTMLElement>;
  pendingProcessTimer: number | null;
  pendingElements: Set<HTMLElement>;
}

/**
 * Active observers registry
 */
const activeObservers = new Map<HTMLElement, DynamicFieldObserverInstance>();

/**
 * Debounce time for batching discovered elements
 */
const DEBOUNCE_MS = 300;

/**
 * Check if an element is a form field (or contains form fields)
 */
const isFormField = (element: HTMLElement): boolean => {
  try {
    return element.matches(FORM_FIELD_SELECTORS);
  } catch {
    return false;
  }
};

/**
 * Find all form field elements within a node
 */
const findFormFieldsInNode = (node: Node): HTMLElement[] => {
  const fields: HTMLElement[] = [];

  if (!(node instanceof HTMLElement)) {
    return fields;
  }

  // Check if the node itself is a form field
  if (isFormField(node)) {
    fields.push(node);
  }

  // Check descendants
  try {
    const descendants = node.querySelectorAll<HTMLElement>(FORM_FIELD_SELECTORS);
    fields.push(...Array.from(descendants));
  } catch {
    // querySelectorAll may fail on some nodes
  }

  return fields;
};

/**
 * Check if an element just became visible or interactive
 */
const didElementBecomeAvailable = (
  element: HTMLElement,
  attributeName: string | null,
  oldValue: string | null,
): boolean => {
  if (!attributeName) return false;

  switch (attributeName) {
    case 'aria-hidden': {
      // aria-hidden was removed or set to "false"
      const currentValue = element.getAttribute('aria-hidden');
      return oldValue === 'true' && (currentValue === null || currentValue === 'false');
    }
    case 'disabled': {
      // disabled was removed
      return oldValue !== null && !element.hasAttribute('disabled');
    }
    case 'hidden': {
      // hidden attribute was removed
      return oldValue !== null && !element.hasAttribute('hidden');
    }
    case 'style': {
      // Check if display/visibility changed to become visible
      try {
        const style = window.getComputedStyle(element);
        const wasHidden =
          oldValue?.includes('display: none') ||
          oldValue?.includes('display:none') ||
          oldValue?.includes('visibility: hidden') ||
          oldValue?.includes('visibility:hidden');
        const isNowVisible = style.display !== 'none' && style.visibility !== 'hidden';
        return Boolean(wasHidden && isNowVisible);
      } catch {
        return false;
      }
    }
    case 'class': {
      // Check if a "hidden" class was removed
      const hiddenClassPatterns = ['hidden', 'd-none', 'hide', 'invisible', 'sr-only', 'visually-hidden'];
      const oldClasses = (oldValue || '').toLowerCase();
      const newClasses = (element.getAttribute('class') || '').toLowerCase();

      return hiddenClassPatterns.some(pattern => oldClasses.includes(pattern) && !newClasses.includes(pattern));
    }
    default:
      return false;
  }
};

/**
 * Process a batch of newly discovered elements
 */
const processPendingElements = async (instance: DynamicFieldObserverInstance): Promise<void> => {
  const elements = Array.from(instance.pendingElements);
  instance.pendingElements.clear();
  instance.pendingProcessTimer = null;

  let registeredCount = 0;

  for (const element of elements) {
    // Skip already processed elements
    if (instance.processedElements.has(element)) {
      continue;
    }

    // Skip honeypot fields
    if (isHoneypotField(element)) {
      continue;
    }

    // Skip elements that are not visible
    try {
      const style = window.getComputedStyle(element);
      if (style.display === 'none' && style.visibility === 'hidden') {
        continue;
      }
    } catch {
      // If we cannot check style, skip
      continue;
    }

    // Skip disabled elements
    if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') {
      continue;
    }

    // Mark as processed
    instance.processedElements.add(element);

    try {
      await registerIncrementalField(element, instance.containerId);
      registeredCount++;
    } catch (error) {
      console.debug('Failed to register dynamically discovered field:', error);
    }
  }

  if (registeredCount > 0) {
    console.log(
      `Dynamic field observer: registered ${registeredCount} new fields in container ${instance.containerId}`,
    );
  }
};

/**
 * Schedule processing of pending elements (debounced)
 */
const schedulePendingProcess = (instance: DynamicFieldObserverInstance): void => {
  if (instance.pendingProcessTimer !== null) {
    clearTimeout(instance.pendingProcessTimer);
  }

  instance.pendingProcessTimer = window.setTimeout(() => {
    processPendingElements(instance).catch(error => {
      console.debug('Error processing pending dynamic fields:', error);
    });
  }, DEBOUNCE_MS);
};

/**
 * Add elements to the pending queue for a given observer instance
 */
const queueElements = (instance: DynamicFieldObserverInstance, elements: HTMLElement[]): void => {
  for (const el of elements) {
    if (!instance.processedElements.has(el)) {
      instance.pendingElements.add(el);
    }
  }

  if (instance.pendingElements.size > 0) {
    schedulePendingProcess(instance);
  }
};

/**
 * Create and start a MutationObserver for dynamic field detection on a container
 *
 * @param container - The form container element to watch
 * @param containerId - The container's identifier in the unified registry
 * @returns A cleanup function to disconnect the observer
 */
const observeContainerForDynamicFields = (container: HTMLElement, containerId: string): (() => void) => {
  // Avoid duplicate observers
  if (activeObservers.has(container)) {
    return () => stopObservingContainer(container);
  }

  const instance: DynamicFieldObserverInstance = {
    observer: null,
    containerId,
    processedElements: new WeakSet(),
    pendingProcessTimer: null,
    pendingElements: new Set(),
  };

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      // Handle added nodes
      if (mutation.type === 'childList') {
        for (const addedNode of Array.from(mutation.addedNodes)) {
          if (addedNode instanceof HTMLElement) {
            const fields = findFormFieldsInNode(addedNode);
            if (fields.length > 0) {
              queueElements(instance, fields);
            }
          }
        }
      }

      // Handle attribute changes (element becomes visible/enabled)
      if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement) {
        const target = mutation.target;
        const attrName = mutation.attributeName;
        const oldValue = mutation.oldValue;

        if (didElementBecomeAvailable(target, attrName, oldValue)) {
          // The element itself might be a form field
          if (isFormField(target)) {
            queueElements(instance, [target]);
          }

          // Or it might contain form fields that are now revealed
          const innerFields = findFormFieldsInNode(target);
          if (innerFields.length > 0) {
            queueElements(instance, innerFields);
          }
        }
      }
    }
  });

  instance.observer = observer;

  observer.observe(container, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeOldValue: true,
    attributeFilter: WATCHED_ATTRIBUTES,
  });

  activeObservers.set(container, instance);

  console.debug(`Dynamic field observer started for container ${containerId}`);

  return () => stopObservingContainer(container);
};

/**
 * Stop observing a specific container
 */
const stopObservingContainer = (container: HTMLElement): void => {
  const instance = activeObservers.get(container);
  if (instance) {
    instance.observer?.disconnect();
    if (instance.pendingProcessTimer !== null) {
      clearTimeout(instance.pendingProcessTimer);
    }
    activeObservers.delete(container);
    console.debug(`Dynamic field observer stopped for container ${instance.containerId}`);
  }
};

/**
 * Stop all active dynamic field observers
 */
const stopAllDynamicFieldObservers = (): void => {
  for (const [container] of activeObservers) {
    stopObservingContainer(container);
  }
};

/**
 * Get the count of actively observed containers
 */
const getActiveObserverCount = (): number => activeObservers.size;

export {
  observeContainerForDynamicFields,
  stopObservingContainer,
  stopAllDynamicFieldObservers,
  getActiveObserverCount,
};
