import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight, Circle } from 'lucide-react';

import { cn } from '@/lib/utils';

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      'fillinyflex fillinycursor-default fillinyselect-none fillinyitems-center fillinyrounded-sm fillinypx-2 fillinypy-1.5 fillinytext-sm fillinyoutline-none focus:fillinybg-accent data-[state=open]:fillinybg-accent',
      inset && 'fillinypl-8',
      className,
    )}
    {...props}>
    {children}
    <ChevronRight className="fillinyml-auto fillinyh-4 fillinyw-4" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      'fillinyz-50 fillinymin-w-[8rem] fillinyoverflow-hidden fillinyrounded-md fillinyborder fillinybg-popover fillinyp-1 fillinytext-popover-foreground fillinyshadow-lg data-[state=open]:fillinyanimate-in data-[state=closed]:fillinyanimate-out data-[state=closed]:fillinyfade-out-0 data-[state=open]:fillinyfade-in-0 data-[state=closed]:fillinyzoom-out-95 data-[state=open]:fillinyzoom-in-95 data-[side=bottom]:fillinyslide-in-from-top-2 data-[side=left]:fillinyslide-in-from-right-2 data-[side=right]:fillinyslide-in-from-left-2 data-[side=top]:fillinyslide-in-from-bottom-2',
      className,
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'fillinyz-50 fillinymin-w-[8rem] fillinyoverflow-hidden fillinyrounded-md fillinyborder fillinybg-popover fillinyp-1 fillinytext-popover-foreground fillinyshadow-md data-[state=open]:fillinyanimate-in data-[state=closed]:fillinyanimate-out data-[state=closed]:fillinyfade-out-0 data-[state=open]:fillinyfade-in-0 data-[state=closed]:fillinyzoom-out-95 data-[state=open]:fillinyzoom-in-95 data-[side=bottom]:fillinyslide-in-from-top-2 data-[side=left]:fillinyslide-in-from-right-2 data-[side=right]:fillinyslide-in-from-left-2 data-[side=top]:fillinyslide-in-from-bottom-2',
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'fillinyrelative fillinyflex fillinycursor-default fillinyselect-none fillinyitems-center fillinygap-2 fillinyrounded-sm fillinypx-2 fillinypy-1.5 fillinytext-sm fillinyoutline-none fillinytransition-colors focus:fillinybg-accent focus:fillinytext-accent-foreground data-[disabled]:fillinypointer-events-none data-[disabled]:fillinyopacity-50 [&_svg]:fillinypointer-events-none [&_svg]:fillinysize-4 [&_svg]:fillinyshrink-0',
      inset && 'fillinypl-8',
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      'fillinyrelative fillinyflex fillinycursor-default fillinyselect-none fillinyitems-center fillinyrounded-sm fillinypy-1.5 fillinypl-8 fillinypr-2 fillinytext-sm fillinyoutline-none fillinytransition-colors focus:fillinybg-accent focus:fillinytext-accent-foreground data-[disabled]:fillinypointer-events-none data-[disabled]:fillinyopacity-50',
      className,
    )}
    checked={checked}
    {...props}>
    <span className="fillinyabsolute fillinyleft-2 fillinyflex fillinyh-3.5 fillinyw-3.5 fillinyitems-center fillinyjustify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="fillinyh-4 fillinyw-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      'fillinyrelative fillinyflex fillinycursor-default fillinyselect-none fillinyitems-center fillinyrounded-sm fillinypy-1.5 fillinypl-8 fillinypr-2 fillinytext-sm fillinyoutline-none fillinytransition-colors focus:fillinybg-accent focus:fillinytext-accent-foreground data-[disabled]:fillinypointer-events-none data-[disabled]:fillinyopacity-50',
      className,
    )}
    {...props}>
    <span className="fillinyabsolute fillinyleft-2 fillinyflex fillinyh-3.5 fillinyw-3.5 fillinyitems-center fillinyjustify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="fillinyh-2 fillinyw-2 fillinyfill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn('fillinypx-2 fillinypy-1.5 fillinytext-sm fillinyfont-semibold', inset && 'fillinypl-8', className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('filliny-mx-1 fillinymy-1 fillinyh-px fillinybg-muted', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn('fillinyml-auto fillinytext-xs fillinytracking-widest fillinyopacity-60', className)}
      {...props}
    />
  );
};
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
