/**
 * Runtime type guards and Zod schemas for safe type narrowing
 * These utilities replace unsafe type assertions (as, as unknown as)
 * with proper runtime validation using Zod and type guards
 */
import { z } from 'zod';

// ============================================================================
// DOM Element Type Guards
// ============================================================================

/**
 * Type guard for HTMLInputElement
 */
export const isHTMLInputElement = (element: unknown): element is HTMLInputElement =>
  element instanceof HTMLInputElement;

/**
 * Type guard for HTMLSelectElement
 */
export const isHTMLSelectElement = (element: unknown): element is HTMLSelectElement =>
  element instanceof HTMLSelectElement;

/**
 * Type guard for HTMLTextAreaElement
 */
export const isHTMLTextAreaElement = (element: unknown): element is HTMLTextAreaElement =>
  element instanceof HTMLTextAreaElement;

/**
 * Type guard for HTMLButtonElement
 */
export const isHTMLButtonElement = (element: unknown): element is HTMLButtonElement =>
  element instanceof HTMLButtonElement;

/**
 * Type guard for HTMLElement
 */
export const isHTMLElement = (element: unknown): element is HTMLElement => element instanceof HTMLElement;

/**
 * Type guard for HTMLDivElement
 */
export const isHTMLDivElement = (element: unknown): element is HTMLDivElement => element instanceof HTMLDivElement;

/**
 * Type guard for HTMLFormElement
 */
export const isHTMLFormElement = (element: unknown): element is HTMLFormElement => element instanceof HTMLFormElement;

/**
 * Type guard for HTMLLabelElement
 */
export const isHTMLLabelElement = (element: unknown): element is HTMLLabelElement =>
  element instanceof HTMLLabelElement;

/**
 * Type guard for Element
 */
export const isElement = (node: unknown): node is Element => node instanceof Element;

/**
 * Type guard for ShadowRoot
 */
export const isShadowRoot = (node: unknown): node is ShadowRoot => node instanceof ShadowRoot;

/**
 * Type guard for Document
 */
export const isDocument = (node: unknown): node is Document => node instanceof Document;

// ============================================================================
// Form Field Type Guards
// ============================================================================

/**
 * Check if an input element is a checkbox
 */
export const isCheckboxInput = (element: unknown): element is HTMLInputElement =>
  isHTMLInputElement(element) && element.type === 'checkbox';

/**
 * Check if an input element is a radio button
 */
export const isRadioInput = (element: unknown): element is HTMLInputElement =>
  isHTMLInputElement(element) && element.type === 'radio';

/**
 * Check if an input element is a file input
 */
export const isFileInput = (element: unknown): element is HTMLInputElement =>
  isHTMLInputElement(element) && element.type === 'file';

/**
 * Check if an input element is a text-like input
 */
export const isTextLikeInput = (element: unknown): element is HTMLInputElement =>
  isHTMLInputElement(element) && ['text', 'email', 'password', 'search', 'tel', 'url', 'number'].includes(element.type);

// ============================================================================
// Safe Element Query Utilities
// ============================================================================

/**
 * Safely query for an HTMLInputElement
 */
export const queryInputElement = (
  container: Document | Element | ShadowRoot,
  selector: string,
): HTMLInputElement | null => {
  const element = container.querySelector(selector);
  return isHTMLInputElement(element) ? element : null;
};

/**
 * Safely query for an HTMLSelectElement
 */
export const querySelectElement = (
  container: Document | Element | ShadowRoot,
  selector: string,
): HTMLSelectElement | null => {
  const element = container.querySelector(selector);
  return isHTMLSelectElement(element) ? element : null;
};

/**
 * Safely query for an HTMLDivElement
 */
export const queryDivElement = (
  container: Document | Element | ShadowRoot,
  selector: string,
): HTMLDivElement | null => {
  const element = container.querySelector(selector);
  return isHTMLDivElement(element) ? element : null;
};

/**
 * Safely query for an HTMLElement
 */
export const queryHTMLElement = (container: Document | Element | ShadowRoot, selector: string): HTMLElement | null => {
  const element = container.querySelector(selector);
  return isHTMLElement(element) ? element : null;
};

/**
 * Safely get element by ID as HTMLInputElement
 */
export const getInputElementById = (doc: Document, id: string): HTMLInputElement | null => {
  const element = doc.getElementById(id);
  return isHTMLInputElement(element) ? element : null;
};

/**
 * Safely get element by ID as HTMLSelectElement
 */
export const getSelectElementById = (doc: Document, id: string): HTMLSelectElement | null => {
  const element = doc.getElementById(id);
  return isHTMLSelectElement(element) ? element : null;
};

/**
 * Safely get element by ID as HTMLElement
 */
export const getHTMLElementById = (doc: Document, id: string): HTMLElement | null => {
  const element = doc.getElementById(id);
  return isHTMLElement(element) ? element : null;
};

// ============================================================================
// Zod Schemas for Runtime Objects
// ============================================================================

/**
 * Schema for objects with optional value property
 */
export const ValuePropertySchema = z.object({
  value: z.string().optional(),
});

/**
 * Selected option schema for form field dropdowns
 */
const SelectedOptionItemSchema = z.object({
  value: z.string(),
  text: z.string().optional(),
  label: z.string().optional(),
  selected: z.boolean().optional(),
});

/**
 * Schema for form-like objects with value
 */
export const FormFieldValueSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  checked: z.boolean().optional(),
  selectedOptions: z.array(SelectedOptionItemSchema).optional(),
});

/**
 * Primitive value schema for React props (covers most common prop types)
 */
const ReactPropValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

/**
 * Schema for React props record (used in fiber memoizedProps/pendingProps)
 */
const ReactPropsRecordSchema = z.record(z.string(), ReactPropValueSchema.nullable());

/**
 * Schema for React fiber-like object
 * memoizedProps and pendingProps are React internal structures
 */
export const ReactFiberSchema = z.object({
  memoizedProps: ReactPropsRecordSchema.optional(),
  pendingProps: ReactPropsRecordSchema.optional(),
});

/**
 * Form value schema for input fields
 */
const FormInputValueSchema = z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]);

/**
 * Schema for React props with value
 */
export const ReactPropsWithValueSchema = z.object({
  value: FormInputValueSchema.optional(),
  defaultValue: FormInputValueSchema.optional(),
});

/**
 * Next.js page props schema
 */
const NextPagePropsRecordSchema = z.record(z.string(), ReactPropValueSchema.nullable());

/**
 * Schema for window with __NEXT_DATA__
 */
export const NextDataWindowSchema = z.object({
  __NEXT_DATA__: z
    .object({
      props: z
        .object({
          pageProps: NextPagePropsRecordSchema.optional(),
        })
        .optional(),
    })
    .optional(),
});

/**
 * Schema for window with React DevTools hook
 */
export const ReactDevToolsWindowSchema = z.object({
  __REACT_DEVTOOLS_GLOBAL_HOOK__: z
    .object({
      renderers: z.map(z.number(), z.object({ version: z.string().optional() })).optional(),
    })
    .optional(),
});

/**
 * Schema for window with React global
 */
export const ReactGlobalWindowSchema = z.object({
  React: z
    .object({
      version: z.string().optional(),
    })
    .optional(),
});

/**
 * Redux DevTools extension function schema
 * The extension is a function that returns an object with methods
 */
const ReduxDevToolsExtensionFnSchema = z.function().args().returns(z.record(z.string(), z.function()));

/**
 * Schema for window with Redux DevTools
 */
export const ReduxDevToolsWindowSchema = z.object({
  __REDUX_DEVTOOLS_EXTENSION__: ReduxDevToolsExtensionFnSchema.optional(),
});

/**
 * Schema for element with event listeners (Chrome DevTools API)
 */
export const ElementWithEventListenersSchema = z.object({
  getEventListeners: z.function().optional(),
});

/**
 * Angular LView context schema (Angular stores component data as arrays)
 */
const AngularLViewContextSchema = z.array(z.union([z.string(), z.number(), z.boolean(), z.null(), z.object({})]));

/**
 * Schema for Angular context
 */
export const AngularContextSchema = z.object({
  __ngContext__: AngularLViewContextSchema.optional(),
});

/**
 * jQuery function schema (jQuery is a callable function with methods)
 */
const JQueryFunctionSchema = z
  .function()
  .args(z.union([z.string(), z.object({})]))
  .returns(z.object({}));

/**
 * Schema for jQuery window
 */
export const JQueryWindowSchema = z.object({
  jQuery: JQueryFunctionSchema.optional(),
});

/**
 * Schema for Formik bag
 */
export const FormikBagSchema = z.object({
  __formik: z
    .object({
      setFieldValue: z.function().optional(),
    })
    .optional(),
});

/**
 * Schema for React Hook Form controller
 */
export const ReactHookFormSchema = z.object({
  __reactHookForm: z
    .object({
      setValue: z.function().optional(),
    })
    .optional(),
});

// ============================================================================
// Safe Property Access Utilities
// ============================================================================

/**
 * Safely access a property from an unknown object
 */
export const safeGetProperty = <T>(obj: unknown, key: string): T | undefined => {
  if (obj !== null && typeof obj === 'object' && key in obj) {
    return (obj as Record<string, unknown>)[key] as T | undefined;
  }
  return undefined;
};

/**
 * Safely check if object has a property
 */
export const hasProperty = <K extends string>(obj: unknown, key: K): obj is Record<K, unknown> =>
  obj !== null && typeof obj === 'object' && key in obj;

/**
 * Safely access nested property using dot notation
 */
export const safeGetNestedProperty = <T>(obj: unknown, path: string): T | undefined => {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current as T | undefined;
};

// ============================================================================
// Environment Detection Schemas
// ============================================================================

/**
 * Schema for globalThis with import.meta
 */
export const GlobalWithImportMetaSchema = z.object({
  import: z
    .object({
      meta: z
        .object({
          env: z
            .object({
              VITE_WEBAPP_ENV: z.string().optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

/**
 * Schema for globalThis with process.env
 */
export const GlobalWithProcessEnvSchema = z.object({
  process: z
    .object({
      env: z.record(z.string().optional()).optional(),
    })
    .optional(),
});

// ============================================================================
// Type-Safe Parsing Utilities
// ============================================================================

// NOTE: safeParse is exported from services/schemas/index.ts (single source of truth)
// Use the version from schemas for consistent null return behavior

/**
 * Check if data matches a Zod schema
 */
export const matchesSchema = <T extends z.ZodType>(schema: T, data: unknown): data is z.infer<T> =>
  schema.safeParse(data).success;

/**
 * Parse data with fallback value
 */
export const parseWithFallback = <T extends z.ZodType>(schema: T, data: unknown, fallback: z.infer<T>): z.infer<T> => {
  const result = schema.safeParse(data);
  return result.success ? result.data : fallback;
};

// ============================================================================
// Form Field Definition Schemas
// ============================================================================

/**
 * Schema for option data (used in select, radio, checkbox fields)
 */
export const OptionDataSchema = z.object({
  value: z.union([z.string(), z.number()]).optional(),
  id: z.union([z.string(), z.number()]).optional(),
  key: z.string().optional(),
  label: z.string().optional(),
  text: z.string().optional(),
  name: z.string().optional(),
});

/**
 * Validation rule schema for form field constraints
 */
const ValidationRuleSchema = z.object({
  required: z.boolean().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  message: z.string().optional(),
});

/**
 * Schema for field data from API
 */
export const FieldDataSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string().optional(),
  key: z.string().optional(),
  type: z.string().optional(),
  fieldType: z.string().optional(),
  label: z.string().optional(),
  title: z.string().optional(),
  displayName: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  isRequired: z.boolean().optional(),
  options: z.array(OptionDataSchema).optional(),
  validation: z.record(z.string(), ValidationRuleSchema).optional(),
  dependencies: z.array(z.string()).optional(),
});

/**
 * Schema for step data in multi-step forms
 */
export const StepDataSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  key: z.string().optional(),
  label: z.string().optional(),
  fields: z.array(FieldDataSchema).optional(),
  order: z.number().optional(),
});

// ============================================================================
// API Response Schemas
// ============================================================================

/**
 * Processed field schema for form definitions from API
 */
const ProcessedFieldItemSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  label: z.string().optional(),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  required: z.boolean().optional(),
});

/**
 * Processed step schema for form definitions from API
 */
const ProcessedStepItemSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string().optional(),
  order: z.number().optional(),
  fields: z.array(ProcessedFieldItemSchema).optional(),
});

/**
 * Schema for processed form definition from API
 */
export const ProcessedFormDefinitionSchema = z.object({
  processed: z
    .object({
      fields: z.array(ProcessedFieldItemSchema).optional(),
      steps: z.array(ProcessedStepItemSchema).optional(),
    })
    .optional(),
});

/**
 * Generic data value schema for API responses
 */
const ApiDataValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])),
  z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
]);

/**
 * Schema for API response with data wrapper
 */
export const ApiResponseWrapperSchema = z.object({
  data: ApiDataValueSchema.optional(),
  result: ApiDataValueSchema.optional(),
  payload: ApiDataValueSchema.optional(),
});
