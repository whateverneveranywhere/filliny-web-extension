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
import {
  setServerDocuments,
  clearServerDocuments,
  setSessionContext,
  clearSessionContext,
} from './serverDocumentContext';
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
  StreamingErrorSchema,
  track,
  AnalyticsEvent,
  listDocumentsService,
} from '@extension/shared';
import { profileStorage, localFilesStorage } from '@extension/storage';
import type { StreamMessage } from './apiTransformHelpers';
import type { FormUpdateResults } from './fieldUpdaterHelpers';
import type { DTOAuthorizedFileForAI, AuthorizedFileCategory } from '@extension/shared';

const debug = createDebugLogger('FormClick');

const FORM_FILL_TIMEOUT = 60000;

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'heic', 'heif']);

const getFileCategory = (mimeType: string, extension: string): AuthorizedFileCategory => {
  if (mimeType.startsWith('image/') || IMAGE_EXTENSIONS.has(extension.toLowerCase())) return 'photo';
  return 'document';
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

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
    // Clear server document context for this session
    clearServerDocuments();
    clearSessionContext();
  };

  try {
    const startTime = performance.now();

    // Get all fields from the unified registry at once
    const fields = unifiedFieldRegistry.getAllFields();

    if (fields.length === 0) {
      showInfoToast(
        'No Fields Detected',
        "We found a form but couldn't detect any fillable fields. The form might use a custom framework. Try refreshing the page.",
      );
      return;
    }

    debug.log('Form Click: Detected fields from registry:', fields.length);
    debug.log(`Field retrieval from registry took: ${((performance.now() - startTime) / 1000).toFixed(2)}s`);

    if (testMode) {
      track(AnalyticsEvent.TEST_MODE_FILL_STARTED, { field_count: fields.length });
      await runTestModeFill(fields);
      return;
    }

    // Only execute API call logic if not in test mode
    const defaultProfile = await profileStorage.get();
    if (!defaultProfile) {
      showInfoToast(
        'Profile Required',
        'Create a filling profile in the Filliny side panel to start using AI form filling.',
      );
      return;
    }
    const visitingUrl = window.location.href;
    const matchingWebsite = getMatchingWebsite(defaultProfile.fillingWebsites, visitingUrl);

    // Fetch authorized local files for the current profile (if profile has an ID)
    let authorizedFiles: DTOAuthorizedFileForAI[] = [];
    const profileId = defaultProfile.id;
    if (profileId) {
      try {
        const localFiles = await localFilesStorage.getProfileFiles(String(profileId));
        authorizedFiles = localFiles.map((file, index) => ({
          id: index,
          filename: file.name,
          description: `User's local file: ${file.name} (${formatFileSize(file.size)})`,
          useCases: `Upload to file input fields that accept ${file.extension.toUpperCase()} or ${file.mimeType} files`,
          category: getFileCategory(file.mimeType, file.extension),
          mimeType: file.mimeType,
          fileSize: file.size,
        }));
        debug.log(`Loaded ${authorizedFiles.length} local authorized files for AI context`);
      } catch (filesError) {
        debug.warn('Failed to load authorized files, continuing without them:', filesError);
      }

      // Fetch server-stored documents for the matching website
      if (matchingWebsite?.id) {
        try {
          const serverDocs = await listDocumentsService(String(profileId), String(matchingWebsite.id));
          const serverFiles: DTOAuthorizedFileForAI[] = serverDocs
            .filter(doc => doc.status === 'ready' && (doc.r2Filename || doc.contentMarkdown))
            .map(doc => ({
              id: 10000 + doc.id,
              filename: doc.r2Filename || `${doc.title.replace(/\s+/g, '-').toLowerCase()}.md`,
              description: `Server document: ${doc.title} (${doc.documentType})`,
              useCases:
                doc.documentType === 'cover_letter'
                  ? 'Upload as cover letter to file input fields'
                  : doc.documentType === 'resume'
                    ? 'Upload as resume/CV to file input fields'
                    : `Upload as ${doc.documentType} document to file input fields`,
              category: doc.documentType === 'resume' ? 'resume' : 'document',
              mimeType: doc.r2MimeType || 'application/pdf',
              fileSize: doc.r2Filesize || 0,
            }));
          authorizedFiles = [...authorizedFiles, ...serverFiles];
          debug.log(`Loaded ${serverFiles.length} server documents for AI context`);

          // Store session context for auto-generation in file.ts
          setSessionContext(String(profileId), String(matchingWebsite.id));

          // Store server document metadata for file injection in file.ts
          setServerDocuments(
            serverDocs
              .filter(doc => doc.status === 'ready' && (doc.r2Filename || doc.contentMarkdown))
              .map(doc => ({
                docId: doc.id,
                profileId: String(profileId),
                websiteId: String(matchingWebsite.id),
                filename: doc.r2Filename || `${doc.title.replace(/\s+/g, '-').toLowerCase()}.md`,
                mimeType: doc.r2MimeType || 'application/pdf',
              })),
          );
        } catch (docsError) {
          debug.warn('Failed to load server documents, continuing without them:', docsError);
        }
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
            const parsed: unknown = JSON.parse(message.data);
            const errorResult = StreamingErrorSchema.safeParse(parsed);
            if (errorResult.success) {
              debug.error('Server streaming error:', errorResult.data.error.message);
              formFillStore.getState().setPhase(StreamingPhase.ERROR);
              streamReject(new FieldUpdateError(errorResult.data.error.message, ErrorCategory.NETWORK_ERROR, 'form'));
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

    // Track form fill started
    const websiteDomain = (() => {
      try {
        return new URL(visitingUrl).hostname;
      } catch {
        return 'unknown';
      }
    })();
    track(AnalyticsEvent.FORM_FILL_STARTED, {
      field_count: fields.length,
      form_count: formContainers.length,
      has_context: !!(matchingWebsite?.fillingContext || defaultProfile?.defaultFillingContext),
      has_authorized_files: authorizedFiles.length > 0,
      website_domain: websiteDomain,
    });

    // Transform data before API call to strip fields the API doesn't accept
    const transformedFormData = transformFormDataForApi(fields);
    const transformedPreferences = transformPreferencesForApi(defaultProfile?.preferences);

    // Make the API call with authorized files for AI context
    const response = await aiFillService({
      contextText: matchingWebsite?.fillingContext || defaultProfile?.defaultFillingContext || '',
      formData: transformedFormData,
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

    // Track form fill completed
    if (updateResults) {
      const durationMs = Math.round(performance.now() - totalStartTime);
      const outcome = updateResults.failed === 0 ? 'success' : updateResults.successful > 0 ? 'partial' : 'failed';
      track(AnalyticsEvent.FORM_FILL_COMPLETED, {
        outcome,
        fields_total: updateResults.successful + updateResults.failed,
        fields_filled: updateResults.successful,
        fields_failed: updateResults.failed,
        duration_ms: durationMs,
      });
    }
  } catch (error) {
    cleanup();
    formFillStore.getState().setPhase(StreamingPhase.ERROR);
    debug.error('Form Click: Error processing AI fill service:', error);

    // Track form fill error
    const errorCategory =
      error instanceof FieldUpdateError
        ? error.category
        : error instanceof ApiUnauthorizedError
          ? 'auth'
          : error instanceof ApiQuotaExceededError
            ? 'quota'
            : 'unknown';
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    track(AnalyticsEvent.FORM_FILL_ERROR, {
      error_category: errorCategory,
      error_message: errorMsg.slice(0, 200),
    });

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
