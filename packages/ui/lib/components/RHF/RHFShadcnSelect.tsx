// components/TextInput.tsx
import React from 'react';
import { useFormContext } from 'react-hook-form';

import type { FormOptions, GeneralFormProps } from '@extension/shared';

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface Props extends GeneralFormProps {
  options: FormOptions;
}

function RHFShadcnSelect({
  name,
  options,
  placeholder,
  title,
  description,
  value: externalValue,
  onChange: externalOnChange,
  required,
  disabled,
}: Props) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="filliny-w-full">
          <FormLabel>{title}</FormLabel>
          <Select
            disabled={disabled}
            required={required}
            data-testid={field.name}
            onValueChange={e => {
              if (externalOnChange) {
                return externalOnChange?.(e);
              }
              return field.onChange(e);
            }}
            defaultValue={field.value !== undefined ? field.value : externalValue}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map(item => (
                <SelectItem key={item.value} value={item.value}>
                  <p>{item.label}</p>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description} </FormDescription>} <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default RHFShadcnSelect;
