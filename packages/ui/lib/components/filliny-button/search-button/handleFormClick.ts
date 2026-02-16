import { transformFormDataForApi, transformPreferencesForApi } from './apiTransformHelpers';
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
import { showQuotaExceededToast, showAuthErrorToast, showFillErrorToast, showInfoToast } from './toastHelpers';
import { unifiedFieldRegistry } from './unifiedFieldDetection';
import {
  aiFillService,
  getMatchingWebsite,
  createDebugLogger,
  ApiQuotaExceededError,
  ApiUnauthorizedError,
  MessageType,
} from '@extension/shared';
import { profileStorage, localFilesStorage } from '@extension/storage';
import type { StreamMessage } from './apiTransformHelpers';
import type { FormUpdateResults } from './fieldUpdaterHelpers';
import type { Field, DTOAuthorizedFileForAI } from '@extension/shared';
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
    showInfoToast('No Forms Found', 'No forms were detected on this page. Please try again.');
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
  // Serialized queue for chunk processing to ensure sequential field updates
  let chunkQueue: Promise<void> = Promise.resolve();

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
      showInfoToast('No Fields Detected', 'Unable to detect form fields. Please refresh the page and try again.');
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

    // Set up message listener for streaming response using MessageType enum for consistency
    messageHandler = (message: StreamMessage) => {
      try {
        if (message.type === MessageType.STREAM_CHUNK && message.data) {
          // Check if the chunk contains a server-side error
          try {
            const parsed = JSON.parse(message.data);
            if (parsed?.error) {
              debug.error('Server streaming error:', parsed.error.message || parsed.error);
              formFillStore.getState().setPhase(StreamingPhase.ERROR);
              streamReject(
                new FieldUpdateError(
                  parsed.error.message || 'Server streaming error',
                  ErrorCategory.NETWORK_ERROR,
                  'form',
                ),
              );
              return;
            }
          } catch {
            // Not a single JSON object - that's fine, processChunksDiffAware handles multi-line parsing
          }

          // Enqueue chunk processing to ensure sequential field updates
          chunkQueue = chunkQueue
            .then(async () => {
              partialChunk = await processChunksDiffAware(message.data!, fields, partialChunk);
            })
            .catch(err => debug.error('Chunk processing error:', err));
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

      // Wait for all queued chunks to finish processing
      await chunkQueue;

      // Streaming complete - run final verification pass
      formFillStore.getState().setPhase(StreamingPhase.FINALIZING);
      updateResults = await runFinalVerificationPass(fields);

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
      debug.error('Unauthorized error:', error.message);
      showAuthErrorToast(error.message);
      return;
    }

    // Handle quota exceeded errors specially
    if (error instanceof ApiQuotaExceededError) {
      showQuotaExceededToast(error.message);
      return;
    }

    const errorMessage =
      error instanceof FieldUpdateError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unknown error occurred';
    showFillErrorToast(errorMessage);
  } finally {
    // Ensure cleanup happens in finally block
    cleanup();

    try {
      debug.log(`Total process took: ${((performance.now() - totalStartTime) / 1000).toFixed(2)}s`);
      // Notify the field manager to re-detect everything to prevent stale state
      document.dispatchEvent(new CustomEvent('filliny:bulkFillComplete'));
    } catch (finallyError) {
      debug.error('Error in finally block:', finallyError);
    }
  }
};
