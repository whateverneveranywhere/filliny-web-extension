import { ShadowPortal } from '../shadow-portal';
import { cn } from '@/lib/utils';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';

const ShadowTooltipProvider = TooltipPrimitive.Provider;

const ShadowTooltip = TooltipPrimitive.Root;

const ShadowTooltipTrigger = TooltipPrimitive.Trigger;

/**
 * An enhanced TooltipContent component that uses ShadowPortal
 * to ensure it renders properly within the Shadow DOM boundary.
 */
const ShadowTooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & { portalContainerId?: string }
>(({ className, sideOffset = 4, portalContainerId = 'shadow-tooltip-container', ...props }, ref) => (
  <ShadowPortal containerId={portalContainerId} zIndex={1000000000003}>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'filliny-z-50 filliny-overflow-hidden filliny-rounded-md filliny-border filliny-bg-popover/80 filliny-backdrop-blur-sm filliny-px-3 filliny-py-1.5 filliny-text-sm filliny-text-popover-foreground filliny-shadow-md filliny-animate-in filliny-fade-in-0 filliny-zoom-in-95 data-[state=closed]:filliny-animate-out data-[state=closed]:filliny-fade-out-0 data-[state=closed]:filliny-zoom-out-95 data-[side=bottom]:filliny-slide-in-from-top-2 data-[side=left]:filliny-slide-in-from-right-2 data-[side=right]:filliny-slide-in-from-left-2 data-[side=top]:filliny-slide-in-from-bottom-2',
        className,
      )}
      {...props}
    />
  </ShadowPortal>
));
ShadowTooltipContent.displayName = 'ShadowTooltipContent';

export { ShadowTooltip, ShadowTooltipTrigger, ShadowTooltipContent, ShadowTooltipProvider };
