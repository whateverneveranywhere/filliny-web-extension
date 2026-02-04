// components/TextInput.tsx

import { Button } from '../ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown, Edit, Loader2, Plus, Trash } from 'lucide-react';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import type { FormOptions, GeneralFormProps } from '@extension/shared';

interface Props extends GeneralFormProps {
  options: FormOptions;
  loading?: boolean;
  isFullWidth?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onCreate?: () => void;
  emptyPlaceholder?: string;
}

const RHFShadcnComboBox = ({
  name,
  title,
  description,
  onDelete,
  onEdit,
  onCreate,
  loading = false,
  options,
  placeholder,
  emptyPlaceholder,
  disabled,
  onChange: externalOnChange,
}: Props) => {
  const { control, setValue } = useFormContext();
  const [popoverOpen, setPopoverOpen] = useState(false);

  // If no options and onCreate is available, clicking the main button should open create dialog
  const shouldOpenCreateOnClick = !loading && options.length === 0 && onCreate;

  const handleSelect = (value: string) => {
    if (externalOnChange) {
      externalOnChange(value);
    } else {
      setValue(name, value);
    }
    setPopoverOpen(false);
  };

  const handleMainButtonClick = (e: React.MouseEvent) => {
    // If no options and onCreate exists, open create dialog instead of popover
    if (shouldOpenCreateOnClick) {
      e.preventDefault();
      e.stopPropagation();
      onCreate?.();
    }
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="filliny-flex filliny-w-full filliny-min-w-0 filliny-flex-col">
          {title && <FormLabel>{title}</FormLabel>}
          <Popover
            modal
            open={shouldOpenCreateOnClick ? false : popoverOpen}
            onOpenChange={shouldOpenCreateOnClick ? undefined : setPopoverOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <div className="filliny-flex filliny-w-full filliny-min-w-0 filliny-items-center filliny-gap-0">
                  <Button
                    loading={loading}
                    disabled={loading || disabled}
                    variant="outline"
                    role="combobox"
                    size={'sm'}
                    onClick={handleMainButtonClick}
                    className={cn(
                      'filliny-w-full filliny-min-w-0 filliny-justify-between filliny-overflow-hidden',
                      onCreate && 'filliny-rounded-r-none filliny-border-r-0',
                      !field.value && 'filliny-text-muted-foreground',
                    )}>
                    <p className="filliny-w-full filliny-truncate filliny-text-left">
                      {field.value
                        ? options.find(option => option.value === field.value)?.label
                        : options.length === 0 && emptyPlaceholder
                          ? emptyPlaceholder
                          : placeholder || `Select ${title}`}
                    </p>
                    {!onCreate && (
                      <ChevronsUpDown className="filliny-ml-2 filliny-size-4 filliny-shrink-0 filliny-opacity-50" />
                    )}
                  </Button>
                  {onCreate && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loading || disabled}
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        onCreate();
                      }}
                      className="filliny-h-9 filliny-w-9 filliny-shrink-0 filliny-rounded-l-none filliny-border-l-0 filliny-px-0">
                      <Plus className="filliny-size-4" />
                    </Button>
                  )}
                </div>
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
                          <div className="filliny-flex filliny-w-full filliny-items-center filliny-truncate">
                            <Check
                              className={cn(
                                'filliny-mr-2 filliny-h-4 filliny-w-4',
                                option.value === field.value ? 'filliny-opacity-100' : 'filliny-opacity-0',
                              )}
                            />
                            <p className="filliny-w-full filliny-truncate">{option.label}</p>{' '}
                          </div>

                          <div className="filliny-flex filliny-items-center filliny-justify-center filliny-gap-1">
                            {onEdit && (
                              <Button
                                variant="outline"
                                size="icon"
                                className="filliny-h-8 filliny-w-8"
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
                                className="filliny-h-8 filliny-w-8"
                                onClick={e => {
                                  e.stopPropagation();
                                  onDelete(option.value);
                                  setPopoverOpen(false);
                                }}>
                                <Trash className="filliny-text-destructive" />
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
                        <Loader2 className={cn('filliny-mr-2 filliny-h-4 filliny-w-4 filliny-animate-spin')} />
                        Loading...
                      </CommandItem>
                    )}
                  </CommandList>
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default RHFShadcnComboBox;
