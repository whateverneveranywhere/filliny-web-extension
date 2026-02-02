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

interface FormOption {
  label: string;
  value: string;
}
type FormOptions = FormOption[] | [];

type FormValues = string | number | null | boolean | undefined;

interface GeneralFormProps {
  className?: string;
  onChange?: (value: FormValues) => void | Promise<void>;
  name: string;
  id?: string;
  title: string;
  value?: FormValues;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

interface TextInputProps extends GeneralFormProps {
  variant: 'text' | 'checkbox' | 'date' | 'switch' | 'number' | 'url' | 'email' | 'textarea';
}

interface WithOptionsProps extends GeneralFormProps {
  variant: 'radio' | 'select' | 'combobox';
  options: FormOptions;
}

interface NavItem extends FormOption {
  href?: string;
  icon?: React.ReactNode;
  children?: NavItem[] | [];
}

// Note: SuccessResponse is defined in services/schemas/index.ts
// This interface is kept for backwards compatibility but may be deprecated
interface SuccessResponseLegacy {
  message: string;
}

interface Step {
  title: string;
  content: React.ReactNode;
  fields?: string[];
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  isLoading?: boolean;
  handleNext: () => void;
  handlePrev: () => void;
  handleFinish: () => void;
}

// Define reusable action types
enum BackgroundActions {
  GET_AUTH_TOKEN = 'GET_AUTH_TOKEN',
  AUTH_TOKEN_CHANGED = 'AUTH_TOKEN_CHANGED',
  INVALID_ACTION = 'INVALID_ACTION',
  // Add future actions here
}

// Generic interface for action requests
interface ActionRequest<ActionType, Payload = undefined> {
  action: ActionType;
  payload?: Payload; // Optional payload to accommodate future actions
}

// Specific request interfaces for each action
type GetAuthTokenRequest = ActionRequest<BackgroundActions.GET_AUTH_TOKEN>;
type InvalidRequest = ActionRequest<BackgroundActions.INVALID_ACTION>;
type AuthTokenChangedRequest = ActionRequest<BackgroundActions.AUTH_TOKEN_CHANGED, GetAuthTokenResponse>;

// Union of all valid requests
type Request = GetAuthTokenRequest | AuthTokenChangedRequest | InvalidRequest;

// Generic interface for action responses
interface ActionResponse<SuccessData = undefined, ErrorData = undefined> {
  success?: SuccessData; // Data returned on success
  error?: ErrorData; // Error message returned on failure
}

// Define specific responses using the generic ActionResponse
type GetAuthTokenResponse = ActionResponse<{ token: string | null }>;
type ErrorResponse = ActionResponse<undefined, { error: string }>;

// All exports at end of file to comply with import-x/exports-last
export type * from 'type-fest';
export type { ColorType, ExcludeValuesFromBaseArrayType, ManifestType, ValueOf };
export type { FormOption, FormOptions, FormValues };
export type { GeneralFormProps, TextInputProps, WithOptionsProps, NavItem };
export type { SuccessResponseLegacy, Step, StepperProps };
export { BackgroundActions };
export type { GetAuthTokenRequest, InvalidRequest, AuthTokenChangedRequest, Request };
export type { GetAuthTokenResponse, ErrorResponse };
