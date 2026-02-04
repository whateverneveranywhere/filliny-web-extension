import { dispatchEvent, simulateTyping, addVisualFeedback, createBaseField } from './utils';
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
  ReactDevToolsWindow,
  ReactGlobalWindow,
  ReduxDevToolsWindow,
  AngularContextElement,
  FormikInputElement,
  ReactHookFormInputElement,
  ReactFiberProps,
  DOMEventHandler,
} from '@extension/shared';

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
 * Type guard to check if value is ReactFiberProps
 */
const isReactFiberProps = (value: unknown): value is ReactFiberProps => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return hasProperty(value, 'memoizedProps') || hasProperty(value, 'pendingProps');
};

/**
 * Safely get React fiber from element
 */
const getReactFiber = (element: HTMLElement): ReactFiberProps | null => {
  const fiberKey = Object.keys(element).find(
    key => key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance'),
  );
  if (fiberKey && hasProperty(element, fiberKey)) {
    const fiber = element[fiberKey];
    if (isReactFiberProps(fiber)) {
      return fiber;
    }
  }
  return null;
};

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
 * Valid state manager types for React detection
 */
const STATE_MANAGER_TYPES = ['redux-toolkit', 'zustand', 'jotai', 'recoil', 'react-query'] as const;

type _StateManagerType = (typeof STATE_MANAGER_TYPES)[number];

/**
 * All valid React detection types
 */
const REACT_DETECTION_TYPES = [
  'controlled',
  'uncontrolled',
  'hook-based',
  'class-based',
  'material-ui',
  'ant-design',
  'chakra-ui',
  'formik',
  'react-hook-form',
  'nextjs',
  'react-18-concurrent',
  ...STATE_MANAGER_TYPES,
  'unknown',
] as const;

type ReactDetectionType = (typeof REACT_DETECTION_TYPES)[number];

/**
 * Type guard for valid React detection type
 */
const isValidReactDetectionType = (value: string): value is ReactDetectionType =>
  REACT_DETECTION_TYPES.includes(value as ReactDetectionType);

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

const _detectReactComponent = (element: HTMLElement): ReactDetection => {
  const detection: ReactDetection = {
    isReact: false,
    type: 'unknown',
    isNextJs: detectNextJs(),
    reactVersion: detectReactVersion(),
    isConcurrentMode: detectConcurrentMode(),
    hasStateManager: detectStateManager().length > 0,
  };

  // Check for React Fiber (React 16+)
  const fiber = getReactFiber(element);

  if (fiber) {
    detection.isReact = true;
    detection.type = detectReactComponentType(element, fiber, detection);
    detection.fiber = fiber;
    detection.props = fiber.memoizedProps ?? fiber.pendingProps;

    return detection;
  }

  // Enhanced Next.js detection
  if (detection.isNextJs) {
    detection.isReact = true;
    detection.type = 'nextjs';

    // Check for Next.js specific patterns
    const nextjsComponentType = detectNextjsComponentType(element);
    if (nextjsComponentType !== 'unknown') {
      detection.type = nextjsComponentType;
    }

    return detection;
  }

  // Check for React 18+ concurrent features
  if (detection.isConcurrentMode) {
    detection.isReact = true;
    detection.type = 'react-18-concurrent';
    return detection;
  }

  // Check for state management libraries
  if (detection.hasStateManager) {
    const stateManagers = detectStateManager();
    detection.isReact = true;
    // Validate that the state manager is a valid detection type
    if (stateManagers.length > 0 && isValidReactDetectionType(stateManagers[0])) {
      detection.type = stateManagers[0];
    }
    detection.stateManager = stateManagers.join(', ');
    return detection;
  }

  // Check for React DevTools markers
  if (element.hasAttribute('data-reactid') || element.hasAttribute('data-react-class')) {
    detection.isReact = true;
    detection.type = 'class-based';
    return detection;
  }

  // Check for React root markers
  if (document.querySelector('[data-reactroot], #root, [id*="react"], [class*="react-root"], #__next')) {
    detection.isReact = true;

    // Check for specific component library patterns
    const componentType = detectComponentLibrary(element);
    if (componentType !== 'unknown') {
      detection.type = componentType;
      return detection;
    }
  }

  // Check for React event handlers
  const hasReactEvents = Object.keys(element).some(key => key.startsWith('__reactEventHandlers'));
  if (hasReactEvents) {
    detection.isReact = true;
    detection.type = 'hook-based';
    return detection;
  }

  // Check for React class patterns
  const className = element.className || '';
  if (/\breact-/i.test(className)) {
    detection.isReact = true;
    detection.type = 'class-based';
    return detection;
  }

  return detection;
};

const detectReactComponentType = (
  element: HTMLElement,
  fiber: ReactFiberProps | null,
  _detection: ReactDetection,
): ReactDetection['type'] => {
  // Check for controlled vs uncontrolled
  if (element instanceof HTMLInputElement && fiber) {
    // Controlled components have value prop managed by React
    if (fiber.memoizedProps?.value !== undefined || fiber.pendingProps?.value !== undefined) {
      return 'controlled';
    }
    // Uncontrolled components use defaultValue
    if (fiber.memoizedProps?.defaultValue !== undefined || fiber.pendingProps?.defaultValue !== undefined) {
      return 'uncontrolled';
    }
  }

  // Check for component library patterns
  const componentType = detectComponentLibrary(element);
  if (componentType !== 'unknown') {
    return componentType;
  }

  // Check for form library patterns
  const formLibrary = detectFormLibrary(element);
  if (formLibrary !== 'unknown') {
    return formLibrary;
  }

  // Default to hook-based for modern React
  return 'hook-based';
};

const detectComponentLibrary = (element: HTMLElement): ReactDetection['type'] => {
  const className = element.className || '';
  const parentClasses = element.parentElement?.className || '';
  const combinedClasses = `${className} ${parentClasses}`.toLowerCase();

  // Material-UI patterns
  if (/\bmui|\bmaterial-ui/i.test(combinedClasses) || element.closest('[class*="Mui"]')) {
    return 'material-ui';
  }

  // Ant Design patterns
  if (/\bant-|\bantd/i.test(combinedClasses) || element.closest('[class*="ant-"]')) {
    return 'ant-design';
  }

  // Chakra UI patterns
  if (/\bchakra|\bchakra-ui/i.test(combinedClasses) || element.closest('[class*="chakra"]')) {
    return 'chakra-ui';
  }

  return 'unknown';
};

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
 * Detect Next.js application
 */
const detectNextJs = (): boolean =>
  // Check for Next.js specific elements and scripts
  !!(
    document.getElementById('__next') ||
    document.querySelector('script[src*="_next"]') ||
    document.querySelector('link[href*="_next"]') ||
    window.location.pathname.includes('/_next/') ||
    document.querySelector('meta[name="next-head-count"]') ||
    (window as unknown as NextJsWindow).__NEXT_DATA__ ||
    document.querySelector('script[id="__NEXT_DATA__"]')
  );
/**
 * Detect React version from global objects or DOM
 */
const detectReactVersion = (): string | undefined => {
  try {
    // Check for React DevTools version info
    const reactDevTools = (window as unknown as ReactDevToolsWindow).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (reactDevTools?.renderers) {
      for (const renderer of reactDevTools.renderers.values()) {
        if (renderer.version) {
          return renderer.version;
        }
      }
    }

    // Check for React in window object
    const reactGlobal = (window as ReactGlobalWindow).React;
    if (reactGlobal?.version) {
      return reactGlobal.version;
    }

    // Check for React version in bundle comments or scripts
    const scripts = Array.from(document.querySelectorAll('script[src*="react"]'));
    for (const script of scripts) {
      const src = script.getAttribute('src') || '';
      const versionMatch = src.match(/react@([\d.]+)/);
      if (versionMatch) {
        return versionMatch[1];
      }
    }
  } catch (error) {
    console.debug('Error detecting React version:', error);
  }

  return undefined;
};

/**
 * Detect React 18+ concurrent mode features
 */
const detectConcurrentMode = (): boolean => {
  try {
    // Check for concurrent mode APIs
    const hasConcurrentFeatures = !!(
      (window as ReactGlobalWindow).createRoot ||
      document.querySelector('[data-react-concurrent="true"]') ||
      document.querySelector('.react-concurrent-mode')
    );

    // Check for Suspense boundaries
    const hasSuspense = !!(
      document.querySelector('[data-react-suspense]') || document.querySelector('.react-suspense')
    );

    // Check for startTransition usage indicators
    const hasTransitions = !!(
      document.querySelector('[data-react-transition]') || document.querySelector('.react-transition')
    );

    return hasConcurrentFeatures || hasSuspense || hasTransitions;
  } catch (error) {
    console.debug('Error detecting concurrent mode:', error);
    return false;
  }
};

/**
 * Detect state management libraries
 */
const detectStateManager = (): string[] => {
  const stateManagers: string[] = [];

  try {
    // Redux/Redux Toolkit
    if (
      (window as ReduxDevToolsWindow).__REDUX_DEVTOOLS_EXTENSION__ ||
      document.querySelector('[data-redux]') ||
      document.querySelector('.redux-store')
    ) {
      stateManagers.push('redux-toolkit');
    }

    // Zustand
    if (document.querySelector('[data-zustand]') || document.querySelector('.zustand-store')) {
      stateManagers.push('zustand');
    }

    // Jotai
    if (document.querySelector('[data-jotai]') || document.querySelector('.jotai-atom')) {
      stateManagers.push('jotai');
    }

    // Recoil
    if (document.querySelector('[data-recoil]') || document.querySelector('.recoil-root')) {
      stateManagers.push('recoil');
    }

    // React Query/TanStack Query
    if (document.querySelector('[data-react-query]') || document.querySelector('.react-query-client')) {
      stateManagers.push('react-query');
    }
  } catch (error) {
    console.debug('Error detecting state managers:', error);
  }

  return stateManagers;
};

/**
 * Detect Next.js specific component types
 */
const detectNextjsComponentType = (element: HTMLElement): ReactDetection['type'] => {
  // Check for Next.js specific patterns
  const nextPatterns = ['[data-nextjs]', '.next-component', '[class*="__next"]', '[id*="__next"]'];

  for (const pattern of nextPatterns) {
    if (element.matches(pattern) || element.closest(pattern)) {
      return 'nextjs';
    }
  }

  // Check for Next.js form patterns
  if (element.closest('form[action*="/_next/"]') || element.closest('[data-next-form]')) {
    return 'nextjs';
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
    element.focus();

    // Handle different React component types
    switch (detection.type) {
      case 'controlled':
        await handleControlledComponent(element, value, detection);
        break;
      case 'uncontrolled':
        await handleUncontrolledComponent(element, value, detection);
        break;
      case 'material-ui':
        await handleMaterialUIComponent(element, value, detection);
        break;
      case 'ant-design':
        await handleAntDesignComponent(element, value, detection);
        break;
      case 'chakra-ui':
        await handleChakraUIComponent(element, value, detection);
        break;
      case 'formik':
        await handleFormikComponent(element, value, detection);
        break;
      case 'react-hook-form':
        await handleReactHookFormComponent(element, value, detection);
        break;
      case 'nextjs':
        await handleNextjsComponent(element, value, detection);
        break;
      case 'react-18-concurrent':
        await handleReact18ConcurrentComponent(element, value, detection);
        break;
      case 'react-query':
        await handleReactQueryComponent(element, value, detection);
        break;
      case 'redux-toolkit':
        await handleReduxToolkitComponent(element, value, detection);
        break;
      case 'zustand':
        await handleZustandComponent(element, value, detection);
        break;
      case 'jotai':
        await handleJotaiComponent(element, value, detection);
        break;
      case 'recoil':
        await handleRecoilComponent(element, value, detection);
        break;
      case 'hook-based':
      case 'class-based':
      default:
        await handleGenericReactComponent(element, value, detection);
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
const handleControlledComponent = async (
  element: HTMLElement,
  value: string,
  detection: ReactDetection,
): Promise<void> => {
  // For controlled components, we need to update the state, not just the DOM
  if (element instanceof HTMLInputElement) {
    // Try to trigger state update through React's synthetic event system
    await triggerReactStateUpdate(element, value, detection);
  }
};

/**
 * Handle uncontrolled React components
 */
const handleUncontrolledComponent = async (
  element: HTMLElement,
  value: string,
  _detection: ReactDetection,
): Promise<void> => {
  // For uncontrolled components, direct DOM manipulation should work
  if (element instanceof HTMLInputElement) {
    element.value = value;
    await triggerReactEvents(element, ['input', 'change']);
  }
};

/**
 * Handle Material-UI components
 */
const handleMaterialUIComponent = async (
  element: HTMLElement,
  value: string,
  _detection: ReactDetection,
): Promise<void> => {
  // Material-UI uses controlled components with special event handling
  const muiContainer = element.closest('[class*="MuiInputBase"], [class*="MuiTextField"], [class*="MuiInput"]');

  if (element instanceof HTMLInputElement) {
    element.value = value;

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
const handleAntDesignComponent = async (
  element: HTMLElement,
  value: string,
  _detection: ReactDetection,
): Promise<void> => {
  const antContainer = element.closest('[class*="ant-input"], [class*="ant-form-item"]');

  if (element instanceof HTMLInputElement) {
    element.value = value;
    await triggerReactEvents(element, ['focus', 'input', 'change', 'blur']);

    if (antContainer && antContainer instanceof HTMLElement) {
      // Ant Design often uses data attributes for state
      antContainer.setAttribute('data-value', value);
      await triggerReactEvents(antContainer, ['input', 'change']);
    }
  }
};

/**
 * Handle Chakra UI components
 */
const handleChakraUIComponent = async (
  element: HTMLElement,
  value: string,
  _detection: ReactDetection,
): Promise<void> => {
  if (element instanceof HTMLInputElement) {
    element.value = value;
    await triggerReactEvents(element, ['focus', 'input', 'change', 'blur']);
  }
};

/**
 * Handle Formik components
 */
const handleFormikComponent = async (
  element: HTMLElement,
  value: string,
  _detection: ReactDetection,
): Promise<void> => {
  if (element instanceof HTMLInputElement) {
    element.value = value;

    // Formik listens to specific events for validation
    await triggerReactEvents(element, ['input', 'change', 'blur']);

    // Also try to trigger Formik's setFieldValue if available
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
};

/**
 * Handle React Hook Form components
 */
const handleReactHookFormComponent = async (
  element: HTMLElement,
  value: string,
  _detection: ReactDetection,
): Promise<void> => {
  if (element instanceof HTMLInputElement) {
    element.value = value;

    // React Hook Form uses register() which attaches specific event handlers
    await triggerReactEvents(element, ['input', 'change', 'blur']);

    // Try to trigger React Hook Form's setValue if available
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
};

/**
 * Handle generic React components
 */
const handleGenericReactComponent = async (
  element: HTMLElement,
  value: string,
  _detection: ReactDetection,
): Promise<void> => {
  if (element instanceof HTMLInputElement) {
    element.value = value;
  } else if (element.isContentEditable) {
    element.textContent = value;
  }

  // Try to trigger state update through React's synthetic event system
  await triggerReactStateUpdate(element, value, _detection);
};

/**
 * Trigger React state updates using synthetic events
 */
const triggerReactStateUpdate = async (
  element: HTMLElement,
  value: string,
  _detection: ReactDetection,
): Promise<void> => {
  // For controlled components, we need to simulate user input to trigger state updates
  if (element instanceof HTMLInputElement) {
    // Clear the input first
    element.value = '';
    await triggerReactEvents(element, ['focus']);

    // Simulate typing character by character for controlled components
    for (let i = 0; i < value.length; i++) {
      const char = value[i];
      const newValue = value.substring(0, i + 1);

      // Update the value
      element.value = newValue;

      // Create synthetic events
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
const handleNextjsComponent = async (element: HTMLElement, value: string, detection: ReactDetection): Promise<void> => {
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
    await handleGenericReactComponent(element, value, detection);
  }
};

/**
 * Handle React 18+ concurrent mode components
 */
const handleReact18ConcurrentComponent = async (
  element: HTMLElement,
  value: string,
  detection: ReactDetection,
): Promise<void> => {
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
    await handleGenericReactComponent(element, value, detection);
  }
};

/**
 * Handle React Query/TanStack Query components
 */
const handleReactQueryComponent = async (
  element: HTMLElement,
  value: string,
  detection: ReactDetection,
): Promise<void> => {
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
    await handleGenericReactComponent(element, value, detection);
  }
};

/**
 * Handle Redux Toolkit components
 */
const handleReduxToolkitComponent = async (
  element: HTMLElement,
  value: string,
  detection: ReactDetection,
): Promise<void> => {
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
    await handleGenericReactComponent(element, value, detection);
  }
};

/**
 * Handle Zustand components
 */
const handleZustandComponent = async (
  element: HTMLElement,
  value: string,
  detection: ReactDetection,
): Promise<void> => {
  try {
    console.log('Handling Zustand component');

    if (element instanceof HTMLInputElement) {
      element.value = value;
      await triggerReactEvents(element, ['focus', 'input', 'change', 'blur']);
    }
  } catch (error) {
    console.error('Error in Zustand input handler:', error);
    await handleGenericReactComponent(element, value, detection);
  }
};

/**
 * Handle Jotai components
 */
const handleJotaiComponent = async (element: HTMLElement, value: string, detection: ReactDetection): Promise<void> => {
  try {
    console.log('Handling Jotai component');

    if (element instanceof HTMLInputElement) {
      element.value = value;
      await triggerReactEvents(element, ['focus', 'input', 'change', 'blur']);
    }
  } catch (error) {
    console.error('Error in Jotai input handler:', error);
    await handleGenericReactComponent(element, value, detection);
  }
};

/**
 * Handle Recoil components
 */
const handleRecoilComponent = async (element: HTMLElement, value: string, detection: ReactDetection): Promise<void> => {
  try {
    console.log('Handling Recoil component');

    if (element instanceof HTMLInputElement) {
      element.value = value;
      await triggerReactEvents(element, ['focus', 'input', 'change', 'blur']);
    }
  } catch (error) {
    console.error('Error in Recoil input handler:', error);
    await handleGenericReactComponent(element, value, detection);
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
// Exports (at end of file per ESLint import-x/exports-last rule)
// ============================================================================

export { detectTextField, detectInputField, updateTextField, updateContentEditable };
