import * as React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';

import { cn } from '@/lib/utils';

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root ref={ref} className={cn('fillinyrelative fillinyoverflow-hidden', className)} {...props}>
    <ScrollAreaPrimitive.Viewport className="fillinyh-full fillinyw-full fillinyrounded-[inherit]">
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
      'fillinyflex fillinytouch-none fillinyselect-none fillinytransition-colors',
      orientation === 'vertical' &&
        'fillinyh-full fillinyw-2.5 fillinyborder-l fillinyborder-l-transparent fillinyp-[1px]',
      orientation === 'horizontal' &&
        'fillinyh-2.5 fillinyflex-col fillinyborder-t fillinyborder-t-transparent fillinyp-[1px]',
      className,
    )}
    {...props}>
    <ScrollAreaPrimitive.ScrollAreaThumb className="fillinyrelative fillinyflex-1 fillinyrounded-full fillinybg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
