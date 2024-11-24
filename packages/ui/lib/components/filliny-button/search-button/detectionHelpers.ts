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
    case 'file':
      return createBaseField(input, index, 'file');
    default:
      field = createBaseField(input, index, 'input');
      field.value = input.value || '';
      field.testValue = input.getAttribute('data-test-value') || '';
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

const detectCheckboxField = (checkbox: HTMLInputElement, index: number): Field | null => {
  if (!isElementVisible(checkbox) || shouldSkipElement(checkbox)) return null;

  const field = createBaseField(checkbox, index, 'checkbox');
  field.value = checkbox.checked.toString();
  field.testValue = checkbox.getAttribute('data-test-value') || '';
  return field;
};

export const detectFields = (form: HTMLFormElement): Field[] => {
  const fields: Field[] = [];
  let index = 0;
  const processedGroups = new Set<string>();

  // Detect regular inputs
  form.querySelectorAll<HTMLInputElement>('input:not([type="radio"])').forEach(input => {
    const field = detectInputField(input, index);
    if (field) {
      fields.push(field);
      index++;
    }
  });

  // Detect selects
  form.querySelectorAll<HTMLSelectElement>('select').forEach(select => {
    const field = detectSelectField(select, index);
    if (field) {
      fields.push(field);
      index++;
    }
  });

  // Detect radio groups
  form.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach(radio => {
    const field = detectRadioGroup(form, radio, index, processedGroups);
    if (field) {
      fields.push(field);
      index++;
    }
  });

  // Detect textareas
  form.querySelectorAll<HTMLTextAreaElement>('textarea').forEach(textarea => {
    const field = detectTextareaField(textarea, index);
    if (field) {
      fields.push(field);
      index++;
    }
  });

  // Detect checkboxes
  form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(checkbox => {
    const field = detectCheckboxField(checkbox, index);
    if (field) {
      fields.push(field);
      index++;
    }
  });

  return fields;
};
