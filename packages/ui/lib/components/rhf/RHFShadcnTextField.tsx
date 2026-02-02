import FormFieldWrapper from './FormFieldWrapper';
import { Input } from '../ui/input';
import type { BaseRHFFieldProps } from './types';
import type { FieldValues, Path } from 'react-hook-form';

type TextFieldType = 'number' | 'text' | 'email' | 'password' | 'url' | 'tel';

interface RHFShadcnTextFieldProps<T extends FieldValues = FieldValues> extends BaseRHFFieldProps<T> {
  /** Input type */
  fieldType?: TextFieldType;
}

/**
 * React Hook Form text input component.
 * Uses the unified FormFieldWrapper for consistent layout and behavior.
 *
 * @example
 * // Basic text input
 * <RHFShadcnTextField name="email" title="Email" fieldType="email" />
 *
 * // Number input
 * <RHFShadcnTextField name="age" title="Age" fieldType="number" />
 *
 * // With type safety
 * <RHFShadcnTextField<FormSchema> name="username" title="Username" />
 */
const RHFShadcnTextField = <T extends FieldValues = FieldValues>({
  name,
  title,
  description,
  placeholder,
  value: externalValue,
  onChange: externalOnChange,
  required,
  disabled,
  className,
  control,
  fieldType = 'text',
}: RHFShadcnTextFieldProps<T>) => (
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
      <Input
        {...field}
        required={required}
        disabled={disabled}
        data-testid={field.name}
        type={fieldType}
        placeholder={placeholder}
        onChange={e => {
          const value = fieldType === 'number' ? Number(e.target.value) : String(e.target.value);
          handleChange(value);
        }}
        value={(getValue() as string | number) ?? ''}
      />
    )}
  </FormFieldWrapper>
);

export default RHFShadcnTextField;
export type { RHFShadcnTextFieldProps };
