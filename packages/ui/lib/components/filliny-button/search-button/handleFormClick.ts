import { highlightForms } from './highlightForms';
import { detectFields } from './detectionHelpers';

import { processStreamResponse, updateFormFields } from './fieldUpdaterHelpers';
import { disableOtherButtons, resetOverlays, showLoadingIndicator } from './overlayUtils';
import type { DTOProfileFillingForm } from '@extension/storage';
import { profileStrorage } from '@extension/storage';
import type { Field } from '@extension/shared';
import { aiFillService, getMatchingWebsite } from '@extension/shared';

// Move testMode to a configuration constant at the top of the file
const TEST_MODE = true; // Set this to true to use test data instead of making API calls

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

const getMockValueForFieldType = (type: Field['type'], field: Field): string => {
  switch (type) {
    case 'file':
      return 'https://pdfobject.com/pdf/sample.pdf';
    case 'checkbox':
      return 'true';
    case 'radio': {
      if (field.options && field.options.length > 0) {
        if (field.options.some(opt => ['true', 'false'].includes(opt.value))) {
          return 'true';
        }
        return field.options[0].value;
      }
      return 'true';
    }
    case 'select': {
      if (field.value && field.options) {
        const matchingOption = field.options.find(opt => opt.value === field.value || opt.text === field.value);
        if (matchingOption) {
          return matchingOption.value;
        }
      }

      if (field.options?.length) {
        const startIndex = field.options[0].text.toLowerCase().includes('select') ? 1 : 0;
        if (startIndex < field.options.length) {
          const randomIndex = startIndex + Math.floor(Math.random() * (field.options.length - startIndex));
          return field.options[randomIndex].value;
        }
      }
      return field.value || '';
    }
    case 'textarea':
      return 'This is a sample textarea content for testing purposes';
    case 'button':
      return 'Sample Button Text';
    default:
      return 'Sample test value for input field';
  }
};
