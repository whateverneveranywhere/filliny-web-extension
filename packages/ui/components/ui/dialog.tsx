import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fillinyfixed fillinyinset-0 fillinyz-50 fillinybg-black/80 filliny data-[state=open]:fillinyanimate-in data-[state=closed]:fillinyanimate-out data-[state=closed]:fillinyfade-out-0 data-[state=open]:fillinyfade-in-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fillinyfixed fillinyleft-[50%] fillinytop-[50%] fillinyz-50 fillinygrid fillinyw-full fillinymax-w-lg fillinytranslate-x-[-50%] fillinytranslate-y-[-50%] fillinygap-4 fillinyborder fillinybg-background fillinyp-6 fillinyshadow-lg fillinyduration-200 data-[state=open]:fillinyanimate-in data-[state=closed]:fillinyanimate-out data-[state=closed]:fillinyfade-out-0 data-[state=open]:fillinyfade-in-0 data-[state=closed]:fillinyzoom-out-95 data-[state=open]:fillinyzoom-in-95 data-[state=closed]:fillinyslide-out-to-left-1/2 data-[state=closed]:fillinyslide-out-to-top-[48%] data-[state=open]:fillinyslide-in-from-left-1/2 data-[state=open]:fillinyslide-in-from-top-[48%] sm:fillinyrounded-lg',
        className,
      )}
      {...props}>
      {children}
      <DialogPrimitive.Close className="fillinyabsolute fillinyright-4 fillinytop-4 fillinyrounded-sm fillinyopacity-70 fillinyring-offset-background fillinytransition-opacity hover:fillinyopacity-100 focus:fillinyoutline-none focus:fillinyring-2 focus:fillinyring-ring focus:fillinyring-offset-2 disabled:fillinypointer-events-none data-[state=open]:fillinybg-accent data-[state=open]:fillinytext-muted-foreground">
        <X className="fillinyh-4 fillinyw-4" />
        <span className="fillinysr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('fillinyflex fillinyflex-col fillinyspace-y-1.5 fillinytext-center sm:fillinytext-left', className)}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'fillinyflex fillinyflex-col-reverse sm:fillinyflex-row sm:fillinyjustify-end sm:fillinyspace-x-2',
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('fillinytext-lg fillinyfont-semibold fillinyleading-none fillinytracking-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('fillinytext-sm fillinytext-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
