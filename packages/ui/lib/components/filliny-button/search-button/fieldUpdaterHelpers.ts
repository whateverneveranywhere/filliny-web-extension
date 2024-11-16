import type { Field } from '@extension/shared';
import { addGlowingBorder } from './detectionHelpers';
// type ReadableStreamReadResult<T> = { done: false; value: T } | { done: true; value?: T };

let previousFields: Field[] = [];
const initializedFields: Set<string> = new Set();

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

// filling helpers
export const updateFormFields = (fields: Field[], testMode: boolean = false): void => {
  fields.forEach(async field => {
    const element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
    const previousField = previousFields.find(prevField => prevField.id === field.id);

    if (element) {
      if (element instanceof HTMLInputElement) {
        if (element.type === 'file') {
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

              // Trigger download for the user
              // const downloadUrl = URL.createObjectURL(blob);
              // const a = document.createElement('a');
              // a.href = downloadUrl;
              // a.download = fileName;
              // document.body.appendChild(a);
              // a.click();
              // document.body.removeChild(a);
              // URL.revokeObjectURL(downloadUrl);
            } catch (error) {
              console.error('Failed to fetch file:', error);
            }
          }
        } else if (element.type === 'radio' || element.type === 'checkbox') {
          if (!initializedFields.has(field.id) || (previousField && previousField.value !== field.value)) {
            addGlowingBorder(element);
            initializedFields.add(field.id);
          }

          const name = element.name;
          const group = document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`);
          if (group.length > 0) {
            const firstOption = group[0];
            firstOption.checked = true;
            dispatchEvent(firstOption, 'input');
            dispatchEvent(firstOption, 'change');
          }
        } else {
          if (!initializedFields.has(field.id) || (previousField && previousField.value !== field.value)) {
            addGlowingBorder(element);
            initializedFields.add(field.id);
          }
          element.value = field.value || '';
          dispatchEvent(element, 'input');
          dispatchEvent(element, 'change');
        }
      } else if (element instanceof HTMLTextAreaElement) {
        if (!initializedFields.has(field.id) || (previousField && previousField.value !== field.value)) {
          addGlowingBorder(element);
          initializedFields.add(field.id);
        }
        element.value = field.value || '';
        dispatchEvent(element, 'input');
        dispatchEvent(element, 'change');
      } else if (element instanceof HTMLSelectElement) {
        if (!initializedFields.has(field.id) || (previousField && previousField.value !== field.value)) {
          addGlowingBorder(element);
          initializedFields.add(field.id);
        }
        if (testMode) {
          const firstOption = element.options[1]; // Skip the first option if it's a placeholder
          if (firstOption) {
            element.value = firstOption.value;
            dispatchEvent(element, 'input');
            dispatchEvent(element, 'change');
          }
        } else {
          const index = parseInt(field.value || '0'); // Use '0' as a fallback if field.value is undefined
          if (!isNaN(index) && index >= 0 && index < element.options.length) {
            element.selectedIndex = index;
            dispatchEvent(element, 'input');
            dispatchEvent(element, 'change');
          }
        }
      } else if (element instanceof HTMLButtonElement) {
        element.innerText = field.value || element.innerText;
      }
    }
  });
};

export const dispatchEvent = (
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  eventType: string,
): void => {
  const event = new Event(eventType, { bubbles: true });
  element.dispatchEvent(event);
};

// stream related helpers

export const processChunks = (text: string): void => {
  text.split('\n').forEach(chunk => {
    if (chunk.trim()) {
      try {
        const jsonResponse = JSON.parse(chunk);
        if (jsonResponse?.data?.length) {
          updateFormFields(jsonResponse.data);
          previousFields = jsonResponse.data;
        }
      } catch (e) {
        console.error('Failed to parse chunk:', e);
      }
    }
  });
};

export const processStreamResponse = async (response: ReadableStream): Promise<void> => {
  const reader = response.getReader();
  const decoder = new TextDecoder('utf-8');
  let accumulatedResult = '';

  const processText = async ({ done, value }: ReadableStreamReadResult<Uint8Array>): Promise<void> => {
    if (done) {
      console.log('Stream complete');
      return;
    }

    accumulatedResult += decoder.decode(value, { stream: true });
    processChunks(accumulatedResult);
    accumulatedResult = '';

    await reader.read().then(processText);
  };

  await reader.read().then(processText);
};
