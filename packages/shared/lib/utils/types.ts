import { z } from 'zod';
import type { COLORS } from './const.js';
import type { TupleToUnion } from 'type-fest';

// Type definitions
type ColorType = 'success' | 'info' | 'error' | 'warning' | keyof typeof COLORS;
type ExcludeValuesFromBaseArrayType<B extends string[], E extends (string | number)[]> = Exclude<
  TupleToUnion<B>,
  TupleToUnion<E>
>[];
type ManifestType = chrome.runtime.ManifestV3;

// Types moved from shared-types.ts during merge
type ValueOf<T> = T[keyof T];

// Note: WebappEnvs is exported from ../types/enums.js (single source of truth)
// Do NOT re-export here to avoid duplicate exports

// ============================================================================
// Zod Schemas for Form Types
// ============================================================================

/**
 * Form option schema for select/dropdown options
 */
const FormOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

/**
 * Form values schema - supports various form input types
 */
const FormValuesSchema = z.union([z.string(), z.number(), z.null(), z.boolean(), z.undefined()]);

/**
 * General form props schema - base configuration for form inputs
 */
const GeneralFormPropsSchema = z.object({
  className: z.string().optional(),
  onChange: z
    .function()
    .args(FormValuesSchema)
    .returns(z.union([z.void(), z.promise(z.void())]))
    .optional(),
  name: z.string(),
  id: z.string().optional(),
  title: z.string(),
  value: FormValuesSchema.optional(),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  disabled: z.boolean().optional(),
});

/**
 * Text input props schema - extends general form props with variant
 */
const TextInputPropsSchema = GeneralFormPropsSchema.extend({
  variant: z.enum(['text', 'checkbox', 'date', 'switch', 'number', 'url', 'email', 'textarea']),
});

/**
 * With options props schema - extends general form props with options
 */
const WithOptionsPropsSchema = GeneralFormPropsSchema.extend({
  variant: z.enum(['radio', 'select', 'combobox']),
  options: z.array(FormOptionSchema),
});

/**
 * Navigation item schema - extends form option with navigation properties
 */
const NavItemSchema: z.ZodType<NavItem> = z.lazy(() =>
  FormOptionSchema.extend({
    href: z.string().optional(),
    icon: z.custom<React.ReactNode>().optional(),
    children: z.array(NavItemSchema).optional(),
  }),
);

/**
 * Success response legacy schema - kept for backwards compatibility
 * Note: SuccessResponse is defined in services/schemas/index.ts
 */
const SuccessResponseLegacySchema = z.object({
  message: z.string(),
});

/**
 * Step schema for stepper components
 */
const StepSchema = z.object({
  title: z.string(),
  content: z.custom<React.ReactNode>(),
  fields: z.array(z.string()).optional(),
});

/**
 * Stepper props schema
 */
const StepperPropsSchema = z.object({
  steps: z.array(StepSchema),
  currentStep: z.number(),
  isLoading: z.boolean().optional(),
  handleNext: z.custom<() => void | Promise<void>>(),
  handlePrev: z.custom<() => void>(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleFinish: z.custom<(...args: any[]) => void | Promise<void>>(),
});

// ============================================================================
// Background Action Schemas
// ============================================================================

/**
 * Background actions enum
 */
enum BackgroundActions {
  GET_AUTH_TOKEN = 'GET_AUTH_TOKEN',
  AUTH_TOKEN_CHANGED = 'AUTH_TOKEN_CHANGED',
  INVALID_ACTION = 'INVALID_ACTION',
}

/**
 * Generic action request schema
 */
const ActionRequestSchema = <ActionType extends z.ZodType, Payload extends z.ZodType | undefined = undefined>(
  actionSchema: ActionType,
  payloadSchema?: Payload,
) =>
  z.object({
    action: actionSchema,
    payload: payloadSchema ? payloadSchema : z.undefined().optional(),
  });

/**
 * Generic action response schema
 */
const ActionResponseSchema = <
  SuccessData extends z.ZodType | undefined = undefined,
  ErrorData extends z.ZodType | undefined = undefined,
>(
  successSchema?: SuccessData,
  errorSchema?: ErrorData,
) =>
  z.object({
    success: successSchema ? successSchema : z.undefined().optional(),
    error: errorSchema ? errorSchema : z.undefined().optional(),
  });

/**
 * Get auth token response schema
 */
const GetAuthTokenResponseSchema = ActionResponseSchema(z.object({ token: z.string().nullable() }), z.undefined());

/**
 * Error response schema
 */
const ErrorResponseSchema = ActionResponseSchema(z.undefined(), z.object({ error: z.string() }));

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

type FormOption = z.infer<typeof FormOptionSchema>;
type FormOptions = FormOption[] | [];
type FormValues = z.infer<typeof FormValuesSchema>;
type GeneralFormProps = z.infer<typeof GeneralFormPropsSchema>;
type TextInputProps = z.infer<typeof TextInputPropsSchema>;
type WithOptionsProps = z.infer<typeof WithOptionsPropsSchema>;

// NavItem needs special handling due to recursive definition
interface NavItem extends FormOption {
  href?: string;
  icon?: React.ReactNode;
  children?: NavItem[] | [];
}

type SuccessResponseLegacy = z.infer<typeof SuccessResponseLegacySchema>;
type Step = z.infer<typeof StepSchema>;
type StepperProps = z.infer<typeof StepperPropsSchema>;

// Generic interface for action requests
type ActionRequest<ActionType, Payload = undefined> = {
  action: ActionType;
  payload?: Payload;
};

// Specific request types for each action
type GetAuthTokenRequest = ActionRequest<BackgroundActions.GET_AUTH_TOKEN>;
type InvalidRequest = ActionRequest<BackgroundActions.INVALID_ACTION>;
type AuthTokenChangedRequest = ActionRequest<BackgroundActions.AUTH_TOKEN_CHANGED, GetAuthTokenResponse>;

// Union of all valid requests
type Request = GetAuthTokenRequest | AuthTokenChangedRequest | InvalidRequest;

// Response types
type GetAuthTokenResponse = z.infer<typeof GetAuthTokenResponseSchema>;
type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// ============================================================================
// All exports at end of file to comply with import-x/exports-last
// ============================================================================

// Zod Schemas
export {
  FormOptionSchema,
  FormValuesSchema,
  GeneralFormPropsSchema,
  TextInputPropsSchema,
  WithOptionsPropsSchema,
  NavItemSchema,
  SuccessResponseLegacySchema,
  StepSchema,
  StepperPropsSchema,
};

// Background Action Schemas
export {
  BackgroundActions,
  ActionRequestSchema,
  ActionResponseSchema,
  GetAuthTokenResponseSchema,
  ErrorResponseSchema,
};

// Types
export type {
  FormOption,
  FormOptions,
  FormValues,
  GeneralFormProps,
  TextInputProps,
  WithOptionsProps,
  NavItem,
  SuccessResponseLegacy,
  Step,
  StepperProps,
  GetAuthTokenRequest,
  InvalidRequest,
  AuthTokenChangedRequest,
  Request,
  GetAuthTokenResponse,
  ErrorResponse,
};

// Note: We re-export from type-fest but exclude ValueOf since we have our own definition
export type {
  TupleToUnion,
  SetOptional,
  SetRequired,
  RequireAtLeastOne,
  Simplify,
  Merge,
  PartialDeep,
} from 'type-fest';
export type { ColorType, ExcludeValuesFromBaseArrayType, ManifestType, ValueOf };
