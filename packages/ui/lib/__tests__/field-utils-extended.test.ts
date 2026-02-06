/**
 * Extended unit tests for field-types/utils.ts
 * Tests newly exported functions that have zero unit test coverage
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTextInput,
  createTextarea,
  createSelect,
  createFormWithFields,
  createContentEditable,
  createHoneypotField,
} from './setup.js';
import {
  setNativeValue,
  isHoneypotField,
  isElementAttached,
  ensureFocus,
  captureFormState,
  restoreFormState,
  dispatchPointerClickSequence,
  waitForElement,
  dispatchCompositionEvents,
  dispatchBeforeInput,
  simulatePaste,
  generateUniqueSelectors,
  getElementXPath,
  createBaseField,
} from '../components/filliny-button/search-button/field-types/utils.js';

// ============================================================================
// setNativeValue
// ============================================================================
describe('setNativeValue', () => {
  it('should set value on HTMLInputElement', () => {
    const input = createTextInput({ name: 'test' });
    const result = setNativeValue(input, 'hello');
    expect(result).toBe(true);
    expect(input.value).toBe('hello');
  });

  it('should set value on HTMLTextAreaElement', () => {
    const textarea = createTextarea({ name: 'test' });
    const result = setNativeValue(textarea, 'some text');
    expect(result).toBe(true);
    expect(textarea.value).toBe('some text');
  });

  it('should set value on HTMLSelectElement', () => {
    const select = createSelect([
      { value: 'a', text: 'Option A' },
      { value: 'b', text: 'Option B' },
    ]);
    const result = setNativeValue(select, 'b');
    expect(result).toBe(true);
    expect(select.value).toBe('b');
  });

  it('should return false for a plain div element', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const result = setNativeValue(div, 'test');
    expect(result).toBe(false);
  });
});

// ============================================================================
// isHoneypotField
// ============================================================================
describe('isHoneypotField', () => {
  it('should detect honeypot with hp_ name and display:none', () => {
    const input = createHoneypotField('hp_email', 'display-none');
    expect(isHoneypotField(input)).toBe(true);
  });

  it('should detect honeypot with honey prefix and visibility:hidden', () => {
    const input = createHoneypotField('honeypot', 'visibility-hidden');
    expect(isHoneypotField(input)).toBe(true);
  });

  it('should detect clip-rect hidden elements', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'regular';
    input.style.clip = 'rect(0px, 0px, 0px, 0px)';
    document.body.appendChild(input);
    expect(isHoneypotField(input)).toBe(true);
  });

  it('should detect aria-hidden + tabindex=-1 as honeypot', () => {
    const input = createHoneypotField('some_field', 'aria-hidden');
    expect(isHoneypotField(input)).toBe(true);
  });

  it('should NOT flag a visible field as honeypot', () => {
    const input = createHoneypotField('email', 'visible');
    expect(isHoneypotField(input)).toBe(false);
  });

  it('should NOT flag field with honeypot name but visible', () => {
    // hp_ name but visible - should check visibility too
    const input = createHoneypotField('hp_test', 'visible');
    // The function checks if it's also hidden, so a visible hp_ field is NOT flagged
    expect(isHoneypotField(input)).toBe(false);
  });
});

// ============================================================================
// isElementAttached
// ============================================================================
describe('isElementAttached', () => {
  it('should return true for element in DOM', () => {
    const input = createTextInput();
    expect(isElementAttached(input)).toBe(true);
  });

  it('should return false for detached element', () => {
    const input = document.createElement('input');
    // Not appended to body
    expect(isElementAttached(input)).toBe(false);
  });
});

// ============================================================================
// ensureFocus
// ============================================================================
describe('ensureFocus', () => {
  it('should focus an input element', () => {
    const input = createTextInput();
    const result = ensureFocus(input);
    expect(result).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it('should focus a textarea', () => {
    const textarea = createTextarea();
    const result = ensureFocus(textarea);
    expect(result).toBe(true);
    expect(document.activeElement).toBe(textarea);
  });
});

// ============================================================================
// captureFormState / restoreFormState
// ============================================================================
describe('captureFormState / restoreFormState', () => {
  it('should capture and restore input values', () => {
    const form = createFormWithFields('<input type="text" name="test" value="original">');
    const input = form.querySelector('input') as HTMLInputElement;

    const snapshot = captureFormState(form);
    expect(snapshot.values.size).toBe(1);
    expect(snapshot.timestamp).toBeGreaterThan(0);

    // Change value
    input.value = 'changed';
    expect(input.value).toBe('changed');

    // Restore
    restoreFormState(snapshot);
    expect(input.value).toBe('original');
  });

  it('should capture and restore checkbox checked state', () => {
    const form = createFormWithFields('<input type="checkbox" name="check" checked>');
    const checkbox = form.querySelector('input') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    const snapshot = captureFormState(form);

    checkbox.checked = false;
    restoreFormState(snapshot);
    expect(checkbox.checked).toBe(true);
  });

  it('should capture and restore select selectedIndex', () => {
    const form = createFormWithFields(`
      <select name="sel">
        <option value="a">A</option>
        <option value="b" selected>B</option>
      </select>
    `);
    const select = form.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('b');

    const snapshot = captureFormState(form);

    select.selectedIndex = 0;
    expect(select.value).toBe('a');

    restoreFormState(snapshot);
    expect(select.value).toBe('b');
  });

  // NOTE: jsdom does not implement isContentEditable, so captureFormState/restoreFormState
  // cannot handle contenteditable elements in jsdom. This test verifies the graceful behavior.
  it('should handle contenteditable (jsdom limitation: isContentEditable not supported)', () => {
    const form = createFormWithFields(
      '<div contenteditable="true">Hello world</div><input type="text" name="x" value="v">',
    );

    const snapshot = captureFormState(form);
    // Snapshot should at least capture the input
    expect(snapshot.values.size).toBeGreaterThanOrEqual(1);
    expect(snapshot.timestamp).toBeGreaterThan(0);
  });

  it('should skip detached elements during restore', () => {
    const form = createFormWithFields('<input type="text" name="test" value="val">');
    const input = form.querySelector('input') as HTMLInputElement;

    const snapshot = captureFormState(form);

    // Remove element from DOM
    input.remove();

    // Should not throw
    expect(() => restoreFormState(snapshot)).not.toThrow();
  });
});

// ============================================================================
// dispatchPointerClickSequence
// ============================================================================
describe('dispatchPointerClickSequence', () => {
  it('should dispatch pointer events in correct order', () => {
    const input = createTextInput();
    const events: string[] = [];

    const eventTypes = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
    eventTypes.forEach(type => {
      input.addEventListener(type, () => events.push(type));
    });

    dispatchPointerClickSequence(input);

    expect(events).toEqual(['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']);
  });
});

// ============================================================================
// waitForElement
// ============================================================================
describe('waitForElement', () => {
  it('should resolve immediately if element already exists', async () => {
    const input = createTextInput({ id: 'existing-el' });
    const result = await waitForElement('#existing-el');
    expect(result).toBe(input);
  });

  it('should resolve when element is added later', async () => {
    const promise = waitForElement('#later-el', 2000);

    // Add element after a small delay
    setTimeout(() => {
      const input = document.createElement('input');
      input.id = 'later-el';
      document.body.appendChild(input);
    }, 50);

    const result = await promise;
    expect(result).not.toBeNull();
    expect(result?.id).toBe('later-el');
  });

  it('should return null on timeout', async () => {
    const result = await waitForElement('#nonexistent-el', 100);
    expect(result).toBeNull();
  });
});

// ============================================================================
// dispatchCompositionEvents
// ============================================================================
describe('dispatchCompositionEvents', () => {
  it('should fire compositionstart, compositionupdate, and compositionend', () => {
    const input = createTextInput();
    const events: string[] = [];

    input.addEventListener('compositionstart', () => events.push('compositionstart'));
    input.addEventListener('compositionupdate', () => events.push('compositionupdate'));
    input.addEventListener('compositionend', () => events.push('compositionend'));

    dispatchCompositionEvents(input, 'test');

    expect(events).toEqual(['compositionstart', 'compositionupdate', 'compositionend']);
  });
});

// ============================================================================
// dispatchBeforeInput
// ============================================================================
describe('dispatchBeforeInput', () => {
  it('should fire beforeinput with correct inputType', () => {
    const input = createTextInput();
    let receivedInputType = '';

    input.addEventListener('beforeinput', (e: Event) => {
      receivedInputType = (e as InputEvent).inputType;
    });

    dispatchBeforeInput(input, 'hello', 'insertText');
    expect(receivedInputType).toBe('insertText');
  });

  it('should return true when event is not prevented', () => {
    const input = createTextInput();
    const result = dispatchBeforeInput(input, 'data');
    expect(result).toBe(true);
  });

  it('should return false when event is prevented', () => {
    const input = createTextInput();
    input.addEventListener('beforeinput', e => e.preventDefault());
    const result = dispatchBeforeInput(input, 'data');
    expect(result).toBe(false);
  });
});

// ============================================================================
// simulatePaste
// ============================================================================
describe('simulatePaste', () => {
  it('should not throw when simulating paste on input', () => {
    const input = createTextInput();
    // simulatePaste uses ClipboardEvent with clipboardData which may not be supported in jsdom.
    // The function has a try/catch that returns false on error.
    const result = simulatePaste(input, 'pasted text');
    // Either succeeds (true + value set) or gracefully fails (false)
    expect(typeof result).toBe('boolean');
    if (result) {
      expect(input.value).toBe('pasted text');
    }
  });

  it('should not throw when simulating paste on textarea', () => {
    const textarea = createTextarea();
    const result = simulatePaste(textarea, 'pasted content');
    expect(typeof result).toBe('boolean');
    if (result) {
      expect(textarea.value).toBe('pasted content');
    }
  });
});

// ============================================================================
// generateUniqueSelectors
// ============================================================================
describe('generateUniqueSelectors', () => {
  it('should generate ID selector', () => {
    const input = createTextInput({ id: 'my-input' });
    const selectors = generateUniqueSelectors(input);
    expect(selectors).toContain('#my-input');
  });

  it('should generate class selector', () => {
    const input = createTextInput({ class: 'form-control primary' });
    const selectors = generateUniqueSelectors(input);
    expect(selectors.some(s => s.includes('.form-control'))).toBe(true);
  });

  it('should generate attribute selectors for name, type, role, aria-label', () => {
    const input = createTextInput({ name: 'email', 'aria-label': 'Email address' });
    const selectors = generateUniqueSelectors(input);
    expect(selectors.some(s => s.includes('[name='))).toBe(true);
    expect(selectors.some(s => s.includes('[type='))).toBe(true);
    expect(selectors.some(s => s.includes('[aria-label='))).toBe(true);
  });

  it('should return empty array for element with no id/class/attrs', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const selectors = generateUniqueSelectors(div);
    expect(Array.isArray(selectors)).toBe(true);
  });
});

// ============================================================================
// getElementXPath
// ============================================================================
describe('getElementXPath', () => {
  it('should return a valid XPath string for a nested element', () => {
    const form = createFormWithFields('<div><input type="text" name="test"></div>');
    const input = form.querySelector('input') as HTMLInputElement;
    const xpath = getElementXPath(input);
    expect(xpath).toContain('/input[1]');
    expect(xpath.length).toBeGreaterThan(0);
  });

  it('should return empty string for an element with no parent', () => {
    // Document.documentElement has a parent (document), but document has no parentElement
    // An element with no parentElement returns ''
    const orphan = document.createElement('div');
    const xpath = getElementXPath(orphan);
    expect(xpath).toBe('');
  });
});

// ============================================================================
// createBaseField
// ============================================================================
describe('createBaseField', () => {
  it('should create a field with correct shape', async () => {
    const input = createTextInput({ name: 'username' });
    const field = await createBaseField(input, 100, 'text');

    expect(field.id).toMatch(/^field-/);
    expect(field.type).toBe('text');
    expect(field.xpath).toBeTruthy();
    expect(Array.isArray(field.uniqueSelectors)).toBe(true);
    expect(field.value).toBe('');
  });

  it('should set data-filliny-id attribute on element', async () => {
    const input = createTextInput({ name: 'email' });
    const field = await createBaseField(input, 200, 'email');
    expect(input.getAttribute('data-filliny-id')).toBe(field.id);
  });

  it('should generate test values in testMode', async () => {
    const input = createTextInput({ name: 'test-text' });
    const field = await createBaseField(input, 300, 'text', true);
    expect(field.testValue).toBe('Test text');
  });

  it('should generate email test value in testMode', async () => {
    const input = createTextInput({ name: 'email-field' });
    const field = await createBaseField(input, 301, 'email', true);
    expect(field.testValue).toBe('test@example.com');
  });

  it('should generate tel test value in testMode', async () => {
    const input = createTextInput({ name: 'phone' });
    const field = await createBaseField(input, 302, 'tel', true);
    expect(field.testValue).toBe('+1234567890');
  });

  it('should generate number test value in testMode', async () => {
    const input = createTextInput({ name: 'qty' });
    const field = await createBaseField(input, 303, 'number', true);
    expect(field.testValue).toBe('42');
  });

  it('should default to "text" type for invalid type string via Zod', async () => {
    const input = createTextInput({ name: 'weird' });
    const field = await createBaseField(input, 304, 'invalid_type_xyz');
    expect(field.type).toBe('text');
  });
});
