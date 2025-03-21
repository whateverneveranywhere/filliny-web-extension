import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "filliny-inline-flex filliny-items-center filliny-rounded-md filliny-border filliny-px-2.5 filliny-py-0.5 filliny-text-xs filliny-font-semibold filliny-transition-colors focus:filliny-outline-none focus:filliny-ring-2 focus:filliny-ring-ring focus:filliny-ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "filliny-border-transparent filliny-bg-primary filliny-text-primary-foreground filliny-shadow hover:filliny-bg-primary/80",
        secondary:
          "filliny-border-transparent filliny-bg-secondary filliny-text-secondary-foreground hover:filliny-bg-secondary/80",
        destructive:
          "filliny-border-transparent filliny-bg-destructive filliny-text-destructive-foreground filliny-shadow hover:filliny-bg-destructive/80",
        outline: "filliny-text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
