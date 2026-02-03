import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import type * as React from 'react';

const badgeVariants = cva(
  'filliny-inline-flex filliny-items-center filliny-justify-center filliny-rounded-full filliny-border filliny-px-2.5 filliny-py-1 filliny-text-xs filliny-font-medium filliny-w-fit filliny-whitespace-nowrap filliny-shrink-0 filliny-transition-colors focus-visible:filliny-outline-none focus-visible:filliny-ring-2 focus-visible:filliny-ring-ring focus-visible:filliny-ring-offset-2 [&>svg]:filliny-size-3 filliny-gap-1 [&>svg]:filliny-pointer-events-none',
  {
    variants: {
      variant: {
        default: 'filliny-border-transparent filliny-bg-primary filliny-text-primary-foreground',
        secondary: 'filliny-border-transparent filliny-bg-secondary filliny-text-secondary-foreground',
        destructive: 'filliny-border-transparent filliny-bg-destructive filliny-text-destructive-foreground',
        outline: 'filliny-text-foreground',
        success: 'filliny-border-transparent filliny-bg-success filliny-text-success-foreground',
        warning: 'filliny-border-transparent filliny-bg-warning filliny-text-warning-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
);

export { Badge, badgeVariants };
export type { BadgeProps };
