import type { ReactNode } from "react";

import { cn } from "@dcb/ui";

// The console's one spacing scale.
// Every pane and every page starts with a PaneHeader, 48px high with a
// hairline under it, so headers line up across the screen.

export function PaneHeader({
  title,
  count,
  children,
  className,
}: {
  title: ReactNode;
  // A number beside the title, in tabular figures.
  count?: number;
  // The controls on the right; three at most.
  children?: ReactNode;
  className?: string;
}) {
  // 16px sides, the same as the call bar above it, so the left edges line up.
  return (
    <header
      className={cn(
        "border-border bg-card flex h-12 shrink-0 items-center gap-2 border-b px-4",
        className,
      )}
    >
      <h1 className="type-label flex min-w-0 items-center gap-2 font-semibold">
        <span className="truncate">{title}</span>
        {count !== undefined && (
          <span className="type-caption tabular-nums">
            {count > 999 ? "999+" : count}
          </span>
        )}
      </h1>
      {children && (
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {children}
        </div>
      )}
    </header>
  );
}

// A full page (Staff, Activity, Profile, Calls): the header across the
// top and a body with 16px inside, at most 1024px wide.
export function Page({
  title,
  actions,
  description,
  wide = false,
  children,
}: {
  title: string;
  actions?: ReactNode;
  description?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <PaneHeader title={title}>{actions}</PaneHeader>
      <div className="flex-1 p-4">
        <div className={cn("flex flex-col gap-4", !wide && "max-w-5xl")}>
          {description && <p className="type-secondary">{description}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}

// A boxed panel inside a page or pane: 16px inside, 12px rounding.
export function Panel({
  title,
  actions,
  children,
  className,
  flush = false,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  // No padding inside, for a table or a list of rows.
  flush?: boolean;
}) {
  return (
    <section
      className={cn(
        "border-border bg-card overflow-hidden rounded-md border",
        className,
      )}
    >
      {(title ?? actions) && (
        <div className="border-border flex h-11 items-center gap-2 border-b px-4">
          <h2 className="type-label flex min-w-0 items-center gap-2">
            {title}
          </h2>
          {actions && (
            <div className="ml-auto flex items-center gap-1.5">{actions}</div>
          )}
        </div>
      )}
      <div
        className={cn(
          !flush && "p-4",
          // A table inside keeps 16px from the panel's edge; the table
          // primitive drops the outer padding of its first and last cells.
          flush &&
            "[&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4",
        )}
      >
        {children}
      </div>
    </section>
  );
}
