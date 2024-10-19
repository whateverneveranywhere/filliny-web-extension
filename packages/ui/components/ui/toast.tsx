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
      'fillinyfixed fillinytop-0 fillinyz-[100] fillinyflex fillinymax-h-screen fillinyw-full fillinyflex-col-reverse fillinyp-4 sm:fillinybottom-0 sm:fillinyright-0 sm:fillinytop-auto sm:fillinyflex-col md:fillinymax-w-[420px]',
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  'fillinygroup fillinypointer-events-auto fillinyrelative fillinyflex fillinyw-full fillinyitems-center fillinyjustify-between fillinyspace-x-4 fillinyoverflow-hidden fillinyrounded-md fillinyborder fillinyp-6 fillinypr-8 fillinyshadow-lg fillinytransition-all data-[swipe=cancel]:fillinytranslate-x-0 data-[swipe=end]:fillinytranslate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:fillinytranslate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:fillinytransition-none data-[state=open]:fillinyanimate-in data-[state=closed]:fillinyanimate-out data-[swipe=end]:fillinyanimate-out data-[state=closed]:fillinyfade-out-80 data-[state=closed]:fillinyslide-out-to-right-full data-[state=open]:fillinyslide-in-from-top-full data-[state=open]:sm:fillinyslide-in-from-bottom-full',
  {
    variants: {
      variant: {
        default: 'fillinyborder fillinybg-background fillinytext-foreground',
        destructive:
          'fillinydestructive fillinygroup fillinyborder-destructive fillinybg-destructive fillinytext-destructive-foreground',
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
      'fillinyinline-flex fillinyh-8 fillinyshrink-0 fillinyitems-center fillinyjustify-center fillinyrounded-md fillinyborder fillinybg-transparent fillinypx-3 fillinytext-sm fillinyfont-medium fillinyring-offset-background fillinytransition-colors hover:fillinybg-secondary focus:fillinyoutline-none focus:fillinyring-2 focus:fillinyring-ring focus:fillinyring-offset-2 disabled:fillinypointer-events-none disabled:fillinyopacity-50 group-[.destructive]:fillinyborder-muted/40 group-[.destructive]:hover:fillinyborder-destructive/30 group-[.destructive]:hover:fillinybg-destructive group-[.destructive]:hover:fillinytext-destructive-foreground group-[.destructive]:focus:fillinyring-destructive',
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
      'fillinyabsolute fillinyright-2 fillinytop-2 fillinyrounded-md fillinyp-1 fillinytext-foreground/50 fillinyopacity-0 fillinytransition-opacity hover:fillinytext-foreground focus:fillinyopacity-100 focus:fillinyoutline-none focus:fillinyring-2 group-hover:fillinyopacity-100 group-[.destructive]:fillinytext-red-300 group-[.destructive]:hover:fillinytext-red-50 group-[.destructive]:focus:fillinyring-red-400 group-[.destructive]:focus:fillinyring-offset-red-600',
      className,
    )}
    toast-close=""
    {...props}>
    <X className="fillinyh-4 fillinyw-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn('fillinytext-sm fillinyfont-semibold', className)} {...props} />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description ref={ref} className={cn('fillinytext-sm fillinyopacity-90', className)} {...props} />
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
