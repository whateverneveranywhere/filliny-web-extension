/**
 * Unified Element Finding Utility
 *
 * Provides a comprehensive set of strategies for finding form field elements
 * across different detection scenarios. This consolidates the element finding
 * logic that was previously scattered across multiple files.
 *
 * Enhanced with DOM fingerprinting, Shadow DOM/iframe searching,
 * MutationObserver tracking, and additional strategies (data-testid,
 * data-cy, accessibility name, form association, visual position,
 * React fiber key, fingerprint matching).
 */
import {
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
} from './elementFinderEnhanced';
import { FieldTypeEnum } from '@extension/shared';
import { z } from 'zod';
import type { DOMFingerprint } from './elementFinderEnhanced';
import type { Field } from '@extension/shared';

/**
 * Element finding strategy enum for clarity and consistency
 */
enum FindStrategy {
  BY_DATA_FILLINY_ID = 'byDataFillinyId',
  BY_UNIQUE_SELECTORS = 'byUniqueSelectors',
  BY_NAME = 'byName',
  BY_ID = 'byId',
  BY_LABEL = 'byLabel',
  BY_ARIA = 'byARIA',
  BY_TYPE = 'byType',
  BY_PLACEHOLDER = 'byPlaceholder',
  BY_CONTENT_EDITABLE = 'byContentEditable',
  BY_DATA_TESTID = 'byDataTestId',
  BY_DATA_CY = 'byDataCy',
  BY_ACCESSIBILITY_NAME = 'byAccessibilityName',
  BY_FORM_ASSOCIATION = 'byFormAssociation',
  BY_VISUAL_POSITION = 'byVisualPosition',
  BY_REACT_FIBER_KEY = 'byReactFiberKey',
  BY_FINGERPRINT = 'byFingerprint',
  BY_SHADOW_DOM = 'byShadowDOM',
  BY_IFRAME = 'byIframe',
}

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Find result schema
 */
const FindResultSchema = z.object({
  element: z.custom<HTMLElement | null>(val => val === null || val instanceof HTMLElement, {
    message: 'Expected HTMLElement or null',
  }),
  strategy: z.nativeEnum(FindStrategy).nullable(),
});

/**
 * Find config schema
 */
const FindConfigSchema = z.object({
  container: z
    .custom<HTMLElement | Document>(val => val instanceof HTMLElement || val instanceof Document, {
      message: 'Expected HTMLElement or Document',
    })
    .optional(),
  strategies: z.array(z.nativeEnum(FindStrategy)).optional(),
  skipHidden: z.boolean().optional(),
  skipDisabled: z.boolean().optional(),
});

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

/**
 * Result of an element finding operation
 */
type FindResult = z.infer<typeof FindResultSchema>;

/**
 * Configuration for element finding
 */
type FindConfig = z.infer<typeof FindConfigSchema>;

const DEFAULT_STRATEGIES: FindStrategy[] = [
  FindStrategy.BY_DATA_FILLINY_ID,
  FindStrategy.BY_UNIQUE_SELECTORS,
  FindStrategy.BY_NAME,
  FindStrategy.BY_ID,
  FindStrategy.BY_LABEL,
  FindStrategy.BY_ARIA,
  FindStrategy.BY_DATA_TESTID,
  FindStrategy.BY_DATA_CY,
  FindStrategy.BY_ACCESSIBILITY_NAME,
  FindStrategy.BY_FORM_ASSOCIATION,
  FindStrategy.BY_TYPE,
  FindStrategy.BY_PLACEHOLDER,
  FindStrategy.BY_CONTENT_EDITABLE,
  FindStrategy.BY_REACT_FIBER_KEY,
  FindStrategy.BY_FINGERPRINT,
  FindStrategy.BY_SHADOW_DOM,
  FindStrategy.BY_IFRAME,
  FindStrategy.BY_VISUAL_POSITION,
];

/**
 * Type selectors mapping field types to CSS selectors
 */
const TYPE_SELECTORS: Record<string, string> = {
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

/**
 * ARIA selectors mapping field types to ARIA role selectors
 */
const ARIA_SELECTORS: Record<string, string> = {
  [FieldTypeEnum.TEXT]: '[role="textbox"]',
  [FieldTypeEnum.SELECT]: '[role="combobox"], [role="listbox"]',
  [FieldTypeEnum.CHECKBOX]: '[role="checkbox"]',
  [FieldTypeEnum.RADIO]: '[role="radio"]',
};

/**
 * Find element by data-filliny-id attribute
 */
const findByDataFillinyId = (field: Field, container: HTMLElement | Document): HTMLElement | null =>
  container.querySelector<HTMLElement>(`[data-filliny-id="${field.id}"]`);

/**
 * Find element by unique selectors
 */
const findByUniqueSelectors = (field: Field, container: HTMLElement | Document): HTMLElement | null => {
  if (!field.uniqueSelectors?.length) return null;

  for (const selector of field.uniqueSelectors) {
    try {
      const element = container.querySelector<HTMLElement>(selector);
      if (element) return element;
    } catch {
      // Invalid selector, continue to next
    }
  }
  return null;
};

/**
 * Find element by name attribute
 */
const findByName = (field: Field, container: HTMLElement | Document): HTMLElement | null => {
  if (!field.name) return null;
  return container.querySelector<HTMLElement>(`[name="${CSS.escape(field.name)}"]`);
};

/**
 * Find element by ID attribute
 */
const findById = (field: Field, container: HTMLElement | Document): HTMLElement | null => {
  // Skip if field.id is our generated filliny ID
  if (!field.id || field.id.startsWith('field-')) return null;
  try {
    return container.querySelector<HTMLElement>(`#${CSS.escape(field.id)}`);
  } catch {
    return null;
  }
};

/**
 * Find element by associated label text
 */
const findByLabel = (field: Field, container: HTMLElement | Document): HTMLElement | null => {
  if (!field.label) return null;

  const labels = Array.from(container.querySelectorAll('label'));
  const fieldLabel = field.label.trim().toLowerCase();

  for (const label of labels) {
    const labelText = label.textContent?.trim().toLowerCase();

    if (labelText && (labelText === fieldLabel || labelText.includes(fieldLabel) || fieldLabel.includes(labelText))) {
      // Check for 'for' attribute
      const forAttr = label.getAttribute('for');
      if (forAttr) {
        const linkedElement = document.getElementById(forAttr) as HTMLElement;
        if (linkedElement) return linkedElement;
      }

      // Check if label contains a form element
      const formElement = label.querySelector('input, select, textarea, [contenteditable]');
      if (formElement) return formElement as HTMLElement;
    }
  }
  return null;
};

/**
 * Find element by ARIA attributes
 */
const findByARIA = (field: Field, container: HTMLElement | Document): HTMLElement | null => {
  const selector = ARIA_SELECTORS[field.type];
  if (!selector) return null;

  const elements = container.querySelectorAll<HTMLElement>(selector);
  // Return first element that doesn't already have a data-filliny-id
  return Array.from(elements).find(el => !el.hasAttribute('data-filliny-id')) || null;
};

/**
 * Find element by type and position
 */
const findByType = (field: Field, container: HTMLElement | Document): HTMLElement | null => {
  const selector = TYPE_SELECTORS[field.type];
  if (!selector) return null;

  const elements = container.querySelectorAll<HTMLElement>(selector);
  // Return first element that doesn't already have a data-filliny-id
  return Array.from(elements).find(el => !el.hasAttribute('data-filliny-id')) || null;
};

/**
 * Find element by placeholder text
 */
const findByPlaceholder = (field: Field, container: HTMLElement | Document): HTMLElement | null => {
  if (!field.placeholder) return null;
  return container.querySelector<HTMLElement>(`[placeholder="${CSS.escape(field.placeholder)}"]`);
};

/**
 * Find contenteditable element for text/textarea types
 */
const findByContentEditable = (field: Field, container: HTMLElement | Document): HTMLElement | null => {
  if (field.type !== FieldTypeEnum.TEXT && field.type !== FieldTypeEnum.TEXTAREA) return null;
  return container.querySelector<HTMLElement>('[contenteditable="true"]');
};

/**
 * Strategy function mapping - extended with enhanced strategies
 */
const STRATEGY_FUNCTIONS: Record<
  FindStrategy,
  (field: Field, container: HTMLElement | Document) => HTMLElement | null
> = {
  [FindStrategy.BY_DATA_FILLINY_ID]: findByDataFillinyId,
  [FindStrategy.BY_UNIQUE_SELECTORS]: findByUniqueSelectors,
  [FindStrategy.BY_NAME]: findByName,
  [FindStrategy.BY_ID]: findById,
  [FindStrategy.BY_LABEL]: findByLabel,
  [FindStrategy.BY_ARIA]: findByARIA,
  [FindStrategy.BY_TYPE]: findByType,
  [FindStrategy.BY_PLACEHOLDER]: findByPlaceholder,
  [FindStrategy.BY_CONTENT_EDITABLE]: findByContentEditable,
  [FindStrategy.BY_DATA_TESTID]: findByDataTestId,
  [FindStrategy.BY_DATA_CY]: findByDataCy,
  [FindStrategy.BY_ACCESSIBILITY_NAME]: findByAccessibilityName,
  [FindStrategy.BY_FORM_ASSOCIATION]: findByFormAssociation,
  [FindStrategy.BY_VISUAL_POSITION]: findByVisualPosition,
  [FindStrategy.BY_REACT_FIBER_KEY]: findByReactFiberKey,
  [FindStrategy.BY_FINGERPRINT]: findByFingerprint,
  [FindStrategy.BY_SHADOW_DOM]: findInShadowDOM,
  [FindStrategy.BY_IFRAME]: findInIframes,
};

/**
 * Check if element is visible and not hidden
 */
const isElementVisible = (element: HTMLElement): boolean => {
  try {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  } catch {
    return true;
  }
};

/**
 * Check if element is not disabled
 */
const isElementEnabled = (element: HTMLElement): boolean =>
  !element.hasAttribute('disabled') &&
  !element.hasAttribute('readonly') &&
  element.getAttribute('aria-disabled') !== 'true';

/**
 * Check if element is still attached to the DOM
 */
const isElementAttached = (element: HTMLElement): boolean => {
  try {
    return element.isConnected;
  } catch {
    return false;
  }
};

/**
 * Attempt stale reference recovery using ALL re-finding strategies.
 * Called when isElementAttached returns false for a previously known element.
 */
const recoverStaleReference = (field: Field, container: HTMLElement | Document = document): FindResult => {
  // First check MutationObserver tracked elements
  const tracked = getTrackedElement(field.id);
  if (tracked) {
    return { element: tracked, strategy: null };
  }

  // Try all strategies in order
  for (const strategy of DEFAULT_STRATEGIES) {
    try {
      const strategyFn = STRATEGY_FUNCTIONS[strategy];
      if (!strategyFn) continue;

      const foundElement = strategyFn(field, container);
      if (foundElement && foundElement.isConnected) {
        console.debug(`Recovered stale reference for field ${field.id} using strategy ${strategy}`);

        // Update tracking for the recovered element
        trackElement(field.id, foundElement);
        storeFingerprint(field.id, foundElement);

        return { element: foundElement, strategy };
      }
    } catch {
      // Continue to next strategy
    }
  }

  return { element: null, strategy: null };
};

/**
 * Unified function to find a field element using multiple strategies
 *
 * Enhanced with MutationObserver tracking, fingerprint storage,
 * React fiber key storage, and automatic stale reference recovery.
 *
 * @param field - The field data to find the element for
 * @param config - Optional configuration for the search
 * @param element - Optional existing element reference
 * @returns FindResult with the element and the strategy that found it
 */
const findFieldElement = (field: Field, config: FindConfig = {}, element?: HTMLElement): FindResult => {
  const { container = document, strategies = DEFAULT_STRATEGIES, skipHidden = false, skipDisabled = false } = config;

  // If the element reference is provided and still attached, use it
  if (element && element.isConnected) {
    return { element, strategy: null };
  }

  // Check MutationObserver tracked elements first
  const tracked = getTrackedElement(field.id);
  if (tracked) {
    return { element: tracked, strategy: null };
  }

  // If the element was provided but is stale, attempt recovery
  if (element && !element.isConnected) {
    const recovered = recoverStaleReference(field, container);
    if (recovered.element) {
      return recovered;
    }
  }

  for (const strategy of strategies) {
    try {
      const strategyFn = STRATEGY_FUNCTIONS[strategy];
      if (!strategyFn) continue;

      const foundElement = strategyFn(field, container);

      if (foundElement) {
        // Apply filters
        if (skipHidden && !isElementVisible(foundElement)) {
          continue;
        }
        if (skipDisabled && !isElementEnabled(foundElement)) {
          continue;
        }

        // Store fingerprint and start tracking on first successful find
        storeFingerprint(field.id, foundElement);
        storeReactFiberKey(field.id, foundElement);
        trackElement(field.id, foundElement);

        return { element: foundElement, strategy };
      }
    } catch (error) {
      console.debug(`Strategy ${strategy} failed for field ${field.id}:`, error);
    }
  }

  return { element: null, strategy: null };
};

/**
 * Find field element with a simplified interface (returns just the element)
 *
 * @param field - The field data to find the element for
 * @param container - Optional container to search within
 * @returns The found element or null
 */
const findElement = (field: Field, container?: HTMLElement | Document): HTMLElement | null =>
  findFieldElement(field, { container }).element;

/**
 * Find element using specific strategies only
 *
 * @param field - The field data to find the element for
 * @param strategies - The strategies to use
 * @param container - Optional container to search within
 * @returns FindResult with the element and the strategy that found it
 */
const findElementWithStrategies = (
  field: Field,
  strategies: FindStrategy[],
  container?: HTMLElement | Document,
): FindResult => findFieldElement(field, { container, strategies });

/**
 * Find element for a form overlay (form-specific search)
 *
 * @param formId - The form ID to find
 * @returns The form element or null
 */
const findFormElement = (formId: string): HTMLElement | null => {
  const strategies = [
    () => document.querySelector<HTMLElement>(`form[data-form-id="${formId}"]`),
    () => document.querySelector<HTMLElement>(`[data-filliny-form-container][data-form-id="${formId}"]`),
    () => document.querySelector<HTMLElement>(`[data-form-id="${formId}"]`),
    () => document.querySelector<HTMLElement>('[data-filliny-unified-form="true"]'),
    () => document.querySelector<HTMLElement>('[data-filliny-primary-form="true"]'),
  ];

  for (const strategy of strategies) {
    const element = strategy();
    if (element) return element;
  }

  // Special handling for unified form scenario
  if (formId === 'unified-form') {
    const unifiedFormMember = document.querySelector<HTMLElement>('[data-filliny-unified-form-member="unified-form"]');
    if (unifiedFormMember) return unifiedFormMember;

    const activeOverlayForm = document.querySelector<HTMLElement>('[data-filliny-overlay-active="true"]');
    if (activeOverlayForm) return activeOverlayForm;
  }

  return null;
};

/**
 * Find the outermost container for a form element
 * Used by FormsOverlay to find the best container for overlay coverage
 *
 * @param element - The starting element
 * @returns The outermost container with the most form fields
 */
const findOutermostFormContainer = (element: HTMLElement): HTMLElement => {
  let bestContainer = element;
  let maxFieldCount = countFormFields(element);

  let parent = element.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const parentFieldCount = countFormFields(parent);

    // If parent has more fields (with 10% buffer), use it
    if (parentFieldCount > maxFieldCount * 1.1) {
      bestContainer = parent;
      maxFieldCount = parentFieldCount;
    }

    parent = parent.parentElement;
  }

  return bestContainer;
};

/**
 * Find an input element by spatial proximity to a label or text element
 *
 * @param labelText - The text to search for in labels and text elements
 * @param container - Optional container to search within
 * @returns The closest input element near the matching label, or null
 */
const findByLabelProximity = (labelText: string, container: HTMLElement | Document = document): HTMLElement | null => {
  try {
    // Find all text nodes or labels matching the text
    const labels = Array.from(container.querySelectorAll('label, span, div, p, th, dt'));

    for (const label of labels) {
      if (label instanceof HTMLElement && label.textContent?.trim().toLowerCase().includes(labelText.toLowerCase())) {
        // Look for nearby inputs using spatial proximity
        const labelRect = label.getBoundingClientRect();

        // Check for `for` attribute first
        if (label instanceof HTMLLabelElement && label.htmlFor) {
          const forEl = document.getElementById(label.htmlFor);
          if (forEl instanceof HTMLElement) return forEl;
        }

        // Check siblings and nearby elements
        const nearbyInputs = Array.from(
          container.querySelectorAll('input, select, textarea, [role="textbox"], [role="combobox"]'),
        );

        let closest: HTMLElement | null = null;
        let closestDistance = Infinity;

        for (const input of nearbyInputs) {
          if (input instanceof HTMLElement) {
            const inputRect = input.getBoundingClientRect();
            // Calculate distance between label and input
            const dx = inputRect.left - labelRect.right;
            const dy = Math.abs(inputRect.top - labelRect.top);
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Only consider inputs that are to the right of or below the label
            if (distance < closestDistance && distance < 300) {
              closestDistance = distance;
              closest = input;
            }
          }
        }

        if (closest) return closest;
      }
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Count form fields within an element
 */
const countFormFields = (element: HTMLElement): number => {
  const selectors = [
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
    'select',
    'textarea',
    '[role="textbox"]',
    '[role="combobox"]',
    '[role="checkbox"]',
    '[role="radio"]',
  ];

  let count = 0;
  for (const selector of selectors) {
    try {
      count += element.querySelectorAll(selector).length;
    } catch {
      // Continue if selector fails
    }
  }

  return count;
};

export {
  FindStrategy,
  FindResultSchema,
  FindConfigSchema,
  DOMFingerprintSchema,
  findFieldElement,
  findElement,
  findElementWithStrategies,
  findFormElement,
  findOutermostFormContainer,
  findByDataFillinyId,
  findByUniqueSelectors,
  findByName,
  findById,
  findByLabel,
  findByARIA,
  findByType,
  findByPlaceholder,
  findByContentEditable,
  findByDataTestId,
  findByDataCy,
  findByAccessibilityName,
  findByFormAssociation,
  findByReactFiberKey,
  findByFingerprint,
  findByVisualPosition,
  findInShadowDOM,
  findInIframes,
  findByLabelProximity,
  findElementByVisualPosition,
  isElementVisible,
  isElementEnabled,
  isElementAttached,
  countFormFields,
  // Fingerprinting
  createFingerprint,
  storeFingerprint,
  scoreFingerprintMatch,
  fingerprintStore,
  // Element tracking
  trackElement,
  untrackElement,
  getTrackedElement,
  cleanupAllTrackers,
  // Stale reference recovery
  recoverStaleReference,
  // Shadow DOM utilities
  collectShadowRoots,
  // Accessible name computation
  computeAccessibleName,
  // CSS path / XPath generation
  generateCSSPath,
  generateXPath,
  // React fiber key utilities
  storeReactFiberKey,
};

export type { FindResult, FindConfig, DOMFingerprint };
