"use client";

import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "filliny-inline-flex filliny-items-center filliny-justify-center filliny-rounded-md filliny-text-sm filliny-font-medium filliny-ring-offset-background filliny-transition-colors hover:filliny-bg-muted hover:filliny-text-muted-foreground focus-visible:filliny-outline-none focus-visible:filliny-ring-2 focus-visible:filliny-ring-ring focus-visible:filliny-ring-offset-2 disabled:filliny-pointer-events-none disabled:filliny-opacity-50 data-[state=on]:filliny-bg-accent data-[state=on]:filliny-text-accent-foreground [&_svg]:filliny-pointer-events-none [&_svg]:filliny-size-4 [&_svg]:filliny-shrink-0 filliny-gap-2",
  {
    variants: {
      variant: {
        default: "filliny-bg-transparent",
        outline:
          "filliny-border filliny-border-input filliny-bg-transparent hover:filliny-bg-accent hover:filliny-text-accent-foreground",
      },
      size: {
        default: "filliny-h-10 filliny-px-3 filliny-min-w-10",
        sm: "filliny-h-9 filliny-px-2.5 filliny-min-w-9",
        lg: "filliny-h-11 filliny-px-5 filliny-min-w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root ref={ref} className={cn(toggleVariants({ variant, size, className }))} {...props} />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
