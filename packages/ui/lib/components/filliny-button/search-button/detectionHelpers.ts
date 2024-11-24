import type { Field } from '@extension/shared';
import { createBaseField } from './fieldCreator';

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

const detectInputField = (input: HTMLInputElement, index: number): Field | null => {
  if (!isElementVisible(input) || shouldSkipElement(input)) return null;

  const type = input.type;
  let field: Field;

  switch (type) {
    case 'button':
    case 'submit':
    case 'reset':
    case 'hidden':
      return null;
    case 'color':
    case 'date':
    case 'datetime-local':
    case 'month':
    case 'week':
    case 'time':
    case 'range':
    case 'tel':
    case 'email':
    case 'url':
    case 'number':
      field = createBaseField(input, index, type);
      field.value = input.value || '';
      if (type === 'number' || type === 'range') {
        field.validation = {
          ...field.validation,
          step: Number(input.step) || 1,
        };
      }
      return field;
    case 'file':
      return createBaseField(input, index, 'file');
    default:
      field = createBaseField(input, index, 'text');
      field.value = input.value || '';
      return field;
  }
};

const detectSelectField = (select: HTMLSelectElement, index: number): Field | null => {
  if (!isElementVisible(select) || shouldSkipElement(select)) return null;

  const field = createBaseField(select, index, 'select');
  field.value = select.value || '';
  field.options = Array.from(select.options).map(opt => ({
    value: opt.value,
    text: opt.text.trim(),
    selected: opt.selected,
  }));
  field.testValue = select.getAttribute('data-test-value') || '';

  return field;
};

const detectRadioGroup = (
  form: HTMLFormElement,
  radio: HTMLInputElement,
  index: number,
  processedGroups: Set<string>,
): Field | null => {
  const name = radio.name;
  if (!name || processedGroups.has(name)) return null;

  const groupElements = form.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${name}"]`);
  const visibleElements = Array.from(groupElements).filter(el => isElementVisible(el) && !shouldSkipElement(el));

  if (visibleElements.length === 0) return null;

  const field = createBaseField(visibleElements[0], index, 'radio');
  field.options = visibleElements.map(el => ({
    value: el.value,
    text: getFieldLabel(el) || el.value,
    selected: el.checked,
  }));

  const selectedRadio = visibleElements.find(el => el.checked);
  field.value = selectedRadio ? getFieldLabel(selectedRadio) || selectedRadio.value : '';
  field.testValue = visibleElements[0].getAttribute('data-test-value') || '';

  // Add field ID to all radio buttons in group
  visibleElements.forEach(el => el.setAttribute('data-filliny-id', field.id));

  processedGroups.add(name);
  return field;
};

const detectTextareaField = (textarea: HTMLTextAreaElement, index: number): Field | null => {
  if (!isElementVisible(textarea) || shouldSkipElement(textarea)) return null;

  const field = createBaseField(textarea, index, 'textarea');
  field.value = textarea.value || '';
  field.testValue = textarea.getAttribute('data-test-value') || '';
  return field;
};

const detectCheckboxField = (element: HTMLElement, index: number): Field | null => {
  if (!isElementVisible(element) || shouldSkipElement(element)) return null;

  const field = createBaseField(element, index, 'checkbox');

  // Determine initial state
  let isInitiallyChecked: boolean;
  if (element instanceof HTMLInputElement && element.type === 'checkbox') {
    isInitiallyChecked = element.checked;
  } else if (element.getAttribute('role') === 'checkbox') {
    isInitiallyChecked = element.hasAttribute('checked') || element.getAttribute('aria-checked') === 'true';
  } else {
    isInitiallyChecked = false;
  }

  // Set the value to the opposite of the initial state
  field.value = (!isInitiallyChecked).toString();

  field.testValue = element.getAttribute('data-test-value') || '';
  return field;
};

const getElementRole = (element: HTMLElement): string | null => {
  // Check explicit role first
  const role = element.getAttribute('role');
  if (role) return role;

  // Check implicit roles based on element type
  switch (element.tagName.toLowerCase()) {
    case 'input':
      return (element as HTMLInputElement).type;
    case 'select':
      return 'combobox';
    case 'textarea':
      return 'textbox';
    default:
      return null;
  }
};

const getElementValue = (element: HTMLElement): string => {
  // Check standard value attribute
  const value = element.getAttribute('value') || '';

  // Check aria-checked for checkbox-like elements
  const checked = element.getAttribute('aria-checked');
  if (checked) {
    return checked;
  }

  // Check data-state for custom components
  const state = element.getAttribute('data-state');
  if (state) {
    return state;
  }

  // For input-like elements
  if (element instanceof HTMLInputElement) {
    return element.value;
  }

  // For custom components, check inner text
  return value || element.textContent?.trim() || '';
};

export const detectFields = (form: HTMLFormElement): Field[] => {
  const fields: Field[] = [];
  let index = 0;
  const processedGroups = new Set<string>();

  // Query all potential form controls, including ARIA-based ones
  const formControls = form.querySelectorAll<HTMLElement>(`
    input[type="checkbox"],
    [role="checkbox"],
    [role="switch"],
    input,
    select,
    textarea,
    [role="radio"],
    [role="textbox"],
    [role="combobox"],
    [role="spinbutton"],
    [data-filliny-field]
  `);

  formControls.forEach(element => {
    if (!isElementVisible(element) || shouldSkipElement(element)) return;

    const role = getElementRole(element);
    let field: Field | null = null;

    switch (role) {
      case 'checkbox':
      case 'switch':
        field = detectCheckboxField(element, index);
        break;
      case 'radio':
        if (element instanceof HTMLInputElement) {
          field = detectRadioGroup(form, element, index, processedGroups);
        }
        break;
      case 'textbox':
      case 'spinbutton':
        field = detectTextLikeField(element, index);
        break;
      case 'combobox':
        field = detectSelectLikeField(element, index);
        break;
      default:
        // Handle native elements
        if (element instanceof HTMLInputElement) {
          field = detectInputField(element, index);
        } else if (element instanceof HTMLSelectElement) {
          field = detectSelectField(element, index);
        } else if (element instanceof HTMLTextAreaElement) {
          field = detectTextareaField(element, index);
        }
    }

    if (field) {
      fields.push(field);
      index++;
    }
  });

  return fields;
};

const detectTextLikeField = (element: HTMLElement, index: number): Field | null => {
  const field = createBaseField(element, index, 'text');
  field.value = getElementValue(element);
  field.testValue = element.getAttribute('data-test-value') || '';
  return field;
};

const detectSelectLikeField = (element: HTMLElement, index: number): Field | null => {
  const field = createBaseField(element, index, 'select');

  // Look for options in various formats
  const options = element.querySelectorAll('[role="option"], option, [data-option]');
  field.options = Array.from(options).map(opt => ({
    value: opt.getAttribute('value') || opt.textContent?.trim() || '',
    text: opt.textContent?.trim() || '',
    selected: opt.getAttribute('aria-selected') === 'true' || opt.hasAttribute('selected'),
  }));

  field.value = getElementValue(element);
  field.testValue = element.getAttribute('data-test-value') || '';
  return field;
};
