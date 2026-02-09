/**
 * Test setup for Vitest in UI package
 * Provides DOM mocking and Chrome API mocking for unit tests
 */
// Chrome mock must be imported first
import { mockChrome } from './chrome-mock.js';
import { vi, beforeEach, afterEach } from 'vitest';

// Re-export the mockChrome for test access
export { mockChrome };

// Polyfill CSS.escape for jsdom (not available natively)
if (typeof globalThis.CSS === 'undefined') {
  Object.defineProperty(globalThis, 'CSS', {
    value: { escape: (s: string) => s.replace(/([^\w-])/g, '\\$1') },
    writable: true,
    configurable: true,
  });
} else if (typeof globalThis.CSS.escape !== 'function') {
  globalThis.CSS.escape = (s: string) => s.replace(/([^\w-])/g, '\\$1');
}

// Polyfill PointerEvent for jsdom (not natively available)
if (typeof globalThis.PointerEvent === 'undefined') {
  // @ts-expect-error - PointerEvent polyfill for jsdom
  globalThis.PointerEvent = class PointerEvent extends MouseEvent {
    readonly pointerId: number;
    readonly width: number;
    readonly height: number;
    readonly pressure: number;
    readonly tiltX: number;
    readonly tiltY: number;
    readonly pointerType: string;
    readonly isPrimary: boolean;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
      this.width = params.width ?? 1;
      this.height = params.height ?? 1;
      this.pressure = params.pressure ?? 0;
      this.tiltX = params.tiltX ?? 0;
      this.tiltY = params.tiltY ?? 0;
      this.pointerType = params.pointerType ?? '';
      this.isPrimary = params.isPrimary ?? false;
    }
  };
}

// Mock getBoundingClientRect for jsdom (returns zero dimensions by default)
// This is needed because detection pipeline filters out zero-dimension elements
const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
Element.prototype.getBoundingClientRect = function () {
  const style = (this as HTMLElement).style;
  // Return zero rect for explicitly hidden elements
  if (style && (style.display === 'none' || style.visibility === 'hidden')) {
    return { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0, toJSON: () => ({}) } as DOMRect;
  }
  // Return reasonable default dimensions for visible elements
  return {
    x: 0,
    y: 0,
    width: 100,
    height: 30,
    top: 0,
    right: 100,
    bottom: 30,
    left: 0,
    toJSON: () => ({}),
  } as DOMRect;
};

// Mock React components that use browser-specific APIs
vi.mock('react-draggable', () => ({
  default: vi.fn(({ children }) => children),
  DraggableCore: vi.fn(({ children }) => children),
}));

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

// Cleanup after each test
afterEach(() => {
  vi.restoreAllMocks();
});

// Helper to create a form element with fields
export const createFormWithFields = (fieldsHtml: string): HTMLFormElement => {
  const form = document.createElement('form');
  form.innerHTML = fieldsHtml;
  document.body.appendChild(form);
  return form;
};

// Helper to create text input
export const createTextInput = (attributes: Record<string, string> = {}): HTMLInputElement => {
  const input = document.createElement('input');
  input.type = 'text';
  Object.entries(attributes).forEach(([key, value]) => {
    input.setAttribute(key, value);
  });
  document.body.appendChild(input);
  return input;
};

// Helper to create select element
export const createSelect = (options: { value: string; text: string; selected?: boolean }[]): HTMLSelectElement => {
  const select = document.createElement('select');
  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.text;
    if (opt.selected) option.selected = true;
    select.appendChild(option);
  });
  document.body.appendChild(select);
  return select;
};

// Helper to create checkbox input
export const createCheckbox = (attributes: Record<string, string> = {}): HTMLInputElement => {
  const input = document.createElement('input');
  input.type = 'checkbox';
  Object.entries(attributes).forEach(([key, value]) => {
    input.setAttribute(key, value);
  });
  document.body.appendChild(input);
  return input;
};

// Helper to create radio input
export const createRadio = (attributes: Record<string, string> = {}): HTMLInputElement => {
  const input = document.createElement('input');
  input.type = 'radio';
  Object.entries(attributes).forEach(([key, value]) => {
    input.setAttribute(key, value);
  });
  document.body.appendChild(input);
  return input;
};

// Helper to create file input
export const createFileInput = (attributes: Record<string, string> = {}): HTMLInputElement => {
  const input = document.createElement('input');
  input.type = 'file';
  Object.entries(attributes).forEach(([key, value]) => {
    input.setAttribute(key, value);
  });
  document.body.appendChild(input);
  return input;
};

// Helper to create textarea
export const createTextarea = (attributes: Record<string, string> = {}): HTMLTextAreaElement => {
  const textarea = document.createElement('textarea');
  Object.entries(attributes).forEach(([key, value]) => {
    textarea.setAttribute(key, value);
  });
  document.body.appendChild(textarea);
  return textarea;
};

// Helper to simulate user events
export const simulateEvent = (element: HTMLElement, eventType: string, options: EventInit = {}): void => {
  const event = new Event(eventType, { bubbles: true, cancelable: true, ...options });
  element.dispatchEvent(event);
};

// Helper to simulate input event with value change
export const simulateInput = (element: HTMLInputElement | HTMLTextAreaElement, value: string): void => {
  element.value = value;
  simulateEvent(element, 'input');
  simulateEvent(element, 'change');
};

// Helper to create a contenteditable div
export const createContentEditable = (attributes: Record<string, string> = {}): HTMLDivElement => {
  const div = document.createElement('div');
  div.setAttribute('contenteditable', 'true');
  Object.entries(attributes).forEach(([key, value]) => {
    div.setAttribute(key, value);
  });
  document.body.appendChild(div);
  return div;
};

// Helper to create a <details> element with form fields
export const createDetailsWithFields = (fieldsHtml: string, open: boolean = false): HTMLDetailsElement => {
  const details = document.createElement('details');
  if (open) details.setAttribute('open', '');
  const summary = document.createElement('summary');
  summary.textContent = 'Details';
  details.appendChild(summary);
  const content = document.createElement('div');
  content.innerHTML = fieldsHtml;
  details.appendChild(content);
  document.body.appendChild(details);
  return details;
};

// Helper to create a disabled fieldset with form fields
export const createDisabledFieldset = (fieldsHtml: string): HTMLFieldSetElement => {
  const fieldset = document.createElement('fieldset');
  fieldset.disabled = true;
  fieldset.innerHTML = fieldsHtml;
  document.body.appendChild(fieldset);
  return fieldset;
};

// Helper to create an ARIA combobox with associated listbox
export const createARIACombobox = (
  options: { value: string; text: string; selected?: boolean }[],
): { combobox: HTMLDivElement; listbox: HTMLDivElement } => {
  const combobox = document.createElement('div');
  combobox.setAttribute('role', 'combobox');
  combobox.setAttribute('aria-expanded', 'false');
  combobox.setAttribute('aria-controls', 'test-listbox');
  combobox.setAttribute('tabindex', '0');

  const listbox = document.createElement('div');
  listbox.setAttribute('role', 'listbox');
  listbox.id = 'test-listbox';

  options.forEach(opt => {
    const option = document.createElement('div');
    option.setAttribute('role', 'option');
    option.setAttribute('data-value', opt.value);
    option.textContent = opt.text;
    if (opt.selected) option.setAttribute('aria-selected', 'true');
    listbox.appendChild(option);
  });

  document.body.appendChild(combobox);
  document.body.appendChild(listbox);
  return { combobox, listbox };
};

// Helper to create a honeypot field with various hiding methods
export const createHoneypotField = (
  name: string,
  hidingMethod: 'display-none' | 'visibility-hidden' | 'offscreen' | 'clip-rect' | 'aria-hidden' | 'visible',
): HTMLInputElement => {
  const input = document.createElement('input');
  input.type = 'text';
  input.name = name;

  switch (hidingMethod) {
    case 'display-none':
      input.style.display = 'none';
      break;
    case 'visibility-hidden':
      input.style.visibility = 'hidden';
      break;
    case 'offscreen':
      input.style.position = 'absolute';
      input.style.left = '-9999px';
      input.style.top = '-9999px';
      break;
    case 'clip-rect':
      input.style.clip = 'rect(0px, 0px, 0px, 0px)';
      break;
    case 'aria-hidden':
      input.setAttribute('aria-hidden', 'true');
      input.setAttribute('tabindex', '-1');
      break;
    case 'visible':
      // No hiding - visible field
      break;
  }

  document.body.appendChild(input);
  return input;
};

// Helper to create a multi-step form (wizard)
export const createMultiStepForm = (
  steps: { fieldsHtml: string; visible: boolean }[],
): { form: HTMLFormElement; stepContainers: HTMLDivElement[] } => {
  const form = document.createElement('form');
  const stepContainers: HTMLDivElement[] = [];

  steps.forEach((step, index) => {
    const stepDiv = document.createElement('div');
    stepDiv.setAttribute('data-step', String(index + 1));
    stepDiv.className = `step-${index + 1}`;
    if (!step.visible) {
      stepDiv.style.display = 'none';
    }
    stepDiv.innerHTML = step.fieldsHtml;
    form.appendChild(stepDiv);
    stepContainers.push(stepDiv);
  });

  document.body.appendChild(form);
  return { form, stepContainers };
};
