// components/TextInput.tsx
import React from 'react';
import { useFormContext } from 'react-hook-form';

import type { FormOptions, GeneralFormProps } from '@extension/shared';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

interface Props extends GeneralFormProps {
  options: FormOptions;
}
function RHFShadcnRadioGroup({
  name,
  options,
  title,
  required,
  value: externalValue,
  onChange: externalOnChange,
}: Props) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="filliny-w-full filliny-space-y-3">
          <FormLabel>{title}</FormLabel>
          <FormControl>
            <RadioGroup
              data-testid={field.name}
              onValueChange={e => {
                if (externalOnChange) {
                  return externalOnChange?.(e);
                }
                return field.onChange(e);
              }}
              required={required}
              defaultValue={field.value !== undefined ? field.value : externalValue}
              className="filliny-flex filliny-flex-col filliny-space-y-1">
              {options.map(item => (
                <FormItem
                  key={item.value}
                  className="filliny-flex filliny-items-center filliny-space-x-3 filliny-space-y-0">
                  <FormControl>
                    <RadioGroupItem value={item.value} />
                  </FormControl>
                  <FormLabel className="filliny-font-normal">{item.label}</FormLabel>
                </FormItem>
              ))}
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default RHFShadcnRadioGroup;
