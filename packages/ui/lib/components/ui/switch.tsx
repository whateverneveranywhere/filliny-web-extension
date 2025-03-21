import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "filliny-peer filliny-inline-flex filliny-h-6 filliny-w-11 filliny-shrink-0 filliny-cursor-pointer filliny-items-center filliny-rounded-full filliny-border-2 filliny-border-transparent filliny-transition-colors focus-visible:filliny-outline-none focus-visible:filliny-ring-2 focus-visible:filliny-ring-ring focus-visible:filliny-ring-offset-2 focus-visible:filliny-ring-offset-background disabled:filliny-cursor-not-allowed disabled:filliny-opacity-50 data-[state=checked]:filliny-bg-primary data-[state=unchecked]:filliny-bg-input",
      className,
    )}
    {...props}
    ref={ref}>
    <SwitchPrimitives.Thumb
      className={cn(
        "filliny-pointer-events-none filliny-block filliny-h-5 filliny-w-5 filliny-rounded-full filliny-bg-background filliny-shadow-lg filliny-ring-0 filliny-transition-transform data-[state=checked]:filliny-translate-x-5 data-[state=unchecked]:filliny-translate-x-0",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
