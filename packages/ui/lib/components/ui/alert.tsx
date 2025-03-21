import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "filliny-relative filliny-w-full filliny-rounded-lg filliny-border filliny-p-4 [&>svg+div]:filliny-translate-y-[-3px] [&>svg]:filliny-absolute [&>svg]:filliny-left-4 [&>svg]:filliny-top-4 [&>svg]:filliny-text-foreground [&>svg~*]:filliny-pl-7",
  {
    variants: {
      variant: {
        default: "filliny-bg-background filliny-text-foreground",
        destructive:
          "filliny-border-destructive/50 filliny-text-destructive dark:filliny-border-destructive [&>svg]:filliny-text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    // eslint-disable-next-line jsx-a11y/heading-has-content
    <h5
      ref={ref}
      className={cn("filliny-mb-1 filliny-font-medium filliny-leading-none filliny-tracking-tight", className)}
      {...props}
    />
  ),
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("filliny-text-sm [&_p]:filliny-leading-relaxed", className)} {...props} />
  ),
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
