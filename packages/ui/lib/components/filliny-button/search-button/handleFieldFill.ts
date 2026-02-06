import { processChunksLegacy, updateFieldWithRetry, ErrorCategory, FieldUpdateError } from './fieldUpdaterHelpers';
import { unifiedFieldRegistry } from './unifiedFieldDetection';
import {
  aiFillService,
  getMatchingWebsite,
  createDebugLogger,
  ApiQuotaExceededError,
  ApiUnauthorizedError,
  getConfig,
  MessageType,
} from '@extension/shared';
import { profileStorage } from '@extension/storage';
import type { FieldUpdateResult, FormUpdateResults } from './fieldUpdaterHelpers';
import type { Field, DTOFillingPreferences } from '@extension/shared';
import type { DTOProfileFillingForm } from '@extension/storage';

/**
 * Allowed fields for the API formData payload
 * Only includes fields that exist on both the extension's Field type AND the API schema
 * Strips: xpath, uniqueSelectors, validation, title, testValue, metadata
 */
const ALLOWED_FORM_DATA_FIELDS = [
  'id',
  'name',
  'type',
  'placeholder',
  'label',
  'description',
  'value',
  'options',
  'required',
] as const;

/**
 * Allowed fields for the API preferences payload
 * Strip id and profileId which the API doesn't accept
 */
const ALLOWED_PREFERENCES_FIELDS = ['isFormal', 'isGapFillingAllowed', 'toneId', 'povId'] as const;

/**
 * Transform form field data to only include fields accepted by the API
 * Strips: xpath, uniqueSelectors, validation, title, testValue, metadata
 */
const transformFieldForApi = (field: Field): Partial<Field> => {
  const transformed: Partial<Field> = {};
  for (const key of ALLOWED_FORM_DATA_FIELDS) {
    if (key in field && field[key] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (transformed as any)[key] = field[key];
    }
  }
  return transformed;
};

/**
 * Transform preferences to only include fields accepted by the API
 * Strips: id, profileId
 */
const transformPreferencesForApi = (
  preferences: DTOFillingPreferences | undefined,
): DTOFillingPreferences | undefined => {
  if (!preferences) return undefined;

  const transformed: Partial<DTOFillingPreferences> = {};
  for (const key of ALLOWED_PREFERENCES_FIELDS) {
    if (key in preferences && preferences[key] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (transformed as any)[key] = preferences[key];
    }
  }
  return transformed as DTOFillingPreferences;
};

/**
 * Type for stream message from background script
 */
interface StreamMessage {
  type: string;
  data?: string;
  error?: string;
}

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
  let messageHandler: ((message: StreamMessage) => void) | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  // Track partial chunk data between stream messages
  let partialChunk = '';

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
    // Reset partial chunk state
    partialChunk = '';
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
    element.style.outline = '2px solid #404040';
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

    // Set up message listener for streaming response using MessageType enum for consistency
    messageHandler = (message: StreamMessage) => {
      if (message.type === MessageType.STREAM_CHUNK && message.data) {
        try {
          debug.log('Received stream chunk:', message.data.substring(0, 100) + '...');
          // Pass ALL fields from the registry to processChunks for proper merging
          // Pass and track partial chunk data between calls to avoid data loss
          const allFields = unifiedFieldRegistry.getAllFields();
          processChunksLegacy(message.data, allFields, partialChunk).then((newPartial: string) => {
            partialChunk = newPartial;
          });
        } catch (error) {
          debug.error('Field Fill: Error processing chunk:', error);
          // Don't reject on chunk errors - continue processing
        }
      } else if (message.type === MessageType.STREAM_DONE) {
        debug.log('Stream processing complete for field:', field.id);
        streamResolve();
      } else if (message.type === MessageType.STREAM_ERROR) {
        debug.error('Field Fill: Stream error:', message.error);
        streamReject(new FieldUpdateError(message.error || 'Stream error', ErrorCategory.NETWORK_ERROR, field.id));
      }
    };

    chrome.runtime.onMessage.addListener(messageHandler);

    // Transform field and preferences to strip fields the API doesn't accept
    const transformedField = transformFieldForApi(field);
    const transformedPreferences = transformPreferencesForApi(defaultProfile?.preferences);

    // Call AI service with just this field
    debug.log(`Calling AI service for field: ${field.id}, label: ${field.label || field.name}`);
    const response = await aiFillService({
      contextText: matchingWebsite?.fillingContext || defaultProfile?.defaultFillingContext || '',
      formData: [transformedField as Field], // Send only this single field (transformed)
      websiteUrl: visitingUrl,
      preferences: transformedPreferences,
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

    // Handle unauthorized errors - user needs to log in again
    if (error instanceof ApiUnauthorizedError) {
      const config = getConfig();
      const loginUrl = `${config.baseURL}/sign-in`;

      debug.error('Unauthorized error:', error.message);

      const authMessage = 'Session expired. Please log in again.';
      showErrorFeedback(element, authMessage);
      restoreStyles(5000);

      // Prompt user to log in
      const shouldRedirect = confirm(`${error.message}\n\nWould you like to log in again?`);
      if (shouldRedirect) {
        window.open(loginUrl, '_blank');
      }

      return {
        success: false,
        fieldId: field.id,
        error: new FieldUpdateError(authMessage, ErrorCategory.NETWORK_ERROR, field.id),
      };
    }

    // Handle quota exceeded errors specially
    if (error instanceof ApiQuotaExceededError) {
      const config = getConfig();
      const pricingUrl = `${config.baseURL}/pricing`;

      debug.error('Quota exceeded:', error.message);

      // Show user-friendly error on the field
      const quotaMessage =
        error.errorType === 'no_free_forms'
          ? 'No free forms remaining. Subscribe to continue.'
          : 'Token limit reached. Tokens refresh on your billing cycle.';

      showErrorFeedback(element, quotaMessage);
      restoreStyles(5000);

      // Prompt user to subscribe
      if (error.shouldPromptSubscription) {
        const shouldRedirect = confirm(
          `${error.message}\n\nWould you like to subscribe to Pro for unlimited form filling?`,
        );
        if (shouldRedirect) {
          window.open(pricingUrl, '_blank');
        }
      }

      return {
        success: false,
        fieldId: field.id,
        error: new FieldUpdateError(quotaMessage, ErrorCategory.NETWORK_ERROR, field.id),
      };
    }

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
