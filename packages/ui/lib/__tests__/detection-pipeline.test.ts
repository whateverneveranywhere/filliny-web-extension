/**
 * Unit tests for the detection pipeline
 * Tests detectFields and getFormFieldsRobust from field-types/index.ts
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createFormWithFields,
  createTextInput,
  createSelect,
  createCheckbox,
  createRadio,
  createTextarea,
  createContentEditable,
  createDisabledFieldset,
} from './setup.js';
import { detectFields, getFormFieldsRobust } from '../components/filliny-button/search-button/field-types/index.js';

// ============================================================================
// detectFields - Input type detection
// ============================================================================
describe('detectFields', () => {
  describe('text input types', () => {
    it('should detect text input', async () => {
      const form = createFormWithFields('<input type="text" name="username">');
      const fields = await detectFields(form);
      expect(fields.length).toBeGreaterThanOrEqual(1);
      expect(fields.some(f => f.type === 'text')).toBe(true);
    });

    it('should detect email input', async () => {
      const form = createFormWithFields('<input type="email" name="email">');
      const fields = await detectFields(form);
      expect(fields.some(f => f.type === 'email')).toBe(true);
    });

    it('should detect tel input', async () => {
      const form = createFormWithFields('<input type="tel" name="phone">');
      const fields = await detectFields(form);
      expect(fields.some(f => f.type === 'tel')).toBe(true);
    });

    it('should detect url input', async () => {
      const form = createFormWithFields('<input type="url" name="website">');
      const fields = await detectFields(form);
      expect(fields.some(f => f.type === 'url')).toBe(true);
    });

    it('should detect password input', async () => {
      const form = createFormWithFields('<input type="password" name="pass">');
      const fields = await detectFields(form);
      expect(fields.some(f => f.type === 'password')).toBe(true);
    });

    it('should detect number input', async () => {
      const form = createFormWithFields('<input type="number" name="age">');
      const fields = await detectFields(form);
      expect(fields.some(f => f.type === 'number')).toBe(true);
    });

    it('should detect date input', async () => {
      const form = createFormWithFields('<input type="date" name="dob">');
      const fields = await detectFields(form);
      expect(fields.some(f => f.type === 'date')).toBe(true);
    });

    it('should detect time input', async () => {
      const form = createFormWithFields('<input type="time" name="time">');
      const fields = await detectFields(form);
      expect(fields.some(f => f.type === 'time')).toBe(true);
    });
  });

  describe('select element', () => {
    it('should detect select with options', async () => {
      const form = createFormWithFields(`
        <select name="country">
          <option value="">Choose</option>
          <option value="us">US</option>
          <option value="uk">UK</option>
        </select>
      `);
      const fields = await detectFields(form);
      expect(fields.some(f => f.type === 'select')).toBe(true);
    });
  });

  describe('checkable elements', () => {
    it('should detect checkboxes', async () => {
      const form = createFormWithFields('<input type="checkbox" name="agree" value="yes">');
      const fields = await detectFields(form);
      expect(fields.some(f => f.type === 'checkbox')).toBe(true);
    });

    it('should detect radio buttons', async () => {
      const form = createFormWithFields(`
        <input type="radio" name="gender" value="m">
        <input type="radio" name="gender" value="f">
      `);
      const fields = await detectFields(form);
      expect(fields.some(f => f.type === 'radio')).toBe(true);
    });
  });

  describe('textarea', () => {
    it('should detect textarea', async () => {
      const form = createFormWithFields('<textarea name="bio"></textarea>');
      const fields = await detectFields(form);
      expect(fields.some(f => f.type === 'textarea')).toBe(true);
    });
  });

  describe('skip rules', () => {
    it('should skip hidden inputs', async () => {
      const form = createFormWithFields('<input type="hidden" name="token" value="abc">');
      const fields = await detectFields(form);
      expect(fields.some(f => f.name === 'token')).toBe(false);
    });

    it('should skip submit buttons', async () => {
      const form = createFormWithFields('<input type="submit" value="Submit">');
      const fields = await detectFields(form);
      expect(fields.some(f => f.type === ('submit' as string))).toBe(false);
    });

    it('should skip button inputs', async () => {
      const form = createFormWithFields('<input type="button" value="Click">');
      const fields = await detectFields(form);
      expect(fields.some(f => f.type === ('button' as string))).toBe(false);
    });
  });

  describe('test mode', () => {
    it('should generate test values in testMode', async () => {
      const form = createFormWithFields(`
        <input type="text" name="username">
        <input type="email" name="email">
      `);
      const fields = await detectFields(form, true);
      expect(fields.length).toBeGreaterThanOrEqual(1);
      // At least one field should have a testValue
      expect(fields.some(f => f.testValue !== undefined && f.testValue !== '')).toBe(true);
    });
  });

  describe('empty container', () => {
    it('should return empty array for empty container', async () => {
      const div = document.createElement('div');
      document.body.appendChild(div);
      const fields = await detectFields(div);
      expect(fields).toEqual([]);
    });
  });

  describe('mixed form', () => {
    it('should detect multiple field types in a form', async () => {
      const form = createFormWithFields(`
        <input type="text" name="name">
        <input type="email" name="email">
        <select name="country"><option value="us">US</option></select>
        <textarea name="bio"></textarea>
        <input type="checkbox" name="terms" value="y">
      `);
      const fields = await detectFields(form);
      expect(fields.length).toBeGreaterThanOrEqual(4);

      const types = fields.map(f => f.type);
      expect(types).toContain('text');
      expect(types).toContain('email');
    });
  });
});

// ============================================================================
// getFormFieldsRobust
// ============================================================================
describe('getFormFieldsRobust', () => {
  it('should find standard HTML form elements', () => {
    const form = createFormWithFields(`
      <input type="text" name="name">
      <select name="sel"><option>A</option></select>
      <textarea name="ta"></textarea>
    `);
    const elements = getFormFieldsRobust(form);
    expect(elements.length).toBeGreaterThanOrEqual(3);
  });

  it('should find ARIA role-based elements', () => {
    const form = createFormWithFields(`
      <div role="textbox" tabindex="0">Editable</div>
      <div role="combobox" tabindex="0">Select</div>
    `);
    const elements = getFormFieldsRobust(form);
    expect(elements.length).toBeGreaterThanOrEqual(2);
  });

  it('should return empty array for invalid container', () => {
    // @ts-expect-error Testing invalid input
    const elements = getFormFieldsRobust(null);
    expect(elements).toEqual([]);
  });

  it('should handle container with no form fields', () => {
    const div = document.createElement('div');
    div.innerHTML = '<p>Just text</p><span>More text</span>';
    document.body.appendChild(div);
    const elements = getFormFieldsRobust(div);
    expect(elements.length).toBe(0);
  });
});

// ============================================================================
// Filtering tests
// ============================================================================
describe('Filtering', () => {
  it('should keep ARIA checkbox elements', async () => {
    const form = createFormWithFields(`
      <div role="checkbox" aria-checked="false" tabindex="0">Accept</div>
    `);
    const elements = getFormFieldsRobust(form);
    const hasAriaCheckbox = elements.some(el => el.getAttribute('role') === 'checkbox');
    expect(hasAriaCheckbox).toBe(true);
  });

  it('should keep ARIA radio elements', async () => {
    const form = createFormWithFields(`
      <div role="radiogroup">
        <div role="radio" aria-checked="false" tabindex="0">Option A</div>
        <div role="radio" aria-checked="false" tabindex="0">Option B</div>
      </div>
    `);
    const elements = getFormFieldsRobust(form);
    const ariaRadios = elements.filter(el => el.getAttribute('role') === 'radio');
    expect(ariaRadios.length).toBeGreaterThanOrEqual(2);
  });

  it('should keep ARIA switch elements', async () => {
    const form = createFormWithFields(`
      <button role="switch" aria-checked="false" tabindex="0">Notifications</button>
    `);
    const elements = getFormFieldsRobust(form);
    const hasSwitch = elements.some(el => el.getAttribute('role') === 'switch');
    expect(hasSwitch).toBe(true);
  });
});
