import { highlightForms } from './highlightForms';
import { detectFields } from './detectionHelpers';
import { processStreamResponse, updateFormFields } from './fieldUpdaterHelpers';
import { disableOtherButtons, resetOverlays, showLoadingIndicator } from './overlayUtils';
import type { DTOProfileFillingForm } from '@extension/storage';
import { profileStrorage } from '@extension/storage';
import type { Field, FieldType } from '@extension/shared';
import { aiFillService, getMatchingWebsite } from '@extension/shared';

// Move testMode to a configuration constant at the top of the file
const TEST_MODE = true; // Set this to true to use test data instead of making API calls

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
    case 'checkbox':
      return 'true';
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

export const handleFormClick = async (event: React.MouseEvent<HTMLButtonElement>, formId: string): Promise<void> => {
  event.preventDefault();

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
    const fields = detectFields(form);
    console.log('detected fields', fields);

    if (TEST_MODE) {
      console.log('Running in test mode - using mock data');
      const mockResponse = fields.map(field => ({
        ...field,
        value: getMockValueForFieldType(field.type, field),
      }));
      await updateFormFields(mockResponse, TEST_MODE);
      return;
    }

    // Only execute API call logic if not in test mode
    const [defaultProfile] = await Promise.all([profileStrorage.get()]);
    const visitingUrl = window.location.href;
    const matchingWebsite = getMatchingWebsite((defaultProfile as DTOProfileFillingForm).fillingWebsites, visitingUrl);

    const response = await aiFillService({
      contextText: matchingWebsite?.fillingContext || defaultProfile?.defaultFillingContext || '',
      formData: fields,
      websiteUrl: visitingUrl,
      preferences: defaultProfile?.preferences,
    });

    if (response instanceof ReadableStream) {
      await processStreamResponse(response, fields);
    } else {
      await updateFormFields(response.data, false);
    }
  } catch (error) {
    const apiError = (error as { message: string })?.message;
    if (apiError) {
      alert(apiError);
    }
    console.error('Error processing AI fill service:', error);
  } finally {
    resetOverlays();
  }
};
