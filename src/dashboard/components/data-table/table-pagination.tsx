import type { RowData } from "@tanstack/react-table";
import type { LegacyReactTable as TanstackTable } from "@tanstack/react-table/legacy";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { cn } from "@dcb/ui";
import { Badge } from "@dcb/ui/badge";
import { Button } from "@dcb/ui/button";
import { Select } from "@dcb/ui/select";

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Everything is read off the table instance, so the same bar drives a
// client-paginated table and a `manualPagination` one that fetches per page.
export function TablePagination<TData extends RowData>({
  table,
  itemLabel,
  itemLabelPlural = `${itemLabel}s`,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  isFetching = false,
  className,
}: {
  table: TanstackTable<TData>;
  /** Singular noun, e.g. "employee" becomes "1-20 of 137 employees". */
  itemLabel: string;
  itemLabelPlural?: string;
  pageSizeOptions?: number[];
  isFetching?: boolean;
  className?: string;
}) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const rowCount = table.getRowCount();
  const pageCount = table.getPageCount();

  if (rowCount === 0) return null;

  const first = pageIndex * pageSize + 1;
  const last = Math.min(rowCount, (pageIndex + 1) * pageSize);
  const smallestPageSize = Math.min(...pageSizeOptions);

  return (
    <div
      className={cn(
        "mt-4 flex flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      <div
        className={cn(
          "text-muted-foreground text-sm transition-opacity",
          isFetching && "opacity-60",
        )}
      >
        {rowCount > pageSize && `${first}–${last} of `}
        {rowCount} {rowCount === 1 ? itemLabel : itemLabelPlural}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {rowCount > smallestPageSize && (
          <label className="type-secondary flex items-center gap-2">
            Rows
            <Select
              value={pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              aria-label="Rows per page"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </label>
        )}

        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="First page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.firstPage()}
            >
              <ChevronsLeft />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <ChevronLeft /> Prev
            </Button>
            <Badge variant="outline">
              Page {pageIndex + 1} of {pageCount}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Next <ChevronRight />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Last page"
              disabled={!table.getCanNextPage()}
              onClick={() => table.lastPage()}
            >
              <ChevronsRight />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
