import * as React from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'filliny-fixed filliny-top-0 filliny-z-[100] filliny-flex filliny-max-h-screen filliny-w-full filliny-flex-col-reverse filliny-p-4 sm:filliny-bottom-0 sm:filliny-right-0 sm:filliny-top-auto sm:filliny-flex-col md:filliny-max-w-[420px]',
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  'filliny-group filliny-pointer-events-auto filliny-relative filliny-flex filliny-w-full filliny-items-center filliny-justify-between filliny-space-x-4 filliny-overflow-hidden filliny-rounded-md filliny-border filliny-p-6 filliny-pr-8 filliny-shadow-lg filliny-transition-all data-[swipe=cancel]:filliny-translate-x-0 data-[swipe=end]:filliny-translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:filliny-translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:filliny-transition-none data-[state=open]:filliny-animate-in data-[state=closed]:filliny-animate-out data-[swipe=end]:filliny-animate-out data-[state=closed]:filliny-fade-out-80 data-[state=closed]:filliny-slide-out-to-right-full data-[state=open]:filliny-slide-in-from-top-full data-[state=open]:sm:filliny-slide-in-from-bottom-full',
  {
    variants: {
      variant: {
        default: 'filliny-border filliny-bg-background filliny-text-foreground',
        destructive:
          'filliny-destructive filliny-group filliny-border-destructive filliny-bg-destructive filliny-text-destructive-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return <ToastPrimitives.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />;
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      'filliny-inline-flex filliny-h-8 filliny-shrink-0 filliny-items-center filliny-justify-center filliny-rounded-md filliny-border filliny-bg-transparent filliny-px-3 filliny-text-sm filliny-font-medium filliny-ring-offset-background filliny-transition-colors hover:filliny-bg-secondary focus:filliny-outline-none focus:filliny-ring-2 focus:filliny-ring-ring focus:filliny-ring-offset-2 disabled:filliny-pointer-events-none disabled:filliny-opacity-50 group-[.destructive]:filliny-border-muted/40 group-[.destructive]:hover:filliny-border-destructive/30 group-[.destructive]:hover:filliny-bg-destructive group-[.destructive]:hover:filliny-text-destructive-foreground group-[.destructive]:focus:filliny-ring-destructive',
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'filliny-absolute filliny-right-2 filliny-top-2 filliny-rounded-md filliny-p-1 filliny-text-foreground/50 filliny-opacity-0 filliny-transition-opacity hover:filliny-text-foreground focus:filliny-opacity-100 focus:filliny-outline-none focus:filliny-ring-2 group-hover:filliny-opacity-100 group-[.destructive]:filliny-text-red-300 group-[.destructive]:hover:filliny-text-red-50 group-[.destructive]:focus:filliny-ring-red-400 group-[.destructive]:focus:filliny-ring-offset-red-600',
      className,
    )}
    toast-close=""
    {...props}>
    <X className="filliny-h-4 filliny-w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn('filliny-text-sm filliny-font-semibold', className)} {...props} />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description ref={ref} className={cn('filliny-text-sm filliny-opacity-90', className)} {...props} />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
