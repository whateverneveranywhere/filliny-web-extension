import type { Field } from '@extension/shared';
import { addGlowingBorder } from './overlayUtils';

// Add at the top of the file with other declarations
const initializedFields: Set<string> = new Set();

// Specialized field update helpers
const updateInputField = (element: HTMLInputElement, field: Field): void => {
  if (!initializedFields.has(field.id)) {
    addGlowingBorder(element);
    initializedFields.add(field.id);
  }
  element.value = field.value || '';
  dispatchEvent(element, 'input');
  dispatchEvent(element, 'change');
};

const updateFileField = async (element: HTMLInputElement, field: Field, testMode: boolean): Promise<void> => {
  if (!initializedFields.has(field.id)) {
    addGlowingBorder(element);
    initializedFields.add(field.id);
  }

  const url = testMode ? 'https://pdfobject.com/pdf/sample.pdf' : field.value;
  if (url) {
    try {
      const blob = await fetchFile(url);
      const fileName = getFileNameFromUrl(url);
      const file = new File([blob], fileName, { type: blob.type });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      element.files = dataTransfer.files;
      dispatchEvent(element, 'input');
      dispatchEvent(element, 'change');
    } catch (error) {
      console.error('Failed to fetch file:', error);
    }
  }
};

const updateCheckableField = (element: HTMLInputElement, field: Field): void => {
  if (!initializedFields.has(field.id)) {
    addGlowingBorder(element);
    initializedFields.add(field.id);
  }

  element.checked = field.value === 'true';
  dispatchEvent(element, 'input');
  dispatchEvent(element, 'change');
};

const updateTextAreaField = (element: HTMLTextAreaElement, field: Field): void => {
  if (!initializedFields.has(field.id)) {
    addGlowingBorder(element);
    initializedFields.add(field.id);
  }
  element.value = field.value || '';
  dispatchEvent(element, 'input');
  dispatchEvent(element, 'change');
};

const updateSelectField = (element: HTMLSelectElement, field: Field): void => {
  console.log('Updating select field:', {
    elementId: element.id,
    fieldId: field.id,
    options: Array.from(element.options).map(opt => ({ value: opt.value, text: opt.text })),
    testMode: !!field.testValue,
    currentValue: element.value,
    newValue: field.testValue || field.value,
  });

  if (field.testValue) {
    const matchingOption = Array.from(element.options).find(
      opt => opt.value === field.testValue || opt.text === field.testValue,
    );

    if (matchingOption) {
      // Set the value
      element.value = matchingOption.value;

      // Trigger native events
      dispatchEvent(element, 'input');
      dispatchEvent(element, 'change');

      // Trigger React synthetic events
      const nativeInputEvent = new Event('input', { bubbles: true });
      const nativeChangeEvent = new Event('change', { bubbles: true });

      Object.defineProperty(nativeInputEvent, 'target', { value: element });
      Object.defineProperty(nativeChangeEvent, 'target', { value: element });

      element.dispatchEvent(nativeInputEvent);
      element.dispatchEvent(nativeChangeEvent);

      // Force a click for good measure
      element.click();

      // Add visual feedback
      addGlowingBorder(element);
    } else {
      console.warn('No matching option found:', {
        testValue: field.testValue,
        availableOptions: Array.from(element.options).map(opt => ({
          value: opt.value,
          text: opt.text,
        })),
      });
    }
  }
};

const updateButtonField = (element: HTMLButtonElement, field: Field): void => {
  element.innerText = field.value || element.innerText;
};

const updateRadioGroup = (element: HTMLInputElement, field: Field): void => {
  console.log('Updating radio group:', {
    elementId: element.id,
    fieldId: field.id,
    name: element.name,
    testMode: !!field.testValue,
    currentValue: element.value,
    newValue: field.testValue || field.value,
  });

  const form = element.closest('form');
  if (!form) {
    console.error('Radio group has no parent form:', element);
    return;
  }

  const groupElements = form.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${element.name}"]`);
  console.log('Found radio group elements:', {
    groupSize: groupElements.length,
    elements: Array.from(groupElements).map(el => ({
      value: el.value,
      checked: el.checked,
      label: el.labels?.[0]?.textContent,
    })),
  });

  const valueToUse = field.testValue || field.value || field.options?.[0]?.value;

  if (valueToUse) {
    let foundMatch = false;
    groupElements.forEach(radio => {
      const shouldCheck = radio.value === valueToUse;
      if (shouldCheck) {
        foundMatch = true;
        // Force React to notice the change
        radio.checked = shouldCheck;

        // Trigger native events
        dispatchEvent(radio, 'input');
        dispatchEvent(radio, 'change');

        // Trigger React synthetic events
        const nativeInputEvent = new Event('input', { bubbles: true });
        const nativeChangeEvent = new Event('change', { bubbles: true });

        // Add properties that React's synthetic events expect
        Object.defineProperty(nativeInputEvent, 'target', { value: radio });
        Object.defineProperty(nativeChangeEvent, 'target', { value: radio });

        // Dispatch both native and React events
        radio.dispatchEvent(nativeInputEvent);
        radio.dispatchEvent(nativeChangeEvent);

        // Force a click event which React definitely listens to
        radio.click();

        // Add visual feedback
        addGlowingBorder(radio);
      }
    });

    if (!foundMatch) {
      console.error('No matching radio button found for value:', {
        valueToUse,
        availableValues: Array.from(groupElements).map(el => el.value),
      });
    }
  } else {
    console.warn('No value available to set radio group:', {
      fieldId: field.id,
      name: element.name,
    });
  }
};

// Add this helper function at the top with other helpers
const assignTestValue = (field: Field): void => {
  // Only log for radio/select fields
  if (field.type === 'radio' || field.type === 'select') {
    console.log('Attempting to assign test value for field:', {
      type: field.type,
      id: field.id,
      hasOptions: !!field.options,
      optionsLength: field.options?.length,
      currentValue: field.value,
      currentTestValue: field.testValue,
    });

    if (field.options && field.options.length > 0) {
      // Skip first option if it's a placeholder (contains 'select' text)
      const startIndex = field.type === 'select' && field.options[0].text.toLowerCase().includes('select') ? 1 : 0;
      console.log('Determining start index:', {
        startIndex,
        firstOptionText: field.options[0]?.text,
        isSelectWithPlaceholder: field.type === 'select' && field.options[0]?.text.toLowerCase().includes('select'),
      });

      if (startIndex < field.options.length) {
        field.testValue = field.options[startIndex].value;
        console.log('Successfully assigned test value:', {
          fieldId: field.id,
          assignedValue: field.testValue,
          selectedOption: field.options[startIndex],
        });
      } else {
        console.warn('Failed to assign test value - invalid start index:', {
          fieldId: field.id,
          startIndex,
          optionsLength: field.options.length,
        });
      }
    } else {
      console.warn('Cannot assign test value - no options available:', {
        fieldId: field.id,
        type: field.type,
      });
    }
  }
};

// Main update function that delegates to specialized helpers
export const updateFormFields = async (fields: Field[], testMode: boolean = false): Promise<void> => {
  for (const field of fields) {
    const element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
    if (!element) continue;

    // Only log for radio/select fields
    if ((field.type === 'radio' || field.type === 'select') && testMode && !field.testValue) {
      console.log('Assigning test value for field:', {
        id: field.id,
        type: field.type,
      });
      assignTestValue(field);
    }

    // Use testValue if in test mode
    if (testMode && field.testValue) {
      field.value = field.testValue;
    }

    if (element instanceof HTMLInputElement) {
      switch (element.type) {
        case 'file':
          await updateFileField(element, field, testMode);
          break;
        case 'radio':
          updateRadioGroup(element, field);
          break;
        case 'checkbox':
          updateCheckableField(element, field);
          break;
        default:
          updateInputField(element, field);
      }
    } else if (element instanceof HTMLTextAreaElement) {
      updateTextAreaField(element, field);
    } else if (element instanceof HTMLSelectElement) {
      updateSelectField(element, field);
    } else if (element instanceof HTMLButtonElement) {
      updateButtonField(element, field);
    }
  }
};

// Helper functions (keep existing ones)
const getFileNameFromUrl = (url: string): string => {
  const urlParts = url.split('/');
  return urlParts[urlParts.length - 1];
};

const fetchFile = async (url: string): Promise<Blob> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`);
  }
  return await response.blob();
};

export const dispatchEvent = (
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  eventType: string,
): void => {
  const event = new Event(eventType, { bubbles: true });
  element.dispatchEvent(event);
};

// Stream processing (keep existing implementation)
export const processChunks = (text: string, originalFields: Field[]): void => {
  text.split('\n').forEach(chunk => {
    if (chunk.trim()) {
      try {
        const jsonResponse = JSON.parse(chunk);
        if (jsonResponse?.data?.length) {
          // Merge incoming fields with original field data
          const mergedFields = jsonResponse.data.map((field: Field) => {
            const originalField = originalFields.find(f => f.id === field.id);
            return originalField ? { ...originalField, ...field } : field;
          });

          console.log(`Processing stream data for fields:`, mergedFields);
          updateFormFields(mergedFields);
        }
      } catch (e) {
        console.error('Failed to parse chunk:', e);
      }
    }
  });
};

export const processStreamResponse = async (response: ReadableStream, originalFields: Field[]): Promise<void> => {
  const reader = response.getReader();
  const decoder = new TextDecoder('utf-8');
  let accumulatedResult = '';

  const processText = async ({ done, value }: ReadableStreamReadResult<Uint8Array>): Promise<void> => {
    if (done) {
      console.log('Stream complete');
      return;
    }

    accumulatedResult += decoder.decode(value, { stream: true });
    processChunks(accumulatedResult, originalFields);
    accumulatedResult = '';

    await reader.read().then(processText);
  };

  await reader.read().then(processText);
};
