/**
 * Test setup for Vitest in UI package
 * Provides DOM mocking and Chrome API mocking for unit tests
 */
// Chrome mock must be imported first
import { mockChrome } from './chrome-mock.js';
import { vi, beforeEach, afterEach } from 'vitest';

// Re-export the mockChrome for test access
export { mockChrome };

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
