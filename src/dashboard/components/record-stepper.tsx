import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@dcb/ui/button";
import { Select } from "@dcb/ui/select";

interface StepperRecord {
  id: string | number;
  /** Shown in the `jump` select. Falls back to the id when absent. */
  name?: string;
}

/** Pure so the `jump` select's lookup is testable without mounting anything. */
export function findRecordById<T extends StepperRecord>(
  records: T[],
  id: string,
): T | undefined {
  return records.find((r) => String(r.id) === id);
}

/** Pure so the bounds logic is testable without mounting anything. */
export function stepperBounds<T extends StepperRecord>(
  records: T[],
  currentId: T["id"] | null | undefined,
): { position: number; previous: T | undefined; next: T | undefined } {
  const position = records.findIndex((r) => r.id === currentId);
  const previous = position > 0 ? records[position - 1] : undefined;
  const next =
    position >= 0 && position < records.length - 1
      ? records[position + 1]
      : undefined;
  return { position, previous, next };
}

// Walking prev/next through a fixed list of records without closing the
// dialog they're shown in. Replaces the two independent implementations in
// paystub-breakdown-dialog.tsx and run-employee-detail-dialog.tsx.
export function RecordStepper<T extends StepperRecord>({
  records,
  currentId,
  onSelect,
  noun,
  className,
  jump = false,
}: {
  records: T[];
  currentId: T["id"] | null | undefined;
  onSelect: (record: T) => void;
  noun: { one: string; many: string };
  className?: string;
  /** Adds a select between Previous and Next that jumps straight to any record by name. */
  jump?: boolean;
}) {
  const { position, previous, next } = stepperBounds(records, currentId);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        /^(input|textarea|select)$/i.test(target.tagName)
      )
        return;
      if (event.key === "ArrowLeft" && previous) onSelect(previous);
      if (event.key === "ArrowRight" && next) onSelect(next);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previous, next, onSelect]);

  if (position < 0 || records.length <= 1) return null;

  return (
    <div className={className ?? "flex shrink-0 items-center gap-2"}>
      <Button
        variant="outline"
        size="sm"
        disabled={!previous}
        onClick={() => previous && onSelect(previous)}
      >
        <ChevronLeft className="size-4" />
        Previous
      </Button>
      {jump && (
        <Select
          aria-label={`Jump to ${noun.many}`}
          className="[&_select]:h-8 [&_select]:text-xs"
          value={String(currentId ?? "")}
          onChange={(event) => {
            const found = findRecordById(records, event.target.value);
            if (found) onSelect(found);
          }}
        >
          {records.map((r) => (
            <option key={r.id} value={String(r.id)}>
              {r.name ?? String(r.id)}
            </option>
          ))}
        </Select>
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={!next}
        onClick={() => next && onSelect(next)}
      >
        Next
        <ChevronRight className="size-4" />
      </Button>
      <span
        className="type-caption tabular-nums"
        aria-live="polite"
      >{`${position + 1} of ${records.length} ${records.length === 1 ? noun.one : noun.many}`}</span>
    </div>
  );
}
