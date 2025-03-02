import { highlightForms } from './highlightForms';
import { detectFields } from './detectionHelpers';
import { processChunks, updateFormFields } from './fieldUpdaterHelpers';
import { disableOtherButtons, resetOverlays, showLoadingIndicator } from './overlayUtils';
import type { DTOProfileFillingForm } from '@extension/storage';
import { profileStrorage } from '@extension/storage';
import type { Field, FieldType } from '@extension/shared';
import { aiFillService, getMatchingWebsite } from '@extension/shared';

/**
 * Generate mock values for field testing
 */
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

      // Check for a select element to examine options
      const element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
      if (element instanceof HTMLSelectElement) {
        // Log available options for debugging
        console.log(
          `Test mode: Select options for ${field.id}:`,
          Array.from(element.options).map(opt => ({
            value: opt.value,
            text: opt.text,
            disabled: opt.disabled,
          })),
        );

        // If there's a current value, keep it if available
        if (field.value) {
          // Try several strategies to match field.value to an option
          let matchingOption: HTMLOptionElement | undefined;

          // 1. Match by exact value
          matchingOption = element.querySelector(`option[value="${field.value}"]`) as HTMLOptionElement;

          // 2. Match by option text
          if (!matchingOption) {
            matchingOption = Array.from(element.options).find(
              opt => opt.text === field.value || opt.text.toLowerCase() === String(field.value).toLowerCase(),
            );
          }

          // 3. Match by numeric ID if possible
          if (!matchingOption) {
            const numValue = parseInt(String(field.value), 10);
            if (!isNaN(numValue)) {
              matchingOption = Array.from(element.options).find(opt => parseInt(opt.value, 10) === numValue);
            }
          }

          if (matchingOption) {
            console.log(
              `Test mode: Using existing value ${field.value} for select ${field.id}, matched to option: ${matchingOption.text}`,
            );
            return matchingOption.value;
          } else {
            console.log(`Test mode: Couldn't match existing value ${field.value} to any option for select ${field.id}`);
          }
        }

        // Skip placeholder options
        const isPlaceholder = (option: HTMLOptionElement): boolean => {
          const text = option.text.toLowerCase();
          return (
            text.includes('select') ||
            text.includes('choose') ||
            text.includes('pick') ||
            text === '' ||
            option.value === '' ||
            option.disabled
          );
        };

        // Find valid options (non-placeholder, not disabled)
        const validOptions = Array.from(element.options).filter(opt => !isPlaceholder(opt));

        if (validOptions.length > 0) {
          // Pick a random valid option
          const selectedOption = validOptions[Math.floor(Math.random() * validOptions.length)];
          const selectedValue = selectedOption.value;
          console.log(
            `Test mode: Selected valid option with value ${selectedValue}, text: "${selectedOption.text}" for ${field.id}`,
          );
          return selectedValue;
        }

        // Fall back to first option if no valid options found
        console.log(`Test mode: No valid options found, using first option for ${field.id}`);
        return element.options[0]?.value || '';
      }

      // Fallback to using field options if direct element access fails
      if (field.options?.length) {
        // If there's a current value that matches an option, keep it
        if (field.value) {
          const matchingOption = field.options.find(
            opt =>
              opt.value === field.value ||
              opt.text === field.value ||
              opt.text.toLowerCase() === String(field.value).toLowerCase(),
          );
          if (matchingOption) {
            console.log(`Test mode: Using existing value ${field.value} for select ${field.id} from field options`);
            return matchingOption.value;
          }
        }

        // Skip placeholder options
        const nonPlaceholders = field.options.filter(opt => {
          const text = opt.text.toLowerCase();
          return !text.includes('select') && !text.includes('choose') && !text.includes('pick') && text !== '';
        });

        if (nonPlaceholders.length > 0) {
          const selectedIndex = Math.floor(Math.random() * nonPlaceholders.length);
          console.log(`Test mode: Using option ${selectedIndex} from field options for ${field.id}`);
          return nonPlaceholders[selectedIndex].value;
        }

        // Last resort, use first option
        console.log(`Test mode: Using first option from field options for ${field.id}`);
        return field.options[0].value;
      }

      // Last resort fallback
      return 'option1';
    }
    case 'textarea':
      // Provide a longer multi-line sample for textareas to ensure they visibly update
      return `This is a sample textarea content for testing purposes.\nThis form field supports multiple lines of text.\nFeel free to edit this example text.`;
    case 'button':
      return 'Click me';
    case 'fieldset':
      return '';
    default:
      return 'Sample test value';
  }
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
  event.preventDefault();
  const totalStartTime = performance.now();

  // Look for both native forms and form-like containers
  const formContainer = document.querySelector<HTMLElement>(
    `form[data-form-id="${formId}"], [data-filliny-form-container][data-form-id="${formId}"]`,
  );

  if (!formContainer) {
    alert('Form not found. Please try again.');
    resetOverlays();
    highlightForms({ visionOnly: false });
    return;
  }

  disableOtherButtons(formId);
  showLoadingIndicator(formId);

  try {
    const startTime = performance.now();

    // Detect fields using DOM-only strategy
    const fields = await detectFields(formContainer, false);

    console.log('Form Click: Detected fields:', fields);
    console.log(
      `%c⏱ Detection took: ${((performance.now() - startTime) / 1000).toFixed(2)}s`,
      'background: #059669; color: white; padding: 4px 8px; border-radius: 4px; font-size: 14px; font-weight: bold;',
    );

    if (testMode) {
      console.log('Running in test mode with example values');

      // Create a visual indicator for test mode
      const testModeIndicator = document.createElement('div');
      testModeIndicator.textContent = 'Test Mode Active';
      testModeIndicator.style.cssText =
        'position: fixed; top: 20px; right: 20px; background: #4f46e5; color: white; padding: 8px 16px; border-radius: 4px; z-index: 10000; font-weight: bold;';
      document.body.appendChild(testModeIndicator);

      setTimeout(() => testModeIndicator.remove(), 5000);

      // Use mock data for test mode - now with testValue properly set
      const mockResponse = fields.map(field => {
        const mockValue = getMockValueForFieldType(field.type, field);
        return {
          ...field,
          // Set both value and testValue to ensure consistent behavior
          value: mockValue,
          testValue: mockValue,
        };
      });

      // Log the mock values for debugging
      console.log(
        'Test mode: Mock values generated:',
        mockResponse.map(f => ({
          id: f.id,
          type: f.type,
          value: f.value,
        })),
      );

      // Apply visual changes sequentially to simulate streaming updates
      await simulateStreamingForTestMode(mockResponse);
      return;
    }

    // Only execute API call logic if not in test mode
    const [defaultProfile] = await Promise.all([profileStrorage.get()]);
    const visitingUrl = window.location.href;
    const matchingWebsite = getMatchingWebsite((defaultProfile as DTOProfileFillingForm).fillingWebsites, visitingUrl);

    // Set up message listener for streaming response
    const streamPromise = new Promise<void>((resolve, reject) => {
      const messageHandler = (message: { type: string; data?: string; error?: string }) => {
        if (message.type === 'STREAM_CHUNK' && message.data) {
          try {
            processChunks(message.data, fields);
          } catch (error) {
            console.error('Form Click: Error processing chunk:', error);
            // Don't reject here, continue processing other chunks
          }
        } else if (message.type === 'STREAM_DONE') {
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

    // Make the API call
    const response = await aiFillService({
      contextText: matchingWebsite?.fillingContext || defaultProfile?.defaultFillingContext || '',
      formData: fields,
      websiteUrl: visitingUrl,
      preferences: defaultProfile?.preferences,
    });

    if (response instanceof ReadableStream) {
      // Wait for all streaming chunks to be processed
      await streamPromise;
    } else if (response.data) {
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
