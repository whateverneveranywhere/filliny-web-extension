import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'fillinypeer fillinyh-4 fillinyw-4 fillinyshrink-0 fillinyrounded-sm fillinyborder fillinyborder-primary fillinyring-offset-background focus-visible:fillinyoutline-none focus-visible:fillinyring-2 focus-visible:fillinyring-ring focus-visible:fillinyring-offset-2 disabled:fillinycursor-not-allowed disabled:fillinyopacity-50 data-[state=checked]:fillinybg-primary data-[state=checked]:fillinytext-primary-foreground',
      className,
    )}
    {...props}>
    <CheckboxPrimitive.Indicator
      className={cn('fillinyflex fillinyitems-center fillinyjustify-center fillinytext-current')}>
      <Check className="fillinyh-4 fillinyw-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
