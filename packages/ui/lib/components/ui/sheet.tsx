import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      'filliny-fixed filliny-inset-0 filliny-z-50 filliny-bg-black/80  data-[state=open]:filliny-animate-in data-[state=closed]:filliny-animate-out data-[state=closed]:filliny-fade-out-0 data-[state=open]:filliny-fade-in-0',
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  'filliny-fixed filliny-z-50 filliny-gap-4 filliny-bg-background filliny-p-6 filliny-shadow-lg filliny-transition filliny-ease-in-out data-[state=closed]:filliny-duration-300 data-[state=open]:filliny-duration-500 data-[state=open]:filliny-animate-in data-[state=closed]:filliny-animate-out',
  {
    variants: {
      side: {
        top: 'filliny-inset-x-0 filliny-top-0 filliny-border-b data-[state=closed]:filliny-slide-out-to-top data-[state=open]:filliny-slide-in-from-top',
        bottom:
          'filliny-inset-x-0 filliny-bottom-0 filliny-border-t data-[state=closed]:filliny-slide-out-to-bottom data-[state=open]:filliny-slide-in-from-bottom',
        left: 'filliny-inset-y-0 filliny-left-0 filliny-h-full filliny-w-3/4 filliny-border-r data-[state=closed]:filliny-slide-out-to-left data-[state=open]:filliny-slide-in-from-left sm:filliny-max-w-sm',
        right:
          'filliny-inset-y-0 filliny-right-0 filliny-h-full filliny-w-3/4  filliny-border-l data-[state=closed]:filliny-slide-out-to-right data-[state=open]:filliny-slide-in-from-right sm:filliny-max-w-sm',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  },
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  ({ side = 'right', className, children, ...props }, ref) => (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content ref={ref} className={cn(sheetVariants({ side }), className)} {...props}>
        {children}
        <SheetPrimitive.Close className="filliny-absolute filliny-right-4 filliny-top-4 filliny-rounded-sm filliny-opacity-70 filliny-ring-offset-background filliny-transition-opacity hover:filliny-opacity-100 focus:filliny-outline-none focus:filliny-ring-2 focus:filliny-ring-ring focus:filliny-ring-offset-2 disabled:filliny-pointer-events-none data-[state=open]:filliny-bg-secondary">
          <X className="filliny-h-4 filliny-w-4" />
          <span className="filliny-sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  ),
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'filliny-flex filliny-flex-col filliny-space-y-2 filliny-text-center sm:filliny-text-left',
      className,
    )}
    {...props}
  />
);
SheetHeader.displayName = 'SheetHeader';

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'filliny-flex filliny-flex-col-reverse sm:filliny-flex-row sm:filliny-justify-end sm:filliny-space-x-2',
      className,
    )}
    {...props}
  />
);
SheetFooter.displayName = 'SheetFooter';

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn('filliny-text-lg filliny-font-semibold filliny-text-foreground', className)}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn('filliny-text-sm filliny-text-muted-foreground', className)}
    {...props}
  />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
