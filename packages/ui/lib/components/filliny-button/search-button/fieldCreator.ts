import type { Field, FieldType } from '@extension/shared';
import { getFieldLabel, getFieldDescription } from './fieldUtils';

export const createBaseField = (element: HTMLElement, index: number, type: FieldType): Field => {
  const id = `f-${index}`;
  element.setAttribute('data-filliny-id', id);

  const baseField: Field = {
    id,
    type,
    placeholder: (element as HTMLInputElement).placeholder || '',
    title: element.getAttribute('title') || '',
    label: getFieldLabel(element),
    description: getFieldDescription(element),
    value: '',
    testValue: element.getAttribute('data-test-value') || '',
    required: element.hasAttribute('required'),
  };

  // Create validation object only if there are actual validation rules
  const validation = {
    pattern: element.getAttribute('pattern') || undefined,
    minLength: element.getAttribute('minlength') ? parseInt(element.getAttribute('minlength')!) : undefined,
    maxLength: element.getAttribute('maxlength') ? parseInt(element.getAttribute('maxlength')!) : undefined,
    min: element.getAttribute('min') ? parseInt(element.getAttribute('min')!) : undefined,
    max: element.getAttribute('max') ? parseInt(element.getAttribute('max')!) : undefined,
  };

  // Only add validation if at least one rule exists
  if (Object.values(validation).some(value => value !== undefined)) {
    baseField.validation = validation;
  }

  return baseField;
};
