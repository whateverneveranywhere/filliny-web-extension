import * as React from "react";
import { type DialogProps } from "@radix-ui/react-dialog";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "../ui/dialog";

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "filliny-flex filliny-h-full filliny-w-full filliny-flex-col filliny-overflow-hidden filliny-rounded-md filliny-bg-popover filliny-text-popover-foreground",
      className,
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

type CommandDialogProps = DialogProps;

const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="filliny-overflow-hidden filliny-p-0 filliny-shadow-lg">
        <Command className="[&_[cmdk-group-heading]]:filliny-px-2 [&_[cmdk-group-heading]]:filliny-font-medium [&_[cmdk-group-heading]]:filliny-text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:filliny-pt-0 [&_[cmdk-group]]:filliny-px-2 [&_[cmdk-input-wrapper]_svg]:filliny-size-5 [&_[cmdk-input]]:filliny-h-12 [&_[cmdk-item]]:filliny-px-2 [&_[cmdk-item]]:filliny-py-3 [&_[cmdk-item]_svg]:filliny-size-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
};

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="filliny-flex filliny-items-center filliny-border-b filliny-px-3" cmdk-input-wrapper="">
    <Search className="filliny-mr-2 filliny-size-4 filliny-shrink-0 filliny-opacity-50" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "filliny-flex filliny-h-11 filliny-w-full filliny-rounded-md filliny-bg-transparent filliny-py-3 filliny-text-sm filliny-outline-none placeholder:filliny-text-muted-foreground disabled:filliny-cursor-not-allowed disabled:filliny-opacity-50",
        className,
      )}
      {...props}
    />
  </div>
));

CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("filliny-max-h-[300px] filliny-overflow-y-auto filliny-overflow-x-hidden", className)}
    {...props}
  />
));

CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty ref={ref} className="filliny-py-6 filliny-text-center filliny-text-sm" {...props} />
));

CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "filliny-overflow-hidden filliny-p-1 filliny-text-foreground [&_[cmdk-group-heading]]:filliny-px-2 [&_[cmdk-group-heading]]:filliny-py-1.5 [&_[cmdk-group-heading]]:filliny-text-xs [&_[cmdk-group-heading]]:filliny-font-medium [&_[cmdk-group-heading]]:filliny-text-muted-foreground",
      className,
    )}
    {...props}
  />
));

CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-filliny-mx-1 filliny-h-px filliny-bg-border", className)}
    {...props}
  />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "filliny-relative filliny-flex filliny-cursor-default filliny-select-none filliny-items-center filliny-rounded-sm filliny-px-2 filliny-py-1.5 filliny-text-sm filliny-outline-none aria-selected:filliny-bg-accent aria-selected:filliny-text-accent-foreground data-[disabled='true']:filliny-pointer-events-none data-[disabled='true']:filliny-opacity-50",
      className,
    )}
    {...props}
  />
));

CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("filliny-ml-auto filliny-text-xs filliny-tracking-widest filliny-text-muted-foreground", className)}
      {...props}
    />
  );
};
CommandShortcut.displayName = "CommandShortcut";

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
