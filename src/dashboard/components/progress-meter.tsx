import { Loader2 } from "lucide-react";

// The bar stays empty until the server fixes the exact total.
export interface StreamProgress {
  done: number;
  total: number;
}

export function ProgressMeter({
  progress,
  pendingLabel,
  unit,
}: {
  progress: StreamProgress | null;
  /** Shown until the first frame arrives. */
  pendingLabel: string;
  unit?: string;
}) {
  const pct =
    progress && progress.total > 0
      ? // oxlint-disable-next-line dcb-money/no-raw-money-math -- a percent
        Math.min(100, Math.round((progress.done / progress.total) * 100))
      : null;
  return (
    <span role="status" className="flex items-center gap-2.5">
      <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
        {progress
          ? `${progress.done} of ${progress.total}${unit ? ` ${unit}` : ""}`
          : pendingLabel}
      </span>
      <span className="bg-muted hidden h-1.5 w-28 overflow-hidden rounded-full sm:block md:w-44">
        <span
          className="bg-primary block h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${pct ?? 0}%` }}
        />
      </span>
      <Loader2 className="text-primary size-3.5 shrink-0 animate-spin" />
    </span>
  );
}
