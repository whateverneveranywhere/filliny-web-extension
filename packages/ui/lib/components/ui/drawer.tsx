import { cn } from '@/lib/utils';
import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';

const Drawer = ({ shouldScaleBackground = true, ...props }: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root direction="bottom" shouldScaleBackground={shouldScaleBackground} {...props} />
);
Drawer.displayName = 'Drawer';

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn(
      'filliny-fixed filliny-inset-0 filliny-z-50 filliny-bg-black/50',
      'data-[state=open]:filliny-animate-in data-[state=open]:filliny-fade-in-0 data-[state=open]:filliny-duration-500',
      'data-[state=closed]:filliny-animate-out data-[state=closed]:filliny-fade-out-0 data-[state=closed]:filliny-duration-300',
      className,
    )}
    {...props}
  />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        'filliny-fixed filliny-z-50 filliny-flex filliny-h-auto filliny-flex-col filliny-bg-background',
        'data-[vaul-drawer-direction=bottom]:filliny-inset-x-0 data-[vaul-drawer-direction=bottom]:filliny-bottom-0 data-[vaul-drawer-direction=bottom]:filliny-mt-24 data-[vaul-drawer-direction=bottom]:filliny-max-h-[80vh] data-[vaul-drawer-direction=bottom]:filliny-rounded-t-2xl data-[vaul-drawer-direction=bottom]:filliny-border-t',
        className,
      )}
      {...props}>
      <div className="filliny-mx-auto filliny-mt-4 filliny-h-2 filliny-w-[100px] filliny-shrink-0 filliny-rounded-full filliny-bg-muted" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = 'DrawerContent';

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('filliny-grid filliny-gap-1.5 filliny-p-4 filliny-text-left', className)} {...props} />
);
DrawerHeader.displayName = 'DrawerHeader';

const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('filliny-mt-auto filliny-flex filliny-flex-col filliny-gap-2 filliny-p-4', className)}
    {...props}
  />
);
DrawerFooter.displayName = 'DrawerFooter';

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn('filliny-text-lg filliny-font-semibold filliny-leading-none filliny-tracking-tight', className)}
    {...props}
  />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn('filliny-text-sm filliny-text-muted-foreground', className)}
    {...props}
  />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
