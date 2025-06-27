import { cn } from "@/lib/utils";
import * as React from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "filliny-flex filliny-h-10 filliny-w-full filliny-rounded-md filliny-border filliny-border-input filliny-bg-background filliny-px-3 filliny-py-2 filliny-text-sm filliny-ring-offset-background file:filliny-border-0 file:filliny-bg-transparent file:filliny-text-sm file:filliny-font-medium file:filliny-text-foreground placeholder:filliny-text-muted-foreground focus-visible:filliny-outline-none focus-visible:filliny-ring-2 focus-visible:filliny-ring-ring focus-visible:filliny-ring-offset-2 disabled:filliny-cursor-not-allowed disabled:filliny-opacity-50",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
