import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'fillinyinline-flex fillinyh-10 fillinyitems-center fillinyjustify-center fillinyrounded-md fillinybg-muted fillinyp-1 fillinytext-muted-foreground',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'fillinyinline-flex fillinyitems-center fillinyjustify-center fillinywhitespace-nowrap fillinyrounded-sm fillinypx-3 fillinypy-1.5 fillinytext-sm fillinyfont-medium fillinyring-offset-background fillinytransition-all focus-visible:fillinyoutline-none focus-visible:fillinyring-2 focus-visible:fillinyring-ring focus-visible:fillinyring-offset-2 disabled:fillinypointer-events-none disabled:fillinyopacity-50 data-[state=active]:fillinybg-background data-[state=active]:fillinytext-foreground data-[state=active]:fillinyshadow-sm',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'fillinymt-2 fillinyring-offset-background focus-visible:fillinyoutline-none focus-visible:fillinyring-2 focus-visible:fillinyring-ring focus-visible:fillinyring-offset-2',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
