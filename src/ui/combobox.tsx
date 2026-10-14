"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@dcb/ui";
import { fieldControlClassName } from "@dcb/ui/field-control";
import { Input } from "@dcb/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@dcb/ui/popover";

// Renders only the options it's given; filtering is the caller's job.

export interface ComboboxOption {
  value: string;
  label: string;
  /** Secondary line under the label, e.g. an email that disambiguates duplicate names. */
  description?: string;
}

export function Combobox({
  id,
  value,
  onChange,
  options,
  selectedLabel,
  search,
  onSearchChange,
  onOpenChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches",
  loading = false,
  footer,
  disabled,
  className,
  "aria-invalid": ariaInvalid,
}: {
  id?: string;
  value: string;
  onChange: (value: string, option: ComboboxOption) => void;
  options: ComboboxOption[];
  /** Label for `value` when it isn't in `options` (e.g. scrolled out of a server-fetched chunk). */
  selectedLabel?: string;
  search: string;
  onSearchChange: (search: string) => void;
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  footer?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Tracked by value, not index, since a newly arrived options chunk can shift indices.
  const [activeValue, setActiveValue] = useState<string | null>(null);
  const activeRef = useRef<HTMLDivElement | null>(null);
  // Focus stays in the search box, so the highlighted row is announced through
  // aria-activedescendant instead. Every row needs an id for that to work.
  const fallbackId = useId();
  const baseId = id ?? fallbackId;
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.value === (activeValue ?? value)),
  );
  const active = options[activeIndex];

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeValue]);

  const triggerLabel =
    (value
      ? (selectedLabel ?? options.find((o) => o.value === value)?.label)
      : null) ?? placeholder;

  function move(delta: number) {
    if (options.length === 0) return;
    const next = (activeIndex + delta + options.length) % options.length;
    setActiveValue(options[next]?.value ?? null);
  }

  function select(option: ComboboxOption) {
    onChange(option.value, option);
    setActiveValue(option.value);
    change(false);
  }

  function change(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  return (
    <Popover open={open} onOpenChange={change}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          disabled={disabled}
          className={cn(
            fieldControlClassName,
            "flex items-center justify-between gap-2 px-3 py-2 text-left text-sm",
            className,
          )}
        >
          <span
            className={cn("truncate", !value && "text-muted-foreground/70")}
          >
            {triggerLabel}
          </span>
          <ChevronDownIcon className="text-muted-foreground size-4 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
        // Focus stays on the search box; the list responds to its keyboard events.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          activeRef.current?.scrollIntoView({ block: "nearest" });
        }}
      >
        <div className="border-border border-b p-2">
          <Input
            autoFocus
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 text-sm"
            role="combobox"
            aria-expanded
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={active ? optionId(activeIndex) : undefined}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                move(1);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                move(-1);
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (active) select(active);
              }
            }}
          />
        </div>
        <div
          id={listboxId}
          role="listbox"
          className="max-h-64 overflow-y-auto p-1"
        >
          {options.map((option, index) => {
            const isActive = option.value === active?.value;
            return (
              <div
                key={option.value}
                id={optionId(index)}
                ref={isActive ? activeRef : null}
                role="option"
                aria-selected={option.value === value}
                onMouseEnter={() => setActiveValue(option.value)}
                onClick={() => select(option)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                  isActive && "bg-accent text-accent-foreground",
                )}
              >
                <CheckIcon
                  className={cn(
                    "size-4 shrink-0",
                    option.value === value ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{option.label}</span>
                  {option.description && (
                    <span className="text-muted-foreground block truncate text-xs">
                      {option.description}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
          {options.length === 0 && (
            <p className="text-muted-foreground px-2 py-4 text-center text-sm">
              {loading ? "Searching…" : emptyText}
            </p>
          )}
        </div>
        {footer && (
          <p className="text-muted-foreground border-border border-t px-3 py-2 text-xs">
            {footer}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
