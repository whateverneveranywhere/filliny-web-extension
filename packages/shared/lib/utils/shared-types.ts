export type ValueOf<T> = T[keyof T];

export enum WebappEnvs {
  LOCAL = 'local',
  DEV = 'dev',
  PROD = 'prod',
}

export interface FormOption {
  label: string;
  value: string;
}
export type FormOptions = FormOption[] | [];

export type FormValues = string | number | null | boolean | undefined;

export interface GeneralFormProps {
  className?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange?: (callback: any) => void;
  name: string;
  id?: string;
  title: string;
  value?: FormValues;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export interface TextInputProps extends GeneralFormProps {
  variant: 'text' | 'checkbox' | 'date' | 'switch' | 'number' | 'url' | 'email' | 'textarea';
}

export interface WithOptionsProps extends GeneralFormProps {
  variant: 'radio' | 'select' | 'combobox';
  options: FormOptions;
}

export interface NavItem extends FormOption {
  href?: string;
  icon?: React.ReactNode;
  children?: NavItem[] | [];
}

export interface SuccessResponse {
  message: string;
}

export interface Step {
  title: string;
  content: React.ReactNode;
  fields?: string[];
}

export interface StepperProps {
  steps: Step[];
  currentStep: number;
  isLoading?: boolean;
  handleNext: () => void;
  handlePrev: () => void;
  handleFinish: () => void;
}

// Define reusable action types
export enum BackgroundActions {
  GET_AUTH_TOKEN = 'GET_AUTH_TOKEN',
  INVALID_ACTION = 'INVALID_ACTION',
  // Add future actions here
}

// Generic interface for action requests
interface ActionRequest<ActionType, Payload = undefined> {
  action: ActionType;
  payload?: Payload; // Optional payload to accommodate future actions
}

// Specific request interfaces for each action
export type GetAuthTokenRequest = ActionRequest<BackgroundActions.GET_AUTH_TOKEN>;
export type InvalidRequest = ActionRequest<BackgroundActions.INVALID_ACTION>;

// Union of all valid requests
export type Request = GetAuthTokenRequest | InvalidRequest;

// Generic interface for action responses
interface ActionResponse<SuccessData = undefined, ErrorData = undefined> {
  success?: SuccessData; // Data returned on success
  error?: ErrorData; // Error message returned on failure
}

// Define specific responses using the generic ActionResponse
export type GetAuthTokenResponse = ActionResponse<{ token: string | null }>;
export type ErrorResponse = ActionResponse<undefined, { error: string }>;
