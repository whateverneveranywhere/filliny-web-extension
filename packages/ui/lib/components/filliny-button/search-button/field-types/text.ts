import {
  dispatchEvent,
  simulateTyping,
  addVisualFeedback,
  createBaseField,
  setNativeValue,
  invokeReactOnChange,
  ensureFocus,
} from './utils';
import {
  Framework,
  TEXT_INPUT_TYPES,
  INPUT_TYPES,
  detectFrameworkForElement,
  detectUILibrary,
  detectVue,
  detectSvelte,
  detectQwik,
  detectReact,
  detectAngular,
  isInShadowDOM,
  isHTMLInputElement,
  hasProperty,
} from '@extension/shared';
import type {
  Field,
  NextJsWindow,
  AngularContextElement,
  FormikInputElement,
  ReactHookFormInputElement,
  DOMEventHandler,
} from '@extension/shared';

// ============================================================================
// Rich Text Editor Interfaces
// ============================================================================

/**
 * CKEditor 5 instance attached to an element via `ckeditorInstance`
 */
interface CKEditorInstance {
  setData: (data: string) => void;
  getData: () => string;
}

interface CKEditorHostElement extends HTMLElement {
  ckeditorInstance?: CKEditorInstance;
}

/**
 * TinyMCE editor instance returned by `tinymce.get(id)`
 */
interface TinyMCEEditorInstance {
  setContent: (content: string) => void;
  getContent: () => string;
}

interface TinyMCEStatic {
  get: (id: string) => TinyMCEEditorInstance | null;
}

interface TinyMCEWindow extends Window {
  tinymce?: TinyMCEStatic;
}

/**
 * Quill editor instance attached to an element via `__quill`
 */
interface QuillInstance {
  setText: (text: string) => void;
  getText: () => string;
}

interface QuillHostElement extends HTMLElement {
  __quill?: QuillInstance;
}

/**
 * ProseMirror transaction returned by `state.tr.insertText(...)`
 */
interface ProseMirrorTransaction {
  insertText: (text: string, from: number, to: number) => ProseMirrorTransaction;
}

interface ProseMirrorEditorState {
  tr: ProseMirrorTransaction;
  doc: { content: { size: number } };
}

interface ProseMirrorEditorView {
  state: ProseMirrorEditorState;
  dispatch: (tr: ProseMirrorTransaction) => void;
}

interface ProseMirrorViewDesc {
  view: ProseMirrorEditorView;
}

interface ProseMirrorHostElement extends HTMLElement {
  pmViewDesc?: ProseMirrorViewDesc;
}

/**
 * Lit element with reactive update lifecycle
 */
interface LitElement extends Element {
  requestUpdate: () => void;
}

// ============================================================================
// Type Guards for Framework Detection
// ============================================================================

/**
 * Type guard to check if element has Angular context
 */
const hasAngularContext = (element: HTMLElement): element is AngularContextElement =>
  hasProperty(element, '__ngContext__');

/**
 * Type guard to check if element has Formik bag
 */
const hasFormikBag = (element: HTMLInputElement): element is FormikInputElement => hasProperty(element, '__formik');

/**
 * Type guard to check if element has React Hook Form controller
 */
const hasReactHookFormController = (element: HTMLInputElement): element is ReactHookFormInputElement =>
  hasProperty(element, '__reactHookForm');

/**
 * Type guard for event handler functions
 */
const isEventHandler = (value: unknown): value is DOMEventHandler => typeof value === 'function';

/**
 * Safely get event handler from element
 */
const getEventHandler = (element: HTMLElement, eventName: string): DOMEventHandler | null => {
  const handlerKey = `on${eventName}`;
  if (hasProperty(element, handlerKey)) {
    const handler = element[handlerKey];
    if (isEventHandler(handler)) {
      return handler;
    }
  }
  return null;
};

/**
 * Detect and analyze text input fields
 * Includes various input types like email, url, password, search
 */
const detectTextField = async (
  elements: HTMLElement[],
  baseIndex: number,
  testMode: boolean = false,
): Promise<Field[]> => {
  const fields: Field[] = [];

  // Process standard input elements
  const inputFields = elements.filter((el): el is HTMLInputElement => {
    if (!isHTMLInputElement(el)) {
      return false;
    }
    // Check if the input type is one of the text input types
    return TEXT_INPUT_TYPES.some(inputType => inputType === el.type);
  });

  if (inputFields.length > 0) {
    const results = await detectInputField(inputFields, baseIndex, testMode);
    fields.push(...results);
  }

  // Process textarea elements
  const textareaFields = elements.filter((el): el is HTMLTextAreaElement => el instanceof HTMLTextAreaElement);

  for (let i = 0; i < textareaFields.length; i++) {
    const element = textareaFields[i];
    const field = await createBaseField(element, baseIndex + fields.length + i, 'textarea', testMode);

    // Additional textarea-specific metadata
    field.metadata = {
      framework: Framework.VANILLA,
      visibility: { isVisible: true },
    };
    field.placeholder = element.placeholder;
    field.name = element.name || '';

    fields.push(field);
  }

  // Process contentEditable elements
  const editableFields = elements.filter(
    el =>
      el.isContentEditable &&
      !el.querySelector('input, textarea, select') && // Skip if it contains other input elements
      !(el.textContent || '').includes('\n\n\n'), // Skip if it looks like a rich text editor
  );

  for (let i = 0; i < editableFields.length; i++) {
    const element = editableFields[i];
    const field = await createBaseField(element, baseIndex + fields.length + i, 'contentEditable', testMode);

    // Additional contentEditable metadata
    field.name = element.getAttribute('aria-label') || element.id || '';

    fields.push(field);
  }

  return fields;
};

/**
 * Detect and analyze standard input fields
 */
const detectInputField = async (
  elements: HTMLElement[],
  baseIndex: number,
  testMode: boolean = false,
): Promise<Field[]> => {
  const fields: Field[] = [];

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (!isHTMLInputElement(el)) continue;
    const element = el;

    // Skip hidden and disabled inputs
    if (
      element.type === 'hidden' ||
      element.disabled ||
      element.readOnly ||
      element.getAttribute('aria-hidden') === 'true' ||
      window.getComputedStyle(element).display === 'none' ||
      window.getComputedStyle(element).visibility === 'hidden'
    ) {
      continue;
    }

    // Create field based on input type
    const fieldType = element.type as string;
    const field = await createBaseField(element, baseIndex + i, fieldType, testMode);

    // Add input-specific metadata
    field.name = element.name || '';
    field.placeholder = element.placeholder || '';

    // Add validation properties
    field.validation = field.validation || {};
    if (element.maxLength > 0) field.validation.maxLength = element.maxLength;
    if (element.minLength > 0) field.validation.minLength = element.minLength;

    if (element.type === 'number' || element.type === 'range') {
      field.validation = field.validation || {};
      field.validation.min = element.min ? Number(element.min) : undefined;
      field.validation.max = element.max ? Number(element.max) : undefined;
      field.validation.step = element.step ? Number(element.step) : undefined;
    }

    if (element.required) {
      field.required = true;
    }

    if (element.pattern) {
      field.validation = field.validation || {};
      field.validation.pattern = element.pattern;
    }

    // Set value based on test mode
    if (testMode) {
      switch (element.type) {
        case INPUT_TYPES.EMAIL: {
          field.testValue = 'test@example.com';
          break;
        }
        case INPUT_TYPES.PASSWORD: {
          field.testValue = 'TestPassword123!';
          break;
        }
        case INPUT_TYPES.TEL: {
          field.testValue = '+1234567890';
          break;
        }
        case INPUT_TYPES.URL: {
          field.testValue = 'https://example.com';
          break;
        }
        case INPUT_TYPES.NUMBER: {
          field.testValue = '42';
          break;
        }
        case INPUT_TYPES.DATE: {
          field.testValue = new Date().toISOString().split('T')[0];
          break;
        }
        case INPUT_TYPES.TIME: {
          const now = new Date();
          field.testValue = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          break;
        }
        default: {
          field.testValue = `Test ${element.type || INPUT_TYPES.TEXT}`;
        }
      }
    }

    fields.push(field);
  }

  return fields;
};

/**
 * Update a text input field with enhanced interaction support
 * Handles various text input types with special formatting
 */
const updateTextField = async (element: HTMLElement, value: string): Promise<void> => {
  try {
    // Safety check: Don't apply text updates to checkbox/radio elements
    if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) {
      console.warn(`updateTextField called on ${element.type} element, ignoring to prevent design breakage`);
      return;
    }

    // Safety check: Don't apply text updates to ARIA checkbox/radio elements
    const role = element.getAttribute('role');
    if (role === 'checkbox' || role === 'radio' || role === 'switch') {
      console.warn(`updateTextField called on element with role="${role}", ignoring to prevent design breakage`);
      return;
    }

    // First check if element is in viewport, scroll it into view if needed
    const rect = element.getBoundingClientRect();
    const isInViewport =
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth);

    if (!isInViewport) {
      console.log('Element not in viewport, scrolling into view');
      element.scrollIntoView({ block: 'center' });
    }

    // Add visual feedback
    addVisualFeedback(element);

    // Identify input type if it's an HTMLInputElement
    let inputType = 'text';
    let normalizedValue = value;

    // Special handling for textareas
    if (element instanceof HTMLTextAreaElement) {
      console.log('Handling textarea element specifically');
      // Truncate to maxLength if defined
      if (element.maxLength > 0 && normalizedValue.length > element.maxLength) {
        normalizedValue = normalizedValue.substring(0, element.maxLength);
      }
      // Set value directly and dispatch events
      element.value = normalizedValue;
      dispatchEvent(element, 'input');
      dispatchEvent(element, 'change');

      // Additionally try native events - some frameworks need this
      try {
        const inputEvent = new InputEvent('input', { bubbles: true, cancelable: true });
        element.dispatchEvent(inputEvent);

        const changeEvent = new Event('change', { bubbles: true, cancelable: true });
        element.dispatchEvent(changeEvent);
      } catch (e) {
        console.debug('Native event dispatch error:', e);
      }

      // If the value didn't set, try a secondary approach
      if (element.value !== normalizedValue) {
        // For stubborn textareas, try with selection approach
        element.focus();
        element.select();
        document.execCommand('insertText', false, normalizedValue);
      }

      return;
    } else if (element instanceof HTMLInputElement) {
      inputType = element.type;

      // Format value based on input type
      switch (inputType) {
        case 'email':
          // Ensure email format
          if (!normalizedValue.includes('@')) {
            normalizedValue = normalizedValue.includes('.')
              ? `${normalizedValue.split('.')[0]}@example.com`
              : `${normalizedValue}@example.com`;
          }
          break;

        case 'url':
          // Ensure URL format
          if (!normalizedValue.match(/^https?:\/\//)) {
            normalizedValue = `https://${normalizedValue.replace(/^(www\.)?/, 'www.')}`;
          }
          break;

        case 'tel':
          // Format as phone number if not already
          if (!normalizedValue.match(/^\+?[\d\s\-()]{7,}/)) {
            // Create a basic phone number pattern if one isn't provided
            normalizedValue = normalizedValue.replace(/\D/g, '');
            if (normalizedValue.length < 10) {
              normalizedValue = '555' + normalizedValue.padEnd(7, '0');
            }
          }
          break;

        case 'number':
          // Ensure it's a valid number
          if (isNaN(Number(normalizedValue))) {
            normalizedValue = '0';
          }
          break;

        case 'date':
          // Ensure date format (YYYY-MM-DD)
          if (!normalizedValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const now = new Date();
            normalizedValue = now.toISOString().split('T')[0];
          }
          break;

        case 'time':
          // Ensure time format (HH:MM)
          if (!normalizedValue.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
            const now = new Date();
            normalizedValue = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          }
          break;

        case 'datetime-local':
          // Ensure datetime-local format (YYYY-MM-DDTHH:MM)
          if (!normalizedValue.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)) {
            const now = new Date();
            normalizedValue = now.toISOString().slice(0, 16);
          }
          break;

        case 'month':
          // Ensure month format (YYYY-MM)
          if (!normalizedValue.match(/^\d{4}-\d{2}$/)) {
            const now = new Date();
            normalizedValue = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
          }
          break;

        case 'week':
          // Ensure week format (YYYY-W##)
          if (!normalizedValue.match(/^\d{4}-W\d{2}$/)) {
            const now = new Date();
            const weekNum = Math.ceil(
              ((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7,
            );
            normalizedValue = `${now.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
          }
          break;

        case 'color':
          // Ensure color format (#RRGGBB)
          if (!normalizedValue.match(/^#[0-9A-F]{6}$/i)) {
            normalizedValue = '#1a1a1a'; // Default to a neutral dark gray
          }
          break;

        case 'range':
          // Ensure it's within range
          {
            const min = element.hasAttribute('min') ? Number(element.getAttribute('min')) : 0;
            const max = element.hasAttribute('max') ? Number(element.getAttribute('max')) : 100;
            const num = Number(normalizedValue);
            if (isNaN(num)) {
              normalizedValue = String(min + (max - min) / 2); // Default to middle of range
            } else {
              normalizedValue = String(Math.max(min, Math.min(max, num)));
            }
          }
          break;
      }
    }

    // Use centralized framework detection for all frameworks
    const detectedFramework = detectFrameworkForElement(element);
    const detectedUILibrary = detectUILibrary(element);
    const detectedFormLibrary = detectFormLibrary(element);
    const elementInShadowDOM = isInShadowDOM(element);

    if (elementInShadowDOM) {
      console.log('Element is inside Shadow DOM, using appropriate update strategy');
    }

    // Handle React components (including Next.js, etc.)
    if (detectedFramework === Framework.REACT || detectReact(element)) {
      console.log('Detected React component, using enhanced update strategy', {
        uiLibrary: detectedUILibrary,
        formLibrary: detectedFormLibrary,
      });
      await handleReactTextInput(element, normalizedValue, { isReact: true, type: 'unknown' });
      return;
    }

    // Handle Vue components
    if (detectedFramework === Framework.VUE || detectVue(element)) {
      console.log('Detected Vue component, using Vue-specific update strategy');
      await handleVueTextInput(element, normalizedValue);
      return;
    }

    // Handle Angular components
    if (detectedFramework === Framework.ANGULAR || detectAngular(element)) {
      console.log('Detected Angular component, using enhanced update strategy');
      await handleAngularTextInput(element, normalizedValue);
      return;
    }

    // Handle Svelte components
    if (detectedFramework === Framework.SVELTE || detectSvelte(element)) {
      console.log('Detected Svelte component, using Svelte-specific update strategy');
      await handleSvelteTextInput(element, normalizedValue);
      return;
    }

    // Handle Qwik components
    if (detectedFramework === Framework.QWIK || detectQwik(element)) {
      console.log('Detected Qwik component, using Qwik-specific update strategy');
      await handleQwikTextInput(element, normalizedValue);
      return;
    }

    // Handle new framework-specific components
    let frameworkResult = false;
    switch (detectedFramework) {
      case Framework.ALPINE:
        frameworkResult = await handleAlpineTextInput(element, normalizedValue);
        break;
      case Framework.HTMX:
        frameworkResult = await handleHTMXTextInput(element, normalizedValue);
        break;
      case Framework.KNOCKOUT:
        frameworkResult = await handleKnockoutTextInput(element, normalizedValue);
        break;
      case Framework.LIT:
        frameworkResult = await handleLitTextInput(element, normalizedValue);
        break;
      case Framework.PREACT:
        frameworkResult = await handlePreactTextInput(element, normalizedValue);
        break;
      case Framework.SOLID:
        frameworkResult = await handleSolidTextInput(element, normalizedValue);
        break;
      case Framework.EMBER:
        frameworkResult = await handleEmberTextInput(element, normalizedValue);
        break;
      default:
        break;
    }

    if (frameworkResult) {
      return;
    }

    // If no special frameworks detected, use standard approach with simulateTyping
    await simulateTyping(element, normalizedValue);
  } catch (error) {
    console.error('Error updating text field:', error);
    // Fallback to direct value setting if simulation fails
    try {
      if (element instanceof HTMLInputElement) {
        element.value = value;
        dispatchEvent(element, 'input');
        dispatchEvent(element, 'change');
      }
    } catch (fallbackError) {
      console.error('Even fallback approach failed:', fallbackError);

      // Final attempt for textareas
      if (element instanceof HTMLTextAreaElement) {
        try {
          console.log('Final attempt for textarea');
          element.focus();
          element.value = value;
          // Force blur and focus to trigger change detection
          element.blur();
          element.focus();
        } catch (e) {
          console.error('All textarea update attempts failed:', e);
        }
      }
    }
  }
};

/**
 * All valid React detection types
 */
type ReactDetectionType =
  | 'controlled'
  | 'uncontrolled'
  | 'hook-based'
  | 'class-based'
  | 'material-ui'
  | 'ant-design'
  | 'chakra-ui'
  | 'formik'
  | 'react-hook-form'
  | 'nextjs'
  | 'react-18-concurrent'
  | 'redux-toolkit'
  | 'zustand'
  | 'jotai'
  | 'recoil'
  | 'react-query'
  | 'unknown';

/**
 * Enhanced React component detection with state management patterns
 * Extended support for Next.js, React 18+, and modern frameworks
 */
interface ReactDetection {
  isReact: boolean;
  type: ReactDetectionType;
  framework?: string;
  stateManager?: string;
  reactVersion?: string;
  isNextJs?: boolean;
  isConcurrentMode?: boolean;
  hasStateManager?: boolean;
  fiber?: unknown;
  props?: unknown;
}

const detectFormLibrary = (element: HTMLElement): ReactDetection['type'] => {
  // Check for Formik patterns
  if (element.closest('[class*="formik"]') || element.hasAttribute('data-formik')) {
    return 'formik';
  }

  // Check for React Hook Form patterns
  if (element.hasAttribute('data-react-hook-form') || element.closest('[data-react-hook-form]')) {
    return 'react-hook-form';
  }

  // Check for form names that suggest form libraries
  const formElement = element.closest('form');
  if (formElement) {
    const formName = formElement.getAttribute('name') || formElement.className || '';
    if (/\b(formik|react-hook-form|final-form)\b/i.test(formName)) {
      return 'formik';
    }
  }

  return 'unknown';
};

/**
 * Handle React-specific text input components with enhanced state management
 */
const handleReactTextInput = async (element: HTMLElement, value: string, detection: ReactDetection): Promise<void> => {
  try {
    console.log(`Handling React ${detection.type} component`);

    // Focus the element first
    ensureFocus(element);

    // Try native value setter as a fast path before dispatching to specific handlers
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      setNativeValue(element, value);
      element.dispatchEvent(
        new InputEvent('input', { bubbles: true, data: value, inputType: 'insertReplacementText' }),
      );
      element.dispatchEvent(new Event('change', { bubbles: true }));

      // Wait for React to process before checking if the value stuck
      if (await waitAndVerifyValue(element, value)) {
        return;
      }

      // Fallback: try invokeReactOnChange
      setNativeValue(element, value);
      invokeReactOnChange(element);

      if (await waitAndVerifyValue(element, value)) {
        return;
      }
    }

    // Handle different React component types
    switch (detection.type) {
      case 'controlled':
        await handleControlledComponent(element, value);
        break;
      case 'uncontrolled':
        await handleUncontrolledComponent(element, value);
        break;
      case 'material-ui':
        await handleMaterialUIComponent(element, value);
        break;
      case 'ant-design':
        await handleAntDesignComponent(element, value);
        break;
      case 'chakra-ui':
        await handleChakraUIComponent(element, value);
        break;
      case 'formik':
        await handleFormikComponent(element, value);
        break;
      case 'react-hook-form':
        await handleReactHookFormComponent(element, value);
        break;
      case 'nextjs':
        await handleNextjsComponent(element, value);
        break;
      case 'react-18-concurrent':
        await handleReact18ConcurrentComponent(element, value);
        break;
      case 'react-query':
        await handleReactQueryComponent(element, value);
        break;
      case 'redux-toolkit':
        await handleReduxToolkitComponent(element, value);
        break;
      case 'zustand':
        await handleZustandComponent(element, value);
        break;
      case 'jotai':
        await handleJotaiComponent(element, value);
        break;
      case 'recoil':
        await handleRecoilComponent(element, value);
        break;
      case 'hook-based':
      case 'class-based':
      default:
        await handleGenericReactComponent(element, value);
        break;
    }
  } catch (error) {
    console.error('Error in React input handler:', error);
    // Fall back to standard typing simulation
    await simulateTyping(element, value);
  }
};

/**
 * Handle controlled React components
 */
const handleControlledComponent = async (element: HTMLElement, value: string): Promise<void> => {
  // For controlled components, we need to update the state, not just the DOM
  if (element instanceof HTMLInputElement) {
    // Try to trigger state update through React's synthetic event system
    await triggerReactStateUpdate(element, value);
  }
};

/**
 * Handle uncontrolled React components
 */
const handleUncontrolledComponent = async (element: HTMLElement, value: string): Promise<void> => {
  // For uncontrolled components, direct DOM manipulation works but
  // we still use setNativeValue for consistency with ref-based reads
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    setNativeValue(element, value);
    await triggerReactEvents(element, ['input', 'change']);
  }
};

/**
 * Handle Material-UI components
 */
const handleMaterialUIComponent = async (element: HTMLElement, value: string): Promise<void> => {
  // Material-UI uses controlled components with special event handling
  const muiContainer = element.closest('[class*="MuiInputBase"], [class*="MuiTextField"], [class*="MuiInput"]');

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    // Use native setter to bypass React's controlled input mechanism
    setNativeValue(element, value);

    // Trigger events on both the input and container
    await triggerReactEvents(element, ['focus', 'input', 'change', 'blur']);

    if (muiContainer && muiContainer instanceof HTMLElement) {
      muiContainer.setAttribute('data-value', value);
      await triggerReactEvents(muiContainer, ['input', 'change']);
    }
  }
};

/**
 * Handle Ant Design components
 */
const handleAntDesignComponent = async (element: HTMLElement, value: string): Promise<void> => {
  const antContainer = element.closest('[class*="ant-input"], [class*="ant-form-item"]');

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    setNativeValue(element, value);
    await triggerReactEvents(element, ['focus', 'input', 'change', 'blur']);

    if (antContainer && antContainer instanceof HTMLElement) {
      antContainer.setAttribute('data-value', value);
      await triggerReactEvents(antContainer, ['input', 'change']);
    }
  }
};

/**
 * Handle Chakra UI components
 */
const handleChakraUIComponent = async (element: HTMLElement, value: string): Promise<void> => {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    setNativeValue(element, value);
    await triggerReactEvents(element, ['focus', 'input', 'change', 'blur']);
  }
};

/**
 * Handle Formik components
 */
const handleFormikComponent = async (element: HTMLElement, value: string): Promise<void> => {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    setNativeValue(element, value);

    // Formik listens to specific events for validation
    await triggerReactEvents(element, ['input', 'change', 'blur']);

    // Also try to trigger Formik's setFieldValue if available (input elements only)
    if (element instanceof HTMLInputElement) {
      try {
        if (hasFormikBag(element) && element.__formik?.setFieldValue) {
          const fieldName = element.name || element.id;
          if (fieldName) {
            element.__formik.setFieldValue(fieldName, value);
          }
        }
      } catch (error) {
        console.debug('Could not access Formik bag:', error);
      }
    }
  }
};

/**
 * Handle React Hook Form components
 */
const handleReactHookFormComponent = async (element: HTMLElement, value: string): Promise<void> => {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    setNativeValue(element, value);

    // React Hook Form uses register() which attaches specific event handlers
    await triggerReactEvents(element, ['input', 'change', 'blur']);

    // Try to trigger React Hook Form's setValue if available (input elements only)
    if (element instanceof HTMLInputElement) {
      try {
        if (hasReactHookFormController(element) && element.__reactHookForm?.setValue) {
          const fieldName = element.name || element.id;
          if (fieldName) {
            element.__reactHookForm.setValue(fieldName, value);
          }
        }
      } catch (error) {
        console.debug('Could not access React Hook Form controller:', error);
      }
    }
  }
};

/**
 * Handle generic React components
 */
const handleGenericReactComponent = async (element: HTMLElement, value: string): Promise<void> => {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    setNativeValue(element, value);
  } else if (element.isContentEditable) {
    element.textContent = value;
  }

  // Try to trigger state update through React's synthetic event system
  await triggerReactStateUpdate(element, value);
};

/**
 * Trigger React state updates using synthetic events
 */
/**
 * Wait for React's reconciler to process and verify the value stuck.
 * React processes events in microtasks, so we wait a frame + microtask
 * to check if the value survived React's re-render.
 */
const waitAndVerifyValue = async (
  element: HTMLInputElement | HTMLTextAreaElement,
  expectedValue: string,
): Promise<boolean> => {
  // Wait for React's microtask queue to flush + one animation frame for re-render
  await new Promise(resolve => setTimeout(resolve, 0));
  await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
  return element.value === expectedValue;
};

const triggerReactStateUpdate = async (element: HTMLElement, value: string): Promise<void> => {
  // For controlled components, we need to simulate user input to trigger state updates
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    // Focus first to ensure event handlers are active
    ensureFocus(element);

    // PRIMARY: Use native value setter + dispatch InputEvent with insertReplacementText.
    // This is the technique used by Playwright and Cypress for React controlled inputs.
    setNativeValue(element, value);
    element.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertReplacementText' }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

    // Wait for React to process the event before checking
    if (await waitAndVerifyValue(element, value)) {
      return;
    }

    // FALLBACK 1: Native setter + direct React onChange invocation
    // This bypasses the synthetic event system and calls the handler directly
    setNativeValue(element, value);
    invokeReactOnChange(element);

    if (await waitAndVerifyValue(element, value)) {
      return;
    }

    // FALLBACK 2: Native setter + compositionend event.
    // Some frameworks (especially CJK IME-aware ones) respond to compositionend.
    setNativeValue(element, value);
    element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: value }));
    element.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertCompositionText' }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

    if (await waitAndVerifyValue(element, value)) {
      return;
    }

    // FALLBACK 3: Character-by-character typing (last resort, slowest but most compatible)
    element.value = '';
    await triggerReactEvents(element, ['focus']);

    for (let i = 0; i < value.length; i++) {
      const char = value[i];
      const newValue = value.substring(0, i + 1);

      // Use native setter for each character to properly trigger React's onChange
      setNativeValue(element, newValue);

      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        data: char,
        inputType: 'insertText',
      });

      element.dispatchEvent(inputEvent);

      // Small delay to allow React to process the state update
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Final change event
    await triggerReactEvents(element, ['change', 'blur']);
  }
};

/**
 * Trigger React events with proper synthetic event handling
 */
const triggerReactEvents = async (element: HTMLElement, events: string[]): Promise<void> => {
  for (const eventName of events) {
    try {
      // Create native event
      const event = new Event(eventName, { bubbles: true, cancelable: true });
      element.dispatchEvent(event);

      // Also create InputEvent for input events
      if (eventName === 'input' && element instanceof HTMLInputElement) {
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          data: element.value,
          inputType: 'insertText',
        });
        element.dispatchEvent(inputEvent);
      }

      // Try to call React event handlers directly
      const reactHandler = getEventHandler(element, eventName);
      if (reactHandler) {
        reactHandler.call(element, event);
      }

      // Small delay between events
      await new Promise(resolve => setTimeout(resolve, 5));
    } catch (error) {
      console.debug(`Error triggering ${eventName} event:`, error);
    }
  }
};

/**
 * Handle Angular-specific text input components
 */
const handleAngularTextInput = async (element: HTMLElement, value: string): Promise<void> => {
  try {
    // Focus the element
    element.focus();

    // For Angular forms, we need to update the value and dispatch specific events
    if (element instanceof HTMLInputElement) {
      element.value = value;
    } else if (element.isContentEditable) {
      element.textContent = value;
    }

    // Angular listens to these events
    ['input', 'change', 'blur'].forEach(eventName => {
      const event = new Event(eventName, { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
    });

    // For Angular forms, try to find and update NgModel
    const ngModelName =
      element.getAttribute('ng-model') ||
      element.getAttribute('[(ngModel)]') ||
      element.getAttribute('formControlName');

    if (ngModelName) {
      // Try to find Angular context
      if (hasAngularContext(element)) {
        console.log(`Found Angular context for model: ${ngModelName}`);
        // We can't directly modify Angular context, but the events should trigger updates
      }
    }
  } catch (error) {
    console.error('Error in Angular input handler:', error);
    // Fall back to standard typing simulation
    await simulateTyping(element, value);
  }
};

/**
 * Handle Vue-specific text input components
 */
const handleVueTextInput = async (element: HTMLElement, value: string): Promise<void> => {
  try {
    // Focus the element
    element.focus();

    // For Vue, update the value and dispatch Vue-specific events
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = value;
    } else if (element.isContentEditable) {
      element.textContent = value;
    }

    // Vue listens to input and change events
    // Dispatch input event for v-model
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      data: value,
    });
    element.dispatchEvent(inputEvent);

    // Also dispatch change event
    const changeEvent = new Event('change', { bubbles: true, cancelable: true });
    element.dispatchEvent(changeEvent);

    // For Vue 3 with v-model, try to trigger the model update
    const vModelValue = element.getAttribute('v-model') || element.getAttribute(':value');
    if (vModelValue) {
      console.log(`Vue model binding detected: ${vModelValue}`);
    }

    // Small delay for Vue's reactivity to process
    await new Promise(resolve => setTimeout(resolve, 50));
  } catch (error) {
    console.error('Error in Vue input handler:', error);
    // Fall back to standard typing simulation
    await simulateTyping(element, value);
  }
};

/**
 * Handle Svelte-specific text input components
 */
const handleSvelteTextInput = async (element: HTMLElement, value: string): Promise<void> => {
  try {
    // Focus the element
    element.focus();

    // For Svelte, update the value and dispatch events
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = value;
    } else if (element.isContentEditable) {
      element.textContent = value;
    }

    // Svelte listens to input events for two-way binding
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      data: value,
    });
    element.dispatchEvent(inputEvent);

    // Dispatch change event
    const changeEvent = new Event('change', { bubbles: true, cancelable: true });
    element.dispatchEvent(changeEvent);

    // For Svelte, also try the bind:value pattern
    // Svelte stores component references in the element
    if (hasProperty(element, '__svelte_component__') && element.__svelte_component__) {
      console.log('Svelte component detected');
    }

    // Small delay for Svelte's reactivity to process
    await new Promise(resolve => setTimeout(resolve, 50));
  } catch (error) {
    console.error('Error in Svelte input handler:', error);
    // Fall back to standard typing simulation
    await simulateTyping(element, value);
  }
};

/**
 * Handle Qwik-specific text input components
 */
const handleQwikTextInput = async (element: HTMLElement, value: string): Promise<void> => {
  try {
    // Focus the element
    element.focus();

    // For Qwik, update the value and dispatch events
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = value;
    } else if (element.isContentEditable) {
      element.textContent = value;
    }

    // Qwik uses event handlers that are serialized and loaded on interaction
    // The input event should trigger the lazy-loaded handler
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      data: value,
    });
    element.dispatchEvent(inputEvent);

    // Dispatch change event
    const changeEvent = new Event('change', { bubbles: true, cancelable: true });
    element.dispatchEvent(changeEvent);

    // Qwik may need additional time to deserialize and execute handlers
    await new Promise(resolve => setTimeout(resolve, 100));

    // Dispatch a blur to ensure the value is committed
    element.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
  } catch (error) {
    console.error('Error in Qwik input handler:', error);
    // Fall back to standard typing simulation
    await simulateTyping(element, value);
  }
};

/**
 * Handle Next.js components with enhanced SSR/hydration support
 */
const handleNextjsComponent = async (element: HTMLElement, value: string): Promise<void> => {
  try {
    console.log('Handling Next.js component with enhanced SSR support');

    // Check if component is hydrated
    const isHydrated = !!(
      document.querySelector('[data-reactroot]') ||
      document.querySelector('#__next[data-reactroot]') ||
      (window as NextJsWindow).__NEXT_DATA__?.props
    );

    if (!isHydrated) {
      // Wait for hydration before attempting to update
      console.log('Waiting for Next.js hydration...');
      await waitForNextjsHydration();
    }

    // Handle form updates with Next.js specific patterns
    if (element instanceof HTMLInputElement) {
      element.value = value;

      // Next.js forms often use router for submissions
      await triggerReactEvents(element, ['focus', 'input', 'change', 'blur']);

      // Check for Next.js form action patterns
      const form = element.closest('form');
      if (form?.getAttribute('action')?.includes('/_next/')) {
        // This is likely a server action form
        console.log('Detected Next.js server action form');
        await new Promise(resolve => setTimeout(resolve, 100)); // Allow for server action processing
      }
    }
  } catch (error) {
    console.error('Error in Next.js input handler:', error);
    await handleGenericReactComponent(element, value);
  }
};

/**
 * Handle React 18+ concurrent mode components
 */
const handleReact18ConcurrentComponent = async (element: HTMLElement, value: string): Promise<void> => {
  try {
    console.log('Handling React 18+ concurrent component');

    if (element instanceof HTMLInputElement) {
      // For concurrent mode, use startTransition pattern
      element.value = value;

      // Trigger events with consideration for concurrent features
      await triggerReactEvents(element, ['focus']);

      // Simulate gradual typing for concurrent mode
      for (let i = 0; i <= value.length; i++) {
        const partialValue = value.substring(0, i);
        element.value = partialValue;

        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          data: value[i - 1] || '',
          inputType: 'insertText',
        });

        element.dispatchEvent(inputEvent);

        // Small delay to allow concurrent features to process
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      await triggerReactEvents(element, ['change', 'blur']);
    }
  } catch (error) {
    console.error('Error in React 18+ concurrent input handler:', error);
    await handleGenericReactComponent(element, value);
  }
};

/**
 * Handle React Query/TanStack Query components
 */
const handleReactQueryComponent = async (element: HTMLElement, value: string): Promise<void> => {
  try {
    console.log('Handling React Query component');

    if (element instanceof HTMLInputElement) {
      element.value = value;
      await triggerReactEvents(element, ['focus', 'input', 'change', 'blur']);

      // React Query might invalidate queries on form changes
      // Wait a bit for potential query invalidation
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  } catch (error) {
    console.error('Error in React Query input handler:', error);
    await handleGenericReactComponent(element, value);
  }
};

/**
 * Handle Redux Toolkit components
 */
const handleReduxToolkitComponent = async (element: HTMLElement, value: string): Promise<void> => {
  try {
    console.log('Handling Redux Toolkit component');

    if (element instanceof HTMLInputElement) {
      element.value = value;

      // Redux Toolkit components often use controlled inputs with dispatch actions
      await triggerReactEvents(element, ['focus', 'input', 'change', 'blur']);

      // Give time for Redux actions to process
      await new Promise(resolve => setTimeout(resolve, 30));
    }
  } catch (error) {
    console.error('Error in Redux Toolkit input handler:', error);
    await handleGenericReactComponent(element, value);
  }
};

/**
 * Handle Zustand components
 */
const handleZustandComponent = async (element: HTMLElement, value: string): Promise<void> => {
  try {
    console.log('Handling Zustand component');

    if (element instanceof HTMLInputElement) {
      element.value = value;
      await triggerReactEvents(element, ['focus', 'input', 'change', 'blur']);
    }
  } catch (error) {
    console.error('Error in Zustand input handler:', error);
    await handleGenericReactComponent(element, value);
  }
};

/**
 * Handle Jotai components
 */
const handleJotaiComponent = async (element: HTMLElement, value: string): Promise<void> => {
  try {
    console.log('Handling Jotai component');

    if (element instanceof HTMLInputElement) {
      element.value = value;
      await triggerReactEvents(element, ['focus', 'input', 'change', 'blur']);
    }
  } catch (error) {
    console.error('Error in Jotai input handler:', error);
    await handleGenericReactComponent(element, value);
  }
};

/**
 * Handle Recoil components
 */
const handleRecoilComponent = async (element: HTMLElement, value: string): Promise<void> => {
  try {
    console.log('Handling Recoil component');

    if (element instanceof HTMLInputElement) {
      element.value = value;
      await triggerReactEvents(element, ['focus', 'input', 'change', 'blur']);
    }
  } catch (error) {
    console.error('Error in Recoil input handler:', error);
    await handleGenericReactComponent(element, value);
  }
};

/**
 * Wait for Next.js hydration to complete
 */
const waitForNextjsHydration = async (): Promise<void> =>
  new Promise(resolve => {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait

    const checkHydration = () => {
      const isHydrated = !!(
        document.querySelector('[data-reactroot]') ||
        document.querySelector('#__next[data-reactroot]') ||
        (window as NextJsWindow).__NEXT_DATA__?.props
      );

      if (isHydrated || attempts >= maxAttempts) {
        resolve();
        return;
      }

      attempts++;
      setTimeout(checkHydration, 100);
    };

    checkHydration();
  });

/**
 * Handle contentEditable elements like rich text editors
 */
const updateContentEditable = async (element: HTMLElement, value: string): Promise<void> => {
  try {
    // Try CKEditor 5 API
    if ('ckeditorInstance' in element) {
      try {
        const ckElement = element as CKEditorHostElement;
        if (ckElement.ckeditorInstance) {
          ckElement.ckeditorInstance.setData(value);
          return;
        }
      } catch {
        /* fall through */
      }
    }

    // Try TinyMCE API
    const tinymceId = element.id || element.closest('[id]')?.id;
    if (tinymceId && 'tinymce' in window) {
      try {
        const tinymceWindow = window as TinyMCEWindow;
        const editor = tinymceWindow.tinymce?.get(tinymceId);
        if (editor) {
          editor.setContent(value);
          return;
        }
      } catch {
        /* fall through */
      }
    }

    // Try Quill API
    if ('__quill' in element) {
      try {
        const quillElement = element as QuillHostElement;
        if (quillElement.__quill) {
          quillElement.__quill.setText(value);
          return;
        }
      } catch {
        /* fall through */
      }
    }

    // Try ProseMirror/Tiptap
    if (element.classList.contains('ProseMirror')) {
      try {
        const pmElement = element as ProseMirrorHostElement;
        const view = pmElement.pmViewDesc?.view;
        if (view) {
          const tr = view.state.tr.insertText(value, 0, view.state.doc.content.size);
          view.dispatch(tr);
          return;
        }
      } catch {
        /* fall through */
      }
    }

    // Try Slate
    if (element.hasAttribute('data-slate-editor')) {
      try {
        element.focus();
        document.execCommand('selectAll', false);
        document.execCommand('insertText', false, value);
        return;
      } catch {
        /* fall through */
      }
    }

    // First check if we're dealing with a rich text editor
    const isRichEditor =
      element.closest('[class*="editor"]') !== null ||
      element.closest('[class*="wysiwyg"]') !== null ||
      element.closest('[class*="rich-text"]') !== null;

    if (isRichEditor) {
      console.log('Detected rich text editor, attempting appropriate update strategy');

      // Focus the element first
      element.focus();

      // For CKEditor, TinyMCE and similar editors
      if (window.document.querySelector('.ck-editor, .tox-tinymce, .trumbowyg')) {
        // Use document.execCommand for these editors
        document.execCommand('selectAll', false);
        document.execCommand('insertText', false, value);
      } else {
        // Standard approach for other contentEditable elements
        element.innerHTML = value.replace(/\n/g, '<br>');

        // Dispatch appropriate events
        dispatchEvent(element, 'input');
        dispatchEvent(element, 'change');
      }
    } else {
      // For simple contentEditable elements
      await simulateTyping(element, value);
    }
  } catch (error) {
    console.error('Error updating contentEditable element:', error);
    // Fallback approach
    try {
      element.innerHTML = value.replace(/\n/g, '<br>');
      dispatchEvent(element, 'input');
    } catch (fallbackError) {
      console.error('Even fallback approach failed:', fallbackError);
    }
  }
};

// ============================================================================
// New Framework Handlers
// ============================================================================

const handleAlpineTextInput = async (element: HTMLElement, value: string): Promise<boolean> => {
  // Alpine.js listens to standard DOM input events
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    setNativeValue(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return element.value === value;
  }
  return false;
};

const handleHTMXTextInput = async (element: HTMLElement, value: string): Promise<boolean> => {
  // HTMX listens to standard events, dispatch input event
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    setNativeValue(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return element.value === value;
  }
  return false;
};

const handleKnockoutTextInput = async (element: HTMLElement, value: string): Promise<boolean> => {
  // Knockout.js listens for change and input events
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    setNativeValue(element, value);
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    return element.value === value;
  }
  return false;
};

const handleLitTextInput = async (element: HTMLElement, value: string): Promise<boolean> => {
  // Lit elements may need requestUpdate after value change
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    setNativeValue(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    // Trigger Lit update if available
    const litHost = element.closest('*');
    if (litHost && 'requestUpdate' in litHost) {
      (litHost as LitElement).requestUpdate();
    }
    return element.value === value;
  }
  return false;
};

const handlePreactTextInput = async (element: HTMLElement, value: string): Promise<boolean> => {
  // Preact uses similar patterns to React but with __preactattr_
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    setNativeValue(element, value);
    element.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertReplacementText' }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    if (element.value !== value) {
      invokeReactOnChange(element); // Preact props structure is similar
    }
    return element.value === value;
  }
  return false;
};

const handleSolidTextInput = async (element: HTMLElement, value: string): Promise<boolean> => {
  // Solid.js uses compile-time reactivity, standard DOM events work
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    setNativeValue(element, value);
    element.dispatchEvent(new InputEvent('input', { bubbles: true, data: value }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return element.value === value;
  }
  return false;
};

const handleEmberTextInput = async (element: HTMLElement, value: string): Promise<boolean> => {
  // Ember.js uses event delegation through the container
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    ensureFocus(element);
    setNativeValue(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.blur();
    return element.value === value;
  }
  return false;
};

// ============================================================================
// Exports (at end of file per ESLint import-x/exports-last rule)
// ============================================================================

export { detectTextField, detectInputField, updateTextField, updateContentEditable };
