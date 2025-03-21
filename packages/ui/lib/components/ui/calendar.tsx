/* eslint-disable @typescript-eslint/no-unused-vars */
import type * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("filliny-p-3", className)}
      classNames={{
        months:
          "filliny-flex filliny-flex-col sm:filliny-flex-row filliny-space-y-4 sm:filliny-space-x-4 sm:filliny-space-y-0",
        month: "filliny-space-y-4",
        caption: "filliny-flex filliny-justify-center filliny-pt-1 filliny-relative filliny-items-center",
        caption_label: "filliny-text-sm filliny-font-medium",
        nav: "filliny-space-x-1 filliny-flex filliny-items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "filliny-h-7 filliny-w-7 filliny-bg-transparent filliny-p-0 filliny-opacity-50 hover:filliny-opacity-100",
        ),
        nav_button_previous: "filliny-absolute filliny-left-1",
        nav_button_next: "filliny-absolute filliny-right-1",
        table: "filliny-w-full filliny-border-collapse filliny-space-y-1",
        head_row: "filliny-flex",
        head_cell:
          "filliny-text-muted-foreground filliny-rounded-md filliny-w-9 filliny-font-normal filliny-text-[0.8rem]",
        row: "filliny-flex filliny-w-full filliny-mt-2",
        cell: "filliny-h-9 filliny-w-9 filliny-text-center filliny-text-sm filliny-p-0 filliny-relative [&:has([aria-selected].day-range-end)]:filliny-rounded-r-md [&:has([aria-selected].day-outside)]:filliny-bg-accent/50 [&:has([aria-selected])]:filliny-bg-accent first:[&:has([aria-selected])]:filliny-rounded-l-md last:[&:has([aria-selected])]:filliny-rounded-r-md focus-within:filliny-relative focus-within:filliny-z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "filliny-h-9 filliny-w-9 filliny-p-0 filliny-font-normal aria-selected:filliny-opacity-100",
        ),
        day_range_end: "filliny-day-range-end",
        day_selected:
          "filliny-bg-primary filliny-text-primary-foreground hover:filliny-bg-primary hover:filliny-text-primary-foreground focus:filliny-bg-primary focus:filliny-text-primary-foreground",
        day_today: "filliny-bg-accent filliny-text-accent-foreground",
        day_outside:
          "filliny-day-outside filliny-text-muted-foreground filliny-opacity-50 aria-selected:filliny-bg-accent/50 aria-selected:filliny-text-muted-foreground aria-selected:filliny-opacity-30",
        day_disabled: "filliny-text-muted-foreground filliny-opacity-50",
        day_range_middle: "aria-selected:filliny-bg-accent aria-selected:filliny-text-accent-foreground",
        day_hidden: "filliny-invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="filliny-h-4 filliny-w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="filliny-h-4 filliny-w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
