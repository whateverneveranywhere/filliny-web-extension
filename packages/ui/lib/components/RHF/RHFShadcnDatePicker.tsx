// components/TextInput.tsx
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import React, { useMemo } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { cn } from "@/lib/utils";
import type { GeneralFormProps } from "@extension/shared";

import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

function RHFShadcnDatePicker({
  title,
  name,
  description,
  placeholder,
  required,
  value: externalValue,
  onChange: externalOnChange,
}: GeneralFormProps) {
  const { control } = useFormContext();

  const UTCtoUserDate = useMemo(() => (externalValue ? parseISO(externalValue as string) : undefined), [externalValue]);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="filliny-flex filliny-w-full filliny-flex-col">
          <FormLabel>{title}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className={cn(
                    "filliny-pl-3 filliny-text-left filliny-font-normal filliny-w-full",
                    !field.value && "filliny-text-muted-foreground",
                  )}>
                  {field.value ? format(field.value, "PPP") : <span>{placeholder || "Pick a date"}</span>}
                  <CalendarIcon className="filliny-ml-auto filliny-size-4 filliny-opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="filliny-w-auto filliny-p-0" align="start">
              <Calendar
                required={required}
                data-testid={field.name}
                mode="single"
                onSelect={e => {
                  const utcTimestamp = format(e as Date, "yyyy-MM-dd'T'HH:mm:ss'Z'");
                  if (externalOnChange) {
                    externalOnChange(utcTimestamp);
                  } else {
                    field.onChange(utcTimestamp);
                  }
                }}
                selected={field?.value ? parseISO(field?.value) : UTCtoUserDate}
                disabled={date => date > new Date() || date < new Date("1900-01-01")}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default RHFShadcnDatePicker;
