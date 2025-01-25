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

const getAllFrameDocuments = (): Document[] => {
  const docs: Document[] = [document];
  const processedFrames = new Set<string>();

  const tryGetIframeDoc = (iframe: HTMLIFrameElement): Document | null => {
    try {
      // Try different ways to access iframe content
      if (iframe.contentDocument?.readyState === 'complete') {
        return iframe.contentDocument;
      }
      if (iframe.contentWindow?.document?.readyState === 'complete') {
        return iframe.contentWindow.document;
      }
      // If not complete but accessible, queue for retry
      if (iframe.contentDocument || iframe.contentWindow?.document) {
        setTimeout(() => {
          const doc = tryGetIframeDoc(iframe);
          if (doc && !processedFrames.has(iframe.src)) {
            processedFrames.add(iframe.src);
            docs.push(doc);
            detectFormLikeContainers(); // Re-run detection
          }
        }, 500);
      }
    } catch (e) {
      console.debug('Frame access restricted:', {
        src: iframe.src,
        error: (e as Error).message,
      });
    }
    return null;
  };

  // Process all iframes recursively
  const processIframes = (doc: Document) => {
    Array.from(doc.getElementsByTagName('iframe')).forEach(iframe => {
      if (!processedFrames.has(iframe.src)) {
        const iframeDoc = tryGetIframeDoc(iframe);
        if (iframeDoc) {
          processedFrames.add(iframe.src);
          docs.push(iframeDoc);
          // Recursively process nested iframes
          processIframes(iframeDoc);
        }
      }
    });
  };

  try {
    processIframes(document);
  } catch (e) {
    console.warn('Error processing frames:', e);
  }

  return docs;
};

// Update the initialization to be more robust
export const initializeIframeDetection = (): void => {
  let detectingForms = false;

  const safeDetectForms = () => {
    if (detectingForms) return;
    detectingForms = true;
    setTimeout(() => {
      detectFormLikeContainers();
      detectingForms = false;
    }, 0);
  };

  // Watch for any DOM changes that might indicate new forms
  const observer = new MutationObserver(mutations => {
    const hasRelevantChanges = mutations.some(mutation =>
      Array.from(mutation.addedNodes).some(node => {
        if (node instanceof HTMLElement) {
          return node.tagName === 'IFRAME' || node.tagName === 'FORM' || node.querySelector('form, iframe');
        }
        return false;
      }),
    );

    if (hasRelevantChanges) {
      safeDetectForms();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Initial detection
  safeDetectForms();

  // Handle dynamic iframe loads
  window.addEventListener('load', safeDetectForms, { once: true });
  window.addEventListener('DOMContentLoaded', safeDetectForms, { once: true });
};

// Update querySelector to work across frames
const querySelectorAllFrames = (selector: string): Element[] => {
  const results: Element[] = [];
  const documents = getAllFrameDocuments();

  for (const doc of documents) {
    try {
      results.push(...Array.from(doc.querySelectorAll(selector)));
    } catch (e) {
      console.warn('Error querying in frame:', e);
    }
  }

  return results;
};

const getFieldLabel = (element: HTMLElement): string => {
  const strategies = [
    // 1. Accessibility-first approach
    () => {
      // Check ARIA attributes
      const ariaLabel = element.getAttribute('aria-label')?.trim();
      if (ariaLabel) return ariaLabel;

      // Check ARIA labelledby
      const labelledBy = element.getAttribute('aria-labelledby');
      if (labelledBy) {
        const labelTexts = labelledBy
          .split(/\s+/)
          .map(id => document.getElementById(id)?.textContent?.trim())
          .filter(Boolean);
        if (labelTexts.length) return labelTexts.join(' ');
      }

      // Check ARIA describedby
      const describedBy = element.getAttribute('aria-describedby');
      if (describedBy) {
        const descriptionTexts = describedBy
          .split(/\s+/)
          .map(id => document.getElementById(id)?.textContent?.trim())
          .filter(Boolean);
        if (descriptionTexts.length) return descriptionTexts.join(' ');
      }

      return '';
    },

    // 2. Standard HTML semantics
    () => {
      // Check for explicit label using 'for' attribute
      if (element.id) {
        const labelElement = element.ownerDocument.querySelector(`label[for="${element.id}"]`);
        if (labelElement?.textContent?.trim()) return labelElement.textContent.trim();
      }

      // Check for wrapping label
      const parentLabel = element.closest('label');
      if (parentLabel) {
        // Clone to avoid modifying the actual DOM
        const clone = parentLabel.cloneNode(true) as HTMLElement;
        // Remove the input element from clone to get just the label text
        clone.querySelectorAll('input, select, textarea, button').forEach(el => el.remove());
        if (clone.textContent?.trim()) return clone.textContent.trim();
      }

      return '';
    },

    // 3. DOM structure analysis
    () => {
      const doc = element.ownerDocument;

      // Try to find preceding text nodes using XPath
      try {
        const xpathResult = doc.evaluate(
          `./preceding-sibling::text()[normalize-space(.)!=''] | 
           ./preceding-sibling::*/text()[normalize-space(.)!=''] |
           ../text()[following-sibling::*[1][self::${element.tagName.toLowerCase()}]]`,
          element,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null,
        );

        const textNodes = [];
        for (let i = 0; i < xpathResult.snapshotLength; i++) {
          const node = xpathResult.snapshotItem(i);
          if (node?.textContent) textNodes.push(node.textContent.trim());
        }

        // Return the closest meaningful text
        const relevantText = textNodes.reverse().find(
          text =>
            text.length > 1 &&
            text.length < 200 &&
            !/^[0-9.,$€£%]+$/.test(text) &&
            !text.includes('{{') && // Skip template syntax
            !text.includes('}}'),
        );

        if (relevantText) return relevantText;
      } catch (e) {
        console.debug('XPath evaluation failed:', e);
      }

      return '';
    },

    // 4. Form field attributes
    () => {
      return (
        element.getAttribute('placeholder')?.trim() ||
        element.getAttribute('title')?.trim() ||
        element
          .getAttribute('name')
          ?.split(/[._[\]]/g)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')
          .trim() ||
        ''
      );
    },
  ];

  // Try each strategy until we find a valid label
  for (const strategy of strategies) {
    const label = strategy();
    if (label && !/^[0-9.,$€£%]+$/.test(label)) {
      return label;
    }
  }

  return 'Unlabeled field';
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

// Add new helper for tracking used IDs
const usedFieldIds = new Set<string>();

const getUniqueFieldId = (baseIndex: number): string => {
  let fieldId = `field-${baseIndex}`;
  let counter = baseIndex;

  while (usedFieldIds.has(fieldId)) {
    counter++;
    fieldId = `field-${counter}`;
  }

  usedFieldIds.add(fieldId);
  return fieldId;
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

  // Get the current state
  let isChecked = false;
  if (element instanceof HTMLInputElement) {
    isChecked = element.checked;
  } else {
    isChecked = element.getAttribute('aria-checked') === 'true' || element.hasAttribute('checked');
  }

  // Store boolean value as string
  field.value = isChecked.toString();

  field.metadata = {
    framework: 'vanilla',
    visibility: { isVisible: isElementVisible(element) },
    ...field.metadata,
    checkboxValue: element instanceof HTMLInputElement ? element.value : 'on',
    isExclusive:
      element.hasAttribute('data-exclusive') ||
      element.closest('[role="radiogroup"]') !== null ||
      element.closest('fieldset[data-exclusive]') !== null,
    groupName:
      element instanceof HTMLInputElement
        ? element.name
        : element.getAttribute('data-group') || element.closest('fieldset')?.id,
  };

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
const isFormLikeContainer = async (element: HTMLElement): Promise<boolean> => {
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
export const detectFields = async (container: HTMLElement, isImplicitForm: boolean = false): Promise<Field[]> => {
  const fields: Field[] = [];
  let index = 0;
  const processedGroups = new Set<string>();

  // Process all elements and collect promises
  const promises = Array.from(
    container.querySelectorAll<HTMLElement>(`
      input[type="checkbox"], [role="checkbox"], [role="switch"],
      input, select, textarea, [role="radio"], [role="textbox"],
      [role="combobox"], [role="spinbutton"], [data-filliny-field]
    `),
  ).map(async element => {
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
        field = await detectSelectLikeField(element, index);
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

  // Wait for all async operations to complete
  await Promise.all(promises);
  return fields;
};

const detectTextLikeField = (element: HTMLElement, index: number): Field | null => {
  const field = createBaseField(element, index, 'text');
  field.value = getElementValue(element);
  field.testValue = element.getAttribute('data-test-value') || '';
  return field;
};

const detectDynamicSelectOptions = async (element: HTMLElement): Promise<Array<{ value: string; text: string }>> => {
  const originalState = document.documentElement.innerHTML;
  let options: Array<{ value: string; text: string }> = [];

  try {
    // Click to trigger any dynamic content
    element.click();
    await new Promise(resolve => setTimeout(resolve, 300));

    // Look for any newly added content in the DOM
    const root = element.ownerDocument;
    const addedElements = Array.from(root.querySelectorAll('*')).filter(el => {
      if (!el.isConnected || !isElementVisible(el as HTMLElement)) return false;

      // Look for common option patterns
      const isOptionLike =
        el.matches('li, [role="option"]') || // Standard options
        el.getAttribute('role')?.includes('option') || // ARIA roles
        el.matches('[data-value], [value]') || // Value attributes
        el.parentElement?.getAttribute('role')?.includes('listbox'); // Inside listbox

      return isOptionLike && !element.contains(el);
    });

    // Group options by their containers to find the most likely option list
    const optionGroups = addedElements.reduce((groups, el) => {
      const container = el.parentElement;
      if (!container) return groups;

      if (!groups.has(container)) {
        groups.set(container, []);
      }
      groups.get(container)?.push(el);
      return groups;
    }, new Map<Element, Element[]>());

    // Use the group with the most options
    const bestGroup = Array.from(optionGroups.entries()).sort(([, a], [, b]) => b.length - a.length)[0]?.[1] || [];

    options = bestGroup
      .map(opt => ({
        value: opt.getAttribute('data-value') || opt.getAttribute('value') || opt.textContent?.trim() || '',
        text: opt.textContent?.trim() || '',
      }))
      .filter(opt => opt.value || opt.text);

    // Clean up
    document.body.click();
  } catch (e) {
    console.debug('Error detecting dynamic options:', (e as Error).message);
  }

  // Restore original state if needed
  if (document.documentElement.innerHTML !== originalState) {
    document.documentElement.innerHTML = originalState;
  }

  return options;
};

// Update detectSelectLikeField to use the dynamic detection as fallback
const detectSelectLikeField = async (element: HTMLElement, index: number): Promise<Field | null> => {
  const field = createBaseField(element, index, 'select');

  // Try standard option detection first
  const staticOptions = element.querySelectorAll('[role="option"], option, [data-option]');
  if (staticOptions.length) {
    field.options = Array.from(staticOptions).map(opt => ({
      value: opt.getAttribute('value') || opt.textContent?.trim() || '',
      text: opt.textContent?.trim() || '',
      selected: opt.getAttribute('aria-selected') === 'true' || opt.hasAttribute('selected'),
    }));
  } else {
    // Fallback to dynamic detection
    const dynamicOptions = await detectDynamicSelectOptions(element);
    if (dynamicOptions.length) {
      field.options = dynamicOptions.map(opt => ({
        ...opt,
        selected: false,
      }));
    }
  }

  field.value = getElementValue(element);
  field.testValue = element.getAttribute('data-test-value') || '';
  return field;
};

// Add new export for detecting form-like containers
export const detectFormLikeContainers = async (): Promise<HTMLElement[]> => {
  const containers: HTMLElement[] = [];
  const documents = getAllFrameDocuments();

  for (const doc of documents) {
    try {
      const forms = Array.from(doc.querySelectorAll<HTMLFormElement>('form'));
      containers.push(...forms);

      // Convert NodeList to Array
      const potentialContainers = Array.from(doc.querySelectorAll<HTMLElement>('div, section, article, main, aside'));

      for (const container of potentialContainers) {
        if (container.closest('form') || containers.some(existing => existing.contains(container))) {
          continue;
        }
        if (await isFormLikeContainer(container)) {
          containers.push(container);
        }
      }
    } catch (e) {
      console.warn('Error detecting forms in frame:', e);
    }
  }

  return containers;
};

// Add new helper for XPath-based element location
export const findElementByXPath = (xpath: string): HTMLElement | null => {
  // Try direct XPath first
  for (const doc of getAllFrameDocuments()) {
    try {
      const result = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      const element = result.singleNodeValue as HTMLElement;
      if (element) return element;
    } catch (e) {
      console.warn('XPath evaluation failed:', e);
    }
  }

  // Fallback to querySelector if XPath fails
  const elements = querySelectorAllFrames('[data-filliny-id]');
  return (elements[0] as HTMLElement) || null;
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
  const fieldId = getUniqueFieldId(index);

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
