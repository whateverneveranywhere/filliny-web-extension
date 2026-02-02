import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Textarea } from '../ui/textarea';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import type { GeneralFormProps } from '@extension/shared';

interface Props extends GeneralFormProps {
  placeholder?: string;
  rows?: number;
}

function RHFShadcnTextarea({
  name,
  title,
  description,
  placeholder,
  required,
  value: externalValue,
  rows = 4,
  onChange: externalOnChange,
}: Props) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="filliny-w-full">
          <FormLabel>{title}</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              required={required}
              data-testid={field.name}
              placeholder={placeholder}
              className="filliny-resize-none"
              rows={rows}
              onChange={e => {
                field.onChange(e);
                if (externalOnChange) {
                  externalOnChange(e.target.value);
                }
              }}
              value={field.value !== undefined ? field.value : externalValue}
            />
          </FormControl>
          <FormDescription>{description} </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default RHFShadcnTextarea;
