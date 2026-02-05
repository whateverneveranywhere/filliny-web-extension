import FormFieldWrapper from './FormFieldWrapper';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { WithOptionsRHFFieldProps } from './types';
import type { FieldValues, Path } from 'react-hook-form';

interface RHFShadcnSelectProps<T extends FieldValues = FieldValues> extends WithOptionsRHFFieldProps<T> {
  /** Show loading state */
  loading?: boolean;
  /** Make the select full width */
  isFullWidth?: boolean;
  /** Placeholder when no options available */
  emptyPlaceholder?: string;
}

/**
 * React Hook Form select dropdown component.
 * Uses Radix Select which works better inside drawers than Popover-based ComboBox.
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
 *
 * @example
 * // With loading state
 * <RHFShadcnSelect
 *   name="povId"
 *   title="POV"
 *   loading={isLoading}
 *   options={povList || []}
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
  loading = false,
  isFullWidth = false,
  emptyPlaceholder,
}: RHFShadcnSelectProps<T>) => (
  <FormFieldWrapper<T>
    name={name as Path<T>}
    control={control}
    title={title}
    description={description}
    required={required}
    disabled={disabled || loading}
    className={cn(isFullWidth && 'filliny-w-full', className)}
    value={externalValue}
    onChange={externalOnChange}>
    {({ field, handleChange, getValue }) => {
      const currentValue = getValue() as string | undefined;
      const hasOptions = options.length > 0;
      const displayPlaceholder =
        !hasOptions && emptyPlaceholder ? emptyPlaceholder : placeholder || `Select ${title || 'option'}`;

      return (
        <Select
          disabled={disabled || loading || !hasOptions}
          required={required}
          data-testid={field.name}
          onValueChange={value => handleChange(value)}
          value={currentValue ?? ''}>
          <SelectTrigger
            className={cn(
              'filliny-h-9',
              isFullWidth && 'filliny-w-full',
              !currentValue && 'filliny-text-muted-foreground',
            )}>
            {loading ? (
              <div className="filliny-flex filliny-items-center filliny-gap-2">
                <Loader2 className="filliny-h-4 filliny-w-4 filliny-animate-spin" />
                <span>Loading...</span>
              </div>
            ) : (
              <SelectValue placeholder={displayPlaceholder} />
            )}
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            {hasOptions ? (
              options.map(item => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))
            ) : (
              <div className="filliny-px-2 filliny-py-1.5 filliny-text-sm filliny-text-muted-foreground">
                No options available
              </div>
            )}
          </SelectContent>
        </Select>
      );
    }}
  </FormFieldWrapper>
);

export default RHFShadcnSelect;
