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

  // 1. Check explicit label with 'for' attribute
  if (element.id) {
    const labelElement = document.querySelector(`label[for="${element.id}"]`);
    if (labelElement) {
      label = labelElement.textContent?.trim() || '';
    }
  }

  // 2. Check for wrapping label
  if (!label) {
    const parentLabel = element.closest('label');
    if (parentLabel) {
      label = parentLabel.textContent?.trim() || '';
    }
  }

  // 3. Check aria-label
  if (!label) {
    label = element.getAttribute('aria-label')?.trim() || '';
  }

  // 4. Check aria-labelledby
  if (!label && element.getAttribute('aria-labelledby')) {
    const labelledBy = element.getAttribute('aria-labelledby')?.split(' ');
    if (labelledBy) {
      label = labelledBy
        .map(id => document.getElementById(id)?.textContent?.trim())
        .filter(Boolean)
        .join(' ');
    }
  }

  // 5. Check placeholder
  if (!label && 'placeholder' in element) {
    label = (element as HTMLInputElement).placeholder || '';
  }

  // 6. Check name attribute
  if (!label) {
    const name = element.getAttribute('name');
    if (name) {
      // Convert name to readable format (e.g., user_first_name -> User First Name)
      label = name
        .replace(/[_-]/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  }

  // 7. Check preceding elements for potential labels
  if (!label) {
    // Look for elements that might be labels immediately before this field
    const previousElement = element.previousElementSibling;
    if (previousElement && ['span', 'div', 'p'].includes(previousElement.tagName.toLowerCase())) {
      label = previousElement.textContent?.trim() || '';
    }
  }

  // 8. Check parent containers for potential field groups
  if (!label) {
    const fieldGroup = element.closest('[class*="field"], [class*="form-group"], [class*="input-group"]');
    if (fieldGroup) {
      // Look for heading elements or elements with specific classes
      const groupLabel = fieldGroup.querySelector('legend, h1, h2, h3, h4, h5, h6, [class*="label"], [class*="title"]');
      if (groupLabel) {
        label = groupLabel.textContent?.trim() || '';
      }
    }
  }

  // 9. Analyze surrounding context
  if (!label) {
    // Look for any text node directly preceding the input
    let node = element.previousSibling;
    while (node && !label) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text && text.length < 50) {
          // Avoid capturing large text blocks
          label = text;
        }
      }
      node = node.previousSibling;
    }
  }

  // 10. Generate fallback label based on field type and context
  if (!label) {
    const type = (element as HTMLInputElement).type || element.getAttribute('type');
    const role = element.getAttribute('role');
    const pattern = element.getAttribute('pattern');

    // Create contextual fallback label
    if (type === 'email' || pattern?.includes('@')) {
      label = 'Email';
    } else if (type === 'tel' || pattern?.includes('\\d')) {
      label = 'Phone';
    } else if (type === 'password') {
      label = 'Password';
    } else if (role === 'search' || element.classList.contains('search')) {
      label = 'Search';
    } else if (element instanceof HTMLSelectElement) {
      label = 'Selection';
    } else if (element instanceof HTMLTextAreaElement) {
      label = 'Comments';
    } else {
      // Last resort: generate based on position
      const inputs = Array.from(
        element.closest('form, [data-filliny-confidence]')?.querySelectorAll('input, select, textarea') || [],
      );
      const index = inputs.indexOf(element as HTMLElement);
      label = `Field ${index + 1}`;
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

const detectRadioGroup = (element: HTMLInputElement, index: number, processedGroups: Set<string>): Field | null => {
  const name = element.name;
  if (!name || processedGroups.has(name)) return null;

  // Find the parent form or form-like container
  const container = element.closest('form, [data-filliny-confidence]');
  if (!container) return null;

  const groupElements = container.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${name}"]`);
  const visibleElements = Array.from(groupElements).filter(el => isElementVisible(el) && !shouldSkipElement(el));

  if (visibleElements.length === 0) return null;

  const field = createBaseField(visibleElements[0], index, 'radio');
  field.options = visibleElements.map(el => {
    const labelText = getFieldLabel(el);
    return {
      value: el.value,
      text: labelText || el.value,
      selected: el.checked,
    };
  });

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

// Add new helper function at the top
const isFormLikeContainer = (element: HTMLElement): boolean => {
  // Common form-like container classes and attributes
  const formLikeClasses = ['form', 'form-group', 'form-container', 'form-wrapper', 'form-section'];
  const formLikeRoles = ['form', 'group', 'region'];

  return (
    // Check for form-like classes
    formLikeClasses.some(className => element.classList.contains(className)) ||
    // Check for form-like roles
    (element.getAttribute('role') && formLikeRoles.includes(element.getAttribute('role')!)) ||
    // Check for multiple form controls
    element.querySelectorAll('input, select, textarea').length > 1
  );
};

// Modify the detectFields export to handle both forms and form-like containers
export const detectFields = (container: HTMLElement, isImplicitForm: boolean = false): Field[] => {
  const fields: Field[] = [];
  let index = 0;
  const processedGroups = new Set<string>();

  // Query all potential form controls, including ARIA-based ones
  const formControls = container.querySelectorAll<HTMLElement>(`
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

  // Add confidence level attribute to the container
  if (isImplicitForm) {
    container.setAttribute('data-filliny-confidence', 'medium');
  } else {
    container.setAttribute('data-filliny-confidence', 'high');
  }

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
          field = detectRadioGroup(element, index, processedGroups);
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

// Add new export for detecting form-like containers
export const detectFormLikeContainers = (): HTMLElement[] => {
  const containers: HTMLElement[] = [];

  // First, get all actual forms
  const forms = Array.from(document.querySelectorAll<HTMLFormElement>('form'));
  containers.push(...forms);

  // Then look for potential form-like containers that aren't actual forms
  const potentialContainers = document.querySelectorAll<HTMLElement>('div, section, article, main, aside');

  potentialContainers.forEach(container => {
    // Skip if this container is inside an actual form or already detected container
    if (container.closest('form') || containers.some(existing => existing.contains(container))) {
      return;
    }

    if (isFormLikeContainer(container)) {
      containers.push(container);
    }
  });

  return containers;
};
