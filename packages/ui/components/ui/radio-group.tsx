import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Circle } from 'lucide-react';

import { cn } from '@/lib/utils';

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return <RadioGroupPrimitive.Root className={cn('fillinygrid fillinygap-2', className)} {...props} ref={ref} />;
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        'fillinyaspect-square fillinyh-4 fillinyw-4 fillinyrounded-full fillinyborder fillinyborder-primary fillinytext-primary fillinyring-offset-background focus:fillinyoutline-none focus-visible:fillinyring-2 focus-visible:fillinyring-ring focus-visible:fillinyring-offset-2 disabled:fillinycursor-not-allowed disabled:fillinyopacity-50',
        className,
      )}
      {...props}>
      <RadioGroupPrimitive.Indicator className="fillinyflex fillinyitems-center fillinyjustify-center">
        <Circle className="fillinyh-2.5 fillinyw-2.5 fillinyfill-current fillinytext-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
