import { cn } from "@dcb/ui";

// One key, as it is printed on the keyboard: "⌘", "K", "Esc". Used beside a
// menu item or in a tooltip to teach the shortcut for it.
export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "border-border bg-muted text-muted-foreground pointer-events-none inline-flex h-5 min-w-5 items-center justify-center gap-1 rounded-xs border px-1 font-sans text-xs leading-none font-medium select-none [&_svg:not([class*='size-'])]:size-3",
        className,
      )}
      {...props}
    />
  );
}

// Keys pressed together or one after another: ⌘ K, G then N.
export function KbdGroup({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-0.5", className)}
      {...props}
    />
  );
}
