import FormFieldWrapper from './FormFieldWrapper';
import { Switch } from '../ui/switch';
import type { BaseRHFFieldProps } from './types';
import type { FieldValues, Path } from 'react-hook-form';

/**
 * React Hook Form switch/toggle component.
 * Renders as a horizontal layout with label on the left and switch on the right.
 *
 * @example
 * // Basic switch
 * <RHFShadcnSwitch name="notifications" title="Enable notifications" />
 *
 * // With description
 * <RHFShadcnSwitch
 *   name="darkMode"
 *   title="Dark mode"
 *   description="Use dark color scheme"
 * />
 */
const RHFShadcnSwitch = <T extends FieldValues = FieldValues>({
  name,
  title,
  description,
  value: externalValue,
  onChange: externalOnChange,
  className,
  required,
  disabled = false,
  control,
}: BaseRHFFieldProps<T>) => (
  <FormFieldWrapper<T>
    name={name as Path<T>}
    control={control}
    title={title}
    description={description}
    required={required}
    disabled={disabled}
    className={className}
    value={externalValue}
    onChange={externalOnChange}
    layout={{ direction: 'horizontal', showError: false }}>
    {({ field, handleChange, getValue }) => (
      <Switch
        required={required}
        data-testid={field.name}
        disabled={disabled}
        onCheckedChange={checked => handleChange(checked)}
        checked={(getValue() as boolean) ?? false}
      />
    )}
  </FormFieldWrapper>
);

export default RHFShadcnSwitch;
