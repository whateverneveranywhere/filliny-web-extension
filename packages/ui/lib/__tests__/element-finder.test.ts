/**
 * Unit tests for elementFinder.ts
 * Tests all 9 finding strategies and helper functions
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTextInput,
  createSelect,
  createCheckbox,
  createRadio,
  createTextarea,
  createFormWithFields,
  createContentEditable,
} from './setup.js';
import {
  FindStrategy,
  findFieldElement,
  findFormElement,
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
} from '../components/filliny-button/search-button/elementFinder.js';
import type { Field } from '@extension/shared';

// Helper to create a minimal Field object
const createField = (overrides: Partial<Field> = {}): Field =>
  ({
    id: 'field-1',
    type: 'text',
    xpath: '',
    uniqueSelectors: [],
    value: '',
    ...overrides,
  }) as Field;

// ============================================================================
// findByDataFillinyId
// ============================================================================
describe('findByDataFillinyId', () => {
  it('should find element by data-filliny-id attribute', () => {
    const input = createTextInput({ 'data-filliny-id': 'field-42' });
    const field = createField({ id: 'field-42' });
    const result = findByDataFillinyId(field, document);
    expect(result).toBe(input);
  });

  it('should return null when no matching data-filliny-id', () => {
    createTextInput({ name: 'test' });
    const field = createField({ id: 'field-nonexistent' });
    const result = findByDataFillinyId(field, document);
    expect(result).toBeNull();
  });
});

// ============================================================================
// findByUniqueSelectors
// ============================================================================
describe('findByUniqueSelectors', () => {
  it('should find element by ID selector', () => {
    const input = createTextInput({ id: 'unique-input' });
    const field = createField({ uniqueSelectors: ['#unique-input'] });
    const result = findByUniqueSelectors(field, document);
    expect(result).toBe(input);
  });

  it('should find element by class selector', () => {
    const input = createTextInput({ class: 'special-input' });
    const field = createField({ uniqueSelectors: ['.special-input'] });
    const result = findByUniqueSelectors(field, document);
    expect(result).toBe(input);
  });

  it('should skip invalid selectors gracefully', () => {
    const input = createTextInput({ id: 'valid-el' });
    const field = createField({ uniqueSelectors: ['[invalid>>>', '#valid-el'] });
    const result = findByUniqueSelectors(field, document);
    expect(result).toBe(input);
  });

  it('should return null when no uniqueSelectors', () => {
    const field = createField({ uniqueSelectors: [] });
    const result = findByUniqueSelectors(field, document);
    expect(result).toBeNull();
  });
});

// ============================================================================
// findByName
// ============================================================================
describe('findByName', () => {
  it('should find element by name attribute', () => {
    const input = createTextInput({ name: 'email' });
    const field = createField({ name: 'email' });
    const result = findByName(field, document);
    expect(result).toBe(input);
  });

  it('should return null when field has no name', () => {
    createTextInput({ id: 'no-name' });
    const field = createField({});
    const result = findByName(field, document);
    expect(result).toBeNull();
  });
});

// ============================================================================
// findById
// ============================================================================
describe('findById', () => {
  it('should find element by DOM id', () => {
    const input = createTextInput({ id: 'real-dom-id' });
    const field = createField({ id: 'real-dom-id' });
    const result = findById(field, document);
    expect(result).toBe(input);
  });

  it('should skip field-* prefix IDs (generated filliny IDs)', () => {
    createTextInput({ id: 'field-123' });
    const field = createField({ id: 'field-123' });
    const result = findById(field, document);
    expect(result).toBeNull();
  });

  it('should return null when field has no id', () => {
    const field = createField({ id: '' });
    const result = findById(field, document);
    expect(result).toBeNull();
  });
});

// ============================================================================
// findByLabel
// ============================================================================
describe('findByLabel', () => {
  it('should find element via label for association', () => {
    createFormWithFields(`
      <label for="my-input">Username</label>
      <input type="text" id="my-input">
    `);
    const field = createField({ label: 'Username' });
    const result = findByLabel(field, document);
    expect(result).not.toBeNull();
    expect((result as HTMLInputElement).id).toBe('my-input');
  });

  it('should find wrapped input inside label', () => {
    createFormWithFields(`
      <label>Email <input type="email" name="email"></label>
    `);
    const field = createField({ label: 'Email' });
    const result = findByLabel(field, document);
    expect(result).not.toBeNull();
    expect((result as HTMLInputElement).type).toBe('email');
  });

  it('should support partial label match', () => {
    createFormWithFields(`
      <label for="addr">Street Address (required)</label>
      <input type="text" id="addr">
    `);
    const field = createField({ label: 'Street Address' });
    const result = findByLabel(field, document);
    expect(result).not.toBeNull();
  });

  it('should return null when no label', () => {
    const field = createField({});
    const result = findByLabel(field, document);
    expect(result).toBeNull();
  });
});

// ============================================================================
// findByARIA
// ============================================================================
describe('findByARIA', () => {
  it('should find element by role=textbox', () => {
    const div = document.createElement('div');
    div.setAttribute('role', 'textbox');
    document.body.appendChild(div);

    const field = createField({ type: 'text' });
    const result = findByARIA(field, document);
    expect(result).toBe(div);
  });

  it('should find element by role=combobox for select type', () => {
    const div = document.createElement('div');
    div.setAttribute('role', 'combobox');
    document.body.appendChild(div);

    const field = createField({ type: 'select' });
    const result = findByARIA(field, document);
    expect(result).toBe(div);
  });

  it('should return null for unknown type', () => {
    const field = createField({ type: 'file' });
    const result = findByARIA(field, document);
    expect(result).toBeNull();
  });
});

// ============================================================================
// findByType
// ============================================================================
describe('findByType', () => {
  it('should find input by type text', () => {
    const input = createTextInput();
    const field = createField({ type: 'text' });
    const result = findByType(field, document);
    expect(result).toBe(input);
  });

  it('should find select element for select type', () => {
    const select = createSelect([{ value: 'a', text: 'A' }]);
    const field = createField({ type: 'select' });
    const result = findByType(field, document);
    expect(result).toBe(select);
  });

  it('should find textarea for textarea type', () => {
    const textarea = createTextarea();
    const field = createField({ type: 'textarea' });
    const result = findByType(field, document);
    expect(result).toBe(textarea);
  });

  it('should return null for type with no matching selector', () => {
    const field = createField({ type: 'unknown-type' as Field['type'] });
    const result = findByType(field, document);
    expect(result).toBeNull();
  });
});

// ============================================================================
// findByPlaceholder
// ============================================================================
describe('findByPlaceholder', () => {
  it('should find element by placeholder text', () => {
    const input = createTextInput({ placeholder: 'Enter your email' });
    const field = createField({ placeholder: 'Enter your email' });
    const result = findByPlaceholder(field, document);
    expect(result).toBe(input);
  });

  it('should return null when field has no placeholder', () => {
    createTextInput();
    const field = createField({});
    const result = findByPlaceholder(field, document);
    expect(result).toBeNull();
  });
});

// ============================================================================
// findByContentEditable
// ============================================================================
describe('findByContentEditable', () => {
  it('should find contenteditable element for text type', () => {
    const div = createContentEditable();
    const field = createField({ type: 'text' });
    const result = findByContentEditable(field, document);
    expect(result).toBe(div);
  });

  it('should find contenteditable for textarea type', () => {
    createContentEditable();
    const field = createField({ type: 'textarea' });
    const result = findByContentEditable(field, document);
    expect(result).not.toBeNull();
  });

  it('should return null for non-text types', () => {
    createContentEditable();
    const field = createField({ type: 'checkbox' });
    const result = findByContentEditable(field, document);
    expect(result).toBeNull();
  });
});

// ============================================================================
// findFieldElement (unified)
// ============================================================================
describe('findFieldElement', () => {
  it('should use strategies in priority order', () => {
    const input = createTextInput({ 'data-filliny-id': 'field-99', name: 'test' });
    const field = createField({ id: 'field-99', name: 'test' });
    const result = findFieldElement(field);
    expect(result.element).toBe(input);
    expect(result.strategy).toBe(FindStrategy.BY_DATA_FILLINY_ID);
  });

  it('should fall back to next strategy when first fails', () => {
    const input = createTextInput({ name: 'fallback-name' });
    const field = createField({ id: 'field-no-match', name: 'fallback-name' });
    const result = findFieldElement(field);
    expect(result.element).toBe(input);
    // Strategy could be BY_NAME or BY_TYPE depending on CSS.escape support
    expect(result.strategy).not.toBeNull();
  });

  it('should skip hidden elements when skipHidden is true', () => {
    const input = createTextInput({ name: 'hidden-input' });
    input.style.display = 'none';
    const field = createField({ name: 'hidden-input' });
    const result = findFieldElement(field, { skipHidden: true });
    expect(result.element).toBeNull();
  });

  it('should skip disabled elements when skipDisabled is true', () => {
    const input = createTextInput({ name: 'disabled-input', disabled: 'true' });
    const field = createField({ name: 'disabled-input' });
    const result = findFieldElement(field, { skipDisabled: true });
    expect(result.element).toBeNull();
  });

  it('should return null when no strategy finds the element', () => {
    const field = createField({ id: 'field-ghost' });
    const result = findFieldElement(field);
    expect(result.element).toBeNull();
    expect(result.strategy).toBeNull();
  });

  it('should prefer provided element reference if connected', () => {
    const input = createTextInput({ name: 'ref-input' });
    const field = createField({ id: 'field-ref' });
    const result = findFieldElement(field, {}, input);
    expect(result.element).toBe(input);
    expect(result.strategy).toBeNull(); // strategy is null when using provided element
  });
});

// ============================================================================
// findFormElement
// ============================================================================
describe('findFormElement', () => {
  it('should find form by data-form-id', () => {
    const form = document.createElement('form');
    form.setAttribute('data-form-id', 'my-form');
    document.body.appendChild(form);

    const result = findFormElement('my-form');
    expect(result).toBe(form);
  });

  it('should find unified-form fallback', () => {
    const div = document.createElement('div');
    div.setAttribute('data-filliny-unified-form', 'true');
    document.body.appendChild(div);

    const result = findFormElement('some-id');
    expect(result).toBe(div);
  });

  it('should return null when form not found', () => {
    const result = findFormElement('nonexistent-form');
    expect(result).toBeNull();
  });
});

// ============================================================================
// isElementVisible
// ============================================================================
describe('isElementVisible', () => {
  it('should return false for display:none', () => {
    const input = createTextInput();
    input.style.display = 'none';
    expect(isElementVisible(input)).toBe(false);
  });

  it('should return false for visibility:hidden', () => {
    const input = createTextInput();
    input.style.visibility = 'hidden';
    expect(isElementVisible(input)).toBe(false);
  });

  it('should return true for visible element', () => {
    const input = createTextInput();
    expect(isElementVisible(input)).toBe(true);
  });
});

// ============================================================================
// isElementEnabled
// ============================================================================
describe('isElementEnabled', () => {
  it('should return false for disabled element', () => {
    const input = createTextInput({ disabled: '' });
    expect(isElementEnabled(input)).toBe(false);
  });

  it('should return false for readonly element', () => {
    const input = createTextInput({ readonly: '' });
    expect(isElementEnabled(input)).toBe(false);
  });

  it('should return false for aria-disabled=true', () => {
    const input = createTextInput({ 'aria-disabled': 'true' });
    expect(isElementEnabled(input)).toBe(false);
  });

  it('should return true for enabled element', () => {
    const input = createTextInput();
    expect(isElementEnabled(input)).toBe(true);
  });
});

// ============================================================================
// countFormFields
// ============================================================================
describe('countFormFields', () => {
  it('should count form fields in a container', () => {
    const form = createFormWithFields(`
      <input type="text" name="name">
      <input type="email" name="email">
      <select name="country"><option>US</option></select>
      <textarea name="bio"></textarea>
      <input type="hidden" name="token">
    `);
    // hidden input should not be counted
    expect(countFormFields(form)).toBe(4);
  });

  it('should count ARIA role-based elements', () => {
    const form = createFormWithFields(`
      <div role="textbox"></div>
      <div role="combobox"></div>
      <div role="checkbox"></div>
    `);
    expect(countFormFields(form)).toBe(3);
  });

  it('should return 0 for empty container', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    expect(countFormFields(div)).toBe(0);
  });
});
