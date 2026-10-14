import type { ReactNode } from "react";

import { cn } from "@dcb/ui";

import { TopBarActions } from "~/dashboard/components/nav/page-actions";

/**
 * The one horizontal gutter in the app. The top bar and every page read it, so
 * a page's name in the bar, the page's own buttons and its content all start
 * on the same left edge.
 */
export const PAGE_GUTTER = "px-4 md:px-6";

/**
 * The shell's <main> is `relative overflow-hidden`, so a page owns its own
 * scrolling. PageScroll is that scroll region; PageContainer is the column
 * inside it. Together they replace the
 * `absolute inset-0 overflow-y-auto` + `mx-auto max-w-… px-4 py-6` pair the
 * pages used to repeat.
 */
export function PageScroll({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-scroll"
      className={cn("absolute inset-0 overflow-y-auto", className)}
      {...props}
    />
  );
}

// A page takes the width it is given and lines up with the top bar, so its
// name, its buttons and its content start and end on the same edges. The one
// exception is a page that needs no width — the run landing, the sign-in
// screens — and such a page caps itself with its own `max-w-…`, which `mx-auto`
// then centres. The three names are kept while the pages still pass them.
const pageWidths = {
  narrow: "mx-auto w-full",
  default: "mx-auto w-full",
  wide: "mx-auto w-full",
} as const;

export function PageContainer({
  width = "default",
  className,
  ...props
}: React.ComponentProps<"div"> & { width?: keyof typeof pageWidths }) {
  return (
    <div
      data-slot="page-container"
      className={cn(PAGE_GUTTER, "py-6 md:py-8", pageWidths[width], className)}
      {...props}
    />
  );
}

/**
 * A page's own buttons. The top bar names the page and holds what belongs to
 * it, so these go up there, beside the name, rather than into a row of their
 * own above the page. Nothing is drawn here.
 */
export function PageHeader({
  actions,
}: {
  /** Buttons for the page. Drawn in the top bar, on the right. */
  actions?: ReactNode;
}) {
  return <TopBarActions>{actions}</TopBarActions>;
}

/** A block inside a page: a heading, an optional line under it, the content. */
export function PageSection({
  title,
  description,
  actions,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section
      data-slot="page-section"
      className={cn("mt-8", className)}
      {...props}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="type-label">{title}</h2>
          {description && <p className="type-secondary mt-1">{description}</p>}
        </div>
        {actions && (
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        )}
      </div>
      {children}
    </section>
  );
}
