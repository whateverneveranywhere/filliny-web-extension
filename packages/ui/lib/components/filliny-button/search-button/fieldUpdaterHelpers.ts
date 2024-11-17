import type { Field } from '@extension/shared';
import { addGlowingBorder } from './detectionHelpers';

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

  if (field.type === 'radio') {
    const name = element.name;
    const group = document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${name}"]`);
    if (group.length > 0) {
      const valueToSelect = field.value || group[0].value;
      group.forEach(radio => {
        if (radio.value === valueToSelect) {
          radio.checked = true;
          dispatchEvent(radio, 'input');
          dispatchEvent(radio, 'change');
        }
      });
    }
  } else if (field.type === 'checkbox') {
    element.checked = field.value === 'true';
    dispatchEvent(element, 'input');
    dispatchEvent(element, 'change');
  }
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
  if (!initializedFields.has(field.id)) {
    addGlowingBorder(element);
    initializedFields.add(field.id);
  }

  // Skip first option if it looks like a placeholder
  const startIndex = element.options[0]?.text.toLowerCase().includes('select') ? 1 : 0;

  if (field.value && element.querySelector(`option[value="${field.value}"]`)) {
    // If we have a specific value and it exists in options, use it
    element.value = field.value;
  } else if (startIndex < element.options.length) {
    // Otherwise select a valid option
    const validIndex = startIndex + Math.floor(Math.random() * (element.options.length - startIndex));
    element.value = element.options[validIndex].value;
  }

  dispatchEvent(element, 'input');
  dispatchEvent(element, 'change');
};

const updateButtonField = (element: HTMLButtonElement, field: Field): void => {
  element.innerText = field.value || element.innerText;
};

// Main update function that delegates to specialized helpers
export const updateFormFields = async (fields: Field[], testMode: boolean = false): Promise<void> => {
  for (const field of fields) {
    const element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
    if (!element) continue;

    console.log(`Updating field type: ${field.type} with ID: ${field.id}`);

    if (element instanceof HTMLInputElement) {
      switch (element.type) {
        case 'file':
          await updateFileField(element, field, testMode);
          break;
        case 'radio':
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
          jsonResponse.data.forEach((field: Field) => {
            const originalField = originalFields.find(f => f.id === field.id);
            if (originalField) {
              console.log(`Processing stream data for field type: ${originalField.type} with ID: ${field.id}`);
            }
          });

          updateFormFields(jsonResponse.data);
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
