import type { FormOptions, FormValues } from '@extension/shared';
import type { ReactNode } from 'react';
import type { Control, FieldValues, Path } from 'react-hook-form';

/**
 * Base props for all RHF form field components.
 * Uses TypeScript generics for type-safe form field names.
 */
export interface BaseRHFFieldProps<T extends FieldValues = FieldValues> {
  /** The field name - must be a valid path in the form's type */
  name: Path<T>;
  /** Optional control object - uses useFormContext if not provided */
  control?: Control<T>;
  /** Display label for the field */
  title?: string;
  /** Description text shown below the field */
  description?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Custom class name for the field container */
  className?: string;
  /** External value (for controlled components) */
  value?: FormValues;
  /** External onChange handler */
  onChange?: (value: FormValues) => void | Promise<void>;
}

/**
 * Props for fields that have selectable options (select, radio, combobox)
 */
export interface WithOptionsRHFFieldProps<T extends FieldValues = FieldValues> extends BaseRHFFieldProps<T> {
  /** Options for select/radio/combobox fields */
  options: FormOptions;
}

/**
 * Layout configuration for form fields
 */
export interface FieldLayout {
  /** Layout direction */
  direction?: 'vertical' | 'horizontal';
  /** Whether to show the label */
  showLabel?: boolean;
  /** Whether to show the description */
  showDescription?: boolean;
  /** Whether to show validation messages */
  showError?: boolean;
}

/**
 * Render props for custom field rendering
 */
export interface FieldRenderProps<TValue = unknown> {
  /** Current field value */
  value: TValue;
  /** Change handler */
  onChange: (value: TValue) => void;
  /** Blur handler */
  onBlur: () => void;
  /** Field name */
  name: string;
  /** Whether the field has an error */
  hasError: boolean;
  /** Error message if any */
  errorMessage?: string;
}

/**
 * Props for a fully customizable form field wrapper
 */
export interface FormFieldWrapperProps<T extends FieldValues = FieldValues> extends BaseRHFFieldProps<T> {
  /** Layout configuration */
  layout?: FieldLayout;
  /** Custom content to render inside the field */
  children?: ReactNode | ((props: FieldRenderProps) => ReactNode);
}
