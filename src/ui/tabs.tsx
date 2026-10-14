"use client";

import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@dcb/ui";

export function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  );
}

/**
 * One row of tabs on a hairline. The row never wraps. When it is wider than
 * the screen it scrolls sideways with the scrollbar hidden, and the tab cut
 * off at the edge shows there is more. The hairline is an inset shadow rather
 * than a border, so it stays in place while the row scrolls and the bar under
 * the open tab can sit on top of it.
 */
export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "text-muted-foreground flex max-w-full [scrollbar-width:none] items-center gap-1 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--color-border)] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A tab. The label sits in a rounded box that turns gray on hover and carries
 * the focus ring. A straight 2px bar under the label marks the open tab.
 */
export function TabsTrigger({
  className,
  children,
  onFocus,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      // The arrow keys move focus along a row that may be scrolled; bring the
      // focused tab into view.
      onFocus={(event) => {
        event.currentTarget.scrollIntoView({
          block: "nearest",
          inline: "nearest",
        });
        onFocus?.(event);
      }}
      className={cn(
        "group/tab hover:text-foreground data-[state=active]:text-foreground data-[state=active]:after:bg-foreground relative inline-flex shrink-0 cursor-pointer items-center pt-1 pb-2 text-sm font-medium whitespace-nowrap transition-colors outline-none after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:transition-colors disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="group-hover/tab:bg-muted group-focus-visible/tab:ring-ring/40 rounded-md px-2 py-1 transition-colors group-focus-visible/tab:ring-2 group-focus-visible/tab:ring-inset">
        {children}
      </span>
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("focus-visible:outline-none", className)}
      {...props}
    />
  );
}
