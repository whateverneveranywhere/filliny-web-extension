import { highlightForms } from './highlightForms';
import { detectFields } from './detectionHelpers';

import { processStreamResponse, updateFormFields } from './fieldUpdaterHelpers';
import { disableOtherButtons, resetOverlays, showLoadingIndicator } from './overlayUtils';
import type { DTOProfileFillingForm } from '@extension/storage';
import { profileStrorage } from '@extension/storage';
import { aiFillService, getMatchingWebsite } from '@extension/shared';

const testMode = false; // Set this flag to true for development use to mock the API response

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
    const [defaultProfile] = await Promise.all([profileStrorage.get()]);
    const fields = detectFields(form);
    console.log('detected fields', fields);

    if (testMode) {
      // Mock response for test mode
      const mockResponse = fields.map(field => ({
        ...field,
        value: `filliny can fill this field`, // Example mock value
      }));
      updateFormFields(mockResponse, testMode);
    } else {
      const visitingUrl = window.location.href;
      const matchingWebsite = getMatchingWebsite(
        (defaultProfile as DTOProfileFillingForm).fillingWebsites,
        visitingUrl,
      );

      const response = await aiFillService({
        contextText: matchingWebsite?.fillingContext || defaultProfile?.defaultFillingContext || '',
        formData: fields,
        modelSlug: 'filliny-ai',
        websiteUrl: visitingUrl,
        preferences: defaultProfile?.preferences,
      });

      if (response instanceof ReadableStream) {
        await processStreamResponse(response);
      } else {
        updateFormFields(response.data, testMode);
      }
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
