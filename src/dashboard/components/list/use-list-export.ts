import { useCallback, useState } from "react";

import type { CsvColumn } from "~/dashboard/components/list/csv";
import { toCsv } from "~/dashboard/components/list/csv";
import { downloadTextFile } from "~/dashboard/lib/download";

// The export reads the filtered list a page at a time; the ceiling is a
// runaway guard, and a search is already capped server-side well below it.
const EXPORT_PAGE_SIZE = 100;
const DEFAULT_MAX_ROWS = 1000;

/**
 * Downloads the whole filtered list (not just the page on screen) as a CSV,
 * reading it a page at a time through the same paged query the table uses.
 * Errors are left for the caller to show through `RecoverPanel`, the way
 * `invoices/use-csv-download.ts` does — this hook only tracks the message.
 */
export function useListExport<T>({
  filename,
  columns,
  fetchPage,
  maxRows = DEFAULT_MAX_ROWS,
}: {
  filename: (now: Date) => string;
  columns: CsvColumn<T>[];
  fetchPage: (
    page: number,
    pageSize: number,
  ) => Promise<{ items: T[]; pageCount: number }>;
  maxRows?: number;
}) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(() => {
    void (async () => {
      setError(null);
      setRunning(true);
      try {
        const all: T[] = [];
        for (let page = 1; all.length < maxRows; page++) {
          const result = await fetchPage(page, EXPORT_PAGE_SIZE);
          all.push(...result.items);
          if (result.items.length === 0 || page >= result.pageCount) break;
        }
        downloadTextFile(filename(new Date()), toCsv(all, columns));
      } catch (err) {
        setError(
          err instanceof Error && err.message
            ? err.message
            : "Couldn’t export this list.",
        );
      } finally {
        setRunning(false);
      }
    })();
  }, [fetchPage, columns, filename, maxRows]);

  return {
    run,
    running,
    error,
    clearError: useCallback(() => setError(null), []),
  };
}
