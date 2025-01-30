import { highlightForms } from './highlightForms';
import { detectFields } from './detectionHelpers';
import { processChunks, updateFormFields } from './fieldUpdaterHelpers';
import { disableOtherButtons, resetOverlays, showLoadingIndicator } from './overlayUtils';
import type { DTOProfileFillingForm } from '@extension/storage';
import { profileStrorage } from '@extension/storage';
import type { Field, FieldType } from '@extension/shared';
import { aiFillService, getMatchingWebsite } from '@extension/shared';

const getMockValueForFieldType = (type: FieldType, field: Field): string => {
  const now = new Date();

  switch (type) {
    // Basic input types
    case 'text':
      return 'Sample text input';
    case 'password':
      return 'P@ssw0rd123';
    case 'email':
      return 'test@example.com';
    case 'tel':
      return '+1-555-0123';
    case 'url':
      return 'https://example.com';
    case 'search':
      return 'search query';

    // Date and time inputs
    case 'date':
      return now.toISOString().split('T')[0];
    case 'datetime-local':
      return now.toISOString().slice(0, 16);
    case 'month':
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    case 'week': {
      const weekNum = Math.ceil((now.getDate() + 6) / 7);
      return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    }
    case 'time':
      return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Numeric inputs
    case 'number':
    case 'range': {
      const min = field.validation?.min ?? 0;
      const max = field.validation?.max ?? 100;
      const step = field.validation?.step ?? 1;
      return String(Math.floor((max - min) / step) * step + min);
    }

    // Color input
    case 'color':
      return '#FF0000';

    // Complex input types
    case 'file':
      return 'https://example.com/sample.pdf';
    case 'checkbox': {
      const element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
      if (element) {
        // Determine current state
        const isCurrentlyChecked =
          element instanceof HTMLInputElement
            ? element.checked
            : element.hasAttribute('checked') || element.getAttribute('aria-checked') === 'true';

        // Return the opposite state
        return (!isCurrentlyChecked).toString();
      }
      return 'true'; // Default to checking the box if element not found
    }
    case 'radio': {
      if (field.options?.length) {
        // Prefer boolean values if available
        const booleanOption = field.options.find(opt => ['true', 'false'].includes(opt.value));
        if (booleanOption) return booleanOption.value;
        // Otherwise return first option
        return field.options[0].value;
      }
      return 'true';
    }
    case 'select': {
      if (!field.options?.length) return '';

      // If there's a current value that matches an option, keep it
      if (field.value) {
        const matchingOption = field.options.find(opt => opt.value === field.value || opt.text === field.value);
        if (matchingOption) return matchingOption.value;
      }

      // Skip first option if it's a placeholder (e.g., "Select an option...")
      const startIndex = field.options[0].text.toLowerCase().includes('select') ? 1 : 0;
      if (startIndex < field.options.length) {
        const randomIndex = startIndex + Math.floor(Math.random() * (field.options.length - startIndex));
        return field.options[randomIndex].value;
      }
      return field.options[0].value;
    }
    case 'textarea':
      return 'This is a sample textarea content for testing purposes.';
    case 'button':
      return 'Click me';
    case 'fieldset':
      return '';
    default:
      return 'Sample test value';
  }
};

export const handleFormClick = async (
  event: React.MouseEvent<HTMLButtonElement>,
  formId: string,
  testMode: boolean = false,
): Promise<void> => {
  event.preventDefault();
  const totalStartTime = performance.now();

  const form = document.querySelector<HTMLFormElement>(`form[data-form-id="${formId}"]`);
  if (!form) {
    alert('Form not found. Please try again.');
    resetOverlays();
    highlightForms({ visionOnly: false });
    return;
  }

  disableOtherButtons(formId);
  showLoadingIndicator(formId);

  try {
    const startTime = performance.now();
    const fields = await detectFields(form);
    console.log('Form Click: Detected fields:', fields);

    console.log(
      `%c⏱ Detection took: ${((performance.now() - startTime) / 1000).toFixed(2)}s`,
      'background: #059669; color: white; padding: 4px 8px; border-radius: 4px; font-size: 14px; font-weight: bold;',
    );

    if (testMode) {
      console.log('Form Click: Running in test mode - using mock data');
      const mockResponse = fields.map(field => ({
        ...field,
        value: getMockValueForFieldType(field.type, field),
      }));
      await updateFormFields(mockResponse, testMode);
      return;
    }

    // Only execute API call logic if not in test mode
    const [defaultProfile] = await Promise.all([profileStrorage.get()]);
    const visitingUrl = window.location.href;
    const matchingWebsite = getMatchingWebsite((defaultProfile as DTOProfileFillingForm).fillingWebsites, visitingUrl);

    console.log('Form Click: Setting up stream handler');
    // Set up message listener for streaming response
    const streamPromise = new Promise<void>((resolve, reject) => {
      const messageHandler = (message: { type: string; data?: string; error?: string }) => {
        console.log('Form Click: Received message:', message.type);
        if (message.type === 'STREAM_CHUNK' && message.data) {
          try {
            console.log('Form Click: Processing chunk:', message.data.substring(0, 100) + '...');
            processChunks(message.data, fields);
          } catch (error) {
            console.error('Form Click: Error processing chunk:', error);
            // Don't reject here, continue processing other chunks
          }
        } else if (message.type === 'STREAM_DONE') {
          console.log('Form Click: Stream complete');
          chrome.runtime.onMessage.removeListener(messageHandler);
          resolve();
        } else if (message.type === 'STREAM_ERROR') {
          console.error('Form Click: Stream error:', message.error);
          chrome.runtime.onMessage.removeListener(messageHandler);
          reject(new Error(message.error || 'Stream error'));
        }
      };

      chrome.runtime.onMessage.addListener(messageHandler);
    });

    console.log('Form Click: Making API call');
    // Make the API call
    const response = await aiFillService({
      contextText: matchingWebsite?.fillingContext || defaultProfile?.defaultFillingContext || '',
      formData: fields,
      websiteUrl: visitingUrl,
      preferences: defaultProfile?.preferences,
    });

    console.log('Form Click: Got API response:', response);

    if (response instanceof ReadableStream) {
      console.log('Form Click: Processing stream response');
      // Wait for all streaming chunks to be processed
      await streamPromise;
    } else if (response.data) {
      console.log('Form Click: Processing regular response');
      await updateFormFields(response.data, false);
    } else {
      console.error('Form Click: Invalid response format:', response);
      throw new Error('Invalid response format from API');
    }
  } catch (error) {
    console.error('Form Click: Error processing AI fill service:', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'object'
          ? JSON.stringify(error)
          : 'Unknown error occurred';
    alert(`Failed to fill form: ${errorMessage}`);
  } finally {
    console.log(
      `%c⏱ Total process took: ${((performance.now() - totalStartTime) / 1000).toFixed(2)}s`,
      'background: #059669; color: white; padding: 4px 8px; border-radius: 4px; font-size: 14px; font-weight: bold;',
    );
    resetOverlays();
  }
};
