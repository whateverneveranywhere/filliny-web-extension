import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "filliny-flex filliny-min-h-[80px] filliny-w-full filliny-rounded-md filliny-border filliny-border-input filliny-bg-background filliny-px-3 filliny-py-2 filliny-text-sm filliny-ring-offset-background placeholder:filliny-text-muted-foreground focus-visible:filliny-outline-none focus-visible:filliny-ring-2 focus-visible:filliny-ring-ring focus-visible:filliny-ring-offset-2 disabled:filliny-cursor-not-allowed disabled:filliny-opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
