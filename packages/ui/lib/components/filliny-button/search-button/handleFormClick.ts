import { getAllFormContainersFromRegistry } from './detectionHelpers';
import {
  processChunksDiffAware,
  runFinalVerificationPass,
  updateFormFields,
  ErrorCategory,
  FieldUpdateError,
} from './fieldUpdaterHelpers';
import { highlightForms } from './highlightForms';
import { disableOtherButtons, resetOverlays, showLoadingIndicator } from './overlayUtils';
import { formFillStore, StreamingPhase } from './stores';
import { runTestModeFill } from './testModeHelpers';
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
import { profileStorage, localFilesStorage } from '@extension/storage';
import type { FormUpdateResults } from './fieldUpdaterHelpers';
import type { PartialFieldValueMap } from './stores';
import type { Field, DTOFillingPreferences, DTOAuthorizedFileForAI } from '@extension/shared';
import type { DTOProfileFillingForm } from '@extension/storage';

/**
 * Type for stream message from background script
 */
interface StreamMessage {
  type: string;
  data?: string;
  error?: string;
}

const debug = createDebugLogger('FormClick');

/**
 * Keys allowed in the API formData payload.
 * Only includes keys that exist on both the extension's Field type AND the API schema.
 * Strips: xpath, uniqueSelectors, validation, title, testValue, metadata
 */
type AllowedFieldKey =
  | 'id'
  | 'name'
  | 'type'
  | 'placeholder'
  | 'label'
  | 'description'
  | 'value'
  | 'options'
  | 'required';

const ALLOWED_FORM_DATA_FIELDS: readonly AllowedFieldKey[] = [
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
 * Keys allowed in the API preferences payload.
 * Strip id and profileId which the API doesn't accept.
 */
type AllowedPreferencesKey = 'isFormal' | 'isGapFillingAllowed' | 'toneId' | 'povId';

const ALLOWED_PREFERENCES_FIELDS: readonly AllowedPreferencesKey[] = [
  'isFormal',
  'isGapFillingAllowed',
  'toneId',
  'povId',
] as const;

/**
 * Transform form field data to only include fields accepted by the API
 * Strips: xpath, uniqueSelectors, validation
 */
const transformFormDataForApi = (fields: Field[]): Pick<Field, AllowedFieldKey>[] =>
  fields.map(field => {
    const transformed = {} as Pick<Field, AllowedFieldKey>;
    for (const key of ALLOWED_FORM_DATA_FIELDS) {
      if (key in field && field[key] !== undefined) {
        // Safe: key is typed as AllowedFieldKey which is a subset of keyof Field
        Object.assign(transformed, { [key]: field[key] });
      }
    }
    return transformed;
  });

/**
 * Transform preferences to only include fields accepted by the API
 * Strips: id, profileId
 */
const transformPreferencesForApi = (
  preferences: DTOFillingPreferences | undefined,
): DTOFillingPreferences | undefined => {
  if (!preferences) return undefined;

  const transformed = {} as Pick<DTOFillingPreferences, AllowedPreferencesKey>;
  for (const key of ALLOWED_PREFERENCES_FIELDS) {
    if (key in preferences && preferences[key] !== undefined) {
      Object.assign(transformed, { [key]: preferences[key] });
    }
  }
  return transformed as DTOFillingPreferences;
};

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
  let messageHandler: ((message: StreamMessage) => void) | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  // Track partial chunk data between stream messages
  let partialChunk = '';

  const cleanup = (): void => {
    if (messageHandler) {
      chrome.runtime.onMessage.removeListener(messageHandler);
      messageHandler = null;
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    // Reset partial chunk state
    partialChunk = '';
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

    // Fetch authorized local files for the current profile (if profile has an ID)
    let authorizedFiles: DTOAuthorizedFileForAI[] = [];
    const profileId = (defaultProfile as DTOProfileFillingForm)?.id;
    if (profileId) {
      try {
        // Read from local storage instead of cloud API
        const localFiles = await localFilesStorage.getProfileFiles(String(profileId));
        // Transform local files to the AI-friendly format
        // Note: Local files don't have id, description, useCases, or category
        // so we generate minimal info needed for AI to match files with fields
        authorizedFiles = localFiles.map((file, index) => ({
          id: index, // Use index as a placeholder ID
          filename: file.name,
          description: `Local file: ${file.name}`, // Auto-generated description
          useCases: `Match with fields accepting ${file.extension.toUpperCase()} files`, // Auto-generated use case
          category: 'document' as const, // Default category
          mimeType: file.mimeType,
          fileSize: file.size,
        }));
        debug.log(`Loaded ${authorizedFiles.length} local authorized files for AI context`);
      } catch (filesError) {
        debug.warn('Failed to load authorized files, continuing without them:', filesError);
        // Continue without authorized files - not a critical error
      }
    }

    // Initialize the Zustand store session for streaming tracking
    const storeActions = formFillStore.getState();
    storeActions.initSession(fields.map(f => ({ id: f.id, label: f.label || f.name || f.id })));

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
      formFillStore.getState().setPhase(StreamingPhase.ERROR);
      streamReject(
        new FieldUpdateError(
          `Form fill operation timed out after ${FORM_FILL_TIMEOUT}ms`,
          ErrorCategory.TIMEOUT,
          'form',
        ),
      );
    }, FORM_FILL_TIMEOUT);

    // Store adapter for diff-aware processing
    const storeAdapter = {
      getState: () => formFillStore.getState(),
      updateFieldValue: (id: string, value: string | string[] | undefined) =>
        formFillStore.getState().updateFieldValue(id, value),
      markFieldStable: (id: string) => formFillStore.getState().markFieldStable(id),
      markFieldFilled: (id: string) => formFillStore.getState().markFieldFilled(id),
      markFieldVerified: (id: string) => formFillStore.getState().markFieldVerified(id),
      markFieldError: (id: string, msg: string) => formFillStore.getState().markFieldError(id, msg),
      setLastPartialObject: (obj: PartialFieldValueMap | null) => formFillStore.getState().setLastPartialObject(obj),
    };

    // Set up message listener for streaming response using MessageType enum for consistency
    messageHandler = (message: StreamMessage) => {
      try {
        if (message.type === MessageType.STREAM_CHUNK && message.data) {
          try {
            // Use diff-aware processing for incremental updates
            processChunksDiffAware(message.data, fields, partialChunk, storeAdapter).then(newPartial => {
              partialChunk = newPartial;
            });
          } catch (error) {
            debug.error('Form Click: Error processing chunk:', error);
            // Don't reject here, continue processing other chunks
          }
        } else if (message.type === MessageType.STREAM_DONE) {
          debug.log('Stream processing complete');
          streamResolve();
        } else if (message.type === MessageType.STREAM_ERROR) {
          debug.error('Form Click: Stream error:', message.error);
          formFillStore.getState().setPhase(StreamingPhase.ERROR);
          streamReject(new FieldUpdateError(message.error || 'Stream error', ErrorCategory.NETWORK_ERROR, 'form'));
        }
      } catch (messageError) {
        debug.error('Error handling stream message:', messageError);
      }
    };

    chrome.runtime.onMessage.addListener(messageHandler);

    // Transform data before API call to strip fields the API doesn't accept
    const transformedFormData = transformFormDataForApi(fields);
    const transformedPreferences = transformPreferencesForApi(defaultProfile?.preferences);

    // Make the API call with authorized files for AI context
    const response = await aiFillService({
      contextText: matchingWebsite?.fillingContext || defaultProfile?.defaultFillingContext || '',
      formData: transformedFormData as Field[],
      websiteUrl: visitingUrl,
      preferences: transformedPreferences,
      authorizedFiles: authorizedFiles.length > 0 ? authorizedFiles : undefined,
    });

    let updateResults: FormUpdateResults | null = null;

    // Check for streaming mode: either a ReadableStream or a streaming flag from background script
    const isStreaming = response instanceof ReadableStream || ('streaming' in response && response.streaming);

    if (isStreaming) {
      // Wait for all streaming chunks to be processed via messageHandler
      await streamPromise;

      // Streaming complete - run final verification pass
      formFillStore.getState().setPhase(StreamingPhase.FINALIZING);
      updateResults = await runFinalVerificationPass(fields, storeAdapter);

      // Update phase based on verification results
      formFillStore.getState().setPhase(StreamingPhase.COMPLETE);

      // Check for partial failures
      if (updateResults.failed > 0 && updateResults.successful > 0) {
        const message = `Form partially filled: ${updateResults.successful} field(s) succeeded, ${updateResults.failed} failed. ${getUserErrorMessage(updateResults)}`;
        debug.warn(message);
        console.warn(message);
      } else if (updateResults.failed > 0 && updateResults.successful === 0) {
        throw new FieldUpdateError(getUserErrorMessage(updateResults), ErrorCategory.UPDATE_FAILED, 'form');
      }
    } else if (response.data) {
      updateResults = await updateFormFields(response.data, false);
      formFillStore.getState().setPhase(StreamingPhase.COMPLETE);

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
    formFillStore.getState().setPhase(StreamingPhase.ERROR);
    debug.error('Form Click: Error processing AI fill service:', error);

    // Handle unauthorized errors - user needs to log in again
    if (error instanceof ApiUnauthorizedError) {
      const config = getConfig();
      const loginUrl = `${config.baseURL}/sign-in`;

      debug.error('Unauthorized error:', error.message);

      const shouldRedirect = confirm(`${error.message}\n\nWould you like to log in again?`);
      if (shouldRedirect) {
        window.open(loginUrl, '_blank');
      }
      return;
    }

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
      // Notify the field manager to re-detect everything to prevent stale state
      document.dispatchEvent(new CustomEvent('filliny:bulkFillComplete'));

      // Reset the store after a delay so overlay UI can read final state before reset
      setTimeout(() => {
        formFillStore.getState().reset();
      }, 3000);
    } catch (finallyError) {
      debug.error('Error in finally block:', finallyError);
    }
  }
};
