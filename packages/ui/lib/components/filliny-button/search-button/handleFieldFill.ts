import { processChunks, updateFieldWithRetry, ErrorCategory, FieldUpdateError } from './fieldUpdaterHelpers';
import { unifiedFieldRegistry } from './unifiedFieldDetection';
import { aiFillService, getMatchingWebsite, createDebugLogger } from '@extension/shared';
import { profileStorage } from '@extension/storage';
import type { FieldUpdateResult, FormUpdateResults } from './fieldUpdaterHelpers';
import type { Field } from '@extension/shared';
import type { DTOProfileFillingForm } from '@extension/storage';

const debug = createDebugLogger('FieldFill');

/**
 * Default timeout for the entire field fill operation
 */
const FIELD_FILL_TIMEOUT = 30000;

/**
 * User-facing error messages based on error category
 */
const getErrorMessage = (category: ErrorCategory): string => {
  switch (category) {
    case ErrorCategory.DETECTION_FAILED:
      return 'Could not detect the form field. Please try again.';
    case ErrorCategory.ELEMENT_NOT_FOUND:
      return 'Form field not found on the page. It may have been removed or changed.';
    case ErrorCategory.UPDATE_FAILED:
      return 'Failed to fill the field. Please try manually.';
    case ErrorCategory.VERIFICATION_FAILED:
      return 'Field value could not be verified. Please check the result.';
    case ErrorCategory.NETWORK_ERROR:
      return 'Network error occurred. Please check your connection.';
    case ErrorCategory.TIMEOUT:
      return 'Operation timed out. Please try again.';
    default:
      return 'An unexpected error occurred.';
  }
};

/**
 * Display visual error feedback on an element
 */
const showErrorFeedback = (element: HTMLElement, message: string): void => {
  element.style.outline = '2px solid #ef4444';
  element.setAttribute('data-filliny-error', message);
  element.setAttribute('title', message);
};

/**
 * Display visual success feedback on an element
 */
const showSuccessFeedback = (element: HTMLElement): void => {
  element.style.outline = '2px solid #10b981';
  element.removeAttribute('data-filliny-error');
};

/**
 * Handle filling a single field
 * This function sends just one field to the AI service and applies the result
 * @param field - The field to fill
 * @returns FieldUpdateResult with success status and any errors
 */
export const handleFieldFill = async (field: Field): Promise<FieldUpdateResult> => {
  debug.log(`Starting field fill for: ${field.id}, type: ${field.type}`);

  // Get the definitive element from the registry
  const fieldInfo = unifiedFieldRegistry.getField(field.id);
  const element = fieldInfo?.element;

  if (!element) {
    const error = new FieldUpdateError(
      `Element for field ID ${field.id} not found in registry`,
      ErrorCategory.ELEMENT_NOT_FOUND,
      field.id,
    );
    debug.error(error.message);
    return { success: false, fieldId: field.id, error };
  }

  // Store original styles for cleanup
  const originalStyles = {
    outline: element.style.outline,
    outlineOffset: element.style.outlineOffset,
    transition: element.style.transition,
    title: element.getAttribute('title'),
  };

  // Track cleanup functions
  let messageHandler: ((message: { type: string; data?: string; error?: string }) => void) | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const cleanup = (): void => {
    // Remove message listener if it exists
    if (messageHandler) {
      chrome.runtime.onMessage.removeListener(messageHandler);
      messageHandler = null;
    }
    // Clear timeout if it exists
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    // Always remove loading state
    element.removeAttribute('data-filliny-loading');
  };

  const restoreStyles = (delay = 2000): void => {
    setTimeout(() => {
      element.style.outline = originalStyles.outline;
      element.style.outlineOffset = originalStyles.outlineOffset;
      element.style.transition = originalStyles.transition;
      if (originalStyles.title) {
        element.setAttribute('title', originalStyles.title);
      } else {
        element.removeAttribute('title');
      }
      element.removeAttribute('data-filliny-error');
    }, delay);
  };

  try {
    // Add a loading indicator to the field
    element.setAttribute('data-filliny-loading', 'true');
    element.setAttribute('data-filliny-element', 'true');

    // Add a highlight effect to show which field is being filled
    element.style.outline = '2px solid #4f46e5';
    element.style.outlineOffset = '2px';
    element.style.transition = 'all 0.3s ease';

    // Get profile data
    const [defaultProfile] = await Promise.all([profileStorage.get()]);
    const visitingUrl = window.location.href;
    const matchingWebsite = getMatchingWebsite((defaultProfile as DTOProfileFillingForm).fillingWebsites, visitingUrl);

    // Create a promise that will be resolved/rejected based on the operation outcome
    let streamResolve: () => void;
    let streamReject: (error: Error) => void;
    const streamPromise = new Promise<void>((resolve, reject) => {
      streamResolve = resolve;
      streamReject = reject;
    });

    // Set up overall timeout for the operation
    timeoutId = setTimeout(() => {
      const error = new FieldUpdateError(
        `Field fill operation timed out after ${FIELD_FILL_TIMEOUT}ms`,
        ErrorCategory.TIMEOUT,
        field.id,
      );
      cleanup();
      streamReject(error);
    }, FIELD_FILL_TIMEOUT);

    // Set up message listener for streaming response
    messageHandler = (message: { type: string; data?: string; error?: string }) => {
      if (message.type === 'STREAM_CHUNK' && message.data) {
        try {
          debug.log('Received stream chunk:', message.data.substring(0, 100) + '...');
          // Pass ALL fields from the registry to processChunks for proper merging
          const allFields = unifiedFieldRegistry.getAllFields();
          processChunks(message.data, allFields);
        } catch (error) {
          debug.error('Field Fill: Error processing chunk:', error);
          // Don't reject on chunk errors - continue processing
        }
      } else if (message.type === 'STREAM_DONE') {
        debug.log('Stream processing complete for field:', field.id);
        streamResolve();
      } else if (message.type === 'STREAM_ERROR') {
        debug.error('Field Fill: Stream error:', message.error);
        streamReject(new FieldUpdateError(message.error || 'Stream error', ErrorCategory.NETWORK_ERROR, field.id));
      }
    };

    chrome.runtime.onMessage.addListener(messageHandler);

    // Call AI service with just this field
    debug.log(`Calling AI service for field: ${field.id}, label: ${field.label || field.name}`);
    const response = await aiFillService({
      contextText: matchingWebsite?.fillingContext || defaultProfile?.defaultFillingContext || '',
      formData: [field], // Send only this single field
      websiteUrl: visitingUrl,
      preferences: defaultProfile?.preferences,
    });

    // Process the response
    let updateResult: FormUpdateResults | null = null;

    if (response instanceof ReadableStream) {
      debug.log('Received ReadableStream response, waiting for stream processing');
      await streamPromise;
    } else if ('data' in response && Array.isArray(response.data) && response.data.length > 0) {
      const updatedField = response.data[0];
      debug.log(`Received direct value for field ${field.id}:`, updatedField.value);

      // Use updateFieldWithRetry directly for better error handling
      const directResult = await updateFieldWithRetry(element, updatedField, false, 3);
      if (!directResult.success) {
        throw directResult.error || new FieldUpdateError('Field update failed', ErrorCategory.UPDATE_FAILED, field.id);
      }
      updateResult = {
        successful: directResult.success ? 1 : 0,
        failed: directResult.success ? 0 : 1,
        skipped: 0,
        errors: directResult.error ? [directResult.error] : [],
        totalRetries: directResult.retryCount || 0,
      };
    } else {
      throw new FieldUpdateError('Invalid response format from API', ErrorCategory.NETWORK_ERROR, field.id);
    }

    // Show success feedback
    showSuccessFeedback(element);
    restoreStyles();

    cleanup();
    return { success: true, fieldId: field.id, retryCount: updateResult?.totalRetries };
  } catch (error) {
    cleanup();

    const fieldError =
      error instanceof FieldUpdateError
        ? error
        : new FieldUpdateError(
            error instanceof Error ? error.message : String(error),
            ErrorCategory.UPDATE_FAILED,
            field.id,
            error instanceof Error ? error : undefined,
          );

    debug.error('Error in handleFieldFill:', fieldError);

    // Show error feedback with user-friendly message
    const userMessage = getErrorMessage(fieldError.category);
    showErrorFeedback(element, userMessage);
    restoreStyles(5000); // Keep error state visible longer

    return { success: false, fieldId: field.id, error: fieldError };
  }
};
