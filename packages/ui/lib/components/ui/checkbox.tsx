import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "filliny-peer filliny-h-4 filliny-w-4 filliny-shrink-0 filliny-rounded-sm filliny-border filliny-border-primary filliny-ring-offset-background focus-visible:filliny-outline-none focus-visible:filliny-ring-2 focus-visible:filliny-ring-ring focus-visible:filliny-ring-offset-2 disabled:filliny-cursor-not-allowed disabled:filliny-opacity-50 data-[state=checked]:filliny-bg-primary data-[state=checked]:filliny-text-primary-foreground",
      className,
    )}
    {...props}>
    <CheckboxPrimitive.Indicator
      className={cn("filliny-flex filliny-items-center filliny-justify-center filliny-text-current")}>
      <Check className="filliny-h-4 filliny-w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
