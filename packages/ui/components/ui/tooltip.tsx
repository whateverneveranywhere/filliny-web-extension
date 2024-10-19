import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'fillinyz-50 fillinyoverflow-hidden fillinyrounded-md fillinyborder fillinybg-popover fillinypx-3 fillinypy-1.5 fillinytext-sm fillinytext-popover-foreground fillinyshadow-md fillinyanimate-in fillinyfade-in-0 fillinyzoom-in-95 data-[state=closed]:fillinyanimate-out data-[state=closed]:fillinyfade-out-0 data-[state=closed]:fillinyzoom-out-95 data-[side=bottom]:fillinyslide-in-from-top-2 data-[side=left]:fillinyslide-in-from-right-2 data-[side=right]:fillinyslide-in-from-left-2 data-[side=top]:fillinyslide-in-from-bottom-2',
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
