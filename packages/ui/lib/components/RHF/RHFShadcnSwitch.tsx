// components/TextInput.tsx
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from "../ui/form";
import { Switch } from "../ui/switch";
import { cn } from "@/lib/utils";
import React from "react";
import { useFormContext } from "react-hook-form";
import type { GeneralFormProps } from "@extension/shared";

interface Props extends GeneralFormProps {
  className?: string;
}

function RHFShadcnSwitch({
  name,
  title,
  description,
  value: externalValue,
  onChange: externalOnChange,
  className,
  required,

  disabled = false,
}: Props) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={`${cn("filliny-flex filliny-flex-row filliny-items-center filliny-justify-between", className)}`}>
          <div className="filliny-space-y-0.5">
            <FormLabel className="filliny-text-base">{title}</FormLabel>
            {description && <FormDescription>{description}</FormDescription>}
          </div>
          <FormControl>
            <Switch
              required={required}
              data-testid={field.name}
              disabled={disabled}
              onCheckedChange={e => {
                if (externalOnChange) {
                  return externalOnChange?.(e);
                }
                return field.onChange(e);
              }}
              checked={field.value !== undefined ? field.value : externalValue}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

export default RHFShadcnSwitch;
