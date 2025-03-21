import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "filliny-z-50 filliny-w-72 filliny-rounded-md filliny-border filliny-bg-popover filliny-p-0 filliny-text-popover-foreground filliny-shadow-md filliny-outline-none data-[state=open]:filliny-animate-in data-[state=closed]:filliny-animate-out data-[state=closed]:filliny-fade-out-0 data-[state=open]:filliny-fade-in-0 data-[state=closed]:filliny-zoom-out-95 data-[state=open]:filliny-zoom-in-95 data-[side=bottom]:filliny-slide-in-from-top-2 data-[side=left]:filliny-slide-in-from-right-2 data-[side=right]:filliny-slide-in-from-left-2 data-[side=top]:filliny-slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
