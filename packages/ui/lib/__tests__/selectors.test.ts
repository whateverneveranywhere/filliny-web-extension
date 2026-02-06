/**
 * Unit tests for the selector confidence system
 * Tests selectors.ts exports
 */
import { describe, it, expect } from 'vitest';
import {
  SelectorConfidence,
  UNIVERSAL_FORM_SELECTORS,
  getSelectorsByConfidence,
  getSelectorsByConfidenceRange,
  getFrameworkSelectors,
  getRichTextEditorSelectors,
  combineSelectors,
  getCombinedSelectorString,
  HIGH_CONFIDENCE_SELECTORS,
  MEDIUM_CONFIDENCE_SELECTORS,
  LOW_CONFIDENCE_SELECTORS,
  SELECTOR_CATEGORIES,
  FRAMEWORK_SELECTORS,
} from '../components/filliny-button/search-button/field-types/selectors.js';

// ============================================================================
// UNIVERSAL_FORM_SELECTORS
// ============================================================================
describe('UNIVERSAL_FORM_SELECTORS', () => {
  it('should have a substantial number of selectors (50+)', () => {
    expect(UNIVERSAL_FORM_SELECTORS.length).toBeGreaterThanOrEqual(50);
  });

  it('should have standard HTML selectors at confidence 0.95', () => {
    const highest = UNIVERSAL_FORM_SELECTORS.filter(s => s.confidence === SelectorConfidence.HIGHEST);
    expect(highest.length).toBeGreaterThan(0);
    // Should include standard select, textarea, input
    const selectorStrings = highest.map(s => s.selector);
    expect(selectorStrings).toContain('select');
    expect(selectorStrings).toContain('textarea');
  });

  it('should have each selector with a description', () => {
    UNIVERSAL_FORM_SELECTORS.forEach(s => {
      expect(s.description).toBeTruthy();
      expect(typeof s.description).toBe('string');
    });
  });

  it('should have each selector with a confidence between 0 and 1', () => {
    UNIVERSAL_FORM_SELECTORS.forEach(s => {
      expect(s.confidence).toBeGreaterThanOrEqual(0);
      expect(s.confidence).toBeLessThanOrEqual(1);
    });
  });
});

// ============================================================================
// getSelectorsByConfidence
// ============================================================================
describe('getSelectorsByConfidence', () => {
  it('should return only selectors >= given threshold', () => {
    const high = getSelectorsByConfidence(0.9);
    expect(high.length).toBeGreaterThan(0);
    high.forEach(s => {
      expect(s.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  it('should return empty array at threshold 1.0', () => {
    const impossible = getSelectorsByConfidence(1.0);
    expect(impossible.length).toBe(0);
  });

  it('should return all selectors at threshold 0', () => {
    const all = getSelectorsByConfidence(0);
    expect(all.length).toBe(UNIVERSAL_FORM_SELECTORS.length);
  });
});

// ============================================================================
// getSelectorsByConfidenceRange
// ============================================================================
describe('getSelectorsByConfidenceRange', () => {
  it('should return selectors within the specified range', () => {
    const mid = getSelectorsByConfidenceRange(0.7, 0.85);
    expect(mid.length).toBeGreaterThan(0);
    mid.forEach(s => {
      expect(s.confidence).toBeGreaterThanOrEqual(0.7);
      expect(s.confidence).toBeLessThanOrEqual(0.85);
    });
  });

  it('should return empty for a range where no selectors exist', () => {
    const empty = getSelectorsByConfidenceRange(0.99, 0.999);
    expect(empty.length).toBe(0);
  });
});

// ============================================================================
// Pre-computed selector groups
// ============================================================================
describe('Pre-computed selector groups', () => {
  it('HIGH_CONFIDENCE_SELECTORS should only have >= 0.85', () => {
    HIGH_CONFIDENCE_SELECTORS.forEach(s => {
      expect(s.confidence).toBeGreaterThanOrEqual(0.85);
    });
  });

  it('MEDIUM_CONFIDENCE_SELECTORS should be in 0.7-0.8 range', () => {
    MEDIUM_CONFIDENCE_SELECTORS.forEach(s => {
      expect(s.confidence).toBeGreaterThanOrEqual(0.7);
      expect(s.confidence).toBeLessThanOrEqual(0.8);
    });
  });

  it('LOW_CONFIDENCE_SELECTORS should be < 0.7', () => {
    LOW_CONFIDENCE_SELECTORS.forEach(s => {
      expect(s.confidence).toBeLessThan(0.7);
    });
  });
});

// ============================================================================
// getFrameworkSelectors
// ============================================================================
describe('getFrameworkSelectors', () => {
  it('should return Material-UI selectors', () => {
    const mui = getFrameworkSelectors('MATERIAL_UI');
    expect(mui.length).toBeGreaterThan(0);
    expect(mui.some(s => s.selector.includes('Mui'))).toBe(true);
  });

  it('should return Ant Design selectors', () => {
    const ant = getFrameworkSelectors('ANT_DESIGN');
    expect(ant.length).toBeGreaterThan(0);
    expect(ant.some(s => s.selector.includes('ant-'))).toBe(true);
  });

  it('should return Headless UI selectors', () => {
    const headless = getFrameworkSelectors('HEADLESS_UI');
    expect(headless.length).toBeGreaterThan(0);
    expect(headless.some(s => s.selector.includes('headlessui') || s.selector.includes('headless'))).toBe(true);
  });

  it('should return Radix UI selectors', () => {
    const radix = getFrameworkSelectors('RADIX_UI');
    expect(radix.length).toBeGreaterThan(0);
    expect(radix.some(s => s.selector.includes('radix'))).toBe(true);
  });
});

// ============================================================================
// getRichTextEditorSelectors
// ============================================================================
describe('getRichTextEditorSelectors', () => {
  it('should return selectors for rich text editors', () => {
    const editors = getRichTextEditorSelectors();
    expect(editors.length).toBeGreaterThan(0);
  });

  it('should include CKEditor selectors', () => {
    const editors = getRichTextEditorSelectors();
    expect(editors.some(s => s.selector.includes('ck-editor') || s.selector.includes('cke_'))).toBe(true);
  });

  it('should include TinyMCE selectors', () => {
    const editors = getRichTextEditorSelectors();
    expect(editors.some(s => s.selector.includes('mce') || s.selector.includes('tox-tinymce'))).toBe(true);
  });

  it('should include Quill selectors', () => {
    const editors = getRichTextEditorSelectors();
    expect(editors.some(s => s.selector.includes('ql-') || s.selector.includes('quill'))).toBe(true);
  });
});

// ============================================================================
// combineSelectors
// ============================================================================
describe('combineSelectors', () => {
  it('should merge and deduplicate selectors', () => {
    const a = [
      { selector: 'input', confidence: 0.9, description: 'A' },
      { selector: 'select', confidence: 0.8, description: 'B' },
    ];
    const b = [
      { selector: 'input', confidence: 0.9, description: 'A dup' },
      { selector: 'textarea', confidence: 0.85, description: 'C' },
    ];

    const combined = combineSelectors(a, b);
    const selectorStrings = combined.map(s => s.selector);

    expect(selectorStrings.filter(s => s === 'input').length).toBe(1);
    expect(combined.length).toBe(3);
  });

  it('should sort by confidence descending', () => {
    const a = [{ selector: 'a', confidence: 0.5, description: 'low' }];
    const b = [{ selector: 'b', confidence: 0.9, description: 'high' }];

    const combined = combineSelectors(a, b);
    expect(combined[0].selector).toBe('b');
    expect(combined[1].selector).toBe('a');
  });
});

// ============================================================================
// getCombinedSelectorString
// ============================================================================
describe('getCombinedSelectorString', () => {
  it('should return a valid CSS selector string', () => {
    const selectorStr = getCombinedSelectorString(0.9);
    expect(typeof selectorStr).toBe('string');
    expect(selectorStr.length).toBeGreaterThan(0);
    // Should be comma-separated
    expect(selectorStr).toContain(', ');
  });

  it('should return empty string when no selectors match', () => {
    const selectorStr = getCombinedSelectorString(1.0);
    expect(selectorStr).toBe('');
  });
});

// ============================================================================
// SELECTOR_CATEGORIES & FRAMEWORK_SELECTORS structure
// ============================================================================
describe('SELECTOR_CATEGORIES', () => {
  it('should have STANDARD_HTML category', () => {
    expect(SELECTOR_CATEGORIES.STANDARD_HTML.length).toBeGreaterThan(0);
  });

  it('should have ARIA_ROLES category', () => {
    expect(SELECTOR_CATEGORIES.ARIA_ROLES.length).toBeGreaterThan(0);
    expect(SELECTOR_CATEGORIES.ARIA_ROLES).toContain('[role="textbox"]');
  });

  it('should have CONTENT_EDITABLE category', () => {
    expect(SELECTOR_CATEGORIES.CONTENT_EDITABLE.length).toBeGreaterThan(0);
  });
});

describe('FRAMEWORK_SELECTORS', () => {
  it('should have RICH_TEXT_EDITORS with multiple editor configs', () => {
    const editors = FRAMEWORK_SELECTORS.RICH_TEXT_EDITORS;
    expect(Object.keys(editors).length).toBeGreaterThanOrEqual(5);
  });

  it('should have DATE_PICKERS configuration', () => {
    expect(FRAMEWORK_SELECTORS.DATE_PICKERS).toBeDefined();
    expect(FRAMEWORK_SELECTORS.DATE_PICKERS.flatpickr.length).toBeGreaterThan(0);
  });
});
