import { ShadowPortal } from "../shadow-portal";
import { cn } from "@/lib/utils";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import * as React from "react";

const ShadowDropdownMenu = DropdownMenuPrimitive.Root;
const ShadowDropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const ShadowDropdownMenuGroup = DropdownMenuPrimitive.Group;
const ShadowDropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const ShadowDropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "filliny-flex filliny-cursor-default filliny-select-none filliny-items-center filliny-rounded-sm filliny-px-2 filliny-py-1.5 filliny-text-sm filliny-outline-none focus:filliny-bg-accent data-[state=open]:filliny-bg-accent",
      inset && "filliny-pl-8",
      className,
    )}
    {...props}>
    {children}
    <ChevronRight className="filliny-ml-auto filliny-h-4 filliny-w-4" />
  </DropdownMenuPrimitive.SubTrigger>
));
ShadowDropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const ShadowDropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent> & { portalContainerId?: string }
>(({ className, portalContainerId = "shadow-dropdown-subcontent", ...props }, ref) => (
  <ShadowPortal containerId={portalContainerId} zIndex={9999}>
    <DropdownMenuPrimitive.SubContent
      ref={ref}
      className={cn(
        "filliny-z-50 filliny-min-w-[8rem] filliny-overflow-hidden filliny-rounded-md filliny-border filliny-bg-popover filliny-p-1 filliny-text-popover-foreground filliny-shadow-lg data-[state=open]:filliny-animate-in data-[state=closed]:filliny-animate-out data-[state=closed]:filliny-fade-out-0 data-[state=open]:filliny-fade-in-0 data-[state=closed]:filliny-zoom-out-95 data-[state=open]:filliny-zoom-in-95 data-[side=bottom]:filliny-slide-in-from-top-2 data-[side=left]:filliny-slide-in-from-right-2 data-[side=right]:filliny-slide-in-from-left-2 data-[side=top]:filliny-slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </ShadowPortal>
));
ShadowDropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

const ShadowDropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> & { portalContainerId?: string }
>(({ className, portalContainerId = "shadow-dropdown-content", sideOffset = 4, ...props }, ref) => (
  <ShadowPortal containerId={portalContainerId} zIndex={9999}>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "filliny-z-50 filliny-min-w-[8rem] filliny-overflow-hidden filliny-rounded-md filliny-border filliny-bg-popover filliny-p-1 filliny-text-popover-foreground filliny-shadow-md data-[state=open]:filliny-animate-in data-[state=closed]:filliny-animate-out data-[state=closed]:filliny-fade-out-0 data-[state=open]:filliny-fade-in-0 data-[state=closed]:filliny-zoom-out-95 data-[state=open]:filliny-zoom-in-95 data-[side=bottom]:filliny-slide-in-from-top-2 data-[side=left]:filliny-slide-in-from-right-2 data-[side=right]:filliny-slide-in-from-left-2 data-[side=top]:filliny-slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </ShadowPortal>
));
ShadowDropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const ShadowDropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "filliny-relative filliny-flex filliny-cursor-default filliny-select-none filliny-items-center filliny-rounded-sm filliny-px-2 filliny-py-1.5 filliny-text-sm filliny-outline-none filliny-transition-colors focus:filliny-bg-accent focus:filliny-text-accent-foreground data-[disabled]:filliny-pointer-events-none data-[disabled]:filliny-opacity-50",
      inset && "filliny-pl-8",
      className,
    )}
    {...props}
  />
));
ShadowDropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const ShadowDropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "filliny-relative filliny-flex filliny-cursor-default filliny-select-none filliny-items-center filliny-rounded-sm filliny-py-1.5 filliny-pl-8 filliny-pr-2 filliny-text-sm filliny-outline-none filliny-transition-colors focus:filliny-bg-accent focus:filliny-text-accent-foreground data-[disabled]:filliny-pointer-events-none data-[disabled]:filliny-opacity-50",
      className,
    )}
    checked={checked}
    {...props}>
    <span className="filliny-absolute filliny-left-2 filliny-flex filliny-h-3.5 filliny-w-3.5 filliny-items-center filliny-justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="filliny-h-4 filliny-w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
ShadowDropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

const ShadowDropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "filliny-relative filliny-flex filliny-cursor-default filliny-select-none filliny-items-center filliny-rounded-sm filliny-py-1.5 filliny-pl-8 filliny-pr-2 filliny-text-sm filliny-outline-none filliny-transition-colors focus:filliny-bg-accent focus:filliny-text-accent-foreground data-[disabled]:filliny-pointer-events-none data-[disabled]:filliny-opacity-50",
      className,
    )}
    {...props}>
    <span className="filliny-absolute filliny-left-2 filliny-flex filliny-h-3.5 filliny-w-3.5 filliny-items-center filliny-justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="filliny-h-2 filliny-w-2 filliny-fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
ShadowDropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const ShadowDropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "filliny-px-2 filliny-py-1.5 filliny-text-sm filliny-font-semibold",
      inset && "filliny-pl-8",
      className,
    )}
    {...props}
  />
));
ShadowDropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const ShadowDropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("filliny-mx-1 filliny-my-1 filliny-h-px filliny-bg-muted", className)}
    {...props}
  />
));
ShadowDropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const ShadowDropdownMenuSub = DropdownMenuPrimitive.Sub;

const ShadowDropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn("filliny-ml-auto filliny-text-xs filliny-tracking-widest filliny-opacity-60", className)}
    {...props}
  />
);
ShadowDropdownMenuShortcut.displayName = "ShadowDropdownMenuShortcut";

export {
  ShadowDropdownMenu,
  ShadowDropdownMenuTrigger,
  ShadowDropdownMenuContent,
  ShadowDropdownMenuItem,
  ShadowDropdownMenuCheckboxItem,
  ShadowDropdownMenuRadioItem,
  ShadowDropdownMenuLabel,
  ShadowDropdownMenuSeparator,
  ShadowDropdownMenuShortcut,
  ShadowDropdownMenuGroup,
  ShadowDropdownMenuSub,
  ShadowDropdownMenuSubTrigger,
  ShadowDropdownMenuSubContent,
  ShadowDropdownMenuRadioGroup,
};
