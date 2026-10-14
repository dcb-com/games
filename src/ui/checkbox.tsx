"use client";

import { CheckIcon, MinusIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

import { cn, focusRing } from "@dcb/ui";

export function Checkbox({
  className,
  "aria-invalid": ariaInvalid,
  "data-invalid": dataInvalid,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & {
  "data-invalid"?: boolean;
}) {
  // Same deal as Input: `data-invalid` reads better next to a form library's
  // flag, `aria-invalid` is what the screen reader hears. Both land on the
  // element, so the invalid border applies either way.
  const invalid = ariaInvalid ?? (dataInvalid ? true : undefined);

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      aria-invalid={invalid}
      data-invalid={dataInvalid}
      className={cn(
        focusRing,
        "group/checkbox border-input bg-secondary size-4 shrink-0 rounded-xs border transition-[background-color,border-color,box-shadow] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground",
        "data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:text-primary-foreground",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        {/* Radix renders the indicator for both checked and indeterminate, so
         * the mark is picked in CSS rather than from a controlled prop. */}
        <CheckIcon className="size-3.5 group-data-[state=indeterminate]/checkbox:hidden" />
        <MinusIcon className="hidden size-3.5 group-data-[state=indeterminate]/checkbox:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
