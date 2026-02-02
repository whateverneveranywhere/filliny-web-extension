/**
 * Comprehensive unit tests for runtime type guards
 * Tests DOM element type guards and safe property access utilities
 */
import {
  isHTMLInputElement,
  isHTMLSelectElement,
  isHTMLTextAreaElement,
  isHTMLButtonElement,
  isHTMLElement,
  isHTMLDivElement,
  isHTMLFormElement,
  isHTMLLabelElement,
  isElement,
  isDocument,
  isCheckboxInput,
  isRadioInput,
  isFileInput,
  isTextLikeInput,
  queryInputElement,
  querySelectElement,
  queryDivElement,
  queryHTMLElement,
  getInputElementById,
  getSelectElementById,
  getHTMLElementById,
  safeGetProperty,
  hasProperty,
  safeGetNestedProperty,
  matchesSchema,
  parseWithFallback,
} from '../utils/runtime-type-guards.js';
import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';

describe('DOM Element Type Guards', () => {
  describe('isHTMLInputElement', () => {
    it('should return true for input elements', () => {
      const input = document.createElement('input');
      expect(isHTMLInputElement(input)).toBe(true);
    });

    it('should return false for non-input elements', () => {
      expect(isHTMLInputElement(document.createElement('div'))).toBe(false);
      expect(isHTMLInputElement(document.createElement('select'))).toBe(false);
      expect(isHTMLInputElement(null)).toBe(false);
      expect(isHTMLInputElement(undefined)).toBe(false);
      expect(isHTMLInputElement('input')).toBe(false);
    });
  });

  describe('isHTMLSelectElement', () => {
    it('should return true for select elements', () => {
      const select = document.createElement('select');
      expect(isHTMLSelectElement(select)).toBe(true);
    });

    it('should return false for non-select elements', () => {
      expect(isHTMLSelectElement(document.createElement('input'))).toBe(false);
      expect(isHTMLSelectElement(null)).toBe(false);
    });
  });

  describe('isHTMLTextAreaElement', () => {
    it('should return true for textarea elements', () => {
      const textarea = document.createElement('textarea');
      expect(isHTMLTextAreaElement(textarea)).toBe(true);
    });

    it('should return false for non-textarea elements', () => {
      expect(isHTMLTextAreaElement(document.createElement('input'))).toBe(false);
    });
  });

  describe('isHTMLButtonElement', () => {
    it('should return true for button elements', () => {
      const button = document.createElement('button');
      expect(isHTMLButtonElement(button)).toBe(true);
    });

    it('should return false for input[type=button]', () => {
      const input = document.createElement('input');
      input.type = 'button';
      expect(isHTMLButtonElement(input)).toBe(false);
    });
  });

  describe('isHTMLElement', () => {
    it('should return true for any HTML element', () => {
      expect(isHTMLElement(document.createElement('div'))).toBe(true);
      expect(isHTMLElement(document.createElement('span'))).toBe(true);
      expect(isHTMLElement(document.createElement('custom-element'))).toBe(true);
    });

    it('should return false for non-HTML elements', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      expect(isHTMLElement(svg)).toBe(false);
      expect(isHTMLElement(null)).toBe(false);
    });
  });

  describe('isHTMLDivElement', () => {
    it('should return true for div elements', () => {
      expect(isHTMLDivElement(document.createElement('div'))).toBe(true);
    });

    it('should return false for non-div elements', () => {
      expect(isHTMLDivElement(document.createElement('span'))).toBe(false);
    });
  });

  describe('isHTMLFormElement', () => {
    it('should return true for form elements', () => {
      expect(isHTMLFormElement(document.createElement('form'))).toBe(true);
    });

    it('should return false for non-form elements', () => {
      expect(isHTMLFormElement(document.createElement('div'))).toBe(false);
    });
  });

  describe('isHTMLLabelElement', () => {
    it('should return true for label elements', () => {
      expect(isHTMLLabelElement(document.createElement('label'))).toBe(true);
    });

    it('should return false for non-label elements', () => {
      expect(isHTMLLabelElement(document.createElement('span'))).toBe(false);
    });
  });

  describe('isElement', () => {
    it('should return true for any element', () => {
      expect(isElement(document.createElement('div'))).toBe(true);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      expect(isElement(svg)).toBe(true);
    });

    it('should return false for non-elements', () => {
      expect(isElement(document.createTextNode('text'))).toBe(false);
      expect(isElement(null)).toBe(false);
    });
  });

  describe('isDocument', () => {
    it('should return true for document', () => {
      expect(isDocument(document)).toBe(true);
    });

    it('should return false for non-documents', () => {
      expect(isDocument(document.createElement('div'))).toBe(false);
      expect(isDocument(null)).toBe(false);
    });
  });
});

describe('Form Field Type Guards', () => {
  describe('isCheckboxInput', () => {
    it('should return true for checkbox inputs', () => {
      const input = document.createElement('input');
      input.type = 'checkbox';
      expect(isCheckboxInput(input)).toBe(true);
    });

    it('should return false for other input types', () => {
      const text = document.createElement('input');
      text.type = 'text';
      expect(isCheckboxInput(text)).toBe(false);

      const radio = document.createElement('input');
      radio.type = 'radio';
      expect(isCheckboxInput(radio)).toBe(false);
    });
  });

  describe('isRadioInput', () => {
    it('should return true for radio inputs', () => {
      const input = document.createElement('input');
      input.type = 'radio';
      expect(isRadioInput(input)).toBe(true);
    });

    it('should return false for other input types', () => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      expect(isRadioInput(checkbox)).toBe(false);
    });
  });

  describe('isFileInput', () => {
    it('should return true for file inputs', () => {
      const input = document.createElement('input');
      input.type = 'file';
      expect(isFileInput(input)).toBe(true);
    });

    it('should return false for other input types', () => {
      const text = document.createElement('input');
      expect(isFileInput(text)).toBe(false);
    });
  });

  describe('isTextLikeInput', () => {
    const textLikeTypes = ['text', 'email', 'password', 'search', 'tel', 'url', 'number'];

    it.each(textLikeTypes)('should return true for input type: %s', type => {
      const input = document.createElement('input');
      input.type = type;
      expect(isTextLikeInput(input)).toBe(true);
    });

    it('should return false for non-text-like inputs', () => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      expect(isTextLikeInput(checkbox)).toBe(false);

      const file = document.createElement('input');
      file.type = 'file';
      expect(isTextLikeInput(file)).toBe(false);
    });
  });
});

describe('Safe Element Query Utilities', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = `
      <input type="text" id="text-input" class="text-field" />
      <input type="checkbox" id="checkbox-input" />
      <select id="country-select">
        <option value="us">United States</option>
      </select>
      <div id="content-div" class="content"></div>
      <span id="info-span">Info</span>
    `;
    document.body.appendChild(container);
  });

  describe('queryInputElement', () => {
    it('should return input element when found', () => {
      const result = queryInputElement(container, '#text-input');
      expect(result).toBeInstanceOf(HTMLInputElement);
      expect(result?.id).toBe('text-input');
    });

    it('should return null for non-input selectors', () => {
      const result = queryInputElement(container, '#content-div');
      expect(result).toBeNull();
    });

    it('should return null for non-existent selectors', () => {
      const result = queryInputElement(container, '#non-existent');
      expect(result).toBeNull();
    });
  });

  describe('querySelectElement', () => {
    it('should return select element when found', () => {
      const result = querySelectElement(container, '#country-select');
      expect(result).toBeInstanceOf(HTMLSelectElement);
    });

    it('should return null for non-select elements', () => {
      const result = querySelectElement(container, '#text-input');
      expect(result).toBeNull();
    });
  });

  describe('queryDivElement', () => {
    it('should return div element when found', () => {
      const result = queryDivElement(container, '#content-div');
      expect(result).toBeInstanceOf(HTMLDivElement);
    });

    it('should return null for non-div elements', () => {
      const result = queryDivElement(container, '#info-span');
      expect(result).toBeNull();
    });
  });

  describe('queryHTMLElement', () => {
    it('should return any HTML element', () => {
      expect(queryHTMLElement(container, '#text-input')).toBeInstanceOf(HTMLElement);
      expect(queryHTMLElement(container, '#content-div')).toBeInstanceOf(HTMLElement);
      expect(queryHTMLElement(container, '#info-span')).toBeInstanceOf(HTMLElement);
    });

    it('should return null for non-existent elements', () => {
      expect(queryHTMLElement(container, '#non-existent')).toBeNull();
    });
  });

  describe('getElementById utilities', () => {
    beforeEach(() => {
      // Clean up and re-add to ensure IDs are unique
      document.body.innerHTML = '';
      container = document.createElement('div');
      container.innerHTML = `
        <input type="text" id="unique-input" />
        <select id="unique-select"></select>
        <div id="unique-div"></div>
      `;
      document.body.appendChild(container);
    });

    it('getInputElementById should return input element', () => {
      const result = getInputElementById(document, 'unique-input');
      expect(result).toBeInstanceOf(HTMLInputElement);
    });

    it('getSelectElementById should return select element', () => {
      const result = getSelectElementById(document, 'unique-select');
      expect(result).toBeInstanceOf(HTMLSelectElement);
    });

    it('getHTMLElementById should return any HTML element', () => {
      const result = getHTMLElementById(document, 'unique-div');
      expect(result).toBeInstanceOf(HTMLElement);
    });
  });
});

describe('Safe Property Access Utilities', () => {
  describe('safeGetProperty', () => {
    it('should get existing properties', () => {
      const obj = { name: 'test', value: 42 };
      expect(safeGetProperty<string>(obj, 'name')).toBe('test');
      expect(safeGetProperty<number>(obj, 'value')).toBe(42);
    });

    it('should return undefined for non-existent properties', () => {
      const obj = { name: 'test' };
      expect(safeGetProperty(obj, 'missing')).toBeUndefined();
    });

    it('should return undefined for null/undefined', () => {
      expect(safeGetProperty(null, 'prop')).toBeUndefined();
      expect(safeGetProperty(undefined, 'prop')).toBeUndefined();
    });

    it('should handle primitive values', () => {
      // Primitives are not objects, so safeGetProperty returns undefined
      expect(safeGetProperty('string', 'length')).toBeUndefined();
      expect(safeGetProperty(42, 'toFixed')).toBeUndefined();
    });
  });

  describe('hasProperty', () => {
    it('should return true for existing properties', () => {
      const obj = { name: 'test', nested: { value: 1 } };
      expect(hasProperty(obj, 'name')).toBe(true);
      expect(hasProperty(obj, 'nested')).toBe(true);
    });

    it('should return false for non-existent properties', () => {
      const obj = { name: 'test' };
      expect(hasProperty(obj, 'missing')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(hasProperty(null, 'prop')).toBe(false);
      expect(hasProperty(undefined, 'prop')).toBe(false);
    });
  });

  describe('safeGetNestedProperty', () => {
    const testObj = {
      level1: {
        level2: {
          level3: {
            value: 'deep value',
          },
        },
        array: [1, 2, 3],
      },
      simple: 'top level',
    };

    it('should get nested properties', () => {
      expect(safeGetNestedProperty(testObj, 'level1.level2.level3.value')).toBe('deep value');
      expect(safeGetNestedProperty(testObj, 'simple')).toBe('top level');
    });

    it('should return undefined for non-existent paths', () => {
      expect(safeGetNestedProperty(testObj, 'level1.missing.path')).toBeUndefined();
      expect(safeGetNestedProperty(testObj, 'nonexistent')).toBeUndefined();
    });

    it('should handle null/undefined in path', () => {
      const objWithNull = { a: { b: null } };
      expect(safeGetNestedProperty(objWithNull, 'a.b.c')).toBeUndefined();
    });
  });
});

describe('Schema Matching Utilities', () => {
  const TestSchema = z.object({
    name: z.string(),
    age: z.number(),
  });

  describe('matchesSchema', () => {
    it('should return true for matching data', () => {
      expect(matchesSchema(TestSchema, { name: 'John', age: 30 })).toBe(true);
    });

    it('should return false for non-matching data', () => {
      expect(matchesSchema(TestSchema, { name: 'John' })).toBe(false);
      expect(matchesSchema(TestSchema, { name: 123, age: 30 })).toBe(false);
      expect(matchesSchema(TestSchema, null)).toBe(false);
    });
  });

  describe('parseWithFallback', () => {
    const fallback = { name: 'Default', age: 0 };

    it('should return parsed data for valid input', () => {
      const result = parseWithFallback(TestSchema, { name: 'John', age: 30 }, fallback);
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should return fallback for invalid input', () => {
      const result = parseWithFallback(TestSchema, { invalid: true }, fallback);
      expect(result).toEqual(fallback);
    });

    it('should return fallback for null input', () => {
      const result = parseWithFallback(TestSchema, null, fallback);
      expect(result).toEqual(fallback);
    });
  });
});

describe('Edge Cases', () => {
  it('should handle elements detached from DOM', () => {
    const detachedDiv = document.createElement('div');
    detachedDiv.innerHTML = '<input type="text" class="test" />';

    const result = queryInputElement(detachedDiv, '.test');
    expect(result).toBeInstanceOf(HTMLInputElement);
  });

  it('should handle deeply nested elements', () => {
    const container = document.createElement('div');
    let current = container;
    for (let i = 0; i < 50; i++) {
      const child = document.createElement('div');
      current.appendChild(child);
      current = child;
    }
    const input = document.createElement('input');
    input.id = 'deep-input';
    current.appendChild(input);

    const result = queryInputElement(container, '#deep-input');
    expect(result).toBeInstanceOf(HTMLInputElement);
  });

  it('should handle elements with special characters in selectors', () => {
    const container = document.createElement('div');
    const input = document.createElement('input');
    input.setAttribute('data-test-id', 'special:chars');
    container.appendChild(input);

    // Using attribute selector instead of ID
    const result = queryInputElement(container, '[data-test-id="special:chars"]');
    expect(result).toBeInstanceOf(HTMLInputElement);
  });

  it('should handle multiple matching elements (returns first)', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <input type="text" class="common" id="first" />
      <input type="text" class="common" id="second" />
    `;

    const result = queryInputElement(container, '.common');
    expect(result?.id).toBe('first');
  });
});
