import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '@/lib/utils';

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'fillinyz-50 fillinyw-72 fillinyrounded-md fillinyborder fillinybg-popover fillinyp-4 fillinytext-popover-foreground fillinyshadow-md fillinyoutline-none data-[state=open]:fillinyanimate-in data-[state=closed]:fillinyanimate-out data-[state=closed]:fillinyfade-out-0 data-[state=open]:fillinyfade-in-0 data-[state=closed]:fillinyzoom-out-95 data-[state=open]:fillinyzoom-in-95 data-[side=bottom]:fillinyslide-in-from-top-2 data-[side=left]:fillinyslide-in-from-right-2 data-[side=right]:fillinyslide-in-from-left-2 data-[side=top]:fillinyslide-in-from-bottom-2',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
