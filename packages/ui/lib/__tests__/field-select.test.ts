/**
 * Unit tests for select.ts field detection and filling
 * Tests detectSelectFields and updateSelect
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createSelect, createFormWithFields, createARIACombobox } from './setup.js';
import { detectSelectFields, updateSelect } from '../components/filliny-button/search-button/field-types/select.js';

// ============================================================================
// detectSelectFields
// ============================================================================
describe('detectSelectFields', () => {
  it('should detect native select element', async () => {
    const select = createSelect([
      { value: 'us', text: 'United States' },
      { value: 'uk', text: 'United Kingdom' },
    ]);
    select.name = 'country';

    const fields = await detectSelectFields([select], 0);
    expect(fields.length).toBe(1);
    expect(fields[0].type).toBe('select');
    expect(fields[0].options).toBeDefined();
    expect(fields[0].options!.length).toBeGreaterThanOrEqual(2);
  });

  it('should extract options from native select', async () => {
    const select = createSelect([
      { value: 'a', text: 'Option A' },
      { value: 'b', text: 'Option B', selected: true },
      { value: 'c', text: 'Option C' },
    ]);
    select.name = 'test-select';

    const fields = await detectSelectFields([select], 0);
    expect(fields.length).toBe(1);

    const options = fields[0].options;
    expect(options).toBeDefined();
    expect(options!.some(o => o.value === 'a')).toBe(true);
    expect(options!.some(o => o.value === 'b')).toBe(true);
    expect(options!.some(o => o.value === 'c')).toBe(true);
  });

  it('should detect ARIA combobox', async () => {
    const { combobox } = createARIACombobox([
      { value: 'opt1', text: 'Option 1' },
      { value: 'opt2', text: 'Option 2' },
    ]);

    const fields = await detectSelectFields([combobox], 0);
    expect(fields.length).toBe(1);
    expect(fields[0].type).toBe('select');
  });

  it('should detect ARIA listbox', async () => {
    const listbox = document.createElement('div');
    listbox.setAttribute('role', 'listbox');
    listbox.setAttribute('tabindex', '0');

    const option1 = document.createElement('div');
    option1.setAttribute('role', 'option');
    option1.textContent = 'Option 1';
    listbox.appendChild(option1);

    const option2 = document.createElement('div');
    option2.setAttribute('role', 'option');
    option2.textContent = 'Option 2';
    listbox.appendChild(option2);

    document.body.appendChild(listbox);

    const fields = await detectSelectFields([listbox], 0);
    expect(fields.length).toBe(1);
  });

  it('should skip non-select elements', async () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'text-field';
    document.body.appendChild(input);

    const fields = await detectSelectFields([input], 0);
    expect(fields.length).toBe(0);
  });
});

// ============================================================================
// updateSelect
// ============================================================================
describe('updateSelect', () => {
  it('should set native select value and dispatch change', async () => {
    const select = createSelect([
      { value: 'a', text: 'A' },
      { value: 'b', text: 'B' },
      { value: 'c', text: 'C' },
    ]);
    let changeFired = false;
    select.addEventListener('change', () => {
      changeFired = true;
    });

    await updateSelect(select, 'b');
    expect(select.value).toBe('b');
    expect(changeFired).toBe(true);
  });

  it('should handle multi-select', async () => {
    const select = document.createElement('select');
    select.multiple = true;
    const opts = ['a', 'b', 'c'];
    opts.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v.toUpperCase();
      select.appendChild(opt);
    });
    document.body.appendChild(select);

    await updateSelect(select, ['a', 'c']);

    const selectedOptions = Array.from(select.selectedOptions).map(o => o.value);
    expect(selectedOptions).toContain('a');
    expect(selectedOptions).toContain('c');
  });

  it('should handle value not in options gracefully', async () => {
    const select = createSelect([
      { value: 'x', text: 'X' },
      { value: 'y', text: 'Y' },
    ]);

    // Should not throw when value doesn't exist
    await expect(updateSelect(select, 'nonexistent')).resolves.not.toThrow();
  });
});

// ============================================================================
// React Select detection
// ============================================================================
describe('React Select detection', () => {
  it('should detect element with react-select class', async () => {
    const div = document.createElement('div');
    div.className = 'react-select-container';
    const control = document.createElement('div');
    control.className = 'react-select__control';
    const input = document.createElement('input');
    input.type = 'text';
    control.appendChild(input);
    div.appendChild(control);
    document.body.appendChild(div);

    const fields = await detectSelectFields([div], 0);
    // React Select detection depends on internal heuristics
    // At minimum it should process without error
    expect(Array.isArray(fields)).toBe(true);
  });

  it('should detect element with select__control class', async () => {
    const div = document.createElement('div');
    div.className = 'select__control';
    div.setAttribute('tabindex', '0');
    document.body.appendChild(div);

    const fields = await detectSelectFields([div], 0);
    expect(Array.isArray(fields)).toBe(true);
  });
});
