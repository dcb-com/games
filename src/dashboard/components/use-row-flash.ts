import { useCallback, useEffect, useRef, useState } from "react";

// How long a changed row stays lit before it fades back.
const FLASH_MS = 1500;

/**
 * Marks the rows a mutation just changed. The rows paint `bg-accent` for a
 * moment and fade out, so the change is visible where it happened and not
 * only in the toast. Takes either a single id or a set, so one hook covers
 * both a single-row flash and a bulk one.
 */
export function useRowFlash() {
  const [flashed, setFlashed] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = useCallback((ids: string | Iterable<string>) => {
    clearTimeout(timer.current);
    setFlashed(new Set(typeof ids === "string" ? [ids] : ids));
    timer.current = setTimeout(() => setFlashed(new Set<string>()), FLASH_MS);
  }, []);

  const isFlashed = useCallback((id: string) => flashed.has(id), [flashed]);

  return { isFlashed, flash };
}

/**
 * Waits for a row a mutation just created to arrive in the refetched list,
 * then flashes it. Returns `waitForArrival(match, getId)`: call it right
 * after the mutation succeeds, with a predicate that identifies the new row
 * once the list settles (e.g. by email), since it doesn't exist in `rows`
 * until the refetch lands.
 */
export function useFlashOnArrival<T>(rows: T[], flash: (id: string) => void) {
  const waiting = useRef<null | {
    match: (row: T) => boolean;
    getId: (row: T) => string;
  }>(null);

  useEffect(() => {
    if (!waiting.current) return;
    const row = rows.find(waiting.current.match);
    if (!row) return;
    const id = waiting.current.getId(row);
    waiting.current = null;
    flash(id);
  }, [rows, flash]);

  return useCallback(
    (match: (row: T) => boolean, getId: (row: T) => string) => {
      waiting.current = { match, getId };
    },
    [],
  );
}
