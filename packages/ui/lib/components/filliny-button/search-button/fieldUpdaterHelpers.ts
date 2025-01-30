import type { Field } from '@extension/shared';
import { addGlowingBorder } from './overlayUtils';

// Add at the top of the file with other declarations
const initializedFields: Set<string> = new Set();

interface Select2Instance {
  trigger: (event: string, data: { val: string }) => void;
}

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

const updateCheckableField = (element: HTMLElement, field: Field): void => {
  if (!initializedFields.has(field.id)) {
    addGlowingBorder(element);
    initializedFields.add(field.id);
  }

  // Convert field.value to boolean, handling string values more explicitly
  const newCheckedState = (() => {
    if (typeof field.value === 'boolean') return field.value;
    if (typeof field.value === 'string') {
      const value = field.value.toLowerCase();
      return value === 'true' || value === 'yes' || value === 'on' || value === '1';
    }
    if (typeof field.value === 'number') return field.value === 1;
    return false;
  })();

  console.log('Updating checkbox:', {
    id: field.id,
    value: field.value,
    newState: newCheckedState,
    element: element.tagName,
    currentState: element instanceof HTMLInputElement ? element.checked : element.getAttribute('aria-checked'),
  });

  if (element instanceof HTMLInputElement) {
    // Set checked state
    element.checked = newCheckedState;

    // Trigger native events in correct order
    element.dispatchEvent(new Event('click', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

    // Force React to notice the change
    const nativeInputEvent = new Event('input', { bubbles: true });
    const nativeChangeEvent = new Event('change', { bubbles: true });
    Object.defineProperty(nativeInputEvent, 'target', { value: element });
    Object.defineProperty(nativeChangeEvent, 'target', { value: element });
    element.dispatchEvent(nativeInputEvent);
    element.dispatchEvent(nativeChangeEvent);
  } else {
    if (newCheckedState) {
      element.setAttribute('checked', '');
      element.setAttribute('aria-checked', 'true');
    } else {
      element.removeAttribute('checked');
      element.setAttribute('aria-checked', 'false');
    }
    // Trigger events for custom elements
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Handle any framework-specific updates
  if (element.closest('[data-reactroot]')) {
    // Force React controlled components to update
    const reactChangeEvent = new Event('change', { bubbles: true });
    Object.defineProperty(reactChangeEvent, 'target', {
      value: { checked: newCheckedState, type: 'checkbox' },
    });
    element.dispatchEvent(reactChangeEvent);
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

const updateSelectField = (element: HTMLElement, field: Field): void => {
  if (!(element instanceof HTMLSelectElement)) {
    console.warn('Expected HTMLSelectElement but got:', element.tagName);
    return;
  }

  console.log('Updating select field:', {
    elementId: element.id,
    fieldId: field.id,
    currentValue: element.value,
    newValue: field.testValue || field.value,
    options: Array.from(element.options).map(opt => ({
      value: opt.value,
      text: opt.text,
    })),
  });

  // Try to find the option by exact value first, then by text content
  const valueToUse = field.testValue || field.value;
  let found = false;

  // First try exact value match
  if (valueToUse) {
    // Try to find by value attribute first
    const optionByValue = Array.from(element.options).find(opt => opt.value === valueToUse);
    if (optionByValue) {
      element.value = optionByValue.value;
      found = true;
    } else {
      // If not found by value, try to find by text content
      const optionByText = Array.from(element.options).find(
        opt => opt.text.trim() === valueToUse || opt.text.trim().toLowerCase() === valueToUse.toLowerCase(),
      );
      if (optionByText) {
        element.value = optionByText.value;
        found = true;
      }
    }
  }

  if (!found && valueToUse) {
    console.warn('Could not find matching option for value:', {
      fieldId: field.id,
      value: valueToUse,
      availableOptions: Array.from(element.options).map(opt => ({
        value: opt.value,
        text: opt.text,
      })),
    });
  }

  // Trigger Select2 update if it's a Select2 field
  if (field.metadata?.framework === 'select2') {
    const select2Instance = (window as { jQuery?: (el: HTMLElement) => { data: (key: string) => Select2Instance } })
      .jQuery?.(element)
      ?.data?.('select2');

    if (select2Instance) {
      select2Instance.trigger('select', { val: element.value });
    }
  }

  // Dispatch events
  dispatchEvent(element, 'change');
  dispatchEvent(element, 'input');
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
      // Check for exact value match first
      let shouldCheck = radio.value === valueToUse;

      // If no match found, try matching against label text
      if (!shouldCheck && radio.labels?.[0]) {
        const labelText = radio.labels[0].textContent?.trim();
        shouldCheck = labelText === valueToUse || labelText?.toLowerCase() === valueToUse.toLowerCase();
      }

      if (shouldCheck) {
        foundMatch = true;
        // Force React to notice the change
        radio.checked = true;

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
        availableValues: Array.from(groupElements).map(el => ({
          value: el.value,
          label: el.labels?.[0]?.textContent,
        })),
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
  console.log('updateFormFields called:', { fieldsCount: fields.length, testMode });

  for (const field of fields) {
    console.log('Processing field:', {
      id: field.id,
      type: field.type,
      label: field.label,
      value: field.value,
      testValue: field.testValue,
      metadata: field.metadata,
    });

    // For Select2 fields, look for both the container and the actual select
    let element: HTMLElement | null = null;
    if (field.metadata?.framework === 'select2' && field.metadata.actualSelect) {
      // Get the actual select element instead of the container
      element = document.getElementById(field.metadata.actualSelect);
      console.log('Found Select2 actual select:', {
        id: field.metadata.actualSelect,
        element: element?.tagName,
        value: (element as HTMLSelectElement)?.value,
      });
    } else {
      element = document.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
    }

    console.log('Found element:', {
      found: !!element,
      elementType: element?.tagName,
      elementId: element?.id,
      dataFillinyId: element?.getAttribute('data-filliny-id'),
    });

    if (!element) {
      console.warn('Element not found for field:', field.id);
      continue;
    }

    // Only assign test values in test mode and for fields that support it
    if (testMode && !field.testValue && (field.type === 'radio' || field.type === 'select')) {
      console.log('Assigning test value for field:', field.id);
      assignTestValue(field);
    }

    // Use testValue if in test mode and available
    if (testMode && field.testValue) {
      console.log('Using test value:', {
        fieldId: field.id,
        originalValue: field.value,
        testValue: field.testValue,
      });
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
