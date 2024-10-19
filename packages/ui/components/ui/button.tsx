import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'fillinyinline-flex fillinyitems-center fillinyjustify-center fillinygap-2 fillinywhitespace-nowrap fillinyrounded-md fillinytext-sm fillinyfont-medium fillinyring-offset-background fillinytransition-colors focus-visible:fillinyoutline-none focus-visible:fillinyring-2 focus-visible:fillinyring-ring focus-visible:fillinyring-offset-2 disabled:fillinypointer-events-none disabled:fillinyopacity-50 [&_svg]:fillinypointer-events-none [&_svg]:fillinysize-4 [&_svg]:fillinyshrink-0',
  {
    variants: {
      variant: {
        default: 'fillinybg-primary fillinytext-primary-foreground hover:fillinybg-primary/90',
        destructive: 'fillinybg-destructive fillinytext-destructive-foreground hover:fillinybg-destructive/90',
        outline:
          'fillinyborder fillinyborder-input fillinybg-background hover:fillinybg-accent hover:fillinytext-accent-foreground',
        secondary: 'fillinybg-secondary fillinytext-secondary-foreground hover:fillinybg-secondary/80',
        ghost: 'hover:fillinybg-accent hover:fillinytext-accent-foreground',
        link: 'fillinytext-primary fillinyunderline-offset-4 hover:fillinyunderline',
      },
      size: {
        default: 'fillinyh-10 fillinypx-4 fillinypy-2',
        sm: 'fillinyh-9 fillinyrounded-md fillinypx-3',
        lg: 'fillinyh-11 fillinyrounded-md fillinypx-8',
        icon: 'fillinyh-10 fillinyw-10',
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
