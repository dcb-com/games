import type { CellData, RowData, TableFeatures } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import type {
  LegacyRow as Row,
  LegacyReactTable as TanstackTable,
} from "@tanstack/react-table/legacy";
import { legacyCreateColumnHelper as createColumnHelper } from "@tanstack/react-table/legacy";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@dcb/ui";
import { Card } from "@dcb/ui/card";
import { Checkbox } from "@dcb/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dcb/ui/table";

import { SkeletonTableRows } from "~/dashboard/components/skeleton-table-rows";

/** What a column may say about how its cells look. */
interface ColumnLook {
  align?: "left" | "center" | "right";
  className?: string;
  /** Sizes this column's loading bar, so the skeleton matches the real cell. */
  skeletonClassName?: string;
}

declare module "@tanstack/react-table" {
  interface ColumnMeta<
    in out TFeatures extends TableFeatures,
    in out TData extends RowData,
    TValue extends CellData = CellData,
  > {
    align?: ColumnLook["align"];
    className?: ColumnLook["className"];
    skeletonClassName?: ColumnLook["skeletonClassName"];
  }

  interface TableMeta<
    in out TFeatures extends TableFeatures,
    in out TData extends RowData,
  > {
    // Kept on the instance rather than a closure so a keystroke doesn't force new column defs.
    search?: string;
  }
}

const ALIGN = {
  left: "",
  center: "text-center",
  right: "text-right",
} as const;

/**
 * The card's side padding, carried by the first and last cell instead of the
 * card. `@dcb/ui/table` already puts the table in its own `overflow-x-auto`
 * box, and that box is as wide as the card's content: with the padding on the
 * card, a table too wide for a phone was cut short of the card's edge, which
 * read as a broken column rather than as a row that scrolls. With the padding
 * on the cells the cut lands on the card's own edge and the columns that do
 * not fit are a swipe away.
 */
const EDGE_PADDING = "first:pl-4 last:pr-4";

// How long the pointer rests on a row before it counts as aiming for it.
// Long enough that sweeping across the table asks for nothing.
const ROW_INTENT_MS = 150;

function hitsOwnControl(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest("a, button, input, select, textarea, label") !== null
  );
}

// `never` keeps this callable from either header or cell context.
function metaClasses(meta?: ColumnLook) {
  return cn(meta?.align && ALIGN[meta.align], meta?.className);
}

// Pair with `TablePagination`, which drives paging off the same instance.
export function DataTable<TData extends RowData>({
  table,
  ariaLabel,
  isLoading = false,
  empty,
  skeletonRows = 8,
  skeletonCellClassName,
  className,
  onRowClick,
  onRowIntent,
}: {
  table: TanstackTable<TData>;
  /** Names the table for a screen reader: "Administrators", "Invoices". */
  ariaLabel?: string;
  /** First load only; a page change should keep the previous rows visible. */
  isLoading?: boolean;
  empty?: React.ReactNode;
  skeletonRows?: number;
  skeletonCellClassName?: string;
  className?: string;
  // Not keyboard-bound: the control it stands in for is already in the tab order.
  onRowClick?: (row: Row<TData>) => void;
  // The pointer has rested on a row: a chance to start reading what a
  // click would open, so the page is ready when it arrives.
  onRowIntent?: (row: Row<TData>) => void;
}) {
  const columnCount = table.getVisibleLeafColumns().length;
  const rows = table.getRowModel().rows;
  const intent = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(intent.current), []);

  // An empty list draws its message outside the table. Inside a wide table
  // that scrolls sideways, a centered message sits off screen on a phone.
  if (!isLoading && rows.length === 0 && empty) {
    return (
      <Card
        className={cn("px-4 py-6", className)}
        role="region"
        aria-label={ariaLabel}
      >
        {empty}
      </Card>
    );
  }

  return (
    <Card className={cn("py-2", className)}>
      <Table aria-label={ariaLabel} aria-busy={isLoading}>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="hover:bg-transparent">
              {group.headers.map((header) => {
                const content = flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                );
                const sorted = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      EDGE_PADDING,
                      metaClasses(header.column.columnDef.meta),
                    )}
                    aria-sort={
                      sorted === "asc"
                        ? "ascending"
                        : sorted === "desc"
                          ? "descending"
                          : undefined
                    }
                  >
                    {header.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="hover:text-foreground inline-flex items-center gap-1"
                      >
                        {content}
                        {sorted === "asc" ? (
                          <ChevronUp className="size-3" />
                        ) : sorted === "desc" ? (
                          <ChevronDown className="size-3" />
                        ) : (
                          <ChevronsUpDown className="size-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      content
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <SkeletonTableRows
              rows={skeletonRows}
              columns={table.getVisibleLeafColumns().map((column) => ({
                className: cn(EDGE_PADDING, metaClasses(column.columnDef.meta)),
                barClassName: column.columnDef.meta?.skeletonClassName,
              }))}
              cellClassName={skeletonCellClassName}
            />
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columnCount}
                className={cn(EDGE_PADDING, "h-64")}
              >
                {empty}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(onRowClick && "cursor-pointer")}
                onClick={
                  onRowClick &&
                  ((event) => {
                    if (hitsOwnControl(event.target)) return;
                    // A row's menu and dialogs are drawn outside the table,
                    // but React still passes their clicks up to the row.
                    if (
                      !(event.target instanceof Node) ||
                      !event.currentTarget.contains(event.target)
                    ) {
                      return;
                    }
                    onRowClick(row);
                  })
                }
                onMouseEnter={
                  onRowIntent &&
                  (() => {
                    clearTimeout(intent.current);
                    intent.current = setTimeout(
                      () => onRowIntent(row),
                      ROW_INTENT_MS,
                    );
                  })
                }
                onMouseLeave={
                  onRowIntent && (() => clearTimeout(intent.current))
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      EDGE_PADDING,
                      metaClasses(cell.column.columnDef.meta),
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

/**
 * An optional first column of checkboxes, for a table that offers an action
 * over several rows at once. Put it in front of the other columns and set
 * `enableRowSelection` on the instance: the header box ticks every row on this
 * page that the instance allows, and shows a dash while only some of them are
 * picked. A row the instance refuses gets a box that cannot be ticked, so the
 * table never offers an action it would then have to explain away.
 */
export function selectionColumn<TData extends RowData>({
  rowLabel,
  headerLabel = "Select every row on this page",
}: {
  /** Names one row's box for a screen reader: "Select Ada Lovelace". */
  rowLabel: (row: TData) => string;
  headerLabel?: string;
}) {
  return createColumnHelper<TData>().display({
    id: "select",
    enableSorting: false,
    meta: { className: "w-8", skeletonClassName: "size-4 rounded-xs" },
    header: ({ table }) => (
      <Checkbox
        aria-label={headerLabel}
        checked={
          table.getIsAllPageRowsSelected()
            ? true
            : table.getIsSomePageRowsSelected()
              ? "indeterminate"
              : false
        }
        onCheckedChange={(next) =>
          table.toggleAllPageRowsSelected(next === true)
        }
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={rowLabel(row.original)}
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onCheckedChange={(next) => row.toggleSelected(next === true)}
      />
    ),
  });
}
