import FormFieldWrapper from './FormFieldWrapper';
import { Textarea } from '../ui/textarea';
import { cn } from '@/lib/utils';
import type { BaseRHFFieldProps } from './types';
import type { FieldValues, Path } from 'react-hook-form';

interface RHFShadcnTextareaProps<T extends FieldValues = FieldValues> extends BaseRHFFieldProps<T> {
  /** Number of visible text rows */
  rows?: number;
  /** Whether to allow resizing */
  resizable?: boolean;
}

/**
 * React Hook Form textarea component.
 * Uses the unified FormFieldWrapper for consistent layout and behavior.
 *
 * @example
 * // Basic textarea
 * <RHFShadcnTextarea name="bio" title="Biography" rows={6} />
 *
 * // With type safety
 * <RHFShadcnTextarea<FormSchema> name="description" title="Description" />
 */
const RHFShadcnTextarea = <T extends FieldValues = FieldValues>({
  name,
  title,
  description,
  placeholder,
  required,
  disabled,
  className,
  control,
  value: externalValue,
  onChange: externalOnChange,
  rows = 4,
  resizable = false,
}: RHFShadcnTextareaProps<T>) => (
  <FormFieldWrapper<T>
    name={name as Path<T>}
    control={control}
    title={title}
    description={description}
    required={required}
    disabled={disabled}
    className={className}
    value={externalValue}
    onChange={externalOnChange}>
    {({ field, handleChange, getValue }) => (
      <Textarea
        {...field}
        required={required}
        disabled={disabled}
        data-testid={field.name}
        placeholder={placeholder}
        className={cn(!resizable && 'filliny-resize-none')}
        rows={rows}
        onChange={e => handleChange(e.target.value)}
        value={(getValue() as string) ?? ''}
      />
    )}
  </FormFieldWrapper>
);

export default RHFShadcnTextarea;
export type { RHFShadcnTextareaProps };
