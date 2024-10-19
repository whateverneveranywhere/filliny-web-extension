import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'filliny-inline-flex filliny-items-center filliny-justify-center filliny-gap-2 filliny-whitespace-nowrap filliny-rounded-md filliny-text-sm filliny-font-medium filliny-ring-offset-background filliny-transition-colors focus-visible:filliny-outline-none focus-visible:filliny-ring-2 focus-visible:filliny-ring-ring focus-visible:filliny-ring-offset-2 disabled:filliny-pointer-events-none disabled:filliny-opacity-50 [&_svg]:filliny-pointer-events-none [&_svg]:filliny-size-4 [&_svg]:filliny-shrink-0',
  {
    variants: {
      variant: {
        default: 'filliny-bg-primary filliny-text-primary-foreground hover:filliny-bg-primary/90',
        destructive: 'filliny-bg-destructive filliny-text-destructive-foreground hover:filliny-bg-destructive/90',
        outline:
          'filliny-border filliny-border-input filliny-bg-background hover:filliny-bg-accent hover:filliny-text-accent-foreground',
        secondary: 'filliny-bg-secondary filliny-text-secondary-foreground hover:filliny-bg-secondary/80',
        ghost: 'hover:filliny-bg-accent hover:filliny-text-accent-foreground',
        link: 'filliny-text-primary filliny-underline-offset-4 hover:filliny-underline',
      },
      size: {
        default: 'filliny-h-10 filliny-px-4 filliny-py-2',
        sm: 'filliny-h-9 filliny-rounded-md filliny-px-3',
        lg: 'filliny-h-11 filliny-rounded-md filliny-px-8',
        icon: 'filliny-h-10 filliny-w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
