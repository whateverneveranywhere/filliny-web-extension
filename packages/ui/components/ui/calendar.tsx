import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('fillinyp-3', className)}
      classNames={{
        months:
          'fillinyflex fillinyflex-col sm:fillinyflex-row fillinyspace-y-4 sm:fillinyspace-x-4 sm:fillinyspace-y-0',
        month: 'fillinyspace-y-4',
        caption: 'fillinyflex fillinyjustify-center fillinypt-1 fillinyrelative fillinyitems-center',
        caption_label: 'fillinytext-sm fillinyfont-medium',
        nav: 'fillinyspace-x-1 fillinyflex fillinyitems-center',
        nav_button: cn(
          buttonVariants({ variant: 'outline' }),
          'fillinyh-7 fillinyw-7 fillinybg-transparent fillinyp-0 fillinyopacity-50 hover:fillinyopacity-100',
        ),
        nav_button_previous: 'fillinyabsolute fillinyleft-1',
        nav_button_next: 'fillinyabsolute fillinyright-1',
        table: 'fillinyw-full fillinyborder-collapse fillinyspace-y-1',
        head_row: 'fillinyflex',
        head_cell: 'fillinytext-muted-foreground fillinyrounded-md fillinyw-9 fillinyfont-normal fillinytext-[0.8rem]',
        row: 'fillinyflex fillinyw-full fillinymt-2',
        cell: 'fillinyh-9 fillinyw-9 fillinytext-center fillinytext-sm fillinyp-0 fillinyrelative [&:has([aria-selected].day-range-end)]:fillinyrounded-r-md [&:has([aria-selected].day-outside)]:fillinybg-accent/50 [&:has([aria-selected])]:fillinybg-accent first:[&:has([aria-selected])]:fillinyrounded-l-md last:[&:has([aria-selected])]:fillinyrounded-r-md focus-within:fillinyrelative focus-within:fillinyz-20',
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'fillinyh-9 fillinyw-9 fillinyp-0 fillinyfont-normal aria-selected:fillinyopacity-100',
        ),
        day_range_end: 'fillinyday-range-end',
        day_selected:
          'fillinybg-primary fillinytext-primary-foreground hover:fillinybg-primary hover:fillinytext-primary-foreground focus:fillinybg-primary focus:fillinytext-primary-foreground',
        day_today: 'fillinybg-accent fillinytext-accent-foreground',
        day_outside:
          'fillinyday-outside fillinytext-muted-foreground fillinyopacity-50 aria-selected:fillinybg-accent/50 aria-selected:fillinytext-muted-foreground aria-selected:fillinyopacity-30',
        day_disabled: 'fillinytext-muted-foreground fillinyopacity-50',
        day_range_middle: 'aria-selected:fillinybg-accent aria-selected:fillinytext-accent-foreground',
        day_hidden: 'fillinyinvisible',
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="fillinyh-4 fillinyw-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="fillinyh-4 fillinyw-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
