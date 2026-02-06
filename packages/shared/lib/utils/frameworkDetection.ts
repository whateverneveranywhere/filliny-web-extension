/**
 * Centralized Framework Detection Module
 *
 * Provides comprehensive detection for frontend frameworks and libraries,
 * including support for Shadow DOM traversal and observation.
 */

import { z } from 'zod';
import type {
  VueVnodeElement,
  SvelteMetaElement,
  FrameworkDetectionWindow,
  StateManagerDetectionWindow,
  SSRDetectionWindow,
} from '../types/dom.js';

/**
 * Enum for supported frontend frameworks
 * Used for type-safe framework identification across the codebase
 */
enum Framework {
  REACT = 'react',
  VUE = 'vue',
  ANGULAR = 'angular',
  SVELTE = 'svelte',
  QWIK = 'qwik',
  VANILLA = 'vanilla',
  SELECT2 = 'select2',
  ALPINE = 'alpine',
  HTMX = 'htmx',
  KNOCKOUT = 'knockout',
  LIT = 'lit',
  STENCIL = 'stencil',
  PREACT = 'preact',
  SOLID = 'solid',
  EMBER = 'ember',
}

/**
 * Enum for UI component libraries
 * Extends framework detection to specific component libraries
 */
enum UILibrary {
  MATERIAL_UI = 'material-ui',
  ANT_DESIGN = 'ant-design',
  CHAKRA_UI = 'chakra-ui',
  VUETIFY = 'vuetify',
  PRIMEVUE = 'primevue',
  ANGULAR_MATERIAL = 'angular-material',
  BOOTSTRAP = 'bootstrap',
  TAILWIND = 'tailwind',
  SHADCN = 'shadcn',
  RADIX = 'radix',
  HEADLESS_UI = 'headless-ui',
  SVELTE_UI = 'svelte-ui',
  UNKNOWN = 'unknown',
}

/**
 * Enum for form libraries
 */
enum FormLibrary {
  FORMIK = 'formik',
  REACT_HOOK_FORM = 'react-hook-form',
  FINAL_FORM = 'final-form',
  VUELIDATE = 'vuelidate',
  VEE_VALIDATE = 'vee-validate',
  ANGULAR_FORMS = 'angular-forms',
  SVELTE_FORMS = 'svelte-forms',
  UNKNOWN = 'unknown',
}

/**
 * Enum for state management libraries
 */
enum StateManager {
  REDUX = 'redux',
  REDUX_TOOLKIT = 'redux-toolkit',
  ZUSTAND = 'zustand',
  JOTAI = 'jotai',
  RECOIL = 'recoil',
  MOBX = 'mobx',
  REACT_QUERY = 'react-query',
  PINIA = 'pinia',
  VUEX = 'vuex',
  NGRX = 'ngrx',
  AKITA = 'akita',
  UNKNOWN = 'unknown',
}

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Framework detection result schema
 */
const FrameworkDetectionResultSchema = z.object({
  framework: z.nativeEnum(Framework),
  version: z.string().optional(),
  uiLibrary: z.nativeEnum(UILibrary),
  formLibrary: z.nativeEnum(FormLibrary),
  stateManager: z.nativeEnum(StateManager),
  isSSR: z.boolean(),
  isSPA: z.boolean(),
  confidence: z.number(),
  detectionMethod: z.string(),
});

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

/**
 * Result of framework detection
 */
type FrameworkDetectionResult = z.infer<typeof FrameworkDetectionResultSchema>;

/**
 * Shadow DOM observer registry (internal)
 */
interface ShadowDOMObserver {
  observer: MutationObserver;
  roots: Set<ShadowRoot>;
}

// Global registry for Shadow DOM observers
const shadowDOMObservers = new Map<Document, ShadowDOMObserver>();

// Original attachShadow reference
let originalAttachShadow: typeof HTMLElement.prototype.attachShadow | null = null;

// Callbacks to be invoked when new Shadow DOM roots are attached
const shadowRootCallbacks: Set<(root: ShadowRoot, host: HTMLElement) => void> = new Set();

/**
 * Observe a shadow root for changes and trigger callbacks
 */
const observeShadowRoot = (shadowRoot: ShadowRoot, host: HTMLElement): void => {
  // Notify all registered callbacks
  for (const callback of shadowRootCallbacks) {
    try {
      callback(shadowRoot, host);
    } catch (error) {
      console.error('Error in shadow root callback:', error);
    }
  }
};

/**
 * Find existing shadow roots in the document
 */
const findExistingShadowRoots = (root: Document | ShadowRoot | Element, observerData: ShadowDOMObserver): void => {
  const elements = Array.from(root.querySelectorAll('*'));
  for (const element of elements) {
    if (element instanceof HTMLElement && element.shadowRoot) {
      if (!observerData.roots.has(element.shadowRoot)) {
        observeShadowRoot(element.shadowRoot, element);
        observerData.roots.add(element.shadowRoot);
        // Recursively find shadow roots within this shadow root
        findExistingShadowRoots(element.shadowRoot, observerData);
      }
    }
  }
};

/**
 * Initialize Shadow DOM observation for a document
 * Patches attachShadow to observe new shadow roots automatically
 */
const initializeShadowDOMObservation = (
  doc: Document,
  onShadowRootAttached?: (root: ShadowRoot, host: HTMLElement) => void,
): void => {
  // Skip if already initialized
  if (shadowDOMObservers.has(doc)) {
    if (onShadowRootAttached) {
      shadowRootCallbacks.add(onShadowRootAttached);
    }
    return;
  }

  // Store original attachShadow if not already stored
  if (!originalAttachShadow) {
    originalAttachShadow = HTMLElement.prototype.attachShadow;
  }

  // Register callback if provided
  if (onShadowRootAttached) {
    shadowRootCallbacks.add(onShadowRootAttached);
  }

  const shadowObserverData: ShadowDOMObserver = {
    observer: new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLElement && node.shadowRoot) {
            observeShadowRoot(node.shadowRoot, node);
          }
        }
      }
    }),
    roots: new Set(),
  };

  // Patch attachShadow to intercept new shadow roots
  HTMLElement.prototype.attachShadow = function (this: HTMLElement, init: ShadowRootInit): ShadowRoot {
    const shadowRoot = originalAttachShadow!.call(this, init);
    observeShadowRoot(shadowRoot, this);
    return shadowRoot;
  };

  // Start observing the document for dynamically added elements with shadow roots
  shadowObserverData.observer.observe(doc, {
    childList: true,
    subtree: true,
  });

  // Find and observe existing shadow roots
  findExistingShadowRoots(doc, shadowObserverData);

  shadowDOMObservers.set(doc, shadowObserverData);
};

/**
 * Get all elements including those in Shadow DOM
 */
const querySelectorAllDeep = <T extends Element = Element>(
  selector: string,
  root: Document | Element | ShadowRoot = document,
): T[] => {
  const results: T[] = [];

  // Query the root
  try {
    const elements = root.querySelectorAll<T>(selector);
    results.push(...Array.from(elements));
  } catch {
    // Invalid selector, continue
  }

  // Query all shadow roots
  const allElements = Array.from(root.querySelectorAll('*'));
  for (const element of allElements) {
    if (element instanceof HTMLElement && element.shadowRoot) {
      results.push(...querySelectorAllDeep<T>(selector, element.shadowRoot));
    }
  }

  return results;
};

/**
 * Query a single element including Shadow DOM
 */
const querySelectorDeep = <T extends Element = Element>(
  selector: string,
  root: Document | Element | ShadowRoot = document,
): T | null => {
  // Try the root first
  try {
    const element = root.querySelector<T>(selector);
    if (element) return element;
  } catch {
    // Invalid selector, continue
  }

  // Search shadow roots
  const allElements = Array.from(root.querySelectorAll('*'));
  for (const element of allElements) {
    if (element instanceof HTMLElement && element.shadowRoot) {
      const found = querySelectorDeep<T>(selector, element.shadowRoot);
      if (found) return found;
    }
  }

  return null;
};

/**
 * Cleanup Shadow DOM observation
 */
const cleanupShadowDOMObservation = (doc?: Document): void => {
  if (doc) {
    const observerData = shadowDOMObservers.get(doc);
    if (observerData) {
      observerData.observer.disconnect();
      shadowDOMObservers.delete(doc);
    }
  } else {
    // Cleanup all observers
    for (const observerData of shadowDOMObservers.values()) {
      observerData.observer.disconnect();
    }
    shadowDOMObservers.clear();

    // Restore original attachShadow
    if (originalAttachShadow) {
      HTMLElement.prototype.attachShadow = originalAttachShadow;
      originalAttachShadow = null;
    }
  }

  shadowRootCallbacks.clear();
};

/**
 * Detect Vue.js framework on an element
 */
const detectVue = (element: Element): boolean =>
  // Check for Vue.js specific attributes and properties
  element.hasAttribute('v-model') ||
  element.hasAttribute('v-bind') ||
  element.hasAttribute('v-on') ||
  element.hasAttribute('v-if') ||
  element.hasAttribute('v-for') ||
  element.hasAttribute('v-show') ||
  element.hasAttribute(':class') ||
  element.hasAttribute(':style') ||
  element.hasAttribute('@click') ||
  element.hasAttribute('@input') ||
  element.hasAttribute('@change') ||
  // Check for Vue 2 instance
  '__vue__' in element ||
  // Check for Vue 3 parent component
  '__vueParentComponent__' in element ||
  // Check for Vue 3 proxy
  (element as unknown as VueVnodeElement).__vnode__ !== undefined ||
  // Check for data-v-* scoped style attributes (Vue SFC)
  Array.from(element.attributes).some(attr => attr.name.startsWith('data-v-'));

/**
 * Detect React framework on an element
 */
const detectReact = (element: Element): boolean => {
  // Check for React Fiber (React 16+)
  const hasFiber = Object.keys(element).some(
    key => key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance'),
  );
  if (hasFiber) return true;

  // Check for React event handlers
  const hasReactEvents = Object.keys(element).some(key => key.startsWith('__reactEventHandlers'));
  if (hasReactEvents) return true;

  // Check for React props
  const hasReactProps = Object.keys(element).some(key => key.startsWith('__reactProps'));
  if (hasReactProps) return true;

  // Check for data attributes
  if (element.hasAttribute('data-reactid') || element.hasAttribute('data-react-class')) {
    return true;
  }

  return false;
};

/**
 * Detect Angular framework on an element
 */
const detectAngular = (element: Element): boolean =>
  // Check for Angular directives
  element.hasAttribute('ng-model') ||
  element.hasAttribute('[(ngModel)]') ||
  element.hasAttribute('formControlName') ||
  element.hasAttribute('[formControl]') ||
  element.hasAttribute('ngClass') ||
  element.hasAttribute('[ngClass]') ||
  element.hasAttribute('*ngIf') ||
  element.hasAttribute('*ngFor') ||
  // Check for Angular context
  '__ngContext__' in element ||
  // Check for ng-* attributes
  Array.from(element.attributes).some(attr => attr.name.startsWith('ng-') || attr.name.startsWith('_ng'));

/**
 * Detect Svelte framework on an element
 */
const detectSvelte = (element: Element): boolean =>
  // Check for Svelte-specific attributes
  Array.from(element.attributes).some(attr => attr.name.startsWith('svelte-')) ||
  // Check for Svelte action attribute pattern
  element.hasAttribute('use:action') ||
  // Check for Svelte bind attributes
  Array.from(element.attributes).some(attr => attr.name.startsWith('bind:')) ||
  // Check for Svelte event handling pattern
  Array.from(element.attributes).some(attr => attr.name.startsWith('on:')) ||
  // Check for Svelte class directive
  Array.from(element.attributes).some(attr => attr.name.startsWith('class:')) ||
  // Check for Svelte component property
  '__svelte_component' in element ||
  (element as unknown as SvelteMetaElement).__svelte_meta !== undefined;

/**
 * Detect Qwik framework on an element
 */
const detectQwik = (element: Element): boolean =>
  // Check for Qwik-specific attributes
  element.hasAttribute('q:slot') ||
  element.hasAttribute('q:id') ||
  element.hasAttribute('on:click') ||
  element.hasAttribute('on:qvisible') ||
  // Check for Qwik serialization attributes
  Array.from(element.attributes).some(attr => attr.name.startsWith('q:') || attr.name.startsWith('on:')) ||
  // Check for Qwik component marker
  '__qwik__' in element;

/**
 * Detect Alpine.js framework on an element
 */
const detectAlpine = (element: Element): boolean =>
  element.hasAttribute('x-data') ||
  element.hasAttribute('x-model') ||
  element.hasAttribute('x-bind') ||
  element.hasAttribute('x-on') ||
  element.hasAttribute('@click') ||
  element.hasAttribute('@input') ||
  element.closest('[x-data]') !== null;

/**
 * Detect HTMX on an element
 */
const detectHTMX = (element: Element): boolean =>
  element.hasAttribute('hx-post') ||
  element.hasAttribute('hx-get') ||
  element.hasAttribute('hx-put') ||
  element.hasAttribute('hx-delete') ||
  element.hasAttribute('hx-trigger') ||
  element.closest('[hx-post], [hx-get], [hx-put], [hx-delete]') !== null;

/**
 * Detect Knockout.js on an element
 */
const detectKnockout = (element: Element): boolean =>
  element.hasAttribute('data-bind') || element.closest('[data-bind]') !== null;

/**
 * Detect Lit element
 */
const detectLit = (element: Element): boolean =>
  '__litElement' in element || (element.tagName.includes('-') && element.shadowRoot !== null);

/**
 * Detect Stencil component
 */
const detectStencil = (element: Element): boolean =>
  element.hasAttribute('s-id') || element.hasAttribute('s-cr') || '__stencil' in element;

/**
 * Detect Preact on an element
 */
const detectPreact = (element: Element): boolean => {
  const hasPreactAttr = Object.keys(element).some(key => key.startsWith('__preactattr_'));
  if (hasPreactAttr) return true;
  return '__c' in element && '__e' in element;
};

/**
 * Detect Solid.js on an element
 */
const detectSolid = (element: Element): boolean =>
  element.hasAttribute('data-hk') || element.hasAttribute('data-solid') || element.closest('[data-hk]') !== null;

/**
 * Detect Ember.js on an element
 */
const detectEmber = (element: Element): boolean =>
  (element.id && element.id.startsWith('ember')) ||
  element.classList.contains('ember-view') ||
  element.closest('.ember-view') !== null;

/**
 * Detect the framework used by an element
 */
const detectFrameworkForElement = (element: Element): Framework => {
  if (detectReact(element)) return Framework.REACT;
  // Check Preact before React since Preact elements may also pass React checks
  if (detectPreact(element)) return Framework.PREACT;
  if (detectVue(element)) return Framework.VUE;
  if (detectAngular(element)) return Framework.ANGULAR;
  if (detectSvelte(element)) return Framework.SVELTE;
  if (detectQwik(element)) return Framework.QWIK;
  if (detectAlpine(element)) return Framework.ALPINE;
  if (detectHTMX(element)) return Framework.HTMX;
  if (detectKnockout(element)) return Framework.KNOCKOUT;
  if (detectLit(element)) return Framework.LIT;
  if (detectStencil(element)) return Framework.STENCIL;
  if (detectSolid(element)) return Framework.SOLID;
  if (detectEmber(element)) return Framework.EMBER;
  return Framework.VANILLA;
};

/**
 * Detect the primary framework used in the document
 */
const detectDocumentFramework = (doc: Document = document): Framework => {
  // Check for global framework indicators
  const win = doc.defaultView as FrameworkDetectionWindow | null;

  if (!win) return Framework.VANILLA;

  // React detection
  if (
    win.__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
    win.__NEXT_DATA__ ||
    win.React ||
    doc.querySelector('[data-reactroot]') ||
    doc.getElementById('__next') ||
    doc.querySelector('script[src*="react"]')
  ) {
    return Framework.REACT;
  }

  // Vue detection
  if (
    win.__VUE__ ||
    win.__VUE_DEVTOOLS_GLOBAL_HOOK__ ||
    win.__NUXT__ ||
    win.Vue ||
    doc.getElementById('app')?.hasAttribute('data-v-app') ||
    doc.querySelector('[data-v-app]') ||
    doc.querySelector('script[src*="vue"]')
  ) {
    return Framework.VUE;
  }

  // Angular detection
  if (
    win.angular ||
    win.ng?.probe ||
    doc.querySelector('[ng-app]') ||
    doc.querySelector('[ng-controller]') ||
    doc.querySelector('app-root') ||
    doc.querySelector('script[src*="angular"]')
  ) {
    return Framework.ANGULAR;
  }

  // Svelte detection
  if (win.__SVELTE__ || doc.querySelector('[class*="svelte-"]') || doc.querySelector('script[src*="svelte"]')) {
    return Framework.SVELTE;
  }

  // Qwik detection
  if (win.__QWIK_DEV__ || doc.querySelector('[q\\:container]') || doc.querySelector('script[src*="qwik"]')) {
    return Framework.QWIK;
  }

  // Alpine.js detection
  if (doc.querySelector('[x-data]') || doc.querySelector('script[src*="alpine"]')) {
    return Framework.ALPINE;
  }

  // HTMX detection
  if (doc.querySelector('[hx-post], [hx-get]') || doc.querySelector('script[src*="htmx"]')) {
    return Framework.HTMX;
  }

  // Knockout.js detection
  if (
    (win as unknown as Record<string, unknown>).ko ||
    doc.querySelector('[data-bind]') ||
    doc.querySelector('script[src*="knockout"]')
  ) {
    return Framework.KNOCKOUT;
  }

  // Lit detection
  if (doc.querySelector('script[src*="lit"]')) {
    return Framework.LIT;
  }

  // Preact detection
  if (doc.querySelector('script[src*="preact"]')) {
    return Framework.PREACT;
  }

  // Solid.js detection
  if (doc.querySelector('[data-hk]') || doc.querySelector('script[src*="solid"]')) {
    return Framework.SOLID;
  }

  // Ember.js detection
  if (
    (win as unknown as Record<string, unknown>).Ember ||
    doc.querySelector('.ember-view') ||
    doc.querySelector('script[src*="ember"]')
  ) {
    return Framework.EMBER;
  }

  return Framework.VANILLA;
};

/**
 * Detect UI library used
 */
const detectUILibrary = (element: Element): UILibrary => {
  const className = element.className?.toString().toLowerCase() || '';
  const parentClasses =
    (element.parentElement?.className?.toString().toLowerCase() || '') +
    (element.closest('[class]')?.className?.toString().toLowerCase() || '');
  const combinedClasses = `${className} ${parentClasses}`;

  // Material-UI / MUI
  if (
    combinedClasses.includes('mui-') ||
    combinedClasses.includes('material-ui') ||
    element.closest('[class*="Mui"]')
  ) {
    return UILibrary.MATERIAL_UI;
  }

  // Ant Design
  if (combinedClasses.includes('ant-') || combinedClasses.includes('antd') || element.closest('[class*="ant-"]')) {
    return UILibrary.ANT_DESIGN;
  }

  // Chakra UI
  if (combinedClasses.includes('chakra-') || element.closest('[class*="chakra"]')) {
    return UILibrary.CHAKRA_UI;
  }

  // Vuetify
  if (combinedClasses.includes('v-') || element.closest('[class*="v-"]')) {
    return UILibrary.VUETIFY;
  }

  // PrimeVue
  if (combinedClasses.includes('p-') || element.closest('[class*="p-component"]')) {
    return UILibrary.PRIMEVUE;
  }

  // Angular Material
  if (combinedClasses.includes('mat-') || element.closest('[class*="mat-"]')) {
    return UILibrary.ANGULAR_MATERIAL;
  }

  // Bootstrap
  if (
    combinedClasses.includes('form-control') ||
    combinedClasses.includes('btn-') ||
    element.closest('[class*="bootstrap"]')
  ) {
    return UILibrary.BOOTSTRAP;
  }

  // Shadcn/Radix
  if (element.closest('[data-radix-collection-item]') || element.closest('[data-slot]')) {
    return UILibrary.SHADCN;
  }

  // Headless UI
  if (element.closest('[data-headlessui-state]')) {
    return UILibrary.HEADLESS_UI;
  }

  return UILibrary.UNKNOWN;
};

/**
 * Detect form library used
 */
const detectFormLibrary = (element: Element): FormLibrary => {
  // Formik
  if (element.closest('[class*="formik"]') || element.hasAttribute('data-formik')) {
    return FormLibrary.FORMIK;
  }

  // React Hook Form
  if (element.hasAttribute('data-react-hook-form') || element.closest('[data-react-hook-form]')) {
    return FormLibrary.REACT_HOOK_FORM;
  }

  // Final Form
  if (element.closest('[data-final-form]')) {
    return FormLibrary.FINAL_FORM;
  }

  // Vuelidate
  if (element.hasAttribute('v-validate') || element.closest('[v-validate]')) {
    return FormLibrary.VUELIDATE;
  }

  // Vee-validate
  if (element.closest('[class*="vee-"]') || element.hasAttribute('v-field')) {
    return FormLibrary.VEE_VALIDATE;
  }

  // Angular Forms
  if (element.hasAttribute('formControlName') || element.hasAttribute('[formControl]')) {
    return FormLibrary.ANGULAR_FORMS;
  }

  return FormLibrary.UNKNOWN;
};

/**
 * Detect state management library used
 */
const detectStateManager = (doc: Document = document): StateManager => {
  const win = doc.defaultView as StateManagerDetectionWindow | null;

  if (!win) return StateManager.UNKNOWN;

  // Redux / Redux Toolkit
  if (win.__REDUX_DEVTOOLS_EXTENSION__ || doc.querySelector('[data-redux]') || doc.querySelector('.redux-store')) {
    return StateManager.REDUX_TOOLKIT;
  }

  // MobX
  if (win.__MOBX_DEVTOOLS_GLOBAL_HOOK__ || doc.querySelector('[data-mobx]')) {
    return StateManager.MOBX;
  }

  // Pinia
  if (win.__PINIA__ || win.__VUE_DEVTOOLS_GLOBAL_HOOK__?.pinia) {
    return StateManager.PINIA;
  }

  // Zustand (harder to detect, check for store patterns)
  if (doc.querySelector('[data-zustand]') || doc.querySelector('.zustand-store')) {
    return StateManager.ZUSTAND;
  }

  // Jotai
  if (doc.querySelector('[data-jotai]') || doc.querySelector('.jotai-atom')) {
    return StateManager.JOTAI;
  }

  // Recoil
  if (doc.querySelector('[data-recoil]') || doc.querySelector('.recoil-root')) {
    return StateManager.RECOIL;
  }

  // React Query
  if (doc.querySelector('[data-react-query]') || doc.querySelector('.react-query-client')) {
    return StateManager.REACT_QUERY;
  }

  // NgRx
  if (win.__NGRX_STORE_DEV_TOOLS__) {
    return StateManager.NGRX;
  }

  return StateManager.UNKNOWN;
};

/**
 * Comprehensive framework detection for a document
 */
const detectFramework = (doc: Document = document): FrameworkDetectionResult => {
  const framework = detectDocumentFramework(doc);
  const stateManager = detectStateManager(doc);

  // Find a representative form element for UI/form library detection
  const formElement = doc.querySelector('form, [role="form"]');
  const uiLibrary = formElement ? detectUILibrary(formElement) : UILibrary.UNKNOWN;
  const formLibrary = formElement ? detectFormLibrary(formElement) : FormLibrary.UNKNOWN;

  // Detect SSR/SPA
  const win = doc.defaultView as SSRDetectionWindow | null;

  const isSSR = !!(win?.__NEXT_DATA__ || win?.__NUXT__ || win?.__SVELTEKIT_APP_VERSION__);
  const isSPA = !isSSR && framework !== Framework.VANILLA;

  return {
    framework,
    uiLibrary,
    formLibrary,
    stateManager,
    isSSR,
    isSPA,
    confidence: framework !== Framework.VANILLA ? 0.9 : 0.5,
    detectionMethod: 'comprehensive',
  };
};

/**
 * Check if an element is inside a Shadow DOM
 */
const isInShadowDOM = (element: Element): boolean => {
  let node: Node | null = element;
  while (node) {
    if (node instanceof ShadowRoot) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
};

/**
 * Get the root of an element (document or shadow root)
 */
const getRoot = (element: Element): Document | ShadowRoot => element.getRootNode() as Document | ShadowRoot;

/**
 * Traverse all shadow roots from an element
 */
const traverseShadowRoots = (element: Element, callback: (shadowRoot: ShadowRoot) => void): void => {
  const allElements = Array.from(element.querySelectorAll('*'));
  for (const el of allElements) {
    if (el instanceof HTMLElement && el.shadowRoot) {
      callback(el.shadowRoot);
      traverseShadowRoots(el.shadowRoot as unknown as Element, callback);
    }
  }
};

// ============================================================================
// All exports at end of file to comply with import-x/exports-last
// ============================================================================

export { Framework, UILibrary, FormLibrary, StateManager };
export { FrameworkDetectionResultSchema };
export type { FrameworkDetectionResult };
export {
  initializeShadowDOMObservation,
  querySelectorAllDeep,
  querySelectorDeep,
  cleanupShadowDOMObservation,
  detectVue,
  detectReact,
  detectAngular,
  detectSvelte,
  detectQwik,
  detectAlpine,
  detectHTMX,
  detectKnockout,
  detectLit,
  detectStencil,
  detectPreact,
  detectSolid,
  detectEmber,
  detectFrameworkForElement,
  detectDocumentFramework,
  detectUILibrary,
  detectFormLibrary,
  detectStateManager,
  detectFramework,
  isInShadowDOM,
  getRoot,
  traverseShadowRoots,
};
