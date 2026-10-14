"use client";

import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import { Toggle as TogglePrimitive } from "radix-ui";

import { cn, focusRing } from "@dcb/ui";

export const toggleVariants = cva(
  "text-muted-foreground hover:text-foreground data-[state=on]:bg-card data-[state=on]:text-foreground inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-sm text-sm font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 data-[state=on]:shadow-xs [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      size: {
        default: "h-8 px-3",
        sm: "h-7 px-2.5 text-xs",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export function Toggle({
  className,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(focusRing, toggleVariants({ size }), className)}
      {...props}
    />
  );
}
