import { cn } from "@dcb/ui";
import { Skeleton } from "@dcb/ui/skeleton";
import { TableCell, TableRow } from "@dcb/ui/table";

interface SkeletonColumn {
  className?: string;
  barClassName?: string;
}

// `cellClassName` sizes any bar the column doesn't size itself.
export function SkeletonTableRows({
  rows,
  columns,
  cellClassName = "h-5 w-24",
}: {
  rows: number;
  columns: number | SkeletonColumn[];
  cellClassName?: string;
}) {
  const cols: SkeletonColumn[] =
    typeof columns === "number"
      ? Array.from({ length: columns }, () => ({}))
      : columns;

  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          {cols.map((col, j) => (
            <TableCell key={j} className={col.className}>
              <Skeleton
                className={cn(
                  "inline-block",
                  col.barClassName ?? cellClassName,
                )}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
