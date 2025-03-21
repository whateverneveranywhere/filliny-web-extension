import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "filliny-relative filliny-h-4 filliny-w-full filliny-overflow-hidden filliny-rounded-full filliny-bg-secondary",
      className,
    )}
    {...props}>
    <ProgressPrimitive.Indicator
      className="filliny-h-full filliny-w-full filliny-flex-1 filliny-bg-primary filliny-transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
