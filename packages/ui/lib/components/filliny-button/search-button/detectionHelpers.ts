import type { Field, FieldType } from '@extension/shared';
import { getConfig } from '@extension/shared';
import { getFieldLabelFromOCR, findOptimalLabelContainer } from './ocrHelpers';

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

// Update getFieldLabel to maintain compatibility with existing calls
export const getFieldLabel = async (
  element: HTMLElement,
  fieldIdOrConfig?: string | { enableOCRFirst?: boolean },
): Promise<string> => {
  // Get config first
  const config = getConfig();

  // Check if OCR should be tried first (either from config or passed parameter)
  const shouldTryOCRFirst =
    (typeof fieldIdOrConfig === 'object' && fieldIdOrConfig?.enableOCRFirst) || config.debug.enableOCRFirst;

  // If OCR should be tried first, do it before other methods
  if (shouldTryOCRFirst) {
    const ocrLabel = await getFieldLabelFromOCR(element, typeof fieldIdOrConfig === 'string' ? fieldIdOrConfig : '');
    if (ocrLabel && ocrLabel !== 'Unlabeled field' && !/^\d+$/.test(ocrLabel)) {
      return ocrLabel;
    }
  }

  // Handle string case (fieldId) for non-OCR-first case
  if (typeof fieldIdOrConfig === 'string' && !shouldTryOCRFirst) {
    const ocrLabel = await getFieldLabelFromOCR(element, fieldIdOrConfig);
    if (ocrLabel && ocrLabel !== 'Unlabeled field' && !/^\d+$/.test(ocrLabel)) {
      return ocrLabel;
    }
  }

  // Try standard HTML methods
  const labelText = await getStandardLabel(element);
  if (labelText) {
    return labelText;
  }

  // Try ARIA attributes
  const ariaLabel = element.getAttribute('aria-label')?.trim();
  if (ariaLabel) {
    return ariaLabel;
  }

  // Try finding associated label element
  if (element.id) {
    const labelElement = document.querySelector(`label[for="${element.id}"]`);
    if (labelElement?.textContent) {
      return labelElement.textContent.trim();
    }
  }

  // Try parent label
  const parentLabel = element.closest('label');
  if (parentLabel?.textContent) {
    const clone = parentLabel.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('input, select, textarea').forEach(el => el.remove());
    const text = clone.textContent?.trim() || '';
    if (text) {
      return text;
    }
  }

  // Try OCR as a last resort if not tried first
  if (!shouldTryOCRFirst) {
    const ocrLabel = await getFieldLabelFromOCR(element, typeof fieldIdOrConfig === 'string' ? fieldIdOrConfig : '');
    if (ocrLabel && ocrLabel !== 'Unlabeled field' && !/^\d+$/.test(ocrLabel)) {
      return ocrLabel;
    }
  }

  // If all methods fail, try to extract from field attributes
  const nameLabel = element
    .getAttribute('name')
    ?.split(/[._-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();

  if (nameLabel) {
    return nameLabel;
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
const detectInputField = async (
  input: HTMLInputElement,
  index: number,
  testMode: boolean = false,
): Promise<Field | null> => {
  if (shouldSkipElement(input)) return null;

  const framework = detectFramework(input);
  const field = await createBaseField(input, index, input.type, testMode);
  if (!field) return null;

  // Special handling for Select2 inputs
  if (input.classList.contains('select2-focusser')) {
    const select2Container = input.closest('.select2-container');
    if (select2Container) {
      const selectId = select2Container.getAttribute('id')?.replace('s2id_', '');
      if (selectId) {
        const actualSelect = document.getElementById(selectId) as HTMLSelectElement;
        if (actualSelect) {
          const selectField = await createBaseField(actualSelect, index, 'select', testMode);
          if (!selectField) return null;

          // Set data attribute on both elements
          select2Container.setAttribute('data-filliny-id', selectField.id);
          input.setAttribute('data-filliny-id', selectField.id);

          selectField.options = await Promise.all(
            Array.from(actualSelect.options).map(async opt => ({
              value: opt.value,
              text: opt.text.trim(),
              selected: opt.selected,
            })),
          );

          // Always select first valid option in test mode
          const validOptions = selectField.options.filter(
            opt =>
              opt.value &&
              !opt.text.toLowerCase().includes('select') &&
              !opt.text.includes('--') &&
              !opt.text.toLowerCase().includes('please select'),
          );

          if (validOptions.length > 0) {
            selectField.testValue = validOptions[0].value;
            selectField.value = validOptions[0].value; // Set the value immediately in test mode
          }

          // Add Select2-specific metadata
          selectField.metadata = {
            framework: 'select2',
            select2Container: select2Container.id,
            actualSelect: selectId,
            visibility: computeElementVisibility(actualSelect),
          };

          return selectField;
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
      field.value = input.value || '';
      if (input.type === 'number' || input.type === 'range') {
        field.validation = {
          ...field.validation,
          step: Number(input.step) || 1,
        };
      }
      return field;
    case 'file':
      return field;
    default:
      field.value = input.value || '';
      return field;
  }
};

// Add helper for detecting dynamic select options
const detectDynamicSelectOptions = async (
  element: HTMLSelectElement | HTMLElement,
): Promise<Array<{ value: string; text: string; selected: boolean }>> => {
  const options: Array<{ value: string; text: string; selected: boolean }> = [];

  try {
    // Strategy 1: Check if we're dealing with a native select
    if (element instanceof HTMLSelectElement) {
      return Array.from(element.options).map(opt => ({
        value: opt.value,
        text: opt.textContent?.trim() || opt.value,
        selected: opt.selected,
      }));
    }

    // Strategy 2: Find any associated select by ID relationships
    const elementId = element.id || element.getAttribute('aria-controls') || element.getAttribute('aria-owns');
    if (elementId) {
      const associatedSelect = document.querySelector(
        `select[id="${elementId}-select"], select[aria-labelledby="${elementId}"]`,
      );
      if (associatedSelect instanceof HTMLSelectElement) {
        return Array.from(associatedSelect.options).map(opt => ({
          value: opt.value,
          text: opt.textContent?.trim() || opt.value,
          selected: opt.selected,
        }));
      }
    }

    // Strategy 3: Walk up the DOM to find the nearest common container
    let currentElement: HTMLElement | null = element;
    while (currentElement && !options.length) {
      // Look for any select or option elements in this container
      const selectsAndOptions = Array.from(currentElement.children).filter(
        child =>
          child instanceof HTMLSelectElement ||
          child instanceof HTMLOptionElement ||
          child.getAttribute('role') === 'listbox' ||
          child.getAttribute('role') === 'option',
      );

      if (selectsAndOptions.length > 0) {
        // Found potential options container
        for (const el of selectsAndOptions) {
          if (el instanceof HTMLSelectElement) {
            return Array.from(el.options).map(opt => ({
              value: opt.value,
              text: opt.textContent?.trim() || opt.value,
              selected: opt.selected,
            }));
          } else if (el instanceof HTMLOptionElement) {
            options.push({
              value: el.value,
              text: el.textContent?.trim() || el.value,
              selected: el.selected,
            });
          } else {
            // Handle role="option" elements
            const value = el.getAttribute('data-value') || el.getAttribute('value') || el.textContent?.trim() || '';
            const text = el.textContent?.trim() || value;
            options.push({
              value,
              text,
              selected: el.getAttribute('aria-selected') === 'true',
            });
          }
        }
        if (options.length) return options;
      }

      // Strategy 4: Look for hidden inputs that might contain option data
      const hiddenInputs = currentElement.querySelectorAll('input[type="hidden"]');
      for (const input of Array.from(hiddenInputs)) {
        if (input instanceof HTMLInputElement && input.value) {
          try {
            const parsed = JSON.parse(input.value);
            if (Array.isArray(parsed)) {
              const parsedOptions = parsed
                .map(item => ({
                  value: String(item.value || item.id || ''),
                  text: String(item.label || item.text || item.name || ''),
                  selected: Boolean(item.selected),
                }))
                .filter(opt => opt.value || opt.text);
              if (parsedOptions.length) return parsedOptions;
            }
          } catch {
            // Not JSON data, continue
          }
        }
      }

      // Strategy 5: Check for sibling elements that might be options
      const siblings = Array.from(currentElement.children);
      const optionLikeElements = siblings.filter(
        sibling =>
          sibling.getAttribute('role') === 'option' ||
          sibling.tagName === 'OPTION' ||
          (sibling.tagName === 'LI' && sibling.closest('[role="listbox"]')),
      );

      if (optionLikeElements.length) {
        return optionLikeElements
          .map(opt => ({
            value: opt.getAttribute('data-value') || opt.getAttribute('value') || opt.textContent?.trim() || '',
            text: opt.textContent?.trim() || '',
            selected: opt.getAttribute('aria-selected') === 'true' || opt.hasAttribute('selected'),
          }))
          .filter(opt => opt.value || opt.text);
      }

      currentElement = currentElement.parentElement;
    }

    // Strategy 6: Look for a listbox/combobox relationship
    const listboxId = element.getAttribute('aria-controls') || element.getAttribute('aria-owns');
    if (listboxId) {
      const listbox = document.getElementById(listboxId);
      if (listbox) {
        const listboxOptions = Array.from(listbox.children);
        return listboxOptions
          .map(opt => ({
            value: opt.getAttribute('data-value') || opt.getAttribute('value') || opt.textContent?.trim() || '',
            text: opt.textContent?.trim() || '',
            selected: opt.getAttribute('aria-selected') === 'true' || opt.hasAttribute('selected'),
          }))
          .filter(opt => opt.value || opt.text);
      }
    }
  } catch (error) {
    console.warn('Error in option detection:', error);
  }

  return options;
};

// Update detectSelectField to ensure we always have options
const detectSelectField = async (select: HTMLSelectElement | HTMLElement, index: number): Promise<Field | null> => {
  if (shouldSkipElement(select)) return null;

  const field = await createBaseField(select, index, 'select');

  // Get initial value
  field.value = select instanceof HTMLSelectElement ? select.value : select.getAttribute('value') || '';

  // Detect options including dynamic ones
  const detectedOptions = await detectDynamicSelectOptions(select);
  field.options = detectedOptions;

  // Set test value if options are available
  if (detectedOptions.length > 0) {
    // Skip first option if it looks like a placeholder
    const startIndex = detectedOptions[0].text.toLowerCase().includes('select') ? 1 : 0;
    if (startIndex < detectedOptions.length) {
      field.testValue = detectedOptions[startIndex].value;
    }
  }

  return field;
};

const detectRadioGroup = async (
  element: HTMLInputElement,
  index: number,
  processedGroups: Set<string>,
): Promise<Field | null> => {
  const name = element.name;
  if (!name || processedGroups.has(name)) return null;

  // Find the parent form or form-like container
  const container = element.closest('form, [data-filliny-confidence], fieldset, [role="radiogroup"]');
  if (!container) return null;

  const groupElements = container.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${name}"]`);
  const visibleElements = Array.from(groupElements).filter(el => !shouldSkipElement(el));

  if (visibleElements.length === 0) return null;

  // Create field for the group
  const field = await createBaseField(visibleElements[0], index, 'radio');

  // Find the common container for all radio buttons in the group
  const commonContainer = findCommonContainer(visibleElements);
  if (commonContainer) {
    // Try to get a group label first from the container
    const containerLabel = await getFieldLabel(commonContainer, field.id);
    if (containerLabel && containerLabel !== 'Unlabeled field') {
      field.label = containerLabel;
    }
  }

  // Get labels for each radio option
  field.options = await Promise.all(
    visibleElements.map(async el => {
      // Find the closest label container for this radio button
      const labelContainer = findRadioLabelContainer(el);
      let labelText = '';

      if (labelContainer) {
        // First try standard label detection methods
        const standardLabel = await getStandardLabel(labelContainer);
        if (standardLabel) {
          labelText = standardLabel;
        } else if (getConfig().debug.enableOCRFirst) {
          // Only try OCR if enabled
          const { container: ocrContainer } = findOptimalLabelContainer(labelContainer);
          labelText = await getFieldLabelFromOCR(ocrContainer, field.id);
        }
      }

      // Fallback to element value if no label found
      return {
        value: el.value,
        text: labelText || el.value,
        selected: el.checked,
      };
    }),
  );

  const selectedRadio = visibleElements.find(el => el.checked);
  field.value = selectedRadio ? field.options.find(opt => opt.value === selectedRadio.value)?.text || '' : '';
  field.testValue = visibleElements[0].getAttribute('data-test-value') || '';

  // Add field ID to all radio buttons in group and their containers
  visibleElements.forEach(el => {
    el.setAttribute('data-filliny-id', field.id);
    const container = findRadioLabelContainer(el);
    if (container) {
      container.setAttribute('data-filliny-id', field.id);
    }
  });

  processedGroups.add(name);
  return field;
};

// Helper function to find the common container for a group of radio buttons
const findCommonContainer = (elements: HTMLElement[]): HTMLElement | null => {
  if (elements.length === 0) return null;
  if (elements.length === 1) return elements[0].parentElement;

  let commonAncestor = elements[0].parentElement;
  while (commonAncestor) {
    if (elements.every(el => commonAncestor?.contains(el))) {
      // Check if this is a meaningful container (fieldset, div with role, etc.)
      if (
        commonAncestor.tagName.toLowerCase() === 'fieldset' ||
        commonAncestor.getAttribute('role') === 'radiogroup' ||
        commonAncestor.classList.contains('radio-group') ||
        commonAncestor.querySelector('legend')
      ) {
        return commonAncestor;
      }
    }
    commonAncestor = commonAncestor.parentElement;
  }
  return null;
};

// Helper function to find the best label container for a radio button
const findRadioLabelContainer = (radio: HTMLElement): HTMLElement | null => {
  // First check for an explicit label
  if (radio.id) {
    const explicitLabel = radio.ownerDocument.querySelector<HTMLElement>(`label[for="${radio.id}"]`);
    if (explicitLabel) return explicitLabel;
  }

  // Check for wrapping label
  const wrapperLabel = radio.closest('label');
  if (wrapperLabel) return wrapperLabel;

  // Look for adjacent label-like elements
  const parent = radio.parentElement;
  if (!parent) return null;

  // Check siblings
  const siblings = Array.from(parent.children);
  const radioIndex = siblings.indexOf(radio);

  // Check next sibling first (most common pattern)
  if (radioIndex < siblings.length - 1) {
    const next = siblings[radioIndex + 1];
    if (isLabelLike(next)) return next as HTMLElement;
  }

  // Check previous sibling
  if (radioIndex > 0) {
    const prev = siblings[radioIndex - 1];
    if (isLabelLike(prev)) return prev as HTMLElement;
  }

  // If no good container found, return parent as fallback
  return parent;
};

// Helper to check if an element is likely to contain a label
const isLabelLike = (element: Element): boolean => {
  // First ensure we have an HTMLElement
  if (!(element instanceof HTMLElement)) return false;

  // Now TypeScript knows element is HTMLElement
  const tagName = element.tagName.toLowerCase();
  if (['label', 'span', 'div', 'p'].includes(tagName)) {
    // Check if element has meaningful text content
    const text = element.textContent?.trim() || '';
    return text.length > 0 && text.length < 100 && !/^[0-9.,$€£%]+$/.test(text);
  }
  return false;
};

// Helper to get standard label without OCR
const getStandardLabel = async (element: HTMLElement): Promise<string> => {
  // Check for explicit text content
  const text = element.textContent?.trim();
  if (text && text.length > 0 && text.length < 100 && !/^[0-9.,$€£%]+$/.test(text)) {
    return text;
  }

  // Check ARIA attributes
  const ariaLabel = element.getAttribute('aria-label')?.trim();
  if (ariaLabel) return ariaLabel;

  // Check ARIA labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelTexts = labelledBy
      .split(/\s+/)
      .map(id => element.ownerDocument.getElementById(id)?.textContent?.trim())
      .filter(Boolean);
    if (labelTexts.length) return labelTexts.join(' ');
  }

  return '';
};

const detectTextareaField = async (textarea: HTMLTextAreaElement, index: number): Promise<Field | null> => {
  if (!isElementVisible(textarea) || shouldSkipElement(textarea)) return null;

  const field = await createBaseField(textarea, index, 'textarea');
  field.value = textarea.value || '';
  field.testValue = textarea.getAttribute('data-test-value') || '';
  return field;
};

const detectCheckboxField = async (element: HTMLElement, index: number): Promise<Field | null> => {
  if (shouldSkipElement(element)) return null;

  const field = await createBaseField(element, index, 'checkbox');

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

const getFormFields = (element: HTMLElement): HTMLElement[] => {
  const fields = Array.from(
    element.querySelectorAll<HTMLElement>(
      `input:not([type="hidden"]):not([type="submit"]),
       select, 
       textarea,
       [role="textbox"],
       [role="combobox"],
       [role="spinbutton"],
       [contenteditable="true"],
       [data-filliny-field],
       [tabindex],
       .form-control,
       [class*="input"],
       [class*="field"],
       [class*="textbox"]`,
    ),
  ).filter(el => isElementVisible(el) && !shouldSkipElement(el));

  return fields;
};

// Update detectFormLikeContainers to remove debug logs
export const detectFormLikeContainers = async (): Promise<HTMLElement[]> => {
  const containers: HTMLElement[] = [];
  const documents = getAllFrameDocuments();

  for (const doc of documents) {
    try {
      // First, get all native forms - these take precedence
      const nativeForms = Array.from(doc.querySelectorAll<HTMLFormElement>('form'));
      if (nativeForms.length > 0) {
        containers.push(...nativeForms);
        continue; // Skip looking for form-like containers if we found native forms
      }

      // If no native forms, look for form-like containers
      const allFields = getFormFields(doc.body);

      if (allFields.length >= 2) {
        // Create a map of containers to their field counts
        const containerFieldCounts = new Map<
          HTMLElement,
          {
            fields: HTMLElement[];
            depth: number;
          }
        >();

        // For each field, walk up the DOM tree and count fields in each container
        allFields.forEach(field => {
          let current = field.parentElement;
          let depth = 0;
          while (current && current !== doc.body) {
            const existingData = containerFieldCounts.get(current) || { fields: [], depth };
            if (!existingData.fields.includes(field)) {
              existingData.fields.push(field);
              containerFieldCounts.set(current, existingData);
            }
            current = current.parentElement;
            depth++;
          }
        });

        // Convert to array for sorting
        const containerEntries = Array.from(containerFieldCounts.entries());

        // Sort containers by:
        // 1. Number of fields (descending)
        // 2. DOM depth (ascending - prefer shallower containers)
        // 3. DOM position (ascending - prefer earlier in document)
        containerEntries.sort(([containerA, dataA], [containerB, dataB]) => {
          // First compare by number of fields
          const fieldDiff = dataB.fields.length - dataA.fields.length;
          if (fieldDiff !== 0) return fieldDiff;

          // If same number of fields, prefer shallower containers
          const depthDiff = dataA.depth - dataB.depth;
          if (depthDiff !== 0) return depthDiff;

          // If same depth, prefer the one that appears earlier in DOM
          const position = containerA.compareDocumentPosition(containerB);
          if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
          if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
          return 0;
        });

        // Get the container with the most fields that's not nested in another container
        for (const [container, data] of containerEntries) {
          // Skip if this container has too few fields
          if (data.fields.length < 2) continue;

          // Skip if this container is nested inside an already selected container
          if (containers.some(selected => selected.contains(container))) continue;

          // Skip if this container has mostly the same fields as an already selected container
          const hasOverlappingFields = containers.some(selected => {
            const selectedFields = getFormFields(selected);
            const commonFields = data.fields.filter(field => selectedFields.includes(field));
            return commonFields.length >= data.fields.length * 0.5; // 50% overlap threshold
          });

          if (hasOverlappingFields) continue;

          container.setAttribute('data-filliny-form-container', 'true');
          containers.push(container);
          break; // Only take the best container if no native forms
        }
      }
    } catch (e) {
      console.error('Error in form detection:', e);
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
const createBaseField = async (
  element: HTMLElement,
  index: number,
  type: string,
  testMode: boolean = false,
): Promise<Field> => {
  const fieldId = getUniqueFieldId(index);

  // Set the data attribute on the element
  element.setAttribute('data-filliny-id', fieldId);

  // First detect all field properties except label
  const field: Field = {
    id: fieldId,
    type: type as FieldType,
    xpath: getElementXPath(element),
    uniqueSelectors: generateUniqueSelectors(element),
    value: '',
  };

  // Now get the label using OCR as primary strategy
  field.label = await getFieldLabel(element);

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

// Update detection strategy type
export type DetectionStrategy = 'ocr' | 'dom';

// Restore the field detection functions that were accidentally removed
export const detectFields = async (
  container: HTMLElement,
  isImplicitForm: boolean = false,
  strategy: DetectionStrategy = 'dom',
): Promise<Field[]> => {
  const fields: Field[] = [];
  let index = 0;
  const processedGroups = new Set<string>();

  console.log('Using detection strategy:', strategy);

  if (strategy === 'ocr') {
    // For OCR strategy, we'll process the entire container as one unit
    // and extract fields using OCR techniques
    const elements = Array.from(
      container.querySelectorAll<HTMLElement>(
        'input, select, textarea, [role="textbox"], [role="combobox"], [contenteditable="true"]',
      ),
    );

    for (const element of elements) {
      if (shouldSkipElement(element)) continue;

      // For OCR strategy, we prioritize OCR-based label detection
      const field = await createBaseField(element, index, getElementRole(element) || 'text', true);
      if (field) {
        fields.push(field);
        index++;
      }
    }

    return fields;
  }

  // For DOM strategy, use the existing DOM-based detection methods
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(
      `input:not([type="hidden"]):not([type="submit"]),
       select, 
       textarea,
       [role="textbox"],
       [role="combobox"],
       [role="spinbutton"],
       [contenteditable="true"],
       [data-filliny-field]`,
    ),
  );

  for (const element of elements) {
    if (shouldSkipElement(element)) continue;

    const role = getElementRole(element);
    let field: Field | null = null;

    try {
      switch (role) {
        case 'checkbox':
        case 'switch':
          field = await detectCheckboxField(element, index);
          break;
        case 'radio':
          if (element instanceof HTMLInputElement) {
            field = await detectRadioGroup(element, index, processedGroups);
          }
          break;
        case 'textbox':
        case 'spinbutton':
          field = await detectTextLikeField(element, index);
          break;
        case 'combobox':
          field = await detectSelectField(element, index);
          break;
        default:
          // Handle native elements
          if (element instanceof HTMLInputElement) {
            field = await detectInputField(element, index, isImplicitForm);
          } else if (element instanceof HTMLSelectElement) {
            field = await detectSelectField(element, index);
          } else if (element instanceof HTMLTextAreaElement) {
            field = await detectTextareaField(element, index);
          }
      }

      if (field) {
        fields.push(field);
        index++;
      }
    } catch (e) {
      console.warn('Error detecting field:', e);
    }
  }

  return fields;
};

const detectTextLikeField = async (element: HTMLElement, index: number): Promise<Field | null> => {
  const field = await createBaseField(element, index, 'text');
  field.value = getElementValue(element);
  field.testValue = element.getAttribute('data-test-value') || '';
  return field;
};
