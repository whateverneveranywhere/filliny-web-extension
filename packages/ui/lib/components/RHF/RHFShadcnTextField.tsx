// components/TextInput.tsx
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import React from "react";
import { useFormContext } from "react-hook-form";
import type { GeneralFormProps } from "@extension/shared";

interface Props extends GeneralFormProps {
  fieldType?: "number" | "text" | "email" | "password";
}

function RHFShadcnTextField({
  name,
  title,
  description,
  placeholder,
  value: externalValue,
  onChange: externalOnChange,
  required,
  fieldType = "text",
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
            <Input
              {...field}
              required={required}
              data-testid={field.name}
              type={fieldType}
              placeholder={placeholder}
              onChange={e => {
                const value = fieldType === "number" ? Number(e.target.value) : String(e.target.value);

                const newEvent = { ...e, target: { ...e.target, value } };

                if (externalOnChange) {
                  return externalOnChange?.(newEvent);
                }
                return field.onChange(newEvent);
              }}
              value={field.value !== undefined ? field.value : externalValue}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default RHFShadcnTextField;
