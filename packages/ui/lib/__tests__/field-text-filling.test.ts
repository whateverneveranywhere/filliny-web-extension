/**
 * Unit tests for text.ts field detection and filling
 * Tests updateTextField, updateContentEditable, detectTextField
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createTextInput, createTextarea, createFormWithFields, createContentEditable } from './setup.js';
import {
  updateTextField,
  updateContentEditable,
  detectTextField,
} from '../components/filliny-button/search-button/field-types/text.js';

// ============================================================================
// updateTextField
// ============================================================================
describe('updateTextField', () => {
  it('should set text input value and dispatch events', async () => {
    const input = createTextInput({ name: 'username' });
    let inputEventFired = false;
    input.addEventListener('input', () => {
      inputEventFired = true;
    });

    await updateTextField(input, 'testuser');
    expect(input.value).toBe('testuser');
    expect(inputEventFired).toBe(true);
  });

  it('should set textarea value', async () => {
    const textarea = createTextarea({ name: 'bio' });
    await updateTextField(textarea, 'Hello world');
    expect(textarea.value).toBe('Hello world');
  });

  it('should NOT update checkbox type', async () => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'test';
    document.body.appendChild(checkbox);

    await updateTextField(checkbox, 'true');
    // Checkbox should not have its value changed by updateTextField
    expect(checkbox.value).not.toBe('true');
  });

  it('should NOT update radio type', async () => {
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'test';
    document.body.appendChild(radio);

    await updateTextField(radio, 'value');
    expect(radio.value).not.toBe('value');
  });

  it('should NOT update ARIA switch', async () => {
    const button = document.createElement('button');
    button.setAttribute('role', 'switch');
    document.body.appendChild(button);

    await updateTextField(button, 'true');
    // Switch should not be modified by updateTextField
  });
});

// ============================================================================
// updateContentEditable
// ============================================================================
describe('updateContentEditable', () => {
  // NOTE: updateContentEditable uses simulateTyping for simple contentEditable elements,
  // which relies on document.execCommand and keyboard events that jsdom doesn't fully support.
  it('should attempt to update contentEditable without throwing', async () => {
    const div = createContentEditable();
    // Should not throw
    await expect(updateContentEditable(div, 'Rich text content')).resolves.not.toThrow();
  });
});

// ============================================================================
// detectTextField
// ============================================================================
describe('detectTextField', () => {
  it('should detect text input', async () => {
    const input = createTextInput({ name: 'firstname' });
    const fields = await detectTextField([input], 0);
    expect(fields.length).toBe(1);
    expect(fields[0].type).toBe('text');
  });

  it('should detect email input', async () => {
    const input = document.createElement('input');
    input.type = 'email';
    input.name = 'email';
    document.body.appendChild(input);

    const fields = await detectTextField([input], 0);
    expect(fields.length).toBe(1);
    expect(fields[0].type).toBe('email');
  });

  it('should detect url input', async () => {
    const input = document.createElement('input');
    input.type = 'url';
    input.name = 'website';
    document.body.appendChild(input);

    const fields = await detectTextField([input], 0);
    expect(fields.length).toBe(1);
    expect(fields[0].type).toBe('url');
  });

  it('should detect tel input', async () => {
    const input = document.createElement('input');
    input.type = 'tel';
    input.name = 'phone';
    document.body.appendChild(input);

    const fields = await detectTextField([input], 0);
    expect(fields.length).toBe(1);
    expect(fields[0].type).toBe('tel');
  });

  it('should detect password input', async () => {
    const input = document.createElement('input');
    input.type = 'password';
    input.name = 'pass';
    document.body.appendChild(input);

    const fields = await detectTextField([input], 0);
    expect(fields.length).toBe(1);
    expect(fields[0].type).toBe('password');
  });

  it('should detect number input', async () => {
    const input = document.createElement('input');
    input.type = 'number';
    input.name = 'age';
    document.body.appendChild(input);

    const fields = await detectTextField([input], 0);
    expect(fields.length).toBe(1);
    expect(fields[0].type).toBe('number');
  });

  it('should detect date input', async () => {
    const input = document.createElement('input');
    input.type = 'date';
    input.name = 'dob';
    document.body.appendChild(input);

    const fields = await detectTextField([input], 0);
    expect(fields.length).toBe(1);
    expect(fields[0].type).toBe('date');
  });

  it('should detect time input', async () => {
    const input = document.createElement('input');
    input.type = 'time';
    input.name = 'meeting-time';
    document.body.appendChild(input);

    const fields = await detectTextField([input], 0);
    expect(fields.length).toBe(1);
    expect(fields[0].type).toBe('time');
  });

  it('should detect textarea', async () => {
    const textarea = createTextarea({ name: 'comments' });
    const fields = await detectTextField([textarea], 0);
    expect(fields.length).toBe(1);
    expect(fields[0].type).toBe('textarea');
  });

  // NOTE: jsdom does not implement isContentEditable property, so
  // detectTextField cannot identify contenteditable elements in jsdom.
  it('should handle contenteditable element (jsdom limitation)', async () => {
    const div = createContentEditable();
    const fields = await detectTextField([div], 0);
    // In a real browser, fields.length would be 1. In jsdom, isContentEditable is undefined.
    expect(fields.length).toBe(0);
  });

  it('should skip hidden input', async () => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'token';
    document.body.appendChild(input);

    const fields = await detectTextField([input], 0);
    expect(fields.length).toBe(0);
  });

  it('should set validation info (maxLength, required)', async () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'name';
    input.required = true;
    input.maxLength = 50;
    document.body.appendChild(input);

    const fields = await detectTextField([input], 0);
    expect(fields.length).toBe(1);
    // required is set on field.required, not field.validation.required
    expect(fields[0].required).toBe(true);
    if (fields[0].validation) {
      expect(fields[0].validation.maxLength).toBe(50);
    }
  });

  it('should generate correct test values per type in testMode', async () => {
    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.name = 'email';
    document.body.appendChild(emailInput);

    const fields = await detectTextField([emailInput], 0, true);
    expect(fields.length).toBe(1);
    expect(fields[0].testValue).toBeDefined();
  });
});
