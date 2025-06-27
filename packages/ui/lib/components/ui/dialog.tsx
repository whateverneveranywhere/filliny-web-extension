import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";

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
      "filliny-fixed filliny-inset-0 filliny-z-50 filliny-bg-black/80 filliny- data-[state=open]:filliny-animate-in data-[state=closed]:filliny-animate-out data-[state=closed]:filliny-fade-out-0 data-[state=open]:filliny-fade-in-0",
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
        "filliny-fixed filliny-left-[50%] filliny-top-[50%] filliny-z-50 filliny-grid filliny-w-full filliny-max-w-lg filliny-translate-x-[-50%] filliny-translate-y-[-50%] filliny-gap-4 filliny-border filliny-bg-background filliny-p-6 filliny-shadow-lg filliny-duration-200 data-[state=open]:filliny-animate-in data-[state=closed]:filliny-animate-out data-[state=closed]:filliny-fade-out-0 data-[state=open]:filliny-fade-in-0 data-[state=closed]:filliny-zoom-out-95 data-[state=open]:filliny-zoom-in-95 data-[state=closed]:filliny-slide-out-to-left-1/2 data-[state=closed]:filliny-slide-out-to-top-[48%] data-[state=open]:filliny-slide-in-from-left-1/2 data-[state=open]:filliny-slide-in-from-top-[48%] sm:filliny-rounded-lg",
        className,
      )}
      {...props}>
      {children}
      <DialogPrimitive.Close className="filliny-absolute filliny-right-4 filliny-top-4 filliny-rounded-sm filliny-opacity-70 filliny-ring-offset-background filliny-transition-opacity hover:filliny-opacity-100 focus:filliny-outline-none focus:filliny-ring-2 focus:filliny-ring-ring focus:filliny-ring-offset-2 disabled:filliny-pointer-events-none data-[state=open]:filliny-bg-accent data-[state=open]:filliny-text-muted-foreground">
        <X className="filliny-h-4 filliny-w-4" />
        <span className="filliny-sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "filliny-flex filliny-flex-col filliny-space-y-1.5 filliny-text-center sm:filliny-text-left",
      className,
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "filliny-flex filliny-flex-col-reverse sm:filliny-flex-row sm:filliny-justify-end sm:filliny-space-x-2",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("filliny-text-lg filliny-font-semibold filliny-leading-none filliny-tracking-tight", className)}
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
    className={cn("filliny-text-sm filliny-text-muted-foreground", className)}
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
