/**
 * Enhanced Element Finding Capabilities
 *
 * Adds advanced element finding strategies to the base elementFinder:
 * - DOM fingerprinting for reliable element re-finding
 * - Shadow DOM traversal for elements inside shadow roots
 * - Same-origin iframe searching
 * - MutationObserver-based element tracking
 * - Additional strategies: data-testid, data-cy, accessibility name,
 *   form association, visual position, React fiber key
 * - Stale reference auto-recovery
 */
import { FieldTypeEnum } from '@extension/shared';
import { z } from 'zod';
import type { Field } from '@extension/shared';

// ============================================================================
// DOM Fingerprinting
// ============================================================================

/**
 * DOM Fingerprint schema for element identification
 */
const DOMFingerprintSchema = z.object({
  tagName: z.string(),
  type: z.string().optional(),
  name: z.string().optional(),
  id: z.string().optional(),
  cssPath: z.string(),
  xpath: z.string(),
  formIndex: z.number().optional(),
  surroundingText: z.string(),
  attributesHash: z.string(),
  rect: z
    .object({
      left: z.number(),
      top: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .optional(),
});

/**
 * DOM fingerprint for reliable element re-identification
 */
type DOMFingerprint = z.infer<typeof DOMFingerprintSchema>;

/**
 * Storage for element fingerprints, keyed by field ID
 */
const fingerprintStore = new Map<string, DOMFingerprint>();

/**
 * Generate a CSS path using nth-child selectors for an element
 */
const generateCSSPath = (element: HTMLElement): string => {
  try {
    const parts: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body && current !== document.documentElement) {
      const parentEl: HTMLElement | null = current.parentElement;
      if (!parentEl) break;

      const siblings = Array.from(parentEl.children);
      const index = siblings.indexOf(current) + 1;
      parts.unshift(`${current.tagName.toLowerCase()}:nth-child(${index})`);
      current = parentEl;
    }

    return parts.join(' > ');
  } catch {
    return '';
  }
};

/**
 * Generate an XPath expression for an element
 */
const generateXPath = (element: HTMLElement): string => {
  try {
    const parts: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body && current !== document.documentElement) {
      const parentEl: HTMLElement | null = current.parentElement;
      if (!parentEl) break;

      const currentTag = current.tagName;
      const sameTagSiblings = Array.from(parentEl.children).filter((c: Element) => c.tagName === currentTag);
      const index = sameTagSiblings.indexOf(current) + 1;
      parts.unshift(`${current.tagName.toLowerCase()}[${index}]`);
      current = parentEl;
    }

    return '/' + parts.join('/');
  } catch {
    return '';
  }
};

/**
 * Calculate a simple hash string from element attributes
 */
const hashAttributes = (element: HTMLElement): string => {
  try {
    const attrs = Array.from(element.attributes)
      .map(a => `${a.name}=${a.value}`)
      .sort()
      .join('|');
    let hash = 0;
    for (let i = 0; i < attrs.length; i++) {
      const char = attrs.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash.toString(36);
  } catch {
    return '';
  }
};

/**
 * Get the position index of an element within its parent form
 */
const getFormIndex = (element: HTMLElement): number | undefined => {
  try {
    const form = element.closest('form');
    if (!form) return undefined;

    const formElements = Array.from(
      form.querySelectorAll('input, select, textarea, [contenteditable="true"], [role="textbox"], [role="combobox"]'),
    );
    const index = formElements.indexOf(element);
    return index >= 0 ? index : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Get surrounding text content from the element's parent (first 50 chars)
 */
const getSurroundingText = (element: HTMLElement): string => {
  try {
    const parent = element.parentElement;
    if (!parent) return '';
    const text = parent.textContent?.trim() || '';
    return text.substring(0, 50);
  } catch {
    return '';
  }
};

/**
 * Create a DOM fingerprint for an element
 */
const createFingerprint = (element: HTMLElement): DOMFingerprint => {
  const rect = element.getBoundingClientRect();
  return {
    tagName: element.tagName.toLowerCase(),
    type: element.getAttribute('type') || undefined,
    name: element.getAttribute('name') || undefined,
    id: element.id || undefined,
    cssPath: generateCSSPath(element),
    xpath: generateXPath(element),
    formIndex: getFormIndex(element),
    surroundingText: getSurroundingText(element),
    attributesHash: hashAttributes(element),
    rect:
      rect.width > 0 || rect.height > 0
        ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
        : undefined,
  };
};

/**
 * Store a fingerprint for a field when first detecting the element
 */
const storeFingerprint = (fieldId: string, element: HTMLElement): void => {
  fingerprintStore.set(fieldId, createFingerprint(element));
};

/**
 * Calculate how well a candidate element matches a stored fingerprint (0 to 1)
 */
const scoreFingerprintMatch = (candidate: HTMLElement, fingerprint: DOMFingerprint): number => {
  let score = 0;
  let maxScore = 0;

  // Tag name match (required)
  maxScore += 3;
  if (candidate.tagName.toLowerCase() === fingerprint.tagName) {
    score += 3;
  } else {
    return 0;
  }

  if (fingerprint.type) {
    maxScore += 2;
    if (candidate.getAttribute('type') === fingerprint.type) score += 2;
  }

  if (fingerprint.name) {
    maxScore += 3;
    if (candidate.getAttribute('name') === fingerprint.name) score += 3;
  }

  if (fingerprint.id) {
    maxScore += 3;
    if (candidate.id === fingerprint.id) score += 3;
  }

  if (fingerprint.cssPath) {
    maxScore += 2;
    const candidatePath = generateCSSPath(candidate);
    if (candidatePath === fingerprint.cssPath) score += 2;
  }

  if (fingerprint.attributesHash) {
    maxScore += 2;
    if (hashAttributes(candidate) === fingerprint.attributesHash) score += 2;
  }

  if (fingerprint.formIndex !== undefined) {
    maxScore += 1;
    if (getFormIndex(candidate) === fingerprint.formIndex) score += 1;
  }

  if (fingerprint.surroundingText) {
    maxScore += 1;
    const candidateText = getSurroundingText(candidate);
    if (candidateText === fingerprint.surroundingText) score += 1;
  }

  return maxScore > 0 ? score / maxScore : 0;
};

/**
 * Find an element by matching against a stored fingerprint
 */
const findByFingerprint = (field: Field, container: HTMLElement | Document): HTMLElement | null => {
  const fingerprint = fingerprintStore.get(field.id);
  if (!fingerprint) return null;

  try {
    // First try the exact CSS path
    if (fingerprint.cssPath) {
      const exactMatch = container.querySelector<HTMLElement>(fingerprint.cssPath);
      if (exactMatch && scoreFingerprintMatch(exactMatch, fingerprint) > 0.7) {
        return exactMatch;
      }
    }

    // Fallback: search all candidates of the same tag and find best match
    const candidates = Array.from(container.querySelectorAll<HTMLElement>(fingerprint.tagName));
    let bestMatch: HTMLElement | null = null;
    let bestScore = 0.6;

    for (const candidate of candidates) {
      const matchScore = scoreFingerprintMatch(candidate, fingerprint);
      if (matchScore > bestScore) {
        bestScore = matchScore;
        bestMatch = candidate;
      }
    }

    return bestMatch;
  } catch {
    return null;
  }
};

// ============================================================================
// Shadow DOM Traversal
// ============================================================================

/**
 * Type selectors mapping (duplicated locally to avoid circular deps)
 */
const ENHANCED_TYPE_SELECTORS: Record<string, string> = {
  [FieldTypeEnum.TEXT]: 'input[type="text"], input:not([type])',
  [FieldTypeEnum.EMAIL]: 'input[type="email"]',
  [FieldTypeEnum.PASSWORD]: 'input[type="password"]',
  [FieldTypeEnum.TEL]: 'input[type="tel"]',
  [FieldTypeEnum.URL]: 'input[type="url"]',
  [FieldTypeEnum.NUMBER]: 'input[type="number"]',
  [FieldTypeEnum.DATE]: 'input[type="date"]',
  [FieldTypeEnum.DATETIME_LOCAL]: 'input[type="datetime-local"]',
  [FieldTypeEnum.TIME]: 'input[type="time"]',
  [FieldTypeEnum.MONTH]: 'input[type="month"]',
  [FieldTypeEnum.WEEK]: 'input[type="week"]',
  [FieldTypeEnum.COLOR]: 'input[type="color"]',
  [FieldTypeEnum.RANGE]: 'input[type="range"]',
  [FieldTypeEnum.SELECT]: 'select',
  [FieldTypeEnum.TEXTAREA]: 'textarea',
  [FieldTypeEnum.CHECKBOX]: 'input[type="checkbox"]',
  [FieldTypeEnum.RADIO]: 'input[type="radio"]',
  [FieldTypeEnum.FILE]: 'input[type="file"]',
};

const ENHANCED_ARIA_SELECTORS: Record<string, string> = {
  [FieldTypeEnum.TEXT]: '[role="textbox"]',
  [FieldTypeEnum.SELECT]: '[role="combobox"], [role="listbox"]',
  [FieldTypeEnum.CHECKBOX]: '[role="checkbox"]',
  [FieldTypeEnum.RADIO]: '[role="radio"]',
};

/**
 * Collect all shadow roots on the page, including nested ones
 */
const collectShadowRoots = (root: Document | ShadowRoot = document): ShadowRoot[] => {
  const shadowRoots: ShadowRoot[] = [];

  try {
    const walkTree = (node: Document | ShadowRoot): void => {
      const elements = Array.from(node.querySelectorAll('*'));
      for (const el of elements) {
        if (el instanceof HTMLElement && el.shadowRoot) {
          shadowRoots.push(el.shadowRoot);
          walkTree(el.shadowRoot);
        }
      }
    };

    walkTree(root);
  } catch {
    // Shadow DOM access errors are expected for closed shadow roots
  }

  return shadowRoots;
};

/**
 * Search for an element across all shadow roots on the page
 */
const findInShadowDOM = (field: Field): HTMLElement | null => {
  const shadowRoots = collectShadowRoots();

  for (const shadowRoot of shadowRoots) {
    const byFillinyId = shadowRoot.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);
    if (byFillinyId) return byFillinyId;

    if (field.uniqueSelectors?.length) {
      for (const selector of field.uniqueSelectors) {
        try {
          const element = shadowRoot.querySelector<HTMLElement>(selector);
          if (element) return element;
        } catch {
          // Invalid selector
        }
      }
    }

    if (field.name) {
      const byName = shadowRoot.querySelector<HTMLElement>(`[name="${CSS.escape(field.name)}"]`);
      if (byName) return byName;
    }

    if (field.placeholder) {
      const byPlaceholder = shadowRoot.querySelector<HTMLElement>(`[placeholder="${CSS.escape(field.placeholder)}"]`);
      if (byPlaceholder) return byPlaceholder;
    }

    const typeSelector = ENHANCED_TYPE_SELECTORS[field.type];
    if (typeSelector) {
      const elements = shadowRoot.querySelectorAll<HTMLElement>(typeSelector);
      const match = Array.from(elements).find(el => !el.hasAttribute('data-filliny-id'));
      if (match) return match;
    }
  }

  return null;
};

// ============================================================================
// Iframe Searching
// ============================================================================

/**
 * Search for an element in same-origin iframes
 */
const findInIframes = (field: Field): HTMLElement | null => {
  try {
    const iframes = Array.from(document.querySelectorAll('iframe'));

    for (const iframe of iframes) {
      try {
        const iframeDoc = iframe.contentDocument;
        if (!iframeDoc) continue;

        const byFillinyId = iframeDoc.querySelector(`[data-filliny-id="${field.id}"]`) as HTMLElement | null;
        if (byFillinyId) return byFillinyId;

        if (field.uniqueSelectors?.length) {
          for (const selector of field.uniqueSelectors) {
            try {
              const element = iframeDoc.querySelector(selector) as HTMLElement | null;
              if (element) return element;
            } catch {
              // Invalid selector
            }
          }
        }

        if (field.name) {
          const byName = iframeDoc.querySelector(`[name="${CSS.escape(field.name)}"]`) as HTMLElement | null;
          if (byName) return byName;
        }

        if (field.placeholder) {
          const byPlaceholder = iframeDoc.querySelector(
            `[placeholder="${CSS.escape(field.placeholder)}"]`,
          ) as HTMLElement | null;
          if (byPlaceholder) return byPlaceholder;
        }

        const typeSelector = ENHANCED_TYPE_SELECTORS[field.type];
        if (typeSelector) {
          const elements = Array.from(iframeDoc.querySelectorAll(typeSelector));
          const match = elements.find(el => !el.hasAttribute('data-filliny-id'));
          if (match instanceof HTMLElement) return match;
        }
      } catch {
        // Cross-origin iframe access denied
      }
    }
  } catch {
    // Iframe enumeration failed
  }

  return null;
};

// ============================================================================
// MutationObserver-based Element Tracking
// ============================================================================

interface TrackedElement {
  observer: MutationObserver;
  fieldId: string;
  currentElement: HTMLElement;
}

const trackedElements = new Map<string, TrackedElement>();

const handleMutation = (fieldId: string, mutations: MutationRecord[]): void => {
  const tracked = trackedElements.get(fieldId);
  if (!tracked) return;

  if (tracked.currentElement.isConnected) return;

  for (const mutation of mutations) {
    if (mutation.type !== 'childList') continue;

    for (const addedNode of Array.from(mutation.addedNodes)) {
      if (!(addedNode instanceof HTMLElement)) continue;

      const replacement =
        addedNode.querySelector<HTMLElement>(`[data-filliny-id="${fieldId}"]`) ||
        (addedNode.getAttribute('data-filliny-id') === fieldId ? addedNode : null);

      if (replacement) {
        tracked.currentElement = replacement;
        return;
      }
    }
  }
};

/**
 * Start tracking an element for DOM changes using MutationObserver
 */
const trackElement = (fieldId: string, element: HTMLElement): void => {
  untrackElement(fieldId);

  const parentNode = element.parentElement;
  if (!parentNode) return;

  const observer = new MutationObserver(mutations => {
    handleMutation(fieldId, mutations);
  });

  observer.observe(parentNode, {
    childList: true,
    subtree: true,
  });

  trackedElements.set(fieldId, {
    observer,
    fieldId,
    currentElement: element,
  });
};

/**
 * Stop tracking an element
 */
const untrackElement = (fieldId: string): void => {
  const tracked = trackedElements.get(fieldId);
  if (tracked) {
    tracked.observer.disconnect();
    trackedElements.delete(fieldId);
  }
};

/**
 * Get the tracked element reference if available and still connected
 */
const getTrackedElement = (fieldId: string): HTMLElement | null => {
  const tracked = trackedElements.get(fieldId);
  if (!tracked) return null;
  return tracked.currentElement.isConnected ? tracked.currentElement : null;
};

/**
 * Clean up all tracked elements
 */
const cleanupAllTrackers = (): void => {
  for (const tracked of trackedElements.values()) {
    tracked.observer.disconnect();
  }
  trackedElements.clear();
};

// ============================================================================
// Additional Finding Strategies
// ============================================================================

/**
 * Find element by data-testid attribute (React Testing Library)
 */
const findByDataTestId = (field: Field, container: HTMLElement | Document): HTMLElement | null => {
  const testIdCandidates: string[] = [];
  if (field.name) testIdCandidates.push(field.name);
  if (field.label) testIdCandidates.push(field.label);
  if (field.id && !field.id.startsWith('field-')) testIdCandidates.push(field.id);

  for (const candidate of testIdCandidates) {
    try {
      const exact = container.querySelector<HTMLElement>(`[data-testid="${CSS.escape(candidate)}"]`);
      if (exact) return exact;

      const allTestIds = Array.from(container.querySelectorAll<HTMLElement>('[data-testid]'));
      const lowerCandidate = candidate.toLowerCase();
      for (const el of allTestIds) {
        const testId = el.getAttribute('data-testid')?.toLowerCase();
        if (testId && (testId.includes(lowerCandidate) || lowerCandidate.includes(testId))) {
          return el;
        }
      }
    } catch {
      // Continue
    }
  }

  return null;
};

/**
 * Find element by data-cy attribute (Cypress)
 */
const findByDataCy = (field: Field, container: HTMLElement | Document): HTMLElement | null => {
  const cyCandidates: string[] = [];
  if (field.name) cyCandidates.push(field.name);
  if (field.label) cyCandidates.push(field.label);
  if (field.id && !field.id.startsWith('field-')) cyCandidates.push(field.id);

  for (const candidate of cyCandidates) {
    try {
      const exact = container.querySelector<HTMLElement>(`[data-cy="${CSS.escape(candidate)}"]`);
      if (exact) return exact;

      const allCy = Array.from(container.querySelectorAll<HTMLElement>('[data-cy]'));
      const lowerCandidate = candidate.toLowerCase();
      for (const el of allCy) {
        const cy = el.getAttribute('data-cy')?.toLowerCase();
        if (cy && (cy.includes(lowerCandidate) || lowerCandidate.includes(cy))) {
          return el;
        }
      }
    } catch {
      // Continue
    }
  }

  return null;
};

/**
 * Compute the accessible name of an element following the ARIA naming algorithm
 */
const computeAccessibleName = (element: HTMLElement): string => {
  try {
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const parts = labelledBy
        .split(/\s+/)
        .map(id => document.getElementById(id)?.textContent?.trim())
        .filter(Boolean);
      if (parts.length > 0) return parts.join(' ');
    }

    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    if (element.id) {
      const label = document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(element.id)}"]`);
      if (label?.textContent) return label.textContent.trim();
    }

    const parentLabel = element.closest('label');
    if (parentLabel?.textContent) return parentLabel.textContent.trim();

    const title = element.getAttribute('title');
    if (title) return title;

    const placeholder = element.getAttribute('placeholder');
    if (placeholder) return placeholder;

    return '';
  } catch {
    return '';
  }
};

/**
 * Find element by computed accessibility name
 */
const findByAccessibilityName = (field: Field, container: HTMLElement | Document): HTMLElement | null => {
  if (!field.label) return null;

  try {
    const fieldLabel = field.label.trim().toLowerCase();
    const formElements = Array.from(
      container.querySelectorAll<HTMLElement>(
        'input, select, textarea, [role="textbox"], [role="combobox"], [role="listbox"], [role="checkbox"], [role="radio"], [contenteditable="true"]',
      ),
    );

    for (const el of formElements) {
      const accessibleName = computeAccessibleName(el).toLowerCase();
      if (
        accessibleName &&
        (accessibleName === fieldLabel || accessibleName.includes(fieldLabel) || fieldLabel.includes(accessibleName))
      ) {
        return el;
      }
    }
  } catch {
    // Accessibility name computation failed
  }

  return null;
};

/**
 * Find element by form association (using form.elements namedItem)
 */
const findByFormAssociation = (field: Field, container: HTMLElement | Document): HTMLElement | null => {
  if (!field.name) return null;

  try {
    const forms =
      container instanceof Document ? Array.from(container.forms) : Array.from(container.querySelectorAll('form'));

    for (const form of forms) {
      if (!(form instanceof HTMLFormElement)) continue;

      const namedItem = form.elements.namedItem(field.name);
      if (!namedItem) continue;

      if (namedItem instanceof HTMLElement) {
        return namedItem;
      }

      if (namedItem instanceof RadioNodeList && namedItem.length > 0) {
        const firstElement = namedItem[0];
        if (firstElement instanceof HTMLElement) return firstElement;
      }
    }
  } catch {
    // Form association lookup failed
  }

  return null;
};

/**
 * Get the CSS selector for a field type
 */
const getSelectorForFieldType = (fieldType: string): string => {
  const typeSelector = ENHANCED_TYPE_SELECTORS[fieldType];
  const ariaSelector = ENHANCED_ARIA_SELECTORS[fieldType];

  const selectors: string[] = [];
  if (typeSelector) selectors.push(typeSelector);
  if (ariaSelector) selectors.push(ariaSelector);
  if (fieldType === FieldTypeEnum.TEXT || fieldType === FieldTypeEnum.TEXTAREA) {
    selectors.push('[contenteditable="true"]');
  }

  return selectors.join(', ') || 'input, select, textarea';
};

/**
 * Find element by visual position - find the element closest to where
 * the original element was on screen
 */
const findElementByVisualPosition = (
  originalRect: { left: number; top: number; width: number; height: number },
  fieldType: string,
  container: HTMLElement | Document = document,
): HTMLElement | null => {
  try {
    const selector = getSelectorForFieldType(fieldType);
    const candidates = Array.from(container.querySelectorAll<HTMLElement>(selector));
    let closest: HTMLElement | null = null;
    let minDistance = Infinity;

    for (const candidate of candidates) {
      const rect = candidate.getBoundingClientRect();
      const distance = Math.sqrt(Math.pow(rect.left - originalRect.left, 2) + Math.pow(rect.top - originalRect.top, 2));
      if (distance < minDistance && distance < 100) {
        minDistance = distance;
        closest = candidate;
      }
    }

    return closest;
  } catch {
    return null;
  }
};

/**
 * Find element by visual position using a stored fingerprint
 */
const findByVisualPosition = (field: Field, container: HTMLElement | Document): HTMLElement | null => {
  const fingerprint = fingerprintStore.get(field.id);
  if (!fingerprint?.rect) return null;
  return findElementByVisualPosition(fingerprint.rect, field.type, container);
};

// ============================================================================
// React Fiber Key Matching
// ============================================================================

type ReactFiberKey = `__reactFiber$${string}`;

const isReactFiberKey = (key: string): key is ReactFiberKey => key.startsWith('__reactFiber$');

interface ReactFiberNode {
  key?: string | null;
  return?: ReactFiberNode;
  memoizedProps?: Record<string, string | number | boolean | null | undefined | object>;
}

/**
 * Element with React fiber nodes attached via __reactFiber$ keys.
 * React attaches fiber objects to DOM elements at runtime.
 */
interface ReactFiberDOMElement extends HTMLElement {
  [key: ReactFiberKey]: ReactFiberNode | undefined;
}

/**
 * Type guard: checks whether the element has a fiber for the given key.
 */
const hasReactFiber = (element: HTMLElement, key: ReactFiberKey): element is ReactFiberDOMElement => key in element;

const getReactFiberKey = (element: HTMLElement): string | null => {
  try {
    const fiberKey = Object.keys(element).find(isReactFiberKey);
    if (!fiberKey || !hasReactFiber(element, fiberKey)) return null;

    const fiber = element[fiberKey];
    if (!fiber) return null;

    let current: ReactFiberNode | undefined = fiber;
    while (current) {
      if (current.key) return current.key;
      current = current.return;
    }

    return null;
  } catch {
    return null;
  }
};

const reactFiberKeyStore = new Map<string, string>();

/**
 * Store the React fiber key for a field when first detecting
 */
const storeReactFiberKey = (fieldId: string, element: HTMLElement): void => {
  const key = getReactFiberKey(element);
  if (key) {
    reactFiberKeyStore.set(fieldId, key);
  }
};

/**
 * Find element by matching React fiber key
 */
const findByReactFiberKey = (field: Field, container: HTMLElement | Document): HTMLElement | null => {
  const storedKey = reactFiberKeyStore.get(field.id);
  if (!storedKey) return null;

  try {
    const allElements = Array.from(
      container.querySelectorAll<HTMLElement>('input, select, textarea, [contenteditable="true"]'),
    );

    for (const el of allElements) {
      const key = getReactFiberKey(el);
      if (key === storedKey) return el;
    }
  } catch {
    // React fiber key search failed
  }

  return null;
};

// ============================================================================
// Exports
// ============================================================================

export {
  DOMFingerprintSchema,
  fingerprintStore,
  createFingerprint,
  storeFingerprint,
  scoreFingerprintMatch,
  findByFingerprint,
  generateCSSPath,
  generateXPath,
  collectShadowRoots,
  findInShadowDOM,
  findInIframes,
  trackElement,
  untrackElement,
  getTrackedElement,
  cleanupAllTrackers,
  findByDataTestId,
  findByDataCy,
  computeAccessibleName,
  findByAccessibilityName,
  findByFormAssociation,
  findElementByVisualPosition,
  findByVisualPosition,
  storeReactFiberKey,
  findByReactFiberKey,
};

export type { DOMFingerprint };
