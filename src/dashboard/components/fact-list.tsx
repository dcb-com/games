import type { ReactNode } from "react";

import { cn } from "@dcb/ui";

/** One labelled fact: the label on the left, the value on the right. */
export interface Fact {
  label: ReactNode;
  value: ReactNode;
  /** A quieter second line under the value. */
  note?: ReactNode;
  /** Takes the whole width of a grid, for a long value. */
  full?: boolean;
  /** Only needed when the label is not plain text. */
  key?: string;
}

/**
 * `rows` stacks facts with a rule between them, for a dialog or a card.
 * `grid` pairs them in columns, for a detail panel.
 * `stacked` puts each value under its label, two to a row, for a wide card
 *   where a label on the left and its value on the right sit too far apart.
 * `inline` runs them along one line, for a strip under a header.
 */
type FactLayout = "rows" | "grid" | "stacked" | "inline";

interface FactClasses {
  list: string;
  item: string;
  label: string;
  value: string;
}

const FACT_LAYOUTS: Record<FactLayout, FactClasses> = {
  rows: {
    list: "divide-border divide-y",
    item: "flex items-baseline justify-between gap-4 py-2.5",
    label: "type-caption",
    value: "type-label tabular-nums",
  },
  grid: {
    list: "grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2",
    item: "flex items-baseline justify-between gap-4",
    label: "type-caption",
    value: "type-label tabular-nums",
  },
  stacked: {
    list: "grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2",
    item: "flex min-w-0 flex-col gap-0.5",
    label: "type-caption",
    value: "type-body tabular-nums",
  },
  inline: {
    list: "flex flex-wrap gap-x-8 gap-y-2",
    item: "flex flex-col gap-0.5",
    label: "type-caption",
    value: "text-sm tabular-nums",
  },
};

/** A fact that takes the whole width reads better with the value below the label. */
const FULL_ITEM = "col-span-full flex flex-col gap-0.5";

/** The classes one layout uses. Exported so the choice can be tested. */
export function factListClasses(
  layout: FactLayout = "rows",
  columns: 2 | 3 = 2,
): FactClasses {
  const base = FACT_LAYOUTS[layout];
  if (layout !== "grid" || columns === 2) return base;
  return { ...base, list: cn(base.list, "lg:grid-cols-3") };
}

interface FactListProps {
  facts: Fact[];
  layout?: FactLayout;
  /** How many columns a `grid` reaches at its widest. Ignored by the others. */
  columns?: 2 | 3;
  className?: string;
  "aria-label"?: string;
}

/**
 * The labelled fact strip every detail view needs, in the three shapes the app
 * uses. One set of classes, so a band in a dialog and a band under a page
 * header line up the same way.
 */
export function FactList({
  facts,
  layout = "rows",
  columns = 2,
  className,
  "aria-label": ariaLabel,
}: FactListProps) {
  if (facts.length === 0) return null;
  const classes = factListClasses(layout, columns);

  return (
    <dl aria-label={ariaLabel} className={cn(classes.list, className)}>
      {facts.map((fact, index) => (
        <div
          key={
            fact.key ?? (typeof fact.label === "string" ? fact.label : index)
          }
          className={fact.full && layout === "grid" ? FULL_ITEM : classes.item}
        >
          <dt className={classes.label}>{fact.label}</dt>
          <dd className={classes.value}>
            {fact.value}
            {fact.note && (
              <span className="type-caption mt-0.5 block">{fact.note}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

interface DetailBandProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Controls for the band, such as an Edit link. */
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** A bordered section under a page header, usually holding a FactList. */
export function DetailBand({
  title,
  description,
  actions,
  className,
  children,
}: DetailBandProps) {
  return (
    <section
      aria-label={typeof title === "string" ? title : undefined}
      className={cn("border-border rounded-xl border px-4 py-3", className)}
    >
      {(title ?? actions) && (
        <div className="mb-2 flex items-center justify-between gap-4">
          {title && <h2 className="type-label">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {description && <p className="type-caption mb-2">{description}</p>}
      {children}
    </section>
  );
}
