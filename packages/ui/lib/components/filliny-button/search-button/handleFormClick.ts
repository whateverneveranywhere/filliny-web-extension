import { getAllFormContainersFromRegistry } from './detectionHelpers';
import { processChunks, updateFormFields, ErrorCategory, FieldUpdateError } from './fieldUpdaterHelpers';
import { highlightForms } from './highlightForms';
import { disableOtherButtons, resetOverlays, showLoadingIndicator } from './overlayUtils';
import { runTestModeFill } from './testModeHelpers';
import { unifiedFieldRegistry } from './unifiedFieldDetection';
import {
  aiFillService,
  getMatchingWebsite,
  createDebugLogger,
  ApiQuotaExceededError,
  getConfig,
} from '@extension/shared';
import { profileStorage } from '@extension/storage';
import type { FormUpdateResults } from './fieldUpdaterHelpers';
import type { Field } from '@extension/shared';
import type { DTOProfileFillingForm } from '@extension/storage';

const debug = createDebugLogger('FormClick');

/**
 * Default timeout for form fill operations
 */
const FORM_FILL_TIMEOUT = 60000;

/**
 * Get user-friendly error message based on error category
 */
const getUserErrorMessage = (results: FormUpdateResults): string => {
  if (results.errors.length === 0) {
    return 'Unknown error occurred while filling the form.';
  }

  // Categorize errors
  const categories = results.errors.reduce(
    (acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    },
    {} as Record<ErrorCategory, number>,
  );

  // Build user message based on most common error categories
  const messages: string[] = [];

  if (categories[ErrorCategory.ELEMENT_NOT_FOUND]) {
    messages.push(`${categories[ErrorCategory.ELEMENT_NOT_FOUND]} field(s) could not be found`);
  }
  if (categories[ErrorCategory.TIMEOUT]) {
    messages.push(`${categories[ErrorCategory.TIMEOUT]} field(s) timed out`);
  }
  if (categories[ErrorCategory.NETWORK_ERROR]) {
    messages.push('Network error occurred');
  }
  if (categories[ErrorCategory.VERIFICATION_FAILED]) {
    messages.push(`${categories[ErrorCategory.VERIFICATION_FAILED]} field(s) could not be verified`);
  }
  if (categories[ErrorCategory.UPDATE_FAILED]) {
    messages.push(`${categories[ErrorCategory.UPDATE_FAILED]} field(s) failed to update`);
  }

  return messages.length > 0 ? messages.join(', ') + '.' : 'Some fields failed to fill.';
};

/**
 * Handle form click event
 * This is the main entry point for form filling functionality
 */
export const handleFormClick = async (
  event: React.MouseEvent<HTMLButtonElement>,
  formId: string,
  testMode = false,
): Promise<void> => {
  // Make sure event doesn't propagate
  if (event) {
    try {
      event.preventDefault();
      event.stopPropagation();

      // For extra safety with React synthetic events
      if (event.nativeEvent) {
        event.nativeEvent.stopImmediatePropagation?.();
        event.nativeEvent.stopPropagation?.();
        event.nativeEvent.preventDefault?.();
      }
    } catch (eventError) {
      console.debug('Error handling event propagation:', eventError);
    }
  }

  const totalStartTime = performance.now();

  // Get all form containers directly from the unified registry
  const formContainers = getAllFormContainersFromRegistry();

  if (formContainers.length === 0) {
    alert('No forms found. Please try again.');
    try {
      resetOverlays();
      // Re-run detection if no containers were found in the registry
      highlightForms({ visionOnly: false });
    } catch (resetError) {
      console.error('Error resetting overlays:', resetError);
    }
    return;
  }

  debug.log(
    `Processing ${formContainers.length} form containers from registry:`,
    formContainers.map(c => `${c.tagName}${c.className ? '.' + c.className : ''}`),
  );

  try {
    disableOtherButtons(formId);
    showLoadingIndicator(formId);
  } catch (uiError) {
    debug.log('Error updating UI indicators:', uiError);
  }

  // Track cleanup functions
  let messageHandler: ((message: { type: string; data?: string; error?: string }) => void) | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const cleanup = (): void => {
    if (messageHandler) {
      chrome.runtime.onMessage.removeListener(messageHandler);
      messageHandler = null;
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  try {
    const startTime = performance.now();

    // Get all fields from the unified registry at once
    const fields = unifiedFieldRegistry.getAllFields();

    if (fields.length === 0) {
      alert('Unable to detect form fields in any container. Please refresh the page and try again.');
      return;
    }

    debug.log('Form Click: Detected fields from registry:', fields.length);
    debug.log(`Field retrieval from registry took: ${((performance.now() - startTime) / 1000).toFixed(2)}s`);

    if (testMode) {
      // Use the new centralized test mode handler
      await runTestModeFill(fields);
      return;
    }

    // Only execute API call logic if not in test mode
    const [defaultProfile] = await Promise.all([profileStorage.get()]);
    const visitingUrl = window.location.href;
    const matchingWebsite = getMatchingWebsite((defaultProfile as DTOProfileFillingForm).fillingWebsites, visitingUrl);

    // Create promise control for streaming
    let streamResolve: () => void;
    let streamReject: (error: Error) => void;
    const streamPromise = new Promise<void>((resolve, reject) => {
      streamResolve = resolve;
      streamReject = reject;
    });

    // Set up overall timeout for the operation
    timeoutId = setTimeout(() => {
      cleanup();
      streamReject(
        new FieldUpdateError(
          `Form fill operation timed out after ${FORM_FILL_TIMEOUT}ms`,
          ErrorCategory.TIMEOUT,
          'form',
        ),
      );
    }, FORM_FILL_TIMEOUT);

    // Set up message listener for streaming response
    messageHandler = (message: { type: string; data?: string; error?: string }) => {
      try {
        if (message.type === 'STREAM_CHUNK' && message.data) {
          try {
            processChunks(message.data, fields);
          } catch (error) {
            debug.error('Form Click: Error processing chunk:', error);
            // Don't reject here, continue processing other chunks
          }
        } else if (message.type === 'STREAM_DONE') {
          debug.log('Stream processing complete');
          streamResolve();
        } else if (message.type === 'STREAM_ERROR') {
          debug.error('Form Click: Stream error:', message.error);
          streamReject(new FieldUpdateError(message.error || 'Stream error', ErrorCategory.NETWORK_ERROR, 'form'));
        }
      } catch (messageError) {
        debug.error('Error handling stream message:', messageError);
      }
    };

    chrome.runtime.onMessage.addListener(messageHandler);

    // Make the API call
    const response = await aiFillService({
      contextText: matchingWebsite?.fillingContext || defaultProfile?.defaultFillingContext || '',
      formData: fields,
      websiteUrl: visitingUrl,
      preferences: defaultProfile?.preferences,
    });

    let updateResults: FormUpdateResults | null = null;

    if (response instanceof ReadableStream) {
      // Wait for all streaming chunks to be processed
      await streamPromise;
    } else if (response.data) {
      updateResults = await updateFormFields(response.data, false);

      // Check for partial failures
      if (updateResults.failed > 0 && updateResults.successful > 0) {
        const message = `Form partially filled: ${updateResults.successful} field(s) succeeded, ${updateResults.failed} failed. ${getUserErrorMessage(updateResults)}`;
        debug.warn(message);
        // Show a non-blocking notification for partial success
        console.warn(message);
      } else if (updateResults.failed > 0 && updateResults.successful === 0) {
        throw new FieldUpdateError(getUserErrorMessage(updateResults), ErrorCategory.UPDATE_FAILED, 'form');
      }
    } else {
      debug.error('Form Click: Invalid response format:', response);
      throw new FieldUpdateError('Invalid response format from API', ErrorCategory.NETWORK_ERROR, 'form');
    }
  } catch (error) {
    cleanup();
    debug.error('Form Click: Error processing AI fill service:', error);

    // Handle quota exceeded errors specially
    if (error instanceof ApiQuotaExceededError) {
      const config = getConfig();
      const pricingUrl = `${config.baseURL}/pricing`;

      if (error.shouldPromptSubscription) {
        const shouldRedirect = confirm(
          `${error.message}\n\nWould you like to subscribe to Pro for unlimited form filling?`,
        );
        if (shouldRedirect) {
          window.open(pricingUrl, '_blank');
        }
      } else {
        alert(`${error.message}\n\nPlease upgrade your subscription at ${pricingUrl}`);
      }
      return;
    }

    const errorMessage =
      error instanceof FieldUpdateError
        ? error.message
        : error instanceof Error
          ? error.message
          : typeof error === 'object'
            ? JSON.stringify(error)
            : 'Unknown error occurred';
    alert(`Failed to fill form: ${errorMessage}`);
  } finally {
    // Ensure cleanup happens in finally block
    cleanup();

    try {
      debug.log(`Total process took: ${((performance.now() - totalStartTime) / 1000).toFixed(2)}s`);
      resetOverlays();
      // Notify the field manager to re-detect everything to prevent stale state
      document.dispatchEvent(new CustomEvent('filliny:bulkFillComplete'));
    } catch (finallyError) {
      debug.error('Error in finally block:', finallyError);
    }
  }
};

/**
 * Find all form containers on the page
 */
const findAllFormContainers = (): HTMLElement[] => {
  console.log('🔍 Looking for all form containers on page');

  const containers: HTMLElement[] = [];

  // Strategy 1: Find all containers with form IDs
  const formIdContainers = Array.from(document.querySelectorAll<HTMLElement>('[data-form-id]'));
  containers.push(...formIdContainers);

  // Strategy 2: Find semantic form containers
  const semanticSelectors = ['form', '[role="form"]', '[data-filliny-form-container]', '[data-form]', 'fieldset'];

  for (const selector of semanticSelectors) {
    try {
      const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
      elements.forEach(element => {
        if (!containers.includes(element)) {
          containers.push(element);
        }
      });
    } catch (e) {
      console.debug(`Selector failed: ${selector}`, e);
    }
  }

  // Strategy 3: Find containers with significant form fields
  const potentialContainers = Array.from(document.querySelectorAll<HTMLElement>('div, section, main, article'));
  for (const container of potentialContainers) {
    const fieldCount = detectFormFieldsInElement(container).length;
    if (fieldCount >= 2 && !containers.includes(container)) {
      containers.push(container);
    }
  }

  console.log(`✅ Found ${containers.length} form containers`);
  return containers;
};

/**
 * Find container ID for a form container from the unified registry
 */
const findContainerIdForFormContainer = (formContainer: HTMLElement): string | null => {
  // Check if this container has a form ID that we can map to a container ID
  const formId = formContainer.dataset.formId;
  if (formId) {
    // Try to map form ID to container ID based on naming patterns
    const match = formId.match(/form-(\d+)/);
    if (match) {
      // Try different container ID patterns
      const patterns = [`highlight-container-${match[1]}`, `container-${match[1]}`, `form-click-container-${match[1]}`];

      for (const containerId of patterns) {
        const fields = unifiedFieldRegistry.getAllFields(containerId);
        if (fields.length > 0) {
          return containerId;
        }
      }
    }
  }

  // Fallback: check if this container matches any registered container
  // This is more expensive but ensures we find the right one
  return null; // Will trigger re-registration
};

/**
 * Enhanced form container finder that prioritizes the outermost wrapper
 */
const findFormContainer = (formId: string): HTMLElement | null => {
  console.log(`🔍 Looking for form container with ID: ${formId}`);

  // Strategy 1: Look for exact matches first
  const exactMatches = [
    `form[data-form-id="${formId}"]`,
    `[data-filliny-form-container][data-form-id="${formId}"]`,
    `[data-form-id="${formId}"]`,
  ];

  for (const selector of exactMatches) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) {
      console.log(`✅ Found exact match: ${selector}`);
      return validateAndExpandFormContainer(element);
    }
  }

  // Strategy 2: Look for any element with the form ID and expand to find true outermost container
  const anyFormElement = document.querySelector<HTMLElement>(`[data-form-id="${formId}"]`);
  if (anyFormElement) {
    console.log(`🔍 Found element with form ID, expanding to find outermost container...`);
    return validateAndExpandFormContainer(anyFormElement);
  }

  // Strategy 3: Fallback to any form-like container
  const fallbackSelectors = [
    'form',
    '[data-filliny-form-container]',
    "[role='form']",
    '[data-form]',
    '.form',
    '.form-container',
    '.form-wrapper',
  ];

  for (const selector of fallbackSelectors) {
    const elements = document.querySelectorAll<HTMLElement>(selector);
    if (elements.length > 0) {
      console.log(`⚠️ Using fallback selector: ${selector}`);
      // Return the largest form container (most likely to be outermost)
      return Array.from(elements).reduce((largest, current) => {
        const largestRect = largest.getBoundingClientRect();
        const currentRect = current.getBoundingClientRect();
        return currentRect.width * currentRect.height > largestRect.width * largestRect.height ? current : largest;
      });
    }
  }

  console.error(`❌ No form container found for ID: ${formId}`);
  return null;
};

/**
 * Validate and potentially expand a form container to ensure we have the outermost wrapper
 */
const validateAndExpandFormContainer = (element: HTMLElement): HTMLElement => {
  console.log(`🔍 Validating form container: ${element.tagName}${element.className ? '.' + element.className : ''}`);

  // First, detect all form fields within this element
  const fieldsInElement = detectFormFieldsInElement(element);
  console.log(`📋 Found ${fieldsInElement.length} form fields in current container`);

  if (fieldsInElement.length === 0) {
    console.warn(`⚠️ No form fields found in container, returning as-is`);
    return element;
  }

  // Strategy: Walk up the DOM tree to find a container that has significantly more fields
  // This helps us find the true outermost form container
  let bestContainer = element;
  let maxFieldCount = fieldsInElement.length;

  // Walk up the DOM tree
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    // Don't go beyond certain boundary elements
    if (parent.tagName === 'BODY' || parent.tagName === 'HTML') {
      break;
    }

    // Check if this parent has significantly more fields
    const fieldsInParent = detectFormFieldsInElement(parent);

    // If parent has more fields, it might be a better container
    if (fieldsInParent.length > maxFieldCount) {
      console.log(
        `🔍 Parent ${parent.tagName}${parent.className ? '.' + parent.className : ''} has ${fieldsInParent.length} fields (more than ${maxFieldCount})`,
      );

      // Additional validation: make sure this isn't too broad
      const ratio = fieldsInParent.length / maxFieldCount;

      // If the parent has 50% more fields or more, and isn't the entire page, use it
      if (ratio >= 1.5 && ratio <= 10) {
        bestContainer = parent;
        maxFieldCount = fieldsInParent.length;
        console.log(`✅ Using parent as better container: ${parent.tagName}`);
      } else if (ratio > 10) {
        console.log(`⚠️ Parent has too many fields (${fieldsInParent.length}), probably too broad`);
        break;
      }
    }

    parent = parent.parentElement;
  }

  // Special case: if we found a semantic form element, prefer it
  let semanticParent = bestContainer.parentElement;
  while (semanticParent && semanticParent !== document.body) {
    if (
      semanticParent.tagName === 'FORM' ||
      semanticParent.getAttribute('role') === 'form' ||
      semanticParent.hasAttribute('data-form') ||
      semanticParent.className.toLowerCase().includes('form')
    ) {
      const semanticFields = detectFormFieldsInElement(semanticParent);
      if (semanticFields.length >= maxFieldCount * 0.8) {
        // At least 80% of the fields
        console.log(`✅ Found semantic form parent: ${semanticParent.tagName}`);
        bestContainer = semanticParent;
        break;
      }
    }
    semanticParent = semanticParent.parentElement;
  }

  console.log(
    `🎯 Final container choice: ${bestContainer.tagName}${bestContainer.className ? '.' + bestContainer.className : ''} with ${maxFieldCount} fields`,
  );
  return bestContainer;
};

/**
 * Count form fields in an element (lightweight version)
 */
const detectFormFieldsInElement = (element: HTMLElement): HTMLElement[] => {
  const fieldSelectors = [
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
    'select',
    'textarea',
    '[role="textbox"]',
    '[role="combobox"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[contenteditable="true"]',
  ];

  const fields: HTMLElement[] = [];

  fieldSelectors.forEach(selector => {
    try {
      const elements = element.querySelectorAll<HTMLElement>(selector);
      elements.forEach(el => {
        // Basic visibility check
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          fields.push(el);
        }
      });
    } catch {
      // Ignore selector errors
    }
  });

  return fields;
};

/**
 * Simulate streaming updates for test mode by updating fields in batches
 * This creates a more realistic visual experience similar to regular streaming mode
 */
const simulateStreamingForTestMode = async (fields: Field[]): Promise<void> => {
  // Process all fields at once for instant updates in test mode
  console.log('Test mode: Processing all fields instantly');
  await updateFormFields(fields, true);
  console.log('Test mode: All fields processed');
};
