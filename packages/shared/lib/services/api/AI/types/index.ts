import type { DTOFillingPrefrences } from '../../Profiles/types';

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
  modelSlug: string;
  preferences?: DTOFillingPrefrences;
}
