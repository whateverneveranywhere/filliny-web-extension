import type { Field, FieldType } from '@extension/shared';

interface ReactElementProps {
  onSubmit?: () => void;
  onChange?: () => void;
  onClick?: () => void;
  [key: string]: (() => void) | undefined;
}

interface VueElement extends HTMLElement {
  __vue__?: unknown;
}

// Add new helper for computing element visibility with more robust checks
const computeElementVisibility = (
  element: HTMLElement,
): {
  isVisible: boolean;
  hiddenReason?: string;
} => {
  // Check if element or any parent is hidden via CSS
  const isHidden = (el: HTMLElement | null): boolean => {
    while (el) {
      const style = getComputedStyle(el);
      const isFormControl = ['select', 'input', 'textarea'].includes(el.tagName.toLowerCase());

      // More comprehensive visibility checks
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        (!isFormControl && style.opacity === '0') ||
        el.hasAttribute('hidden') ||
        (style.position === 'absolute' && (parseInt(style.left) < -9999 || parseInt(style.top) < -9999))
      ) {
        return true;
      }
      el = el.parentElement;
    }
    return false;
  };

  // Check dimensions and viewport position
  const rect = element.getBoundingClientRect();
  const hasZeroDimensions = !element.offsetWidth && !element.offsetHeight;
  const isOutsideViewport =
    rect.right <= 0 || rect.bottom <= 0 || rect.left >= window.innerWidth || rect.top >= window.innerHeight;

  // Special handling for form controls that might be styled differently
  const isFormControl = ['select', 'input', 'textarea'].includes(element.tagName.toLowerCase());

  if (isFormControl) {
    if (isHidden(element)) {
      return { isVisible: false, hiddenReason: 'hidden-by-css' };
    }
    return { isVisible: true };
  }

  if (hasZeroDimensions) {
    return { isVisible: false, hiddenReason: 'zero-dimensions' };
  }

  if (isOutsideViewport) {
    return { isVisible: false, hiddenReason: 'outside-viewport' };
  }

  if (isHidden(element)) {
    return { isVisible: false, hiddenReason: 'hidden-by-css' };
  }

  return { isVisible: true };
};

// Update isElementVisible to use the new compute function
const isElementVisible = (element: HTMLElement): boolean => {
  const { isVisible } = computeElementVisibility(element);
  return isVisible;
};

const getFieldLabel = (element: HTMLElement): string => {
  let label = '';
  let description = '';

  // 1. Check explicit label with 'for' attribute
  if (element.id) {
    const labelElement = document.querySelector(`label[for="${element.id}"]`);
    if (labelElement) {
      // Get the text content without any nested element text
      const labelNodes = Array.from(labelElement.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent?.trim())
        .filter(Boolean);

      label = labelNodes.join(' ');

      // Look for description in nested elements
      const descriptionEl = labelElement.querySelector('.description, .help-text, .hint, small');
      if (descriptionEl) {
        description = descriptionEl.textContent?.trim() || '';
      }
    }
  }

  // 2. Check for wrapping label
  if (!label) {
    const parentLabel = element.closest('label');
    if (parentLabel) {
      const labelNodes = Array.from(parentLabel.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent?.trim())
        .filter(Boolean);

      label = labelNodes.join(' ');
    }
  }

  // 3. Check aria-label and aria-description
  if (!label) {
    label = element.getAttribute('aria-label')?.trim() || '';
    description = element.getAttribute('aria-description')?.trim() || '';
  }

  // Combine label and description if both exist
  return description ? `${label} (${description})` : label;
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

// Add new helper to detect framework-specific properties
const detectFramework = (
  element: HTMLElement,
): {
  framework: 'react' | 'angular' | 'vue' | 'vanilla';
  props?: ReactElementProps;
} => {
  // Check for React
  const reactKey = Object.keys(element).find(key => key.startsWith('__react') || key.startsWith('_reactProps'));
  if (reactKey) {
    return {
      framework: 'react',
      props: (element as unknown as { [key: string]: ReactElementProps })[reactKey],
    };
  }

  // Check for Angular
  if (element.hasAttribute('ng-model') || element.hasAttribute('[(ngModel)]')) {
    return { framework: 'angular' };
  }

  // Check for Vue
  if (element.hasAttribute('v-model') || (element as VueElement).__vue__) {
    return { framework: 'vue' };
  }

  return { framework: 'vanilla' };
};

// Update field detection to use framework information
const detectInputField = (input: HTMLInputElement, index: number, testMode: boolean = false): Field | null => {
  if (!isElementVisible(input) || shouldSkipElement(input)) return null;

  const framework = detectFramework(input);
  let field = createBaseField(input, index, input.type, testMode);

  // Special handling for Select2 inputs
  if (input.classList.contains('select2-focusser')) {
    const select2Container = input.closest('.select2-container');
    if (select2Container) {
      const selectId = select2Container.getAttribute('id')?.replace('s2id_', '');
      if (selectId) {
        const actualSelect = document.getElementById(selectId) as HTMLSelectElement;
        if (actualSelect) {
          const field = createBaseField(actualSelect, index, 'select', testMode);

          // Set data attribute on both elements
          select2Container.setAttribute('data-filliny-id', field.id);
          input.setAttribute('data-filliny-id', field.id);

          field.options = Array.from(actualSelect.options).map(opt => ({
            value: opt.value,
            text: opt.text.trim(),
            selected: opt.selected,
          }));

          // Always select first valid option in test mode
          const validOptions = field.options.filter(
            opt =>
              opt.value &&
              !opt.text.toLowerCase().includes('select') &&
              !opt.text.includes('--') &&
              !opt.text.toLowerCase().includes('please select'),
          );

          if (validOptions.length > 0) {
            field.testValue = validOptions[0].value;
            field.value = validOptions[0].value; // Set the value immediately in test mode
          }

          // Add Select2-specific metadata
          field.metadata = {
            ...field.metadata,
            framework: 'select2',
            select2Container: select2Container.id,
            actualSelect: selectId,
            visibility: computeElementVisibility(actualSelect),
          };

          return field;
        }
      }
    }
  }

  // Add framework-specific metadata
  field.metadata = {
    framework: framework.framework,
    frameworkProps: framework.props,
    visibility: computeElementVisibility(input),
  };

  // Rest of the existing detection logic...
  switch (input.type) {
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
      field = createBaseField(input, index, input.type);
      field.value = input.value || '';
      if (input.type === 'number' || input.type === 'range') {
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
  // Framework-specific form indicators
  const framework = detectFramework(element);
  if (framework.framework !== 'vanilla') {
    const hasFormProps =
      framework.props &&
      (framework.props.onSubmit ||
        framework.props.onChange ||
        framework.props['ng-submit'] ||
        framework.props['v-on:submit']);
    if (hasFormProps) return true;
  }

  // Common form-like container classes and attributes
  const formLikeClasses = [
    'form',
    'form-group',
    'form-container',
    'form-wrapper',
    'form-section',
    'form-content',
    'form-body',
  ];

  const formLikeRoles = ['form', 'group', 'region', 'search', 'contentinfo'];

  // Check for form-like classes
  const hasFormClass = formLikeClasses.some(
    className => element.classList.contains(className) || element.className.toLowerCase().includes(className),
  );

  // Check for form-like roles
  const hasFormRole = formLikeRoles.includes(element.getAttribute('role') || '');

  // Check for multiple form controls
  const formControls = element.querySelectorAll(
    'input:not([type="hidden"]), select, textarea, [role="textbox"], [role="combobox"]',
  );

  // Check for form-like structure
  const hasFormStructure =
    formControls.length > 1 &&
    !!(
      element.querySelector('button[type="submit"]') ||
      element.querySelector('[role="button"]') ||
      element.querySelector('input[type="submit"]')
    );

  return hasFormClass || hasFormRole || hasFormStructure;
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

  console.log('Tagged elements:', {
    container,
    taggedElements: Array.from(container.querySelectorAll('[data-filliny-id]')).map(el => ({
      id: el.getAttribute('data-filliny-id'),
      tagName: el.tagName,
      type: (el as HTMLInputElement).type,
      classes: el.className,
    })),
  });

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
          field = detectInputField(element, index, isImplicitForm);
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

// Add new helper for XPath-based element location
export const findElementByXPath = (xpath: string, context: HTMLElement = document.body): HTMLElement | null => {
  try {
    const result = document.evaluate(xpath, context, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return result.singleNodeValue as HTMLElement;
  } catch (e) {
    console.warn('XPath evaluation failed:', e);
    return null;
  }
};

// Add helper to generate XPath for an element
const getElementXPath = (element: HTMLElement): string => {
  if (!element.parentElement) return '';

  const idx =
    Array.from(element.parentElement.children)
      .filter(child => child.tagName === element.tagName)
      .indexOf(element) + 1;

  return `${getElementXPath(element.parentElement)}/${element.tagName.toLowerCase()}[${idx}]`;
};

// Update field creation to include XPath information
const createBaseField = (element: HTMLElement, index: number, type: string, testMode: boolean = false): Field => {
  const fieldId = `field-${index}`;

  // Set the data attribute on the element
  element.setAttribute('data-filliny-id', fieldId);

  const field: Field = {
    id: fieldId,
    type: type as FieldType,
    xpath: getElementXPath(element),
    uniqueSelectors: generateUniqueSelectors(element),
    label: getFieldLabel(element),
    value: '',
  };

  // Generate default test values based on field type
  if (testMode) {
    switch (type) {
      case 'text':
        field.testValue = 'Test text';
        break;
      case 'email':
        field.testValue = 'test@example.com';
        break;
      case 'tel':
        field.testValue = '+1234567890';
        break;
      case 'select':
        // Will be handled by Select2 specific code
        break;
      case 'number':
        field.testValue = '42';
        break;
      default:
        field.testValue = `Test ${type}`;
    }
  }

  return field;
};

// Helper to generate multiple unique selectors for an element
const generateUniqueSelectors = (element: HTMLElement): string[] => {
  const selectors: string[] = [];

  // ID-based selector
  if (element.id) {
    selectors.push(`#${CSS.escape(element.id)}`);
  }

  // Class-based selector
  if (element.className) {
    const classSelector = Array.from(element.classList)
      .map(c => `.${CSS.escape(c)}`)
      .join('');
    if (classSelector) selectors.push(classSelector);
  }

  // Attribute-based selectors
  ['name', 'type', 'role', 'aria-label'].forEach(attr => {
    if (element.hasAttribute(attr)) {
      selectors.push(`[${attr}="${CSS.escape(element.getAttribute(attr)!)}"]`);
    }
  });

  return selectors;
};
