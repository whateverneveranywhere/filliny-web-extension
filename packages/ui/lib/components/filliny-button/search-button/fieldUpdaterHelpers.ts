import type { Field } from '@extension/shared';
import { addGlowingBorder } from './overlayUtils';

// Add at the top of the file with other declarations
const initializedFields: Set<string> = new Set();

interface Select2Instance {
  trigger: (event: string, data: { val: string }) => void;
}

const simulateHumanTyping = async (element: HTMLInputElement | HTMLTextAreaElement, text: string): Promise<void> => {
  element.focus();
  element.value = text;
  dispatchEvent(element, 'input');
  dispatchEvent(element, 'change');
  element.blur();
};

// Specialized field update helpers
const updateInputField = async (element: HTMLInputElement, field: Field): Promise<void> => {
  if (!initializedFields.has(field.id)) {
    addGlowingBorder(element);
    initializedFields.add(field.id);
  }

  await simulateHumanTyping(element, field.value || '');
};

const updateFileField = async (element: HTMLInputElement, field: Field, testMode: boolean): Promise<void> => {
  if (!initializedFields.has(field.id)) {
    addGlowingBorder(element);
    initializedFields.add(field.id);
  }

  const url = testMode ? 'https://pdfobject.com/pdf/sample.pdf' : field.value;
  if (url) {
    try {
      // Get accepted file types from input
      const acceptedTypes = element.accept ? element.accept.split(',').map(t => t.trim()) : ['.pdf'];

      // Default to PDF if no specific types are specified
      const defaultMimeType = 'application/pdf';

      const blob = await fetchFile(url);
      const fileName = getFileNameFromUrl(url);

      // Determine the appropriate MIME type based on accepted types
      let mimeType = defaultMimeType;
      if (acceptedTypes.length > 0) {
        // If specific types are accepted, use the first one
        // Convert file extension to MIME type if needed
        const firstType = acceptedTypes[0];
        if (firstType.startsWith('.')) {
          // Convert extension to MIME type (e.g., .pdf -> application/pdf)
          switch (firstType.toLowerCase()) {
            case '.pdf':
              mimeType = 'application/pdf';
              break;
            case '.doc':
            case '.docx':
              mimeType = 'application/msword';
              break;
            // Add more cases as needed
            default:
              mimeType = defaultMimeType;
          }
        } else {
          // Use the MIME type directly if specified
          mimeType = firstType;
        }
      }

      // Create file with appropriate MIME type
      const file = new File([blob], fileName, { type: mimeType });

      // Validate if the file type matches accepted types
      if (
        !acceptedTypes.some(type =>
          type.startsWith('.') ? fileName.toLowerCase().endsWith(type) : file.type.includes(type.split('/')[1]),
        )
      ) {
        console.warn(`File type ${file.type} not in accepted types:`, acceptedTypes);
        // Convert to PDF if necessary
        const pdfFile = new File([blob], `${fileName}.pdf`, { type: 'application/pdf' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(pdfFile);
        element.files = dataTransfer.files;
      } else {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        element.files = dataTransfer.files;
      }

      dispatchEvent(element, 'input');
      dispatchEvent(element, 'change');
    } catch (error) {
      console.error('Failed to fetch file:', error);
    }
  }
};

const updateCheckableField = async (element: HTMLElement, field: Field): Promise<void> => {
  if (!initializedFields.has(field.id)) {
    addGlowingBorder(element);
    initializedFields.add(field.id);
  }

  const newCheckedState = (() => {
    if (typeof field.value === 'boolean') return field.value;
    if (typeof field.value === 'string') {
      const value = field.value.toLowerCase();
      return value === 'true' || value === 'yes' || value === 'on' || value === '1';
    }
    if (typeof field.value === 'number') return field.value === 1;
    return false;
  })();

  if (element instanceof HTMLInputElement) {
    // Only click if the state needs to change
    if (element.checked !== newCheckedState) {
      element.focus();
      element.click(); // This simulates a real user click
      element.blur();
    }
  }
};

const updateTextAreaField = async (element: HTMLTextAreaElement, field: Field): Promise<void> => {
  if (!initializedFields.has(field.id)) {
    addGlowingBorder(element);
    initializedFields.add(field.id);
  }

  await simulateHumanTyping(element, field.value || '');
};

const updateSelectField = async (element: HTMLElement, field: Field): Promise<void> => {
  if (!(element instanceof HTMLSelectElement)) {
    console.warn('Expected HTMLSelectElement but got:', element.tagName);
    return;
  }

  const valueToUse = field.testValue || field.value;
  if (!valueToUse) return;

  // Set value directly without focus/click events
  element.value = valueToUse;
  dispatchEvent(element, 'change');

  // Handle Select2 if needed
  if (field.metadata?.framework === 'select2') {
    const select2Instance = (window as { jQuery?: (el: HTMLElement) => { data: (key: string) => Select2Instance } })
      .jQuery?.(element)
      ?.data?.('select2');

    if (select2Instance) {
      select2Instance.trigger('select', { val: element.value });
    }
  }
};

const updateButtonField = (element: HTMLButtonElement, field: Field): void => {
  element.innerText = field.value || element.innerText;
};

const updateRadioGroup = async (element: HTMLInputElement, field: Field): Promise<void> => {
  const form = element.closest('form');
  if (!form) return;

  const groupElements = form.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${element.name}"]`);
  const valueToUse = field.testValue || field.value || field.options?.[0]?.value;

  if (valueToUse) {
    for (const radio of Array.from(groupElements)) {
      const shouldCheck = radio.value === valueToUse || radio.labels?.[0]?.textContent?.trim() === valueToUse;

      if (shouldCheck && !radio.checked) {
        // Get the actual radio input element
        const radioInput =
          radio.type === 'radio' ? radio : radio.querySelector<HTMLInputElement>('input[type="radio"]');

        if (radioInput) {
          // Focus and click the radio input directly
          radioInput.focus();
          radioInput.click();
          radioInput.blur();

          if (!initializedFields.has(field.id)) {
            addGlowingBorder(radio);
            initializedFields.add(field.id);
          }
        }
        break;
      }
    }
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

// Add these new specialized update helpers
const updateHiddenField = (element: HTMLInputElement, field: Field): void => {
  // No visual feedback for hidden fields
  element.value = field.value || '';
  dispatchEvent(element, 'input');
  dispatchEvent(element, 'change');
};

const updateImageField = (element: HTMLInputElement, field: Field): void => {
  if (!initializedFields.has(field.id)) {
    addGlowingBorder(element);
    initializedFields.add(field.id);
  }
  if (field.value) {
    element.src = field.value;
  }
  dispatchEvent(element, 'input');
  dispatchEvent(element, 'change');
};

// Enhanced event dispatcher with more comprehensive event handling
const dispatchEnhancedEvents = (
  element: HTMLElement,
  value: string | boolean,
  options: { triggerFocus?: boolean; triggerValidation?: boolean } = {},
): void => {
  // Basic events
  const events = ['input', 'change'];

  // Add focus events if requested
  if (options.triggerFocus) {
    events.push('focus', 'focusin');
  }

  // Create and dispatch all events
  events.forEach(eventType => {
    const event = new Event(eventType, { bubbles: true, cancelable: true });
    // Add common properties expected by frameworks
    Object.defineProperty(event, 'target', { value: element });
    Object.defineProperty(event, 'currentTarget', { value: element });

    // Add value property for input events
    if (eventType === 'input' || eventType === 'change') {
      Object.defineProperty(event, 'value', { value });
    }

    element.dispatchEvent(event);
  });

  // Trigger validation if requested
  if (options.triggerValidation) {
    const validityEvent = new Event('invalid', { bubbles: true });
    element.dispatchEvent(validityEvent);
  }
};

// Enhanced update function with accessibility support and test mode handling
const updateFormField = (element: HTMLElement, field: Field, testMode: boolean): void => {
  // Handle ARIA attributes
  if (field.label) {
    element.setAttribute('aria-label', field.label);
  }
  if (field.description) {
    element.setAttribute('aria-description', field.description);
  }
  // Handle disabled state
  if ('disabled' in field) {
    element.toggleAttribute('disabled', field.disabled as boolean);
  }

  // Store original values for potential reset
  if (!element.hasAttribute('data-original-value')) {
    element.setAttribute('data-original-value', (element as HTMLInputElement).value || '');
  }

  // Add test mode indicators and styling
  if (testMode) {
    element.setAttribute('data-test-mode', 'true');
    // Add visual indicator for test mode
    element.style.border = '2px dashed green';
    // Add tooltip to indicate test mode
    element.title = `Test Mode - Original value: ${element.getAttribute('data-original-value')}`;

    // Log test mode information
    console.log('Test mode active for field:', {
      id: field.id,
      type: field.type,
      originalValue: element.getAttribute('data-original-value'),
      testValue: field.testValue,
    });
  } else {
    // Remove test mode indicators if switching back to normal mode
    element.removeAttribute('data-test-mode');
    element.style.removeProperty('border');
    // Restore original title if it exists
    const originalTitle = element.getAttribute('data-original-title');
    if (originalTitle) {
      element.title = originalTitle;
    } else {
      element.removeAttribute('title');
    }
  }
};

// Main update function that delegates to specialized helpers
export const updateFormFields = async (fields: Field[], testMode: boolean = false): Promise<void> => {
  // Process all fields in parallel
  await Promise.all(
    fields.map(async field => {
      let element: HTMLElement | null = null;
      if (field.metadata?.framework === 'select2' && field.metadata.actualSelect) {
        element = document.getElementById(field.metadata.actualSelect);
      } else {
        element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
      }

      if (!element) {
        console.warn('Element not found for field:', field.id);
        return;
      }

      if (testMode && !field.testValue && (field.type === 'radio' || field.type === 'select')) {
        assignTestValue(field);
      }

      if (testMode && field.testValue) {
        field.value = field.testValue;
      }

      updateFormField(element, field, testMode);

      if (element instanceof HTMLInputElement) {
        switch (element.type) {
          case 'search':
          case 'text':
          case 'email':
          case 'password':
          case 'number':
          case 'tel':
          case 'url':
            await updateInputField(element, field);
            break;
          case 'hidden':
            updateHiddenField(element, field);
            break;
          case 'image':
            updateImageField(element, field);
            break;
          case 'file':
            await updateFileField(element, field, testMode);
            break;
          case 'radio':
            await updateRadioGroup(element, field);
            break;
          case 'checkbox':
            await updateCheckableField(element, field);
            break;
          default:
            await updateInputField(element, field);
        }
      } else if (element instanceof HTMLTextAreaElement) {
        await updateTextAreaField(element, field);
      } else if (element instanceof HTMLSelectElement) {
        await updateSelectField(element, field);
      } else if (element instanceof HTMLButtonElement) {
        updateButtonField(element, field);
      }

      dispatchEnhancedEvents(element, field.value || '', {
        triggerFocus: false, // Removed unnecessary focus events
        triggerValidation: field.required,
      });
    }),
  );
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
export const processChunks = async (text: string, originalFields: Field[]): Promise<void> => {
  const chunks = text.split('\n');
  const batchSize = 5; // Process fields in batches for better performance
  const pendingUpdates: Field[][] = [];

  for (const chunk of chunks) {
    if (chunk.trim()) {
      try {
        const jsonResponse = JSON.parse(chunk);
        if (jsonResponse?.data?.length) {
          const mergedFields = jsonResponse.data.map((field: Field) => {
            const originalField = originalFields.find(f => f.id === field.id);
            return originalField ? { ...originalField, ...field } : field;
          });

          // Split fields into batches
          for (let i = 0; i < mergedFields.length; i += batchSize) {
            pendingUpdates.push(mergedFields.slice(i, i + batchSize));
          }
        }
      } catch (e) {
        console.error('Failed to parse chunk:', e);
      }
    }
  }

  // Process all batches in parallel
  await Promise.all(pendingUpdates.map(batch => updateFormFields(batch)));
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
    await processChunks(accumulatedResult, originalFields);
    accumulatedResult = '';

    await reader.read().then(processText);
  };

  await reader.read().then(processText);
};
