import type { DTOFillingPrefrences } from '@extension/storage';

export interface Field {
  id: string;
  type: 'input' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'button' | 'file';
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
