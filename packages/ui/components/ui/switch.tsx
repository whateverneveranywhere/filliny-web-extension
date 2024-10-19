import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';

import { cn } from '@/lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'fillinypeer fillinyinline-flex fillinyh-6 fillinyw-11 fillinyshrink-0 fillinycursor-pointer fillinyitems-center fillinyrounded-full fillinyborder-2 fillinyborder-transparent fillinytransition-colors focus-visible:fillinyoutline-none focus-visible:fillinyring-2 focus-visible:fillinyring-ring focus-visible:fillinyring-offset-2 focus-visible:fillinyring-offset-background disabled:fillinycursor-not-allowed disabled:fillinyopacity-50 data-[state=checked]:fillinybg-primary data-[state=unchecked]:fillinybg-input',
      className,
    )}
    {...props}
    ref={ref}>
    <SwitchPrimitives.Thumb
      className={cn(
        'fillinypointer-events-none fillinyblock fillinyh-5 fillinyw-5 fillinyrounded-full fillinybg-background fillinyshadow-lg fillinyring-0 fillinytransition-transform data-[state=checked]:fillinytranslate-x-5 data-[state=unchecked]:fillinytranslate-x-0',
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
