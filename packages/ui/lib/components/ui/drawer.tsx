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

/**
 * Checks if an element or any of its ancestors is a Radix portal element (popover, dropdown, etc.)
 * This is used to prevent the drawer from closing when clicking on portaled content
 */
const isInsideRadixPortal = (element: HTMLElement | null): boolean => {
  let current = element;
  while (current) {
    // Check for Radix portal indicators
    if (
      current.hasAttribute('data-radix-popper-content-wrapper') ||
      current.hasAttribute('data-radix-menu-content') ||
      current.hasAttribute('data-radix-select-content') ||
      current.hasAttribute('data-radix-popover-content') ||
      current.hasAttribute('data-radix-dropdown-menu-content') ||
      current.closest('[data-radix-popper-content-wrapper]') ||
      current.closest('[data-radix-menu-content]') ||
      current.closest('[data-radix-select-content]') ||
      current.closest('[data-radix-popover-content]') ||
      current.closest('[data-radix-dropdown-menu-content]')
    ) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
};

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, onClick, onPointerDown, onPointerDownCapture, ...props }, ref) => {
  const handlePointerEvent = (event: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    // Prevent drawer from closing if clicking inside a Radix portal (popover, dropdown, etc.)
    if (isInsideRadixPortal(event.target as HTMLElement)) {
      event.stopPropagation();
      event.preventDefault();
      return true;
    }
    return false;
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (handlePointerEvent(event)) return;
    onClick?.(event);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (handlePointerEvent(event)) return;
    onPointerDown?.(event);
  };

  const handlePointerDownCapture = (event: React.PointerEvent<HTMLDivElement>) => {
    if (handlePointerEvent(event)) return;
    onPointerDownCapture?.(event);
  };

  return (
    <DrawerPrimitive.Overlay
      ref={ref}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerDownCapture={handlePointerDownCapture}
      className={cn(
        'filliny-fixed filliny-inset-0 filliny-z-50 filliny-bg-black/50',
        'data-[state=open]:filliny-animate-in data-[state=open]:filliny-fade-in-0 data-[state=open]:filliny-duration-500',
        'data-[state=closed]:filliny-animate-out data-[state=closed]:filliny-fade-out-0 data-[state=closed]:filliny-duration-300',
        className,
      )}
      {...props}
    />
  );
});
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, onPointerDownOutside, onInteractOutside, ...props }, ref) => {
  /**
   * Handle pointer down outside events to prevent drawer from closing
   * when clicking on Radix portal elements (popovers, dropdowns, selects, etc.)
   */
  const handlePointerDownOutside = (event: Event) => {
    const target = event.target as HTMLElement;
    if (isInsideRadixPortal(target)) {
      event.preventDefault();
      return;
    }
    // Call the original handler if provided
    if (onPointerDownOutside) {
      onPointerDownOutside(event as Parameters<NonNullable<typeof onPointerDownOutside>>[0]);
    }
  };

  /**
   * Handle interact outside events (covers focus events as well)
   */
  const handleInteractOutside = (event: Event) => {
    const target = event.target as HTMLElement;
    if (isInsideRadixPortal(target)) {
      event.preventDefault();
      return;
    }
    // Call the original handler if provided
    if (onInteractOutside) {
      onInteractOutside(event as Parameters<NonNullable<typeof onInteractOutside>>[0]);
    }
  };

  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={ref}
        onPointerDownOutside={handlePointerDownOutside}
        onInteractOutside={handleInteractOutside}
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
  );
});
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
