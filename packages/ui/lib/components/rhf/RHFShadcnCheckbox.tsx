import FormFieldWrapper from './FormFieldWrapper';
import { Checkbox } from '../ui/checkbox';
import type { BaseRHFFieldProps } from './types';
import type { FieldValues, Path } from 'react-hook-form';

/**
 * React Hook Form checkbox component.
 * Renders a checkbox with label and optional description.
 * Uses the unified FormFieldWrapper for consistent layout and behavior.
 *
 * @example
 * // Basic checkbox
 * <RHFShadcnCheckbox name="acceptTerms" title="I accept the terms" />
 *
 * // With description
 * <RHFShadcnCheckbox
 *   name="newsletter"
 *   title="Subscribe to newsletter"
 *   description="Get weekly updates"
 * />
 */
const RHFShadcnCheckbox = <T extends FieldValues = FieldValues>({
  name,
  title,
  description,
  value: externalValue,
  required,
  disabled,
  control,
  className,
  onChange: externalOnChange,
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
    layout={{ direction: 'horizontal', showError: true }}
    itemClassName="filliny-flex filliny-w-full filliny-flex-row filliny-items-start filliny-space-x-3 filliny-space-y-0 filliny-rounded-md filliny-py-4">
    {({ field, handleChange, getValue }) => (
      <Checkbox
        required={required}
        disabled={disabled}
        data-testid={field.name}
        onCheckedChange={checked => handleChange(checked as boolean)}
        checked={(getValue() as boolean) ?? false}
      />
    )}
  </FormFieldWrapper>
);

export default RHFShadcnCheckbox;
