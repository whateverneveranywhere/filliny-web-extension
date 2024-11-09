import type { Field } from '@extension/shared';

const isElementVisible = (element: HTMLElement): boolean => {
  // Check if element is visible in the DOM
  return (
    !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length) &&
    getComputedStyle(element).visibility !== 'hidden'
  );
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

  // Inputs
  const inputs = form.querySelectorAll<HTMLInputElement>('input:not([type="hidden"]):not(.filliny-ignore)');
  inputs.forEach(input => {
    if (isElementVisible(input) && input.type !== 'button') {
      const type = input.type === 'file' ? 'file' : 'input';
      const value = type === 'file' ? '' : input.value || '';
      const field = createFieldObject(input, index++, type, value);
      fields.push(field);
    }
  });

  // Selects
  const selects = form.querySelectorAll<HTMLSelectElement>('select:not(.filliny-ignore)');
  selects.forEach(select => {
    if (isElementVisible(select)) {
      const value = select.value || '';
      const field = createFieldObject(select, index++, 'select', value);
      fields.push(field);
    }
  });

  // Hidden Selects
  const hiddenSelects = form.querySelectorAll<HTMLSelectElement>(
    'select[style*="display: none"], select[style*="visibility: hidden"], select[style*="opacity: 0"]',
  );
  hiddenSelects.forEach(select => {
    const options = select.options;
    if (options.length > 0) {
      const value = select.value || '';
      const field = createFieldObject(select, index++, 'select', value);
      fields.push(field);
    }
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

  // Radios
  const radios = form.querySelectorAll<HTMLInputElement>('input[type="radio"]:not(.filliny-ignore)');
  radios.forEach(radio => {
    if (isElementVisible(radio)) {
      const value = radio.checked.toString();
      const field = createFieldObject(radio, index++, 'radio', value);
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

export const addGlowingBorder = (element: HTMLElement, color: string = 'green'): void => {
  element.style.boxShadow = `0 0 10px 2px ${color}`;
  element.style.transition = 'box-shadow 0.3s ease-in-out';

  setTimeout(() => {
    element.style.boxShadow = '';
  }, 2000);
};
