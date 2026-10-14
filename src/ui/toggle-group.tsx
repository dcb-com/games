"use client";

import type { VariantProps } from "class-variance-authority";
import { createContext, useContext } from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";

import { cn, focusRing } from "@dcb/ui";
import { toggleVariants } from "@dcb/ui/toggle";

// A segmented control: a few choices side by side on a muted track, the
// chosen one raised on a card. For switching a view (Open, Closed, All) or
// a mode (Reply, Note), never for an action.

type Size = VariantProps<typeof toggleVariants>["size"];

const SizeContext = createContext<Size>("default");

export function ToggleGroup({
  className,
  size,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & { size?: Size }) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn(
        "bg-muted inline-flex w-fit items-center gap-0.5 rounded-md p-0.5",
        className,
      )}
      {...props}
    >
      <SizeContext.Provider value={size}>{children}</SizeContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

export function ToggleGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  const size = useContext(SizeContext);
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(focusRing, toggleVariants({ size }), className)}
      {...props}
    />
  );
}
