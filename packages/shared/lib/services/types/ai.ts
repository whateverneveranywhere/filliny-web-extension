import type { DTOFillingPrefrences } from '@extension/storage';

export interface Field {
  id: string;
  name?: string;
  type: 'input' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'button' | 'file' | 'fieldset';
  placeholder?: string;
  title?: string;
  label?: string;
  description?: string;
  value?: string;
  options?: string[];
}

export interface DTOFillPayload {
  contextText: string;
  formData: Field[];
  websiteUrl: string;
  preferences?: DTOFillingPrefrences;
}
