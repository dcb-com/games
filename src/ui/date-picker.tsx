"use client";

import { CalendarIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "@dcb/ui";
import { Calendar } from "@dcb/ui/calendar";
import { fieldControlClassName } from "@dcb/ui/field-control";
import { Popover, PopoverContent, PopoverTrigger } from "@dcb/ui/popover";

// Parsed via local date components so the day can't shift a timezone.
function parseLocalDate(value: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return undefined;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toLocalISO(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

const LABEL_FMT = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function DatePicker({
  id,
  value,
  onChange,
  onBlur,
  placeholder = "Select a date",
  disabled,
  invalid,
  fromDate,
  toDate,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  // The first day that may be picked, as YYYY-MM-DD.
  fromDate?: string;
  // The last day that may be picked, as YYYY-MM-DD.
  toDate?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseLocalDate(value);
  const from = fromDate ? parseLocalDate(fromDate) : undefined;
  const to = toDate ? parseLocalDate(toDate) : undefined;
  // Days outside the range can't be clicked at all, so a hint like "pick
  // Oct 12 to Oct 19" is never contradicted by the calendar.
  const outside = [
    ...(from ? [{ before: from }] : []),
    ...(to ? [{ after: to }] : []),
  ];

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Closing the popover counts as blurring the field for validation.
        if (!next) onBlur?.();
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-invalid={invalid ? true : undefined}
          className={cn(
            fieldControlClassName,
            "flex items-center justify-between gap-2 px-4 text-sm",
            !selected && "text-muted-foreground/70",
            className,
          )}
        >
          {selected ? LABEL_FMT.format(selected) : placeholder}
          <CalendarIcon className="text-muted-foreground size-4 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          autoFocus
          selected={selected}
          defaultMonth={selected ?? from}
          disabled={outside.length > 0 ? outside : undefined}
          onSelect={(date) => {
            onChange(date ? toLocalISO(date) : "");
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
