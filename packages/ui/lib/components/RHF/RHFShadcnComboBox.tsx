// components/TextInput.tsx
import { Check, ChevronsUpDown, Edit, Loader2, Trash } from "lucide-react";
import React, { useState } from "react";
import { useFormContext } from "react-hook-form";

import { Button } from "../ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import type { FormOptions, GeneralFormProps } from "@extension/shared";
import { cn } from "@/lib/utils";

interface Props extends GeneralFormProps {
  options: FormOptions;
  loading?: boolean;
  isFullWidth?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

function RHFShadcnComboBox({
  name,
  title,
  description,
  onDelete,
  onEdit,
  loading = false,
  options,
  placeholder,
  disabled,
  onChange: externalOnChange,
}: Props) {
  const { control, setValue } = useFormContext();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleSelect = (value: string) => {
    if (externalOnChange) {
      externalOnChange(value);
    } else {
      setValue(name, value);
    }
    setPopoverOpen(false);
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="filliny-flex filliny-w-full filliny-flex-col">
          <FormLabel>{title}</FormLabel>
          <Popover modal open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  loading={loading}
                  disabled={loading || disabled}
                  variant="outline"
                  role="combobox"
                  size={"sm"}
                  className={cn(
                    "filliny-w-full filliny-justify-between",
                    !field.value && "filliny-text-muted-foreground",
                  )}>
                  <p className="filliny-w-full filliny-truncate filliny-text-left">
                    {field.value ? options.find(option => option.value === field.value)?.label : `Select ${title}`}
                  </p>
                  <ChevronsUpDown className="filliny-ml-2 filliny-size-4 filliny-shrink-0 filliny-opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent align="start" className="filliny-w-[var(--radix-popover-trigger-width)] filliny-p-0">
              <Command className="filliny-w-full">
                <CommandInput placeholder={`${placeholder}...`} />
                <CommandEmpty>No {title} found.</CommandEmpty>
                <CommandGroup>
                  <CommandList>
                    {!loading &&
                      !!options.length &&
                      options.map(option => (
                        <CommandItem
                          className="filliny-flex filliny-h-10 filliny-w-full filliny-items-center filliny-justify-between"
                          data-testid={field.name}
                          value={option.label}
                          key={option.value}
                          onSelect={() => handleSelect(option.value)}>
                          <div className="filliny-flex filliny-w-full filliny-items-center filliny-justify-center filliny-truncate">
                            <Check
                              className={cn(
                                "filliny-mr-2 filliny-h-4 filliny-w-4",
                                option.value === field.value ? "filliny-opacity-100" : "filliny-opacity-0",
                              )}
                            />
                            <p className="filliny-w-full filliny-truncate">{option.label}</p>{" "}
                          </div>

                          <div className="filliny-flex filliny-items-center filliny-justify-center filliny-gap-1">
                            {onEdit && (
                              <Button
                                variant="outline"
                                size="icon"
                                className="filliny-h-8 filliny-w-8 filliny-p-1"
                                onClick={e => {
                                  e.stopPropagation();
                                  onEdit(option.value);
                                  setPopoverOpen(false);
                                }}>
                                <Edit />
                              </Button>
                            )}
                            {onDelete && (
                              <Button
                                variant="outline"
                                size="icon"
                                className="filliny-h-8 filliny-w-8 filliny-p-1"
                                onClick={e => {
                                  e.stopPropagation();
                                  onDelete(option.value);
                                  setPopoverOpen(false);
                                }}>
                                {" "}
                                <Trash className="filliny-text-red-500" />
                              </Button>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    {!loading && !options.length && (
                      <CommandItem value="empty" disabled>
                        No options
                      </CommandItem>
                    )}
                    {loading && (
                      <CommandItem value="loading" disabled>
                        <Loader2 className={cn("filliny-mr-2 filliny-h-4 filliny-w-4 filliny-animate-spin")} />
                        Loading...
                      </CommandItem>
                    )}
                  </CommandList>
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
          <FormDescription>{description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default RHFShadcnComboBox;
