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
