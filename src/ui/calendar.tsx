"use client";

import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn, focusRing } from "@dcb/ui";
import { buttonVariants } from "@dcb/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "dropdown",
  startMonth,
  endMonth,
  ...props
}: CalendarProps) {
  const d = getDefaultClassNames();
  // oxlint-disable-next-line react/purity -- held back, see "Known debts"
  const thisYear = new Date().getFullYear();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      startMonth={startMonth ?? new Date(thisYear - 100, 0)}
      endMonth={endMonth ?? new Date(thisYear + 10, 11)}
      className={cn("p-3", className)}
      classNames={{
        root: cn("w-fit", d.root),
        months: cn("relative flex flex-col gap-4 sm:flex-row", d.months),
        month: cn("flex w-full flex-col gap-4", d.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex items-center justify-between",
          d.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "text-muted-foreground hover:text-foreground size-8 rounded-lg",
          d.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "text-muted-foreground hover:text-foreground size-8 rounded-lg",
          d.button_next,
        ),
        month_caption: cn(
          "flex h-8 items-center justify-center px-8",
          d.month_caption,
        ),
        caption_label: cn(
          "text-foreground inline-flex items-center gap-1 text-sm font-medium",
          // Padded so the value sitting over the transparent native <select> reads as a clickable chip.
          captionLayout !== "label" && "px-2 py-1",
          d.caption_label,
        ),
        dropdowns: cn("flex items-center justify-center gap-1.5", d.dropdowns),
        dropdown_root: cn(
          // The native select over it is invisible, so the ring has to come
          // from the wrapper when that select takes focus.
          "hover:bg-secondary has-[:focus-visible]:ring-ring/40 relative inline-flex items-center rounded-lg transition-colors has-[:focus-visible]:ring-4",
          d.dropdown_root,
        ),
        dropdown: cn(
          "absolute inset-0 z-10 w-full cursor-pointer opacity-0",
          d.dropdown,
        ),
        month_grid: cn("w-full border-collapse", d.month_grid),
        weekdays: cn("flex", d.weekdays),
        weekday: cn(
          "text-muted-foreground w-9 text-[0.8rem] font-normal",
          d.weekday,
        ),
        weeks: cn(d.weeks),
        week: cn("mt-1.5 flex w-full", d.week),
        day: cn("relative size-9 p-0 text-center text-sm", d.day),
        day_button: cn(
          focusRing,
          "text-foreground hover:bg-accent hover:text-accent-foreground aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:hover:bg-primary/90 inline-flex size-9 items-center justify-center rounded-lg font-normal transition-colors",
          d.day_button,
        ),
        today: cn(
          "[&>button:not([aria-selected='true'])]:bg-secondary [&>button:not([aria-selected='true'])]:font-medium",
          d.today,
        ),
        outside: cn("text-muted-foreground/50", d.outside),
        disabled: cn("text-muted-foreground/40 opacity-50", d.disabled),
        hidden: cn("invisible", d.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevClass, ...chevronProps }) => {
          // left/right drive the month nav; "down" is the dropdown indicator.
          if (orientation === "left") {
            return (
              <ChevronLeftIcon
                className={cn("size-4", chevClass)}
                {...chevronProps}
              />
            );
          }
          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", chevClass)}
                {...chevronProps}
              />
            );
          }
          return (
            <ChevronDownIcon
              className={cn("text-muted-foreground size-3.5", chevClass)}
              {...chevronProps}
            />
          );
        },
      }}
      {...props}
    />
  );
}
