import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { cn } from '@/lib/utils';
import { useFormContext } from 'react-hook-form';
import type { BaseRHFFieldProps, FieldLayout, FormValues } from './types';
import type { ReactNode } from 'react';
import type { FieldValues, ControllerRenderProps, ControllerFieldState } from 'react-hook-form';

interface RenderChildProps<T extends FieldValues> {
  field: ControllerRenderProps<T>;
  fieldState: ControllerFieldState;
  /** Handle change with optional external onChange callback */
  handleChange: (value: FormValues) => void;
  /** Get the effective value (field.value or external value) */
  getValue: () => FormValues;
}

interface FormFieldWrapperProps<T extends FieldValues = FieldValues> extends BaseRHFFieldProps<T> {
  /** Layout configuration */
  layout?: FieldLayout;
  /** Render function for the field content */
  children: (props: RenderChildProps<T>) => ReactNode;
  /** Additional class name for the FormItem */
  itemClassName?: string;
}

const defaultLayout: FieldLayout = {
  direction: 'vertical',
  showLabel: true,
  showDescription: true,
  showError: true,
};

/**
 * Reusable form field wrapper component.
 * Handles common patterns for RHF fields including:
 * - Label rendering
 * - Description rendering
 * - Error message rendering
 * - Value management (internal vs external)
 * - Change handler with optional external callback
 *
 * @example
 * <FormFieldWrapper name="email" title="Email Address">
 *   {({ field, handleChange, getValue }) => (
 *     <Input
 *       {...field}
 *       value={getValue() as string}
 *       onChange={(e) => handleChange(e.target.value)}
 *     />
 *   )}
 * </FormFieldWrapper>
 */
const FormFieldWrapper = <T extends FieldValues = FieldValues>({
  name,
  control: externalControl,
  title,
  description,
  required,
  disabled,
  className,
  value: externalValue,
  onChange: externalOnChange,
  layout = defaultLayout,
  children,
  itemClassName,
}: FormFieldWrapperProps<T>) => {
  const formContext = useFormContext<T>();
  const control = externalControl ?? formContext?.control;

  const mergedLayout = { ...defaultLayout, ...layout };

  if (!control) {
    console.error(
      '[FormFieldWrapper] No control provided. Either pass control prop or wrap component in FormProvider.',
    );
    return null;
  }

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        // Helper to get the effective value
        const getValue = (): FormValues => (field.value !== undefined ? field.value : externalValue);

        // Helper to handle changes with optional external callback
        const handleChange = (value: FormValues) => {
          if (externalOnChange) {
            externalOnChange(value);
          } else {
            field.onChange(value);
          }
        };

        const isHorizontal = mergedLayout.direction === 'horizontal';

        return (
          <FormItem
            className={cn(
              'filliny-w-full',
              isHorizontal && 'filliny-flex filliny-flex-row filliny-items-center filliny-justify-between',
              itemClassName,
            )}>
            {mergedLayout.showLabel && title && (
              <div className={isHorizontal ? 'filliny-space-y-0.5' : undefined}>
                <FormLabel className={isHorizontal ? 'filliny-text-base' : undefined}>
                  {title}
                  {required && <span className="filliny-text-destructive filliny-ml-1">*</span>}
                </FormLabel>
                {isHorizontal && mergedLayout.showDescription && description && (
                  <FormDescription>{description}</FormDescription>
                )}
              </div>
            )}
            <FormControl>
              <div className={cn('filliny-w-full', className)}>
                {children({ field, fieldState, handleChange, getValue })}
              </div>
            </FormControl>
            {!isHorizontal && mergedLayout.showDescription && description && (
              <FormDescription>{description}</FormDescription>
            )}
            {mergedLayout.showError && <FormMessage />}
          </FormItem>
        );
      }}
    />
  );
};

export default FormFieldWrapper;
export type { FormFieldWrapperProps, RenderChildProps };
