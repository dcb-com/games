import type { ComponentProps, ReactNode } from "react";

import { cn } from "@dcb/ui";
import { Button } from "@dcb/ui/button";
import { Skeleton } from "@dcb/ui/skeleton";

// One row in the list pane: two lines, about
// 60px, 16px each side. Line one holds the icon, who or what, a mark and
// the age; line two the subject, a few words and the row's button. The
// selected row has a tinted ground and a 2px primary bar on its left.
export function ListRow({
  rowId,
  selected,
  gone = false,
  muted = false,
  interactive = true,
  line1,
  line2,
  className,
  ...rest
}: Omit<ComponentProps<"div">, "children"> & {
  // Matches `data-list-row`, so the keyboard can scroll the row into view.
  rowId: string;
  selected: boolean;
  // Someone else took it; it stays a moment, dimmed, then folds away.
  gone?: boolean;
  // Closed to the person: muted text.
  muted?: boolean;
  // Whether the row reacts to the pointer at all.
  interactive?: boolean;
  line1: ReactNode;
  line2: ReactNode;
}) {
  return (
    // The keys (J, K, Enter, P) reach rows through the command registry, so
    // the row itself does not need to take focus.
    <div
      {...rest}
      data-list-row={rowId}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "border-border/60 relative flex scroll-mt-8 flex-col gap-0.5 border-b px-4 py-2.5",
        interactive && "hover:bg-secondary/60 cursor-default",
        selected && "bg-accent/40 hover:bg-accent/40",
        muted && "text-muted-foreground",
        gone && "pointer-events-none opacity-40 transition-opacity",
        className,
      )}
    >
      {selected && (
        <span
          aria-hidden
          className="bg-primary absolute inset-y-0 left-0 w-0.5"
        />
      )}
      <div className="flex h-5 min-w-0 items-center gap-2">{line1}</div>
      <div className="flex h-5 min-w-0 items-center gap-2">{line2}</div>
    </div>
  );
}

// The row's button on line two. It sits in the 20px line and spills 4px
// above and below, so the row keeps its height.
export function RowButton({
  children,
  variant = "outline",
  disabled,
  onClick,
}: {
  children: ReactNode;
  variant?: "outline" | "default";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="xs"
      variant={variant}
      className="-my-1 ml-auto shrink-0"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </Button>
  );
}

// Six rows of bones, the same height as real rows, while a list loads.
export function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="border-border/60 flex flex-col gap-0.5 border-b px-4 py-2.5"
        >
          <div className="flex h-5 items-center gap-2">
            <Skeleton className="size-4 rounded-full" />
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="ml-auto h-3 w-8" />
          </div>
          <div className="flex h-5 items-center gap-2">
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}

// An empty list: one plain sentence, and the next step when there is one.
export function ListEmpty({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2 px-4 py-6">
      <p className="type-secondary">{children}</p>
      {action}
    </div>
  );
}

// A list that failed to load: the server's words and Try again.
export function ListError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-2 px-4 py-6">
      <p className="type-secondary">{message}</p>
      <Button size="xs" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

// The scrolling body under a pane header. The updates pill floats over the
// top of it, so showing it never moves the rows.
export function ListBody({
  children,
  pill,
  hoverProps,
}: {
  children: ReactNode;
  pill?: ReactNode;
  hoverProps?: { onPointerEnter: () => void; onPointerLeave: () => void };
}) {
  return (
    <div className="relative min-h-0 flex-1" {...hoverProps}>
      {pill && (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center">
          <div className="pointer-events-auto">{pill}</div>
        </div>
      )}
      <div className="h-full min-h-0 overflow-y-auto">{children}</div>
    </div>
  );
}
