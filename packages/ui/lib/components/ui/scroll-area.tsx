import * as React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';

import { cn } from '@/lib/utils';

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root ref={ref} className={cn('filliny-relative filliny-overflow-hidden', className)} {...props}>
    <ScrollAreaPrimitive.Viewport className="filliny-h-full filliny-w-full filliny-rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      'filliny-flex filliny-touch-none filliny-select-none filliny-transition-colors',
      orientation === 'vertical' &&
        'filliny-h-full filliny-w-2.5 filliny-border-l filliny-border-l-transparent filliny-p-[1px]',
      orientation === 'horizontal' &&
        'filliny-h-2.5 filliny-flex-col filliny-border-t filliny-border-t-transparent filliny-p-[1px]',
      className,
    )}
    {...props}>
    <ScrollAreaPrimitive.ScrollAreaThumb className="filliny-relative filliny-flex-1 filliny-rounded-full filliny-bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
