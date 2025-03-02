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

// --- NEW HELPER: Query Shadow Roots ---
const queryShadowRoot = (root: ShadowRoot, selector: string): HTMLElement[] => {
  try {
    return Array.from(root.querySelectorAll(selector));
  } catch (e) {
    console.warn('Error querying shadow root:', e);
    return [];
  }
};

// --- Enhanced Visibility Checks ---
const computeElementVisibility = (element: HTMLElement): { isVisible: boolean; hiddenReason?: string } => {
  try {
    const isHidden = (el: HTMLElement | null): boolean => {
      while (el) {
        const style = getComputedStyle(el);
        const isFormControl = ['select', 'input', 'textarea'].includes(el.tagName.toLowerCase());
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          (!isFormControl && parseFloat(style.opacity) === 0) ||
          el.hasAttribute('hidden') ||
          (style.position === 'absolute' && (parseInt(style.left) < -9999 || parseInt(style.top) < -9999))
        ) {
          return true;
        }
        el = el.parentElement;
      }
      return false;
    };

    const rect = element.getBoundingClientRect();
    const hasZeroDimensions = !element.offsetWidth && !element.offsetHeight;
    const isOutsideViewport =
      rect.right <= 0 || rect.bottom <= 0 || rect.left >= window.innerWidth || rect.top >= window.innerHeight;

    const isFormControl = ['select', 'input', 'textarea'].includes(element.tagName.toLowerCase());
    if (isFormControl && isHidden(element)) return { isVisible: false, hiddenReason: 'hidden-by-css' };
    if (hasZeroDimensions) return { isVisible: false, hiddenReason: 'zero-dimensions' };
    if (isOutsideViewport) return { isVisible: false, hiddenReason: 'outside-viewport' };
    if (isHidden(element)) return { isVisible: false, hiddenReason: 'hidden-by-css' };

    return { isVisible: true };
  } catch (error) {
    console.error('Error computing visibility:', error);
    return { isVisible: false, hiddenReason: 'error-computing' };
  }
};

const isElementVisible = (element: HTMLElement): boolean => computeElementVisibility(element).isVisible;

// --- Get Documents from All Frames (and Shadow DOM) ---
const getAllFrameDocuments = (): Document[] => {
  const docs: Document[] = [document];
  const processedFrames = new Set<string>();

  const tryGetIframeDoc = (iframe: HTMLIFrameElement): Document | null => {
    try {
      if (iframe.contentDocument?.readyState === 'complete') return iframe.contentDocument;
      if (iframe.contentWindow?.document?.readyState === 'complete') return iframe.contentWindow.document;
    } catch (e) {
      console.debug('Frame access restricted:', { src: iframe.src, error: (e as Error).message });
    }
    return null;
  };

  const processIframes = (doc: Document) => {
    Array.from(doc.getElementsByTagName('iframe')).forEach(iframe => {
      if (!processedFrames.has(iframe.src)) {
        const iframeDoc = tryGetIframeDoc(iframe);
        if (iframeDoc) {
          processedFrames.add(iframe.src);
          docs.push(iframeDoc);
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

  const observer = new MutationObserver(mutations => {
    const hasRelevantChanges = mutations.some(mutation =>
      Array.from(mutation.addedNodes).some(node => {
        if (node instanceof HTMLElement) {
          return node.tagName === 'IFRAME' || node.tagName === 'FORM' || !!node.querySelector('form, iframe');
        }
        return false;
      }),
    );
    if (hasRelevantChanges) safeDetectForms();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  safeDetectForms();
  window.addEventListener('load', safeDetectForms, { once: true });
  window.addEventListener('DOMContentLoaded', safeDetectForms, { once: true });
};

const querySelectorAllFrames = (selector: string): Element[] => {
  const results: Element[] = [];
  const documents = getAllFrameDocuments();
  for (const doc of documents) {
    try {
      results.push(...Array.from(doc.querySelectorAll(selector)));
      // Also search in any shadow roots
      Array.from(doc.querySelectorAll('*')).forEach(el => {
        if (el.shadowRoot) {
          results.push(...queryShadowRoot(el.shadowRoot, selector));
        }
      });
    } catch (e) {
      console.warn('Error querying in frame:', e);
    }
  }
  return results;
};

// Global counter for fallback labels
let fallbackLabelCounter = 1;
const generateFallbackLabel = (): string => `Field ${fallbackLabelCounter++}`;

// --- NEW: Clean Up Candidate Text ---
const cleanCandidateText = (text: string): string => {
  let cleaned = text.trim();
  // Remove trailing non-alphanumerics (e.g. "*", "✱")
  cleaned = cleaned.replace(/[*✱\s]+$/g, '').trim();
  // Replace multiple spaces with a single space
  cleaned = cleaned.replace(/\s+/g, ' ');
  return cleaned;
};

// --- NEW: Label Candidate Type ---
interface LabelCandidate {
  text: string;
  confidence: number; // Lower means higher confidence
  source: string;
}

// --- NEW: Aggregate Label Candidates ---
// This function collects candidate labels from various sources.
const aggregateLabelCandidates = async (element: HTMLElement): Promise<LabelCandidate[]> => {
  const candidates: LabelCandidate[] = [];

  try {
    const addCandidate = (text: string, confidence: number, source: string) => {
      const cleaned = cleanCandidateText(text);
      if (isValidLabel(cleaned)) {
        candidates.push({ text: cleaned, confidence, source });
      }
    };

    // NEW: Check preceding sibling(s) of the field's parent for a label container
    let current = element.parentElement;
    while (current) {
      const prev = current.previousElementSibling as HTMLElement;
      const prevText = prev?.textContent;
      if (prev && prevText && isValidLabel(prevText)) {
        addCandidate(prevText, 12, 'preceding-sibling');
        break;
      }
      current = current.parentElement;
    }

    // 1. Explicit <label for="..."> (Highest confidence)
    if (element.id) {
      const labelEl = document.querySelector(`label[for="${element.id}"]`) as HTMLElement;
      if (labelEl) {
        const clone = labelEl.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('input, select, textarea').forEach(el => el.remove());
        addCandidate(clone.textContent || '', 10, 'explicit-label');
      }
    }

    // 2. Wrapping <label>
    const wrappingLabel = element.closest('label') as HTMLElement;
    if (wrappingLabel) {
      const clone = wrappingLabel.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('input, select, textarea').forEach(el => el.remove());
      addCandidate(clone.textContent || '', 15, 'wrapping-label');
    }

    // 3. Closest container with 'label' in class
    const containerWithLabel = element.closest("[class*='label']");
    if (containerWithLabel && containerWithLabel !== element) {
      addCandidate(
        containerWithLabel.textContent || '',
        (containerWithLabel.textContent?.split(/\s+/).length || 0) > 10 ? 18 : 20,
        'closest-label-class',
      );
    }

    // 4. ARIA attributes
    const ariaLabel = element.getAttribute('aria-label')?.trim() || '';
    addCandidate(ariaLabel, 25, 'aria-label');
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      let combined = '';
      for (const id of ariaLabelledBy.split(/\s+/)) {
        const el = document.getElementById(id);
        if (el) {
          const clone = el.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('input, select, textarea').forEach(el => el.remove());
          combined += (clone.textContent?.trim() || '') + ' ';
        }
      }
      addCandidate(combined, 30, 'aria-labelledby');
    }

    // 5. Shadow DOM labels
    if (element.getRootNode() instanceof ShadowRoot) {
      const shadowRoot = element.getRootNode() as ShadowRoot;
      const shadowLabels = queryShadowRoot(shadowRoot, 'label');
      for (const lab of shadowLabels) {
        addCandidate(lab.textContent || '', 35, 'shadow-dom-label');
      }
    }

    // 6. Nearby image labels (alt/title)
    if (element.parentElement) {
      const imgs = Array.from(element.parentElement.querySelectorAll('img')).filter(img =>
        isNearbyElement(img, element),
      );
      for (const img of imgs) {
        addCandidate(img.getAttribute('alt') || '', 40, 'img-alt');
        addCandidate(img.getAttribute('title') || '', 45, 'img-title');
      }
    }

    // 7. Proximity-based free text
    const nearbyText = await findNearbyLabelText(element);
    addCandidate(nearbyText, 50, 'nearby-text');

    // 8. Attributes on the element: placeholder and title
    addCandidate(element.getAttribute('placeholder') || '', 55, 'placeholder');
    addCandidate(element.getAttribute('title') || '', 60, 'title-attr');

    // 9. Derived from the name attribute
    const nameAttr = element.getAttribute('name')?.trim() || '';
    if (nameAttr) {
      const nameCandidate = nameAttr
        .split(/[._-]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .trim();
      addCandidate(nameCandidate, 65, 'name-attr');
    }

    // 10. As a last resort, use the parent's text content
    if (element.parentElement) {
      addCandidate(element.parentElement.textContent || '', 70, 'parent-text');
    }
  } catch (error) {
    console.warn('Error gathering label candidates:', error);
  }

  return candidates;
};

// --- Updated getFieldLabel using aggregated candidates ---
export const getFieldLabel = async (element: HTMLElement): Promise<string> => {
  try {
    const candidates = await aggregateLabelCandidates(element);

    // Sort by confidence (lower is better)
    candidates.sort((a, b) => a.confidence - b.confidence);

    // Return best candidate if its confidence is acceptable
    if (candidates.length > 0 && candidates[0].confidence <= 75) {
      return candidates[0].text;
    }
    return generateFallbackLabel();
  } catch (error) {
    console.error('Error in getFieldLabel:', error);
    return generateFallbackLabel();
  }
};

// --- Improved Label Validation ---
const isValidLabel = (text: string | undefined): boolean => {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length < 2) return false; // require at least 2 characters
  if (!/[a-zA-Z0-9]/.test(trimmed)) return false; // must include alphanumerics
  const placeholderTexts = [
    'select',
    'choose',
    'pick',
    'select one',
    'please select',
    'choose one',
    '--',
    'none',
    'optional',
    'required',
    'select an option',
    'choose an option',
    'please choose',
  ];
  if (placeholderTexts.some(placeholder => trimmed.toLowerCase() === placeholder)) return false;
  if (/^[^\w\s]+$/.test(trimmed)) return false; // solely punctuation
  if (trimmed.split(/\s+/).length > 15) return false; // too many words
  return true;
};

const isNearbyElement = (element1: HTMLElement, element2: HTMLElement): boolean => {
  try {
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();
    const threshold = 50;
    const isHorizontallyNear =
      Math.abs(rect1.left - rect2.left) < threshold || Math.abs(rect1.right - rect2.right) < threshold;
    const isVerticallyNear =
      Math.abs(rect1.top - rect2.top) < threshold || Math.abs(rect1.bottom - rect2.bottom) < threshold;
    return isHorizontallyNear || isVerticallyNear;
  } catch (error) {
    console.warn('Error in isNearbyElement:', error);
    return false;
  }
};

const findFormContainer = (element: HTMLElement): HTMLElement | null => {
  try {
    const formContainer = element.closest('[data-filliny-form-container="true"]');
    if (formContainer) return formContainer as HTMLElement;
    const formLikeContainer = element.closest('form, fieldset, [role="form"], [class*="form"], [class*="form-group"]');
    if (formLikeContainer) return formLikeContainer as HTMLElement;
    let currentElement = element.parentElement;
    while (currentElement) {
      const fields = getFormFields(currentElement);
      if (fields.length >= 2) return currentElement;
      currentElement = currentElement.parentElement;
    }
  } catch (error) {
    console.warn('Error in findFormContainer:', error);
  }
  return null;
};

const findNearbyLabelText = async (element: HTMLElement): Promise<string> => {
  try {
    const rect = element.getBoundingClientRect();
    const container = findFormContainer(element);
    if (!container) return '';
    const searchRegions = {
      above: { top: rect.top - 100, bottom: rect.top, left: rect.left - 50, right: rect.right + 50 },
      left: { top: rect.top - 20, bottom: rect.bottom + 20, left: Math.max(0, rect.left - 300), right: rect.left },
    };

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode: node => {
        if (
          node.parentElement?.closest('input, select, textarea, [placeholder]') ||
          node.parentElement?.getAttribute('role') === 'option' ||
          node.parentElement?.matches("[class*='placeholder']")
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        const txt = node.textContent?.trim();
        return txt && isValidLabel(txt) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });

    let bestText = '';
    let bestScore = Infinity;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const range = document.createRange();
      range.selectNodeContents(node);
      const textRect = range.getBoundingClientRect();
      for (const [region, bounds] of Object.entries(searchRegions)) {
        if (
          textRect.right >= bounds.left &&
          textRect.left <= bounds.right &&
          textRect.bottom >= bounds.top &&
          textRect.top <= bounds.bottom
        ) {
          const distance = region === 'above' ? rect.top - textRect.bottom : rect.left - textRect.right;
          if (distance < 0) continue;
          let score = distance;
          if (region === 'above' && Math.abs(textRect.left - rect.left) < 20) score -= 50;
          if (region === 'left' && Math.abs(textRect.top - rect.top) < 20) score -= 30;
          const wordCount = (node.textContent || '').trim().split(/\s+/).length;
          if (wordCount > 10) score -= 20;
          if (score < bestScore) {
            const candidate = node.textContent?.trim() || '';
            if (
              isValidLabel(candidate) &&
              !(element instanceof HTMLInputElement && candidate.includes(element.value))
            ) {
              bestScore = score;
              bestText = candidate;
            }
          }
        }
      }
    }
    return bestText;
  } catch (error) {
    console.warn('Error in findNearbyLabelText:', error);
    return '';
  }
};

const shouldSkipElement = (element: HTMLElement): boolean => {
  return (
    element.hasAttribute('disabled') ||
    element.hasAttribute('readonly') ||
    element.getAttribute('data-filliny-skip') === 'true' ||
    element.hasAttribute('list')
  );
};

const detectFramework = (
  element: HTMLElement,
): { framework: 'react' | 'angular' | 'vue' | 'vanilla'; props?: ReactElementProps } => {
  const reactKey = Object.keys(element).find(key => key.startsWith('__react') || key.startsWith('_reactProps'));
  if (reactKey) {
    return {
      framework: 'react',
      props: (element as unknown as { [key: string]: ReactElementProps })[reactKey],
    };
  }
  if (element.hasAttribute('ng-model') || element.hasAttribute('[(ngModel)]')) return { framework: 'angular' };
  if (element.hasAttribute('v-model') || (element as VueElement).__vue__) return { framework: 'vue' };
  return { framework: 'vanilla' };
};

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

const detectInputField = async (
  input: HTMLInputElement,
  index: number,
  testMode: boolean = false,
): Promise<Field | null> => {
  if (shouldSkipElement(input)) return null;
  const framework = detectFramework(input);
  const field = await createBaseField(input, index, input.type, testMode);
  if (!field) return null;
  if (input.classList.contains('select2-focusser')) {
    const select2Container = input.closest('.select2-container');
    if (select2Container) {
      const selectId = select2Container.getAttribute('id')?.replace('s2id_', '');
      if (selectId) {
        const actualSelect = document.getElementById(selectId) as HTMLSelectElement;
        if (actualSelect) {
          const selectField = await createBaseField(actualSelect, index, 'select', testMode);
          if (!selectField) return null;
          select2Container.setAttribute('data-filliny-id', selectField.id);
          input.setAttribute('data-filliny-id', selectField.id);
          const isMultiple = actualSelect.multiple;
          selectField.options = await Promise.all(
            Array.from(actualSelect.options).map(async opt => ({
              value: opt.value,
              text: opt.text.trim(),
              selected: opt.selected,
            })),
          );
          const validOptions = selectField.options.filter(
            opt =>
              opt.value &&
              !opt.text.toLowerCase().includes('select') &&
              !opt.text.includes('--') &&
              !opt.text.toLowerCase().includes('please select'),
          );
          if (validOptions.length > 0) {
            if (isMultiple) {
              selectField.testValue = validOptions.slice(0, 2).map(opt => opt.value);
              selectField.value = validOptions.slice(0, 2).map(opt => opt.value);
            } else {
              selectField.testValue = validOptions[0].value;
              selectField.value = validOptions[0].value;
            }
          }
          selectField.metadata = {
            framework: 'select2',
            select2Container: select2Container.id,
            actualSelect: selectId,
            isMultiple,
            visibility: computeElementVisibility(actualSelect),
          };
          return selectField;
        }
      }
    }
  }
  field.metadata = {
    framework: framework.framework,
    frameworkProps: framework.props,
    visibility: computeElementVisibility(input),
  };
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
        field.validation = { ...field.validation, step: Number(input.step) || 1 };
      }
      return field;
    case 'file':
      return field;
    default:
      field.value = input.value || '';
      return field;
  }
};

const detectDynamicSelectOptions = async (
  element: HTMLSelectElement | HTMLElement,
): Promise<Array<{ value: string; text: string; selected: boolean }>> => {
  const options: Array<{ value: string; text: string; selected: boolean }> = [];
  try {
    if (element instanceof HTMLSelectElement) {
      return Array.from(element.options).map(opt => ({
        value: opt.value,
        text: opt.textContent?.trim() || opt.value,
        selected: opt.selected,
      }));
    }
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
    let currentElement: HTMLElement | null = element;
    while (currentElement && !options.length) {
      const selectsAndOptions = Array.from(currentElement.children).filter(
        child =>
          child instanceof HTMLSelectElement ||
          child instanceof HTMLOptionElement ||
          child.getAttribute('role') === 'listbox' ||
          child.getAttribute('role') === 'option',
      );
      if (selectsAndOptions.length > 0) {
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
            // Ignore JSON parse errors
          }
        }
      }
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

const detectSelectField = async (select: HTMLSelectElement | HTMLElement, index: number): Promise<Field | null> => {
  if (shouldSkipElement(select)) return null;
  const field = await createBaseField(select, index, 'select');
  field.value = select instanceof HTMLSelectElement ? select.value : select.getAttribute('value') || '';
  const detectedOptions = await detectDynamicSelectOptions(select);
  field.options = detectedOptions;
  if (detectedOptions.length > 0) {
    const startIndex = detectedOptions[0].text.toLowerCase().includes('select') ? 1 : 0;
    if (startIndex < detectedOptions.length) field.testValue = detectedOptions[startIndex].value;
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
  const container = element.closest('form, [data-filliny-confidence], fieldset, [role="radiogroup"]');
  if (!container) return null;
  const groupElements = container.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${name}"]`);
  const visibleElements = Array.from(groupElements).filter(el => !shouldSkipElement(el));
  if (visibleElements.length === 0) return null;
  const field = await createBaseField(visibleElements[0], index, 'radio');
  const commonContainer = findCommonContainer(visibleElements);
  if (commonContainer) {
    const containerLabel = await getFieldLabel(commonContainer);
    if (containerLabel && containerLabel !== 'Unlabeled field') field.label = containerLabel;
  }
  field.options = await Promise.all(
    visibleElements.map(async el => {
      const labelContainer = findRadioLabelContainer(el);
      let labelText = '';
      if (labelContainer) {
        const standardLabel = await getStandardLabel(labelContainer);
        if (standardLabel) {
          labelText = standardLabel;
        }
      }
      return { value: el.value, text: labelText || el.value, selected: el.checked };
    }),
  );
  const selectedRadio = visibleElements.find(el => el.checked);
  field.value = selectedRadio ? field.options.find(opt => opt.value === selectedRadio.value)?.text || '' : '';
  field.testValue = visibleElements[0].getAttribute('data-test-value') || '';
  visibleElements.forEach(el => {
    el.setAttribute('data-filliny-id', field.id);
    const container = findRadioLabelContainer(el);
    if (container) container.setAttribute('data-filliny-id', field.id);
  });
  processedGroups.add(name);
  return field;
};

const findCommonContainer = (elements: HTMLElement[]): HTMLElement | null => {
  if (elements.length === 0) return null;
  if (elements.length === 1) return elements[0].parentElement;
  let commonAncestor = elements[0].parentElement;
  while (commonAncestor) {
    if (elements.every(el => commonAncestor?.contains(el))) {
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

const findRadioLabelContainer = (radio: HTMLElement): HTMLElement | null => {
  if (radio.id) {
    const explicitLabel = radio.ownerDocument.querySelector<HTMLElement>(`label[for="${radio.id}"]`);
    if (explicitLabel) return explicitLabel;
  }
  const wrapperLabel = radio.closest('label');
  if (wrapperLabel) return wrapperLabel;
  const parent = radio.parentElement;
  if (!parent) return null;
  const siblings = Array.from(parent.children);
  const radioIndex = siblings.indexOf(radio);
  if (radioIndex < siblings.length - 1) {
    const next = siblings[radioIndex + 1];
    if (isLabelLike(next)) return next as HTMLElement;
  }
  if (radioIndex > 0) {
    const prev = siblings[radioIndex - 1];
    if (isLabelLike(prev)) return prev as HTMLElement;
  }
  return parent;
};

const isLabelLike = (element: Element): boolean => {
  if (!(element instanceof HTMLElement)) return false;
  const tagName = element.tagName.toLowerCase();
  if (['label', 'span', 'div', 'p'].includes(tagName)) {
    const text = element.textContent?.trim() || '';
    return text.length > 0 && text.length < 100 && !/^[0-9.,$€£%]+$/.test(text);
  }
  return false;
};

const getStandardLabel = async (element: HTMLElement): Promise<string> => {
  try {
    const text = element.textContent?.trim();
    if (text && text.length > 0 && text.length < 100 && !/^[0-9.,$€£%]+$/.test(text)) return text;
    const ariaLabel = element.getAttribute('aria-label')?.trim();
    if (ariaLabel) return ariaLabel;
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelTexts = labelledBy
        .split(/\s+/)
        .map(id => element.ownerDocument.getElementById(id)?.textContent?.trim())
        .filter(Boolean);
      if (labelTexts.length) return labelTexts.join(' ');
    }
  } catch (error) {
    console.warn('Error in getStandardLabel:', error);
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
  let isChecked = false;
  if (element instanceof HTMLInputElement) isChecked = element.checked;
  else isChecked = element.getAttribute('aria-checked') === 'true' || element.hasAttribute('checked');
  field.value = isChecked.toString();
  field.metadata = {
    framework: 'vanilla',
    visibility: computeElementVisibility(element),
    checkboxValue: element instanceof HTMLInputElement ? element.value : 'on',
    isExclusive:
      element.hasAttribute('data-exclusive') ||
      element.closest("[role='radiogroup']") !== null ||
      element.closest('fieldset[data-exclusive]') !== null,
    groupName:
      element instanceof HTMLInputElement
        ? element.name
        : element.getAttribute('data-group') || element.closest('fieldset')?.id,
  };
  return field;
};

const getElementRole = (element: HTMLElement): string | null => {
  const role = element.getAttribute('role');
  if (role) return role;
  if (element instanceof HTMLInputElement) return element.type;
  switch (element.tagName.toLowerCase()) {
    case 'select':
      return 'combobox';
    case 'textarea':
      return 'textbox';
    default:
      return null;
  }
};

const getElementValue = (element: HTMLElement): string => {
  const value = element.getAttribute('value') || '';
  const checked = element.getAttribute('aria-checked');
  if (checked) return checked;
  const state = element.getAttribute('data-state');
  if (state) return state;
  if (element instanceof HTMLInputElement) return element.value;
  return value || element.textContent?.trim() || '';
};

const getFormFields = (element: HTMLElement): HTMLElement[] => {
  return Array.from(
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
};

export const detectFormLikeContainers = async (): Promise<HTMLElement[]> => {
  const containers: HTMLElement[] = [];
  const documents = getAllFrameDocuments();
  for (const doc of documents) {
    try {
      const nativeForms = Array.from(doc.querySelectorAll<HTMLFormElement>('form'));
      if (nativeForms.length > 0) {
        containers.push(...nativeForms);
        continue;
      }
      const allFields = getFormFields(doc.body);
      if (allFields.length >= 2) {
        const containerFieldCounts = new Map<HTMLElement, { fields: HTMLElement[]; depth: number }>();
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
        const containerEntries = Array.from(containerFieldCounts.entries());
        containerEntries.sort(([containerA, dataA], [containerB, dataB]) => {
          const fieldDiff = dataB.fields.length - dataA.fields.length;
          if (fieldDiff !== 0) return fieldDiff;
          const depthDiff = dataA.depth - dataB.depth;
          if (depthDiff !== 0) return depthDiff;
          const position = containerA.compareDocumentPosition(containerB);
          if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
          if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
          return 0;
        });
        for (const [container, data] of containerEntries) {
          if (data.fields.length < 2) continue;
          if (containers.some(selected => selected.contains(container))) continue;
          const hasOverlappingFields = containers.some(selected => {
            const selectedFields = getFormFields(selected);
            const commonFields = data.fields.filter(field => selectedFields.includes(field));
            return commonFields.length >= data.fields.length * 0.5;
          });
          if (hasOverlappingFields) continue;
          container.setAttribute('data-filliny-form-container', 'true');
          containers.push(container);
          break;
        }
      }
    } catch (e) {
      console.error('Error in form detection:', e);
    }
  }
  return containers;
};

export const findElementByXPath = (xpath: string): HTMLElement | null => {
  for (const doc of getAllFrameDocuments()) {
    try {
      const result = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      const element = result.singleNodeValue as HTMLElement;
      if (element) return element;
    } catch (e) {
      console.warn('XPath evaluation failed:', e);
    }
  }
  const elements = querySelectorAllFrames('[data-filliny-id]');
  return (elements[0] as HTMLElement) || null;
};

const getElementXPath = (element: HTMLElement): string => {
  if (!element.parentElement) return '';
  const idx =
    Array.from(element.parentElement.children)
      .filter(child => child.tagName === element.tagName)
      .indexOf(element) + 1;
  return `${getElementXPath(element.parentElement)}/${element.tagName.toLowerCase()}[${idx}]`;
};

const createBaseField = async (
  element: HTMLElement,
  index: number,
  type: string,
  testMode: boolean = false,
): Promise<Field> => {
  const fieldId = getUniqueFieldId(index);
  element.setAttribute('data-filliny-id', fieldId);
  const field: Field = {
    id: fieldId,
    type: type as FieldType,
    xpath: getElementXPath(element),
    uniqueSelectors: generateUniqueSelectors(element),
    value: '',
  };
  field.label = await getFieldLabel(element);
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

const generateUniqueSelectors = (element: HTMLElement): string[] => {
  const selectors: string[] = [];
  if (element.id) selectors.push(`#${CSS.escape(element.id)}`);
  if (element.className) {
    const classSelector = Array.from(element.classList)
      .map(c => `.${CSS.escape(c)}`)
      .join('');
    if (classSelector) selectors.push(classSelector);
  }
  ['name', 'type', 'role', 'aria-label'].forEach(attr => {
    if (element.hasAttribute(attr)) {
      selectors.push(`[${attr}="${CSS.escape(element.getAttribute(attr)!)}"]`);
    }
  });
  return selectors;
};

export type DetectionStrategy = 'dom';

export const detectFields = async (container: HTMLElement, isImplicitForm = false): Promise<Field[]> => {
  const fields: Field[] = [];
  let index = 0;
  const processedGroups = new Set<string>();
  const commonSelector = [
    'input:not([type="hidden"]):not([type="submit"])',
    'select',
    'textarea',
    '[role="textbox"]',
    '[role="combobox"]',
    '[role="spinbutton"]',
    '[contenteditable="true"]',
    '[data-filliny-field]',
    '[role="checkbox"]',
    '[role="switch"]',
  ].join(',');
  const elements = Array.from(container.querySelectorAll<HTMLElement>(commonSelector)).filter(
    element => !shouldSkipElement(element),
  );
  if (!elements.length) return fields;
  for (const element of elements) {
    try {
      let field: Field | null = null;

      const role = getElementRole(element);
      switch (role) {
        case 'checkbox':
        case 'switch':
          field = await detectCheckboxField(element, index);
          break;
        case 'radio':
          if (element instanceof HTMLInputElement && !processedGroups.has(element.name)) {
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
          if (element instanceof HTMLInputElement) {
            if (element.type === 'radio' && processedGroups.has(element.name)) continue;
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
