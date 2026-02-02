/**
 * Unified Element Finding Utility
 *
 * Provides a comprehensive set of strategies for finding form field elements
 * across different detection scenarios. This consolidates the element finding
 * logic that was previously scattered across multiple files.
 */

import type { Field } from '@extension/shared';

/**
 * Element finding strategy enum for clarity and consistency
 */
export enum FindStrategy {
  BY_DATA_FILLINY_ID = 'byDataFillinyId',
  BY_UNIQUE_SELECTORS = 'byUniqueSelectors',
  BY_NAME = 'byName',
  BY_ID = 'byId',
  BY_LABEL = 'byLabel',
  BY_ARIA = 'byARIA',
  BY_TYPE = 'byType',
  BY_PLACEHOLDER = 'byPlaceholder',
  BY_CONTENT_EDITABLE = 'byContentEditable',
}

/**
 * Result of an element finding operation
 */
export interface FindResult {
  element: HTMLElement | null;
  strategy: FindStrategy | null;
}

/**
 * Configuration for element finding
 */
export interface FindConfig {
  container?: HTMLElement | Document;
  strategies?: FindStrategy[];
  skipHidden?: boolean;
  skipDisabled?: boolean;
}

const DEFAULT_STRATEGIES: FindStrategy[] = [
  FindStrategy.BY_DATA_FILLINY_ID,
  FindStrategy.BY_UNIQUE_SELECTORS,
  FindStrategy.BY_NAME,
  FindStrategy.BY_ID,
  FindStrategy.BY_LABEL,
  FindStrategy.BY_ARIA,
  FindStrategy.BY_TYPE,
  FindStrategy.BY_PLACEHOLDER,
  FindStrategy.BY_CONTENT_EDITABLE,
];

/**
 * Type selectors mapping field types to CSS selectors
 */
const TYPE_SELECTORS: Record<string, string> = {
  text: 'input[type="text"], input:not([type])',
  email: 'input[type="email"]',
  password: 'input[type="password"]',
  tel: 'input[type="tel"]',
  url: 'input[type="url"]',
  number: 'input[type="number"]',
  date: 'input[type="date"]',
  'datetime-local': 'input[type="datetime-local"]',
  time: 'input[type="time"]',
  month: 'input[type="month"]',
  week: 'input[type="week"]',
  color: 'input[type="color"]',
  range: 'input[type="range"]',
  select: 'select',
  textarea: 'textarea',
  checkbox: 'input[type="checkbox"]',
  radio: 'input[type="radio"]',
  file: 'input[type="file"]',
};

/**
 * ARIA selectors mapping field types to ARIA role selectors
 */
const ARIA_SELECTORS: Record<string, string> = {
  text: '[role="textbox"]',
  select: '[role="combobox"], [role="listbox"]',
  checkbox: '[role="checkbox"]',
  radio: '[role="radio"]',
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
  if (field.type !== 'text' && field.type !== 'textarea') return null;
  return container.querySelector<HTMLElement>('[contenteditable="true"]');
};

/**
 * Strategy function mapping
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
 * Unified function to find a field element using multiple strategies
 *
 * @param field - The field data to find the element for
 * @param config - Optional configuration for the search
 * @returns FindResult with the element and the strategy that found it
 */
export const findFieldElement = (field: Field, config: FindConfig = {}): FindResult => {
  const { container = document, strategies = DEFAULT_STRATEGIES, skipHidden = false, skipDisabled = false } = config;

  for (const strategy of strategies) {
    try {
      const strategyFn = STRATEGY_FUNCTIONS[strategy];
      if (!strategyFn) continue;

      const element = strategyFn(field, container);

      if (element) {
        // Apply filters
        if (skipHidden && !isElementVisible(element)) {
          continue;
        }
        if (skipDisabled && !isElementEnabled(element)) {
          continue;
        }

        return { element, strategy };
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
export const findElement = (field: Field, container?: HTMLElement | Document): HTMLElement | null =>
  findFieldElement(field, { container }).element;

/**
 * Find element using specific strategies only
 *
 * @param field - The field data to find the element for
 * @param strategies - The strategies to use
 * @param container - Optional container to search within
 * @returns FindResult with the element and the strategy that found it
 */
export const findElementWithStrategies = (
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
export const findFormElement = (formId: string): HTMLElement | null => {
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
export const findOutermostFormContainer = (element: HTMLElement): HTMLElement => {
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

// Export individual strategy functions for direct use if needed
export {
  findByDataFillinyId,
  findByUniqueSelectors,
  findByName,
  findById,
  findByLabel,
  findByARIA,
  findByType,
  findByPlaceholder,
  findByContentEditable,
  isElementVisible,
  isElementEnabled,
  countFormFields,
};
