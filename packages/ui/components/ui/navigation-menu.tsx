import * as React from 'react';
import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu';
import { cva } from 'class-variance-authority';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

const NavigationMenu = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Root
    ref={ref}
    className={cn(
      'fillinyrelative fillinyz-10 fillinyflex fillinymax-w-max fillinyflex-1 fillinyitems-center fillinyjustify-center',
      className,
    )}
    {...props}>
    {children}
    <NavigationMenuViewport />
  </NavigationMenuPrimitive.Root>
));
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName;

const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.List
    ref={ref}
    className={cn(
      'fillinygroup fillinyflex fillinyflex-1 fillinylist-none fillinyitems-center fillinyjustify-center fillinyspace-x-1',
      className,
    )}
    {...props}
  />
));
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName;

const NavigationMenuItem = NavigationMenuPrimitive.Item;

const navigationMenuTriggerStyle = cva(
  'fillinygroup fillinyinline-flex fillinyh-10 fillinyw-max fillinyitems-center fillinyjustify-center fillinyrounded-md fillinybg-background fillinypx-4 fillinypy-2 fillinytext-sm fillinyfont-medium fillinytransition-colors hover:fillinybg-accent hover:fillinytext-accent-foreground focus:fillinybg-accent focus:fillinytext-accent-foreground focus:fillinyoutline-none disabled:fillinypointer-events-none disabled:fillinyopacity-50 data-[active]:fillinybg-accent/50 data-[state=open]:fillinybg-accent/50',
);

const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Trigger
    ref={ref}
    className={cn(navigationMenuTriggerStyle(), 'fillinygroup', className)}
    {...props}>
    {children}{' '}
    <ChevronDown
      className="fillinyrelative fillinytop-[1px] fillinyml-1 fillinyh-3 fillinyw-3 fillinytransition fillinyduration-200 group-data-[state=open]:fillinyrotate-180"
      aria-hidden="true"
    />
  </NavigationMenuPrimitive.Trigger>
));
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName;

const NavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Content
    ref={ref}
    className={cn(
      'fillinyleft-0 fillinytop-0 fillinyw-full data-[motion^=from-]:fillinyanimate-in data-[motion^=to-]:fillinyanimate-out data-[motion^=from-]:fillinyfade-in data-[motion^=to-]:fillinyfade-out data-[motion=from-end]:fillinyslide-in-from-right-52 data-[motion=from-start]:fillinyslide-in-from-left-52 data-[motion=to-end]:fillinyslide-out-to-right-52 data-[motion=to-start]:fillinyslide-out-to-left-52 md:fillinyabsolute md:fillinyw-auto filliny',
      className,
    )}
    {...props}
  />
));
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName;

const NavigationMenuLink = NavigationMenuPrimitive.Link;

const NavigationMenuViewport = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <div className={cn('fillinyabsolute fillinyleft-0 fillinytop-full fillinyflex fillinyjustify-center')}>
    <NavigationMenuPrimitive.Viewport
      className={cn(
        'fillinyorigin-top-center fillinyrelative fillinymt-1.5 fillinyh-[var(--radix-navigation-menu-viewport-height)] fillinyw-full fillinyoverflow-hidden fillinyrounded-md fillinyborder fillinybg-popover fillinytext-popover-foreground fillinyshadow-lg data-[state=open]:fillinyanimate-in data-[state=closed]:fillinyanimate-out data-[state=closed]:fillinyzoom-out-95 data-[state=open]:fillinyzoom-in-90 md:fillinyw-[var(--radix-navigation-menu-viewport-width)]',
        className,
      )}
      ref={ref}
      {...props}
    />
  </div>
));
NavigationMenuViewport.displayName = NavigationMenuPrimitive.Viewport.displayName;

const NavigationMenuIndicator = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Indicator>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Indicator
    ref={ref}
    className={cn(
      'fillinytop-full fillinyz-[1] fillinyflex fillinyh-1.5 fillinyitems-end fillinyjustify-center fillinyoverflow-hidden data-[state=visible]:fillinyanimate-in data-[state=hidden]:fillinyanimate-out data-[state=hidden]:fillinyfade-out data-[state=visible]:fillinyfade-in',
      className,
    )}
    {...props}>
    <div className="fillinyrelative fillinytop-[60%] fillinyh-2 fillinyw-2 fillinyrotate-45 fillinyrounded-tl-sm fillinybg-border fillinyshadow-md" />
  </NavigationMenuPrimitive.Indicator>
));
NavigationMenuIndicator.displayName = NavigationMenuPrimitive.Indicator.displayName;

export {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
};
