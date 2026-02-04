/**
 * DOM Type Extensions
 *
 * Properly defined type extensions for DOM elements and window objects.
 * These replace inline type assertions like `as HTMLElement & { ... }`.
 *
 * NOTE: Framework detection interfaces intentionally use `unknown` for framework
 * internal properties because the exact shape is framework-specific and not
 * guaranteed across versions. Use the Zod schemas from runtime-type-guards.ts
 * for runtime validation when accessing these properties.
 */
import { z } from 'zod';

// ============================================================================
// HTMLElement Extensions
// ============================================================================

/**
 * HTMLElement with Shadow DOM access
 * Used for elements that may have attached shadow roots
 */
export interface ShadowDOMHostElement extends HTMLElement {
  shadowRoot: ShadowRoot | null;
}

/**
 * HTMLInputElement with Filliny-specific file storage
 * Used to store File objects directly on the input element
 */
export interface FillinyFileInputElement extends HTMLInputElement {
  __fillinyFiles?: File[];
}

/**
 * Element with Chrome DevTools event listeners API
 * Note: getEventListeners is only available in Chrome DevTools context
 */
export interface ElementWithEventListeners {
  getEventListeners?: () => Record<string, unknown[]>;
}

// ============================================================================
// Vue Framework Detection Extensions
// ============================================================================

/**
 * Element with Vue 3 vnode property
 */
export interface VueVnodeElement {
  __vnode__?: unknown;
}

/**
 * Element with Svelte meta property
 */
export interface SvelteMetaElement {
  __svelte_meta?: unknown;
}

/**
 * Element with Angular context property
 */
export interface AngularContextElement extends HTMLElement {
  __ngContext__?: unknown;
}

/**
 * Element with Svelte component property
 */
export interface SvelteComponentElement extends HTMLElement {
  __svelte_component__?: unknown;
}

// ============================================================================
// Form Library Element Extensions
// ============================================================================

/**
 * Element with Formik form bag
 * Used for accessing Formik's setFieldValue method
 */
export interface FormikInputElement extends HTMLInputElement {
  __formik?: {
    setFieldValue?: (name: string, value: string) => void;
  };
}

/**
 * Element with React Hook Form controller
 * Used for accessing React Hook Form's setValue method
 */
export interface ReactHookFormInputElement extends HTMLInputElement {
  __reactHookForm?: {
    setValue?: (name: string, value: string) => void;
  };
}

// ============================================================================
// React Fiber Extensions
// ============================================================================

/**
 * React Fiber props structure
 * Used for accessing controlled/uncontrolled component state
 */
export interface ReactFiberProps {
  memoizedProps?: { value?: unknown; defaultValue?: unknown };
  pendingProps?: { value?: unknown; defaultValue?: unknown };
}

/**
 * Element with React Fiber attached
 * React attaches fiber objects with keys like __reactFiber$* or __reactInternalInstance$*
 */
export interface ReactFiberElement extends HTMLElement {
  [key: `__reactFiber${string}`]: ReactFiberProps;
  [key: `__reactInternalInstance${string}`]: ReactFiberProps;
}

// ============================================================================
// Event Handler Types
// ============================================================================

/**
 * Generic event handler function type
 */
export type DOMEventHandler = (this: HTMLElement, event: Event) => void;

// ============================================================================
// jQuery Extensions
// ============================================================================

/**
 * jQuery static function interface
 */
export interface JQueryStatic {
  (element: HTMLElement): { trigger: (eventName: string) => void };
}

/**
 * Window with jQuery global
 */
export interface JQueryWindow extends Window {
  jQuery?: JQueryStatic;
}

// ============================================================================
// Window Extensions for Framework Detection
// ============================================================================

/**
 * Window with React DevTools global hook
 */
export interface ReactDevToolsWindow extends Window {
  __REACT_DEVTOOLS_GLOBAL_HOOK__?: {
    renderers?: Map<number, { version?: string }>;
    [key: string]: unknown;
  };
}

/**
 * Window with Vue DevTools global hook
 */
export interface VueDevToolsWindow extends Window {
  __VUE_DEVTOOLS_GLOBAL_HOOK__?: {
    pinia?: unknown;
    [key: string]: unknown;
  };
  __VUE__?: unknown;
  Vue?: { version?: string };
}

/**
 * Window with Nuxt global data
 */
export interface NuxtWindow extends Window {
  __NUXT__?: unknown;
}

/**
 * Window with Next.js global data
 */
export interface NextJsWindow extends Window {
  __NEXT_DATA__?: {
    props?: unknown;
    [key: string]: unknown;
  };
}

/**
 * Window with React global (for direct React usage)
 */
export interface ReactGlobalWindow extends Window {
  React?: { version?: string };
  createRoot?: unknown;
}

/**
 * Window with Redux DevTools extension
 */
export interface ReduxDevToolsWindow extends Window {
  __REDUX_DEVTOOLS_EXTENSION__?: unknown;
}

/**
 * Window with MobX DevTools global hook
 */
export interface MobXDevToolsWindow extends Window {
  __MOBX_DEVTOOLS_GLOBAL_HOOK__?: unknown;
}

/**
 * Window with Pinia state manager
 */
export interface PiniaWindow extends Window {
  __PINIA__?: unknown;
}

/**
 * Window with NgRx store dev tools
 */
export interface NgRxDevToolsWindow extends Window {
  __NGRX_STORE_DEV_TOOLS__?: unknown;
}

/**
 * Window with Angular globals
 */
export interface AngularWindow extends Window {
  angular?: unknown;
  ng?: { probe?: unknown };
}

/**
 * Window with Svelte globals
 */
export interface SvelteWindow extends Window {
  __SVELTE__?: unknown;
}

/**
 * Window with SvelteKit app version
 */
export interface SvelteKitWindow extends Window {
  __SVELTEKIT_APP_VERSION__?: unknown;
}

/**
 * Window with Qwik globals
 */
export interface QwikWindow extends Window {
  __QWIK_DEV__?: unknown;
}

/**
 * Combined window type for document framework detection
 * Includes all framework-related global properties
 */
export interface FrameworkDetectionWindow extends Window {
  // React
  __REACT_DEVTOOLS_GLOBAL_HOOK__?: {
    renderers?: Map<number, { version?: string }>;
    [key: string]: unknown;
  };
  React?: { version?: string };
  createRoot?: unknown;
  __NEXT_DATA__?: { props?: unknown; [key: string]: unknown };

  // Vue
  __VUE_DEVTOOLS_GLOBAL_HOOK__?: { pinia?: unknown; [key: string]: unknown };
  __VUE__?: unknown;
  Vue?: { version?: string };
  __NUXT__?: unknown;

  // Angular
  angular?: unknown;
  ng?: { probe?: unknown };

  // Svelte
  __SVELTE__?: unknown;
  __SVELTEKIT_APP_VERSION__?: unknown;

  // Qwik
  __QWIK_DEV__?: unknown;

  // State managers
  __REDUX_DEVTOOLS_EXTENSION__?: unknown;
  __MOBX_DEVTOOLS_GLOBAL_HOOK__?: unknown;
  __PINIA__?: unknown;
  __NGRX_STORE_DEV_TOOLS__?: unknown;
}

/**
 * Window type for state manager detection
 */
export interface StateManagerDetectionWindow extends Window {
  __REDUX_DEVTOOLS_EXTENSION__?: unknown;
  __MOBX_DEVTOOLS_GLOBAL_HOOK__?: unknown;
  __PINIA__?: unknown;
  __VUE_DEVTOOLS_GLOBAL_HOOK__?: { pinia?: unknown };
  __NGRX_STORE_DEV_TOOLS__?: unknown;
}

/**
 * Window type for SSR detection
 */
export interface SSRDetectionWindow extends Window {
  __NEXT_DATA__?: unknown;
  __NUXT__?: unknown;
  __SVELTEKIT_APP_VERSION__?: unknown;
}

// ============================================================================
// Function Parameter Types (Zod Schemas)
// ============================================================================

/**
 * Schema for select element options in tests
 */
export const SelectOptionSchema = z.object({
  value: z.string(),
  text: z.string(),
  selected: z.boolean().optional(),
});
export type SelectOption = z.infer<typeof SelectOptionSchema>;

/**
 * Schema for make-manifest plugin configuration
 */
export const MakeManifestConfigSchema = z.object({
  outDir: z.string(),
});
export type MakeManifestConfig = z.infer<typeof MakeManifestConfigSchema>;

/**
 * Schema for form container scoring result
 */
export const ContainerScoreSchema = z.object({
  score: z.number(),
  reasons: z.array(z.string()),
});
export type ContainerScore = z.infer<typeof ContainerScoreSchema>;

/**
 * TimeoutResult is a generic interface that must remain hardcoded
 * because Zod doesn't support generic type inference in the same way.
 * This is acceptable per the type-inference-patterns.md guidelines
 * for complex generic types that can't be expressed with Zod.
 */
export interface TimeoutResult<T> {
  promise: Promise<T>;
  cleanup: () => void;
}

// ============================================================================
// Metadata Type Extensions (Zod Schemas)
// ============================================================================

/**
 * Schema for accepted file types in file uploads
 */
export const AcceptedTypeSchema = z.object({
  type: z.enum(['extension', 'mime']),
  value: z.string(),
  category: z.enum(['image', 'document', 'video', 'audio', 'archive', 'text', 'other']),
});

/**
 * Schema for file input configuration
 */
export const FileInputConfigSchema = z.object({
  multiple: z.boolean().optional(),
});

/**
 * Schema for file upload data
 */
export const FileUploadDataConfigSchema = z.object({
  acceptedTypes: z.array(AcceptedTypeSchema).optional(),
  fileInput: FileInputConfigSchema.optional(),
});

/**
 * Schema for field metadata with file upload data
 * Used to access fileUploadData from field metadata
 */
export const FileUploadMetadataSchema = z.object({
  fileUploadData: FileUploadDataConfigSchema.optional(),
});
export type FileUploadMetadata = z.infer<typeof FileUploadMetadataSchema>;
