import FormFieldWrapper from './FormFieldWrapper';
import { FormControl, FormItem, FormLabel } from '../ui/form';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import type { WithOptionsRHFFieldProps } from './types';
import type { FieldValues, Path } from 'react-hook-form';

interface RHFShadcnRadioGroupProps<T extends FieldValues = FieldValues> extends WithOptionsRHFFieldProps<T> {
  /** Layout direction for radio options */
  direction?: 'horizontal' | 'vertical';
}

/**
 * React Hook Form radio group component.
 *
 * @example
 * // Vertical radio group (default)
 * <RHFShadcnRadioGroup
 *   name="plan"
 *   title="Select Plan"
 *   options={[
 *     { label: 'Free', value: 'free' },
 *     { label: 'Pro', value: 'pro' },
 *   ]}
 * />
 *
 * // Horizontal radio group
 * <RHFShadcnRadioGroup
 *   name="size"
 *   title="Size"
 *   direction="horizontal"
 *   options={[
 *     { label: 'S', value: 's' },
 *     { label: 'M', value: 'm' },
 *     { label: 'L', value: 'l' },
 *   ]}
 * />
 */
const RHFShadcnRadioGroup = <T extends FieldValues = FieldValues>({
  name,
  options,
  title,
  description,
  required,
  disabled,
  className,
  control,
  value: externalValue,
  onChange: externalOnChange,
  direction = 'vertical',
}: RHFShadcnRadioGroupProps<T>) => (
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
    itemClassName="filliny-space-y-3">
    {({ field, handleChange, getValue }) => (
      <RadioGroup
        data-testid={field.name}
        onValueChange={value => handleChange(value)}
        required={required}
        disabled={disabled}
        defaultValue={(getValue() as string) ?? undefined}
        className={
          direction === 'horizontal'
            ? 'filliny-flex filliny-flex-row filliny-flex-wrap filliny-gap-4'
            : 'filliny-flex filliny-flex-col filliny-space-y-1'
        }>
        {options.map(item => (
          <FormItem key={item.value} className="filliny-flex filliny-items-center filliny-space-x-3 filliny-space-y-0">
            <FormControl>
              <RadioGroupItem value={item.value} />
            </FormControl>
            <FormLabel className="filliny-font-normal">{item.label}</FormLabel>
          </FormItem>
        ))}
      </RadioGroup>
    )}
  </FormFieldWrapper>
);

export default RHFShadcnRadioGroup;
