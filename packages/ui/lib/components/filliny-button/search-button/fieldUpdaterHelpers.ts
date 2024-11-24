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

const updateCheckableField = (element: HTMLElement, field: Field): void => {
  if (!initializedFields.has(field.id)) {
    addGlowingBorder(element);
    initializedFields.add(field.id);
  }

  const newCheckedState = field.value === 'true';

  if (element instanceof HTMLInputElement && element.type === 'checkbox') {
    element.checked = newCheckedState;
  } else if (element.getAttribute('role') === 'checkbox') {
    // Update both the attribute and ARIA state
    if (newCheckedState) {
      element.setAttribute('checked', '');
      element.setAttribute('aria-checked', 'true');
    } else {
      element.removeAttribute('checked');
      element.setAttribute('aria-checked', 'false');
    }
  }

  // Trigger events
  dispatchEnhancedEvents(element, newCheckedState, {
    triggerFocus: true,
    triggerValidation: field.required,
  });
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

// Add these new specialized update helpers
const updateSearchField = (element: HTMLInputElement, field: Field): void => {
  if (!initializedFields.has(field.id)) {
    addGlowingBorder(element);
    initializedFields.add(field.id);
  }
  element.value = field.value || '';
  // Search inputs often have associated clear buttons and search events
  dispatchEvent(element, 'input');
  dispatchEvent(element, 'change');
  dispatchEvent(element, 'search');
};

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
  if (field.disabled !== undefined) {
    element.toggleAttribute('disabled', field.disabled);
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
  for (const field of fields) {
    const element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
    if (!element) continue;

    // Only assign test values in test mode and for fields that support it
    if (testMode && !field.testValue && (field.type === 'radio' || field.type === 'select')) {
      assignTestValue(field);
    }

    // Use testValue if in test mode and available
    if (testMode && field.testValue) {
      field.value = field.testValue;
    }

    // Apply common updates and accessibility enhancements
    updateFormField(element, field, testMode);

    if (element instanceof HTMLInputElement) {
      switch (element.type) {
        case 'search':
          updateSearchField(element, field);
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

    // Trigger enhanced events with validation
    dispatchEnhancedEvents(element, field.value || '', {
      triggerFocus: true,
      triggerValidation: field.required,
    });
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
