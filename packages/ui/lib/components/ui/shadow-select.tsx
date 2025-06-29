import { ShadowPortal } from "../shadow-portal";
import { cn } from "@/lib/utils";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import * as React from "react";

const ShadowSelect = SelectPrimitive.Root;
const ShadowSelectGroup = SelectPrimitive.Group;
const ShadowSelectValue = SelectPrimitive.Value;

const ShadowSelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "filliny-flex filliny-h-10 filliny-w-full filliny-items-center filliny-justify-between filliny-rounded-md filliny-border filliny-border-input filliny-bg-background filliny-px-3 filliny-py-2 filliny-text-sm filliny-ring-offset-background placeholder:filliny-text-muted-foreground focus:filliny-outline-none focus:filliny-ring-2 focus:filliny-ring-ring focus:filliny-ring-offset-2 disabled:filliny-cursor-not-allowed disabled:filliny-opacity-50 [&>span]:filliny-line-clamp-1",
      className,
    )}
    {...props}>
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="filliny-h-4 filliny-w-4 filliny-opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
ShadowSelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const ShadowSelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "filliny-flex filliny-cursor-default filliny-items-center filliny-justify-center filliny-py-1",
      className,
    )}
    {...props}>
    <ChevronUp className="filliny-h-4 filliny-w-4" />
  </SelectPrimitive.ScrollUpButton>
));
ShadowSelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const ShadowSelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "filliny-flex filliny-cursor-default filliny-items-center filliny-justify-center filliny-py-1",
      className,
    )}
    {...props}>
    <ChevronDown className="filliny-h-4 filliny-w-4" />
  </SelectPrimitive.ScrollDownButton>
));
ShadowSelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const ShadowSelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & { portalContainerId?: string }
>(({ className, children, position = "popper", portalContainerId = "shadow-select-container", ...props }, ref) => (
  <ShadowPortal containerId={portalContainerId} zIndex={9999}>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "filliny-relative filliny-z-50 filliny-max-h-96 filliny-min-w-[8rem] filliny-overflow-hidden filliny-rounded-md filliny-border filliny-bg-popover filliny-text-popover-foreground filliny-shadow-md data-[state=open]:filliny-animate-in data-[state=closed]:filliny-animate-out data-[state=closed]:filliny-fade-out-0 data-[state=open]:filliny-fade-in-0 data-[state=closed]:filliny-zoom-out-95 data-[state=open]:filliny-zoom-in-95 data-[side=bottom]:filliny-slide-in-from-top-2 data-[side=left]:filliny-slide-in-from-right-2 data-[side=right]:filliny-slide-in-from-left-2 data-[side=top]:filliny-slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:filliny-translate-y-1 data-[side=left]:filliny-translate-x-1 data-[side=right]:filliny-translate-x-1 data-[side=top]:filliny-translate-y-1",
        className,
      )}
      position={position}
      {...props}>
      <ShadowSelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "filliny-p-1",
          position === "popper" &&
            "filliny-h-[var(--radix-select-trigger-height)] filliny-w-full filliny-min-w-[var(--radix-select-trigger-width)]",
        )}>
        {children}
      </SelectPrimitive.Viewport>
      <ShadowSelectScrollDownButton />
    </SelectPrimitive.Content>
  </ShadowPortal>
));
ShadowSelectContent.displayName = SelectPrimitive.Content.displayName;

const ShadowSelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("filliny-py-1.5 filliny-pl-8 filliny-pr-2 filliny-text-sm filliny-font-semibold", className)}
    {...props}
  />
));
ShadowSelectLabel.displayName = SelectPrimitive.Label.displayName;

const ShadowSelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "filliny-relative filliny-flex filliny-w-full filliny-cursor-default filliny-select-none filliny-items-center filliny-rounded-sm filliny-py-1.5 filliny-pl-8 filliny-pr-2 filliny-text-sm filliny-outline-none focus:filliny-bg-accent focus:filliny-text-accent-foreground data-[disabled]:filliny-pointer-events-none data-[disabled]:filliny-opacity-50",
      className,
    )}
    {...props}>
    <span className="filliny-absolute filliny-left-2 filliny-flex filliny-h-3.5 filliny-w-3.5 filliny-items-center filliny-justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="filliny-h-4 filliny-w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
ShadowSelectItem.displayName = SelectPrimitive.Item.displayName;

const ShadowSelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("filliny-mx-1 filliny-my-1 filliny-h-px filliny-bg-muted", className)}
    {...props}
  />
));
ShadowSelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  ShadowSelect,
  ShadowSelectGroup,
  ShadowSelectValue,
  ShadowSelectTrigger,
  ShadowSelectContent,
  ShadowSelectLabel,
  ShadowSelectItem,
  ShadowSelectSeparator,
  ShadowSelectScrollUpButton,
  ShadowSelectScrollDownButton,
};
