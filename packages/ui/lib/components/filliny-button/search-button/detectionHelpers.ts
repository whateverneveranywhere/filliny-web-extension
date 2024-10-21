import type { Field } from '@extension/shared';

const isElementVisible = (element: HTMLElement): boolean => {
  return (
    element.offsetParent !== null &&
    getComputedStyle(element).visibility !== 'hidden' &&
    getComputedStyle(element).display !== 'none'
  );
};

const getFieldLabel = (element: Element): string => {
  let label = '';
  if (element.id) {
    const labelElement = document.querySelector(`label[for="${element.id}"]`);
    if (labelElement) {
      label = labelElement.textContent?.trim() || '';
    }
  }
  if (!label) {
    const parent = element.closest('label');
    if (parent) {
      label = parent.textContent?.trim() || '';
    }
  }
  return label;
};

const getFieldDescription = (element: Element): string => {
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
  if (element.tagName.toLowerCase() === 'select') {
    const selectElement = element as HTMLSelectElement;
    for (let i = 0; i < selectElement.options.length; i++) {
      options.push(selectElement.options[i].text);
    }
  } else if (element.tagName.toLowerCase() === 'input' && (element as HTMLInputElement).type === 'radio') {
    const name = (element as HTMLInputElement).name;
    const radioElements = document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${name}"]`);
    radioElements.forEach(radio => {
      const radioLabel = getFieldLabel(radio);
      options.push(radioLabel || radio.value);
    });
  } else if (element.tagName.toLowerCase() === 'input' && (element as HTMLInputElement).type === 'checkbox') {
    const name = (element as HTMLInputElement).name;
    const checkboxElements = document.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name="${name}"]`);
    checkboxElements.forEach(checkbox => {
      const checkboxLabel = getFieldLabel(checkbox);
      options.push(checkboxLabel || checkbox.value);
    });
  }
  return options;
};

const createFieldObject = (element: HTMLElement, index: number, type: string, value: string = ''): Field => {
  const id = `f-${index}`;
  element.setAttribute('data-filliny-id', id);

  const field: Field = {
    id,
    type: type as Field['type'],
    placeholder: (element as HTMLInputElement).placeholder || '',
    title: element.getAttribute('title') || '',
    label: getFieldLabel(element),
    description: getFieldDescription(element),
    value,
  };

  if (type === 'select' || type === 'checkbox' || type === 'radio') {
    field.options = getOptions(element);
  }

  return field;
};

export const detectFields = (form: HTMLFormElement): Field[] => {
  const fields: Field[] = [];

  const inputs = form.querySelectorAll<HTMLInputElement>('input:not([type="hidden"]):not(.filliny-ignore)');
  inputs.forEach((input, index) => {
    if (isElementVisible(input) && input.type !== 'button') {
      const type = input.type === 'file' ? 'file' : 'input';
      const field = createFieldObject(input, index, type, type === 'file' ? '' : input.value);
      fields.push(field);
    }
  });

  const selects = form.querySelectorAll<HTMLSelectElement>('select:not(.filliny-ignore)');
  selects.forEach((select, index) => {
    if (isElementVisible(select)) {
      const field = createFieldObject(select, inputs.length + index, 'select', select.value);
      fields.push(field);
    }
  });

  const hiddenSelects = form.querySelectorAll<HTMLSelectElement>(
    'select[style*="display: none"], select[style*="visibility: hidden"], select[style*="opacity: 0"]',
  );
  hiddenSelects.forEach((select, index) => {
    const options = select.querySelectorAll('option');
    if (options.length > 0) {
      const field = createFieldObject(select, inputs.length + selects.length + index, 'select', select.value);
      fields.push(field);
    }
  });

  const textareas = form.querySelectorAll<HTMLTextAreaElement>('textarea:not(.filliny-ignore)');
  textareas.forEach((textarea, index) => {
    if (isElementVisible(textarea)) {
      const field = createFieldObject(
        textarea,
        inputs.length + selects.length + hiddenSelects.length + index,
        'textarea',
        textarea.value,
      );
      fields.push(field);
    }
  });

  const checkboxes = form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:not(.filliny-ignore)');
  checkboxes.forEach((checkbox, index) => {
    if (isElementVisible(checkbox)) {
      const field = createFieldObject(
        checkbox,
        inputs.length + selects.length + hiddenSelects.length + textareas.length + index,
        'checkbox',
        checkbox.checked.toString(),
      );
      fields.push(field);
    }
  });

  const radios = form.querySelectorAll<HTMLInputElement>('input[type="radio"]:not(.filliny-ignore)');
  radios.forEach((radio, index) => {
    if (isElementVisible(radio)) {
      const field = createFieldObject(
        radio,
        inputs.length + selects.length + hiddenSelects.length + textareas.length + checkboxes.length + index,
        'radio',
        radio.checked.toString(),
      );
      fields.push(field);
    }
  });

  // Include buttons related to file inputs
  const fileInputs = form.querySelectorAll<HTMLInputElement>('input[type="file"]:not(.filliny-ignore)');
  fileInputs.forEach((fileInput, fileIndex) => {
    const parent = fileInput.parentElement;
    if (parent) {
      const buttons = parent.querySelectorAll<HTMLButtonElement>('button:not(.filliny-ignore)');
      buttons.forEach((button, index) => {
        if (isElementVisible(button)) {
          const field = createFieldObject(
            button,
            inputs.length +
              selects.length +
              hiddenSelects.length +
              textareas.length +
              checkboxes.length +
              radios.length +
              fileIndex +
              index,
            'button',
            button.innerText,
          );
          fields.push(field);
        }
      });
    }
  });

  return fields;
};

export const addGlowingBorder = (element: HTMLElement, color: string = 'green'): void => {
  Object.assign(element.style, {
    boxShadow: `0 0 10px 2px ${color}`,
    transition: 'box-shadow 0.3s ease-in-out',
  });

  setTimeout(() => {
    element.style.boxShadow = '';
  }, 2000);
};
