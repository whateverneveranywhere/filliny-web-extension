// components/TextInput.tsx
import React from 'react';
import { useFormContext } from 'react-hook-form';

import type { GeneralFormProps } from '@extension/shared';

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Textarea } from '../ui/textarea';

interface Props extends GeneralFormProps {
  placeholder?: string;
  rows?: number;
  // isWithinMaxToken?: number | false;
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
  // isWithinMaxToken,
}: Props) {
  const { control } = useFormContext();
  // const inputLatestValue = watch(name);
  // const charCount = inputLatestValue.length;

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
                if (externalOnChange) {
                  return externalOnChange?.(e);
                }
                return field.onChange(e);
              }}
              value={field.value !== undefined ? field.value : externalValue}
            />
          </FormControl>
          <FormDescription>{description} </FormDescription>
          {/* {isWithinMaxToken !== undefined && (
            <div className={`mt-2 text-sm ${!isWithinMaxToken ? 'text-red-600' : 'text-gray-600'}`}>
              <>
                {isWithinMaxToken === false
                  ? "You've exceeded the max context, please reduce your context characters to stay within the range"
                  : `Tokens count: ${charCount}`}
              </>
            </div>
          )} */}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default RHFShadcnTextarea;
