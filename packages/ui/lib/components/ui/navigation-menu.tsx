import { cn } from "@/lib/utils";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { cva } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
import * as React from "react";

const NavigationMenu = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Root
    ref={ref}
    className={cn(
      "filliny-relative filliny-z-10 filliny-flex filliny-max-w-max filliny-flex-1 filliny-items-center filliny-justify-center",
      className,
    )}
    {...props}>
    {children}
    <NavigationMenuViewport />
  </NavigationMenuPrimitive.Root>
));
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName;

const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.List
    ref={ref}
    className={cn(
      "filliny-group filliny-flex filliny-flex-1 filliny-list-none filliny-items-center filliny-justify-center filliny-space-x-1",
      className,
    )}
    {...props}
  />
));
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName;

const NavigationMenuItem = NavigationMenuPrimitive.Item;

const navigationMenuTriggerStyle = cva(
  "filliny-group filliny-inline-flex filliny-h-10 filliny-w-max filliny-items-center filliny-justify-center filliny-rounded-md filliny-bg-background filliny-px-4 filliny-py-2 filliny-text-sm filliny-font-medium filliny-transition-colors hover:filliny-bg-accent hover:filliny-text-accent-foreground focus:filliny-bg-accent focus:filliny-text-accent-foreground focus:filliny-outline-none disabled:filliny-pointer-events-none disabled:filliny-opacity-50 data-[active]:filliny-bg-accent/50 data-[state=open]:filliny-bg-accent/50",
);

const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Trigger
    ref={ref}
    className={cn(navigationMenuTriggerStyle(), "filliny-group", className)}
    {...props}>
    {children}{" "}
    <ChevronDown
      className="filliny-relative -filliny-top-[1px] filliny-ml-1 filliny-h-3 filliny-w-3 filliny-transition filliny-duration-200 group-data-[state=open]:filliny-rotate-180"
      aria-hidden="true"
    />
  </NavigationMenuPrimitive.Trigger>
));
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName;

const NavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Content
    ref={ref}
    className={cn(
      "filliny-left-0 filliny-top-0 filliny-w-full data-[motion^=from-]:filliny-animate-in data-[motion^=to-]:filliny-animate-out data-[motion^=from-]:filliny-fade-in data-[motion^=to-]:filliny-fade-out data-[motion=from-end]:filliny-slide-in-from-right-52 data-[motion=from-start]:filliny-slide-in-from-left-52 data-[motion=to-end]:filliny-slide-out-to-right-52 data-[motion=to-start]:filliny-slide-out-to-left-52 md:filliny-absolute md:filliny-w-auto filliny-",
      className,
    )}
    {...props}
  />
));
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName;

const NavigationMenuLink = NavigationMenuPrimitive.Link;

const NavigationMenuViewport = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <div className={cn("filliny-absolute filliny-left-0 filliny-top-full filliny-flex filliny-justify-center")}>
    <NavigationMenuPrimitive.Viewport
      className={cn(
        "filliny-origin-top-center filliny-relative filliny-mt-1.5 filliny-h-[var(--radix-navigation-menu-viewport-height)] filliny-w-full filliny-overflow-hidden filliny-rounded-md filliny-border filliny-bg-popover filliny-text-popover-foreground filliny-shadow-lg data-[state=open]:filliny-animate-in data-[state=closed]:filliny-animate-out data-[state=closed]:filliny-zoom-out-95 data-[state=open]:filliny-zoom-in-90 md:filliny-w-[var(--radix-navigation-menu-viewport-width)]",
        className,
      )}
      ref={ref}
      {...props}
    />
  </div>
));
NavigationMenuViewport.displayName = NavigationMenuPrimitive.Viewport.displayName;

const NavigationMenuIndicator = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Indicator>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Indicator
    ref={ref}
    className={cn(
      "filliny-top-full filliny-z-[1] filliny-flex filliny-h-1.5 filliny-items-end filliny-justify-center filliny-overflow-hidden data-[state=visible]:filliny-animate-in data-[state=hidden]:filliny-animate-out data-[state=hidden]:filliny-fade-out data-[state=visible]:filliny-fade-in",
      className,
    )}
    {...props}>
    <div className="filliny-relative filliny-top-[60%] filliny-h-2 filliny-w-2 filliny-rotate-45 filliny-rounded-tl-sm filliny-bg-border filliny-shadow-md" />
  </NavigationMenuPrimitive.Indicator>
));
NavigationMenuIndicator.displayName = NavigationMenuPrimitive.Indicator.displayName;

export {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
};
