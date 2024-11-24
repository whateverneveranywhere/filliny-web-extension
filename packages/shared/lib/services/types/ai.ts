import type { DTOFillingPrefrences } from '@extension/storage';

export type InputFieldType =
  | 'text'
  | 'password'
  | 'email'
  | 'number'
  | 'tel'
  | 'url'
  | 'search'
  | 'color'
  | 'date'
  | 'datetime-local'
  | 'month'
  | 'week'
  | 'time'
  | 'range';

export type FieldType = InputFieldType | 'select' | 'checkbox' | 'radio' | 'textarea' | 'button' | 'file' | 'fieldset';

export interface Field {
  id: string;
  name?: string;
  type: FieldType;
  placeholder?: string;
  title?: string;
  label?: string;
  description?: string;
  value?: string;
  testValue?: string;
  options?: Array<{
    value: string;
    text: string;
    selected: boolean;
  }>;
  required?: boolean;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    step?: number;
  };
  disabled?: boolean;
  readonly?: boolean;
  ariaLabel?: string;
  ariaDescription?: string;
  customEvents?: string[];
  defaultValue?: string;
}

export interface DTOFillPayload {
  contextText: string;
  formData: Field[];
  websiteUrl: string;
  preferences?: DTOFillingPrefrences;
}
