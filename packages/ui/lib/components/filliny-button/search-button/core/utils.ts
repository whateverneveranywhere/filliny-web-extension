/**
 * Core utility functions used across the field detection system
 *
 * These utilities provide common functionality that multiple modules need,
 * following the DRY principle and ensuring consistency.
 */

import { Framework } from '@extension/shared';
import type { ConfidenceScore, ElementPosition, FrameworkDetection, SelectorWithConfidence } from './types';

// ============================================================================
// ELEMENT UTILITIES
// ============================================================================

/**
 * Check if an element is visible and interactive
 */
export const isElementInteractive = (element: HTMLElement): boolean => {
  if (!element || !element.isConnected) return false;

  const style = window.getComputedStyle(element);

  // Check visibility
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  // Check if disabled
  if (
    element.hasAttribute('disabled') ||
    element.hasAttribute('readonly') ||
    element.getAttribute('aria-disabled') === 'true'
  ) {
    return false;
  }

  // Check dimensions
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    // Exception for radio/checkbox which might be visually hidden but functional
    const isCheckable =
      element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio');
    if (!isCheckable) return false;
  }

  return true;
};

/**
 * Get element position relative to viewport
 */
export const getElementPosition = (element: HTMLElement): ElementPosition => {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    zIndex: parseInt(style.zIndex) || 0,
  };
};

/**
 * Generate unique selectors for an element
 */
export const generateUniqueSelectors = (element: HTMLElement): string[] => {
  const selectors: string[] = [];

  // ID selector (highest priority)
  if (element.id) {
    selectors.push(`#${CSS.escape(element.id)}`);
  }

  // Class selector
  if (element.className) {
    const classSelector = Array.from(element.classList)
      .map(c => `.${CSS.escape(c)}`)
      .join('');
    if (classSelector) {
      selectors.push(classSelector);
    }
  }

  // Attribute selectors
  const importantAttrs = ['name', 'type', 'role', 'aria-label', 'data-testid'];
  importantAttrs.forEach(attr => {
    if (element.hasAttribute(attr)) {
      const value = element.getAttribute(attr)!;
      selectors.push(`[${attr}="${CSS.escape(value)}"]`);
    }
  });

  return selectors;
};

/**
 * Get XPath for an element
 */
export const getElementXPath = (element: HTMLElement): string => {
  if (!element.parentElement) return '';

  const idx =
    Array.from(element.parentElement.children)
      .filter(child => child.tagName === element.tagName)
      .indexOf(element) + 1;

  const parentPath = getElementXPath(element.parentElement);
  return `${parentPath}/${element.tagName.toLowerCase()}[${idx}]`;
};

// ============================================================================
// CONFIDENCE SCORING UTILITIES
// ============================================================================

/**
 * Normalize confidence score to 0-1 range
 */
export const normalizeConfidence = (score: number, max = 100): ConfidenceScore => Math.max(0, Math.min(1, score / max));

/**
 * Combine multiple confidence scores using weighted average
 */
export const combineConfidenceScores = (scores: Array<{ score: ConfidenceScore; weight: number }>): ConfidenceScore => {
  if (scores.length === 0) return 0;

  const totalWeight = scores.reduce((sum, { weight }) => sum + weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = scores.reduce((sum, { score, weight }) => sum + score * weight, 0);
  return weightedSum / totalWeight;
};

// ============================================================================
// FRAMEWORK DETECTION UTILITIES
// ============================================================================

/**
 * Detect JavaScript framework used on the page
 */
export const detectFramework = (element?: HTMLElement): FrameworkDetection => {
  const indicators: string[] = [];
  let framework: FrameworkDetection['framework'] = Framework.VANILLA;
  let confidence: ConfidenceScore = 0;
  let version: string | undefined;

  // React detection
  const reactIndicators = [
    () => !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__,
    () => !!(window as any).React,
    () => !!document.querySelector('[data-reactroot]'),
    () => !!document.querySelector('#root'),
    () => element && Object.keys(element).some(key => key.startsWith('__reactFiber')),
    () => element && Object.keys(element).some(key => key.startsWith('__reactInternalInstance')),
  ];

  const reactScore = reactIndicators.filter(check => {
    try {
      return check();
    } catch {
      return false;
    }
  }).length;

  if (reactScore > 0) {
    framework = Framework.REACT;
    confidence = normalizeConfidence(reactScore * 20);
    indicators.push(`React indicators: ${reactScore}`);

    // Try to detect React version
    try {
      const reactGlobal = (window as any).React;
      if (reactGlobal?.version) {
        version = reactGlobal.version;
      }
    } catch {
      // Ignore version detection errors
    }
  }

  // Angular detection
  const angularIndicators = [
    () => !!(window as any).ng,
    () => !!(window as any).angular,
    () => !!document.querySelector('[ng-app]'),
    () => !!document.querySelector('[ng-controller]'),
    () => element && element.hasAttribute('ng-model'),
    () => element && element.hasAttribute('formControlName'),
  ];

  const angularScore = angularIndicators.filter(check => {
    try {
      return check();
    } catch {
      return false;
    }
  }).length;

  if (angularScore > reactScore) {
    framework = Framework.ANGULAR;
    confidence = normalizeConfidence(angularScore * 20);
    indicators.push(`Angular indicators: ${angularScore}`);
  }

  // Vue detection
  const vueIndicators = [
    () => !!(window as any).Vue,
    () => !!document.querySelector('[v-app]'),
    () => !!document.querySelector('[v-model]'),
    () => element && Array.from(element.attributes).some(attr => attr.name.startsWith('v-')),
  ];

  const vueScore = vueIndicators.filter(check => {
    try {
      return check();
    } catch {
      return false;
    }
  }).length;

  if (vueScore > Math.max(reactScore, angularScore)) {
    framework = Framework.VUE;
    confidence = normalizeConfidence(vueScore * 25);
    indicators.push(`Vue indicators: ${vueScore}`);
  }

  return {
    framework,
    version,
    confidence,
    indicators,
  };
};

// ============================================================================
// SELECTOR UTILITIES
// ============================================================================

/**
 * Create selectors with confidence scoring for form elements
 */
export const createFormElementSelectors = (): SelectorWithConfidence[] => [
  // Standard form elements (highest confidence)
  {
    selector: 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
    confidence: 0.95,
    description: 'Standard HTML input elements',
  },
  {
    selector: 'select',
    confidence: 0.95,
    description: 'Standard HTML select elements',
  },
  {
    selector: 'textarea',
    confidence: 0.95,
    description: 'Standard HTML textarea elements',
  },

  // ARIA form elements (high confidence)
  {
    selector: '[role="textbox"]',
    confidence: 0.9,
    description: 'ARIA textbox elements',
  },
  {
    selector: '[role="combobox"]',
    confidence: 0.9,
    description: 'ARIA combobox elements',
  },
  {
    selector: '[role="checkbox"]',
    confidence: 0.9,
    description: 'ARIA checkbox elements',
  },
  {
    selector: '[role="radio"]',
    confidence: 0.9,
    description: 'ARIA radio elements',
  },

  // Content editable (high confidence)
  {
    selector: '[contenteditable="true"]',
    confidence: 0.85,
    description: 'Content editable elements',
  },

  // Framework-specific patterns (medium confidence)
  {
    selector: '.form-control',
    confidence: 0.8,
    description: 'Bootstrap form control elements',
  },
  {
    selector: '.MuiTextField-root input',
    confidence: 0.85,
    description: 'Material-UI text field inputs',
  },
  {
    selector: '.ant-input',
    confidence: 0.85,
    description: 'Ant Design input components',
  },
];

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate that an element is a valid form field
 */
export const isValidFormField = (element: HTMLElement): boolean => {
  // Skip non-interactive elements
  if (!isElementInteractive(element)) return false;

  // Skip elements that are clearly not form fields
  const excludedTags = ['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'HEAD'];
  if (excludedTags.includes(element.tagName)) return false;

  // Skip decorative elements
  if (element.getAttribute('aria-hidden') === 'true' || element.getAttribute('role') === 'presentation') {
    return false;
  }

  return true;
};

// ============================================================================
// DEBOUNCING UTILITIES
// ============================================================================

/**
 * Create a debounced function
 */
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Create a throttled function
 */
export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number,
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Safe function execution with error handling
 */
export const safeExecute = async <T>(fn: () => Promise<T> | T, fallback: T, context?: string): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    console.error(`Safe execution failed${context ? ` in ${context}` : ''}:`, error);
    return fallback;
  }
};

/**
 * Retry function with exponential backoff
 */
export const retry = async <T>(fn: () => Promise<T>, maxAttempts: number = 3, baseDelay: number = 1000): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};
