import type { DTOFillingPrefrences } from '@extension/storage';

export type FieldType = 'input' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'button' | 'file' | 'fieldset';
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
  };
}

export interface DTOFillPayload {
  contextText: string;
  formData: Field[];
  websiteUrl: string;
  preferences?: DTOFillingPrefrences;
}
