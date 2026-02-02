import FormFieldWrapper from './FormFieldWrapper';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { WithOptionsRHFFieldProps } from './types';
import type { FieldValues, Path } from 'react-hook-form';

/**
 * React Hook Form select dropdown component.
 *
 * @example
 * // Basic select
 * <RHFShadcnSelect
 *   name="country"
 *   title="Country"
 *   options={[
 *     { label: 'United States', value: 'us' },
 *     { label: 'Canada', value: 'ca' },
 *   ]}
 * />
 */
const RHFShadcnSelect = <T extends FieldValues = FieldValues>({
  name,
  options,
  placeholder,
  title,
  description,
  value: externalValue,
  onChange: externalOnChange,
  required,
  disabled,
  className,
  control,
}: WithOptionsRHFFieldProps<T>) => (
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
      <Select
        disabled={disabled}
        required={required}
        data-testid={field.name}
        onValueChange={value => handleChange(value)}
        defaultValue={(getValue() as string) ?? undefined}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(item => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )}
  </FormFieldWrapper>
);

export default RHFShadcnSelect;
