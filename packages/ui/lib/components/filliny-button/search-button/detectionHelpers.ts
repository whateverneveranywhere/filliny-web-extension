import type { Field } from '@extension/shared';

const isElementVisible = (element: HTMLElement): boolean => {
  // Check if element or any parent is hidden via CSS
  const isHidden = (el: HTMLElement | null): boolean => {
    while (el) {
      const style = getComputedStyle(el);
      // Don't check position: absolute for form controls that might be styled this way
      const isFormControl = ['select', 'input'].includes(el.tagName.toLowerCase());
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        (!isFormControl && style.opacity === '0') ||
        el.hasAttribute('hidden')
      ) {
        return true;
      }
      el = el.parentElement;
    }
    return false;
  };

  // Special handling for form controls
  const isFormControl = ['select', 'input', 'textarea'].includes(element.tagName.toLowerCase());
  if (isFormControl) {
    // Only check if the element is completely hidden
    return !isHidden(element);
  }

  // For non-form controls, perform full visibility checks
  const hasZeroDimensions = !element.offsetWidth && !element.offsetHeight && !element.getClientRects().length;
  const rect = element.getBoundingClientRect();
  const isOutsideViewport = rect.left + rect.width <= 0 || rect.top + rect.height <= 0;

  return !hasZeroDimensions && !isHidden(element) && !isOutsideViewport;
};

const getFieldLabel = (element: HTMLElement): string => {
  let label = '';

  if (element.id) {
    const labelElement = document.querySelector(`label[for="${element.id}"]`);
    if (labelElement) {
      label = labelElement.textContent?.trim() || '';
    }
  }

  if (!label) {
    const parentLabel = element.closest('label');
    if (parentLabel) {
      label = parentLabel.textContent?.trim() || '';
    }
  }

  return label;
};

const getFieldDescription = (element: HTMLElement): string => {
  let description = element.getAttribute('aria-describedby') || element.getAttribute('data-description') || '';

  if (description) {
    const descElement = document.getElementById(description);
    if (descElement) {
      description = descElement.textContent?.trim() || '';
    }
  } else {
    const parent = element.parentElement;
    if (parent) {
      const siblingDesc = parent.querySelector('.description, .help-text, .hint');
      if (siblingDesc) {
        description = siblingDesc.textContent?.trim() || '';
      }
    }
  }

  return description;
};

const getOptions = (element: HTMLElement): string[] => {
  const options: string[] = [];
  const tagName = element.tagName.toLowerCase();

  if (tagName === 'select') {
    const selectElement = element as HTMLSelectElement;
    for (let i = 0; i < selectElement.options.length; i++) {
      options.push(selectElement.options[i].text.trim());
    }
  } else if (tagName === 'input' && ['radio', 'checkbox'].includes((element as HTMLInputElement).type)) {
    const inputElement = element as HTMLInputElement;
    const type = inputElement.type;
    const name = inputElement.name;
    if (name) {
      const elements = document.querySelectorAll<HTMLInputElement>(`input[type="${type}"][name="${name}"]`);
      elements.forEach(el => {
        const label = getFieldLabel(el);
        options.push(label || el.value);
      });
    }
  }

  return options;
};

const createFieldObject = (element: HTMLElement, index: number, type: Field['type'], value: string = ''): Field => {
  const id = `f-${index}`;
  element.setAttribute('data-filliny-id', id);

  const field: Field = {
    id,
    type,
    placeholder: (element as HTMLInputElement).placeholder || '',
    title: element.getAttribute('title') || '',
    label: getFieldLabel(element),
    description: getFieldDescription(element),
    value,
  };

  if (['select', 'checkbox', 'radio'].includes(type)) {
    field.options = getOptions(element);
  }

  return field;
};

export const detectFields = (form: HTMLFormElement): Field[] => {
  const fields: Field[] = [];
  let index = 0;
  const processedGroups = new Set<string>(); // Track processed radio groups

  // Add these helper functions at the start
  const shouldSkipElement = (element: HTMLElement): boolean => {
    // Skip disabled elements
    if (element.hasAttribute('disabled')) return true;

    // Skip readonly elements
    if (element.hasAttribute('readonly')) return true;

    // Skip elements with specific data attributes
    if (element.getAttribute('data-filliny-skip') === 'true') return true;

    // Skip elements that are part of autocomplete/datalist
    if (element.hasAttribute('list')) return true;

    return false;
  };

  // Inputs (excluding radio)
  const inputs = form.querySelectorAll<HTMLInputElement>(
    'input:not([type="hidden"]):not([type="radio"]):not(.filliny-ignore)',
  );
  inputs.forEach(input => {
    if (isElementVisible(input) && !shouldSkipElement(input) && input.type !== 'button') {
      const type = input.type === 'file' ? 'file' : 'input';
      const value = type === 'file' ? '' : input.value || '';
      const field = createFieldObject(input, index++, type, value);
      fields.push(field);
    }
  });

  // Selects - only add the select element itself, with options
  const selects = form.querySelectorAll<HTMLSelectElement>('select:not(.filliny-ignore)');
  selects.forEach(select => {
    if (isElementVisible(select) && !shouldSkipElement(select)) {
      const value = select.value || '';
      const options: string[] = Array.from(select.options).map(opt => opt.text.trim());

      const field = {
        id: `f-${index++}`,
        type: 'select' as const,
        placeholder: select.getAttribute('placeholder') || '',
        title: select.getAttribute('title') || '',
        label: getFieldLabel(select),
        description: getFieldDescription(select),
        value,
        options,
      };

      select.setAttribute('data-filliny-id', field.id);
      fields.push(field);
    }
  });

  // Radio groups - group by name attribute
  const radios = form.querySelectorAll<HTMLInputElement>('input[type="radio"]:not(.filliny-ignore)');
  radios.forEach(radio => {
    const name = radio.name;
    if (!name || processedGroups.has(name)) return;

    const groupElements = form.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${name}"]`);
    const visibleElements = Array.from(groupElements).filter(el => isElementVisible(el) && !shouldSkipElement(el));

    if (visibleElements.length > 0) {
      // Use the first radio button as the main element
      const mainRadio = visibleElements[0];
      const options: string[] = visibleElements.map(el => {
        const label = getFieldLabel(el);
        return label || el.value;
      });

      const selectedRadio = visibleElements.find(el => el.checked);
      const value = selectedRadio ? getFieldLabel(selectedRadio) || selectedRadio.value : '';

      const field = {
        id: `f-${index++}`,
        type: 'radio' as const,
        placeholder: mainRadio.getAttribute('placeholder') || '',
        title: mainRadio.getAttribute('title') || '',
        label: getFieldLabel(mainRadio),
        description: getFieldDescription(mainRadio),
        value,
        options,
      };

      // Add the field ID to all radio buttons in the group
      visibleElements.forEach(el => el.setAttribute('data-filliny-id', field.id));
      fields.push(field);
    }

    processedGroups.add(name);
  });

  // Textareas
  const textareas = form.querySelectorAll<HTMLTextAreaElement>('textarea:not(.filliny-ignore)');
  textareas.forEach(textarea => {
    if (isElementVisible(textarea)) {
      const value = textarea.value || '';
      const field = createFieldObject(textarea, index++, 'textarea', value);
      fields.push(field);
    }
  });

  // Checkboxes
  const checkboxes = form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:not(.filliny-ignore)');
  checkboxes.forEach(checkbox => {
    if (isElementVisible(checkbox)) {
      const value = checkbox.checked.toString();
      const field = createFieldObject(checkbox, index++, 'checkbox', value);
      fields.push(field);
    }
  });

  // File Inputs and associated buttons
  const fileInputs = form.querySelectorAll<HTMLInputElement>('input[type="file"]:not(.filliny-ignore)');
  fileInputs.forEach(fileInput => {
    const parent = fileInput.parentElement;
    if (parent) {
      const buttons = parent.querySelectorAll<HTMLButtonElement>('button:not(.filliny-ignore)');
      buttons.forEach(button => {
        if (isElementVisible(button)) {
          const value = button.innerText.trim();
          const field = createFieldObject(button, index++, 'button', value);
          fields.push(field);
        }
      });
    }
  });

  return fields;
};
