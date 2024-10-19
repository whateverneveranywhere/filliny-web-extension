import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

import { cn } from '@/lib/utils';

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'fillinyflex fillinyh-10 fillinyw-full fillinyitems-center fillinyjustify-between fillinyrounded-md fillinyborder fillinyborder-input fillinybg-background fillinypx-3 fillinypy-2 fillinytext-sm fillinyring-offset-background placeholder:fillinytext-muted-foreground focus:fillinyoutline-none focus:fillinyring-2 focus:fillinyring-ring focus:fillinyring-offset-2 disabled:fillinycursor-not-allowed disabled:fillinyopacity-50 [&>span]:fillinyline-clamp-1',
      className,
    )}
    {...props}>
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="fillinyh-4 fillinyw-4 fillinyopacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn('fillinyflex fillinycursor-default fillinyitems-center fillinyjustify-center fillinypy-1', className)}
    {...props}>
    <ChevronUp className="fillinyh-4 fillinyw-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn('fillinyflex fillinycursor-default fillinyitems-center fillinyjustify-center fillinypy-1', className)}
    {...props}>
    <ChevronDown className="fillinyh-4 fillinyw-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'fillinyrelative fillinyz-50 fillinymax-h-96 fillinymin-w-[8rem] fillinyoverflow-hidden fillinyrounded-md fillinyborder fillinybg-popover fillinytext-popover-foreground fillinyshadow-md data-[state=open]:fillinyanimate-in data-[state=closed]:fillinyanimate-out data-[state=closed]:fillinyfade-out-0 data-[state=open]:fillinyfade-in-0 data-[state=closed]:fillinyzoom-out-95 data-[state=open]:fillinyzoom-in-95 data-[side=bottom]:fillinyslide-in-from-top-2 data-[side=left]:fillinyslide-in-from-right-2 data-[side=right]:fillinyslide-in-from-left-2 data-[side=top]:fillinyslide-in-from-bottom-2',
        position === 'popper' &&
          'data-[side=bottom]:fillinytranslate-y-1 data-[side=left]:filliny-translate-x-1 data-[side=right]:fillinytranslate-x-1 data-[side=top]:filliny-translate-y-1',
        className,
      )}
      position={position}
      {...props}>
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'fillinyp-1',
          position === 'popper' &&
            'fillinyh-[var(--radix-select-trigger-height)] fillinyw-full fillinymin-w-[var(--radix-select-trigger-width)]',
        )}>
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('fillinypy-1.5 fillinypl-8 fillinypr-2 fillinytext-sm fillinyfont-semibold', className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'fillinyrelative fillinyflex fillinyw-full fillinycursor-default fillinyselect-none fillinyitems-center fillinyrounded-sm fillinypy-1.5 fillinypl-8 fillinypr-2 fillinytext-sm fillinyoutline-none focus:fillinybg-accent focus:fillinytext-accent-foreground data-[disabled]:fillinypointer-events-none data-[disabled]:fillinyopacity-50',
      className,
    )}
    {...props}>
    <span className="fillinyabsolute fillinyleft-2 fillinyflex fillinyh-3.5 fillinyw-3.5 fillinyitems-center fillinyjustify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="fillinyh-4 fillinyw-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('filliny-mx-1 fillinymy-1 fillinyh-px fillinybg-muted', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
