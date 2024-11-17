import React from 'react';
import { useFormContext } from 'react-hook-form';

import { Checkbox } from '../ui/checkbox';
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '../ui/form';
import type { GeneralFormProps } from '@extension/shared';

function RHFShadcnCheckbox({
  name,
  title,
  description,
  value: externalValue,
  required,
  onChange: externalOnChange,
}: GeneralFormProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="filliny-flex filliny-w-full filliny-flex-row filliny-items-start filliny-space-x-3 filliny-space-y-0 filliny-rounded-md filliny-p-4">
          <FormControl>
            <Checkbox
              required={required}
              data-testid={field.name}
              onCheckedChange={e => {
                if (externalOnChange) {
                  return externalOnChange?.(e);
                }
                return field.onChange(e);
              }}
              checked={field.value !== undefined ? field.value : externalValue}
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel>{title}</FormLabel>
            {description && <FormDescription>{description}</FormDescription>}
          </div>
        </FormItem>
      )}
    />
  );
}

export default RHFShadcnCheckbox;
