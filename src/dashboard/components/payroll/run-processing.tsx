import { Check, Circle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { match } from "ts-pattern";

import { cn } from "@dcb/ui";

import { plural } from "~/dashboard/lib/format";
import type { RunStatus } from "~/mock/types";

type Status = RunStatus;

/** The stages a calculation reports, in the order they come. */
type Phase = "start" | "hours" | "taxes" | "reports" | "finish";

const CALCULATION: { phase: Phase; label: string }[] = [
  { phase: "hours", label: "Reading hours and pay" },
  { phase: "taxes", label: "Working out taxes and deductions" },
  { phase: "reports", label: "Building reports" },
  { phase: "finish", label: "Finishing up" },
];

const ORDER: Phase[] = ["start", "hours", "taxes", "reports", "finish"];

// The vendor's step text is playful ("Counting beans…"); it is read here only
// to know which stage the run is in.
function phaseOf(raw: string | null | undefined): Phase | null {
  const lower = (raw ?? "").toLowerCase();
  if (!lower) return null;
  if (lower.includes("bean") || lower.includes("uncle sam")) return "taxes";
  if (lower.includes("time entry") || lower.includes("crunching")) {
    return "hours";
  }
  if (lower.includes("report")) return "reports";
  if (lower.includes("almost")) return "finish";
  if (lower.includes("engine") || lower.includes("activat")) return "start";
  return null;
}

function describe(raw: string | null | undefined, fallback: string): string {
  return match(phaseOf(raw))
    .with("taxes", () => "Calculating taxes…")
    .with("hours", () => "Processing time entries…")
    .with("reports", () => "Building reports…")
    .with("finish", () => "Almost done…")
    .with("start", () => "Starting the payroll…")
    .with(null, () =>
      raw
        ? raw
            .replace(/\s*…\s*$/, "")
            .trim()
            .replace(/\bprovider\b/gi, "payroll")
        : fallback,
    )
    .exhaustive();
}

function elapsedWords(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return plural(rest, "second");
  return rest === 0
    ? plural(minutes, "minute")
    : `${plural(minutes, "minute")} ${plural(rest, "second")}`;
}

// Seconds since this screen appeared. A wait that says how long it has run
// reads as work in progress rather than a page that has hung.
function useElapsed(): number {
  const [started] = useState(() => Date.now());
  const [now, setNow] = useState(started);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return Math.floor((now - started) / 1000);
}

// An unknown percentage renders as an indeterminate bar rather than a
// default sliver.
export function RunProcessing({
  status,
  fallback,
  title,
  calculating = false,
  below,
}: {
  status: Status | undefined;
  fallback: string;
  /** Said in place of the run's own stage, e.g. "Calculating 75 paychecks…". */
  title?: string;
  /** A calculation is under way, so its stages are listed as they pass. */
  calculating?: boolean;
  /** Not in the real dashboard: what sits under the wait, here the game slot. */
  below?: ReactNode;
}) {
  const desc = title ?? describe(status?.procStepDesc, fallback);
  const reported = status?.procStepProgress ?? 0;
  const elapsed = useElapsed();

  // Highest value seen this transition, so the bar never goes backwards.
  // State rather than a ref: a ref read during render isn't safe under the
  // React Compiler.
  const [peak, setPeak] = useState(0);
  if (reported > peak) setPeak(reported);
  const progress = Math.max(reported, peak);

  // The furthest stage reported so far. A stage is ticked only once a later
  // one has been seen, so the list never claims more than the run has said.
  const [stage, setStage] = useState<Phase | null>(null);
  const seen = phaseOf(status?.procStepDesc);
  if (seen && (stage == null || ORDER.indexOf(seen) > ORDER.indexOf(stage))) {
    setStage(seen);
  }
  const at = stage == null ? -1 : ORDER.indexOf(stage);

  // 100% while still on this screen means the next phase hasn't reported
  // yet; treat it as indeterminate too, or the bar reads as hung.
  const determinate = progress > 0 && progress < 100;

  return (
    <div
      role="status"
      className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24"
    >
      <span className="sr-only">
        {desc}
        {determinate ? ` ${progress}% done.` : " Working…"}
      </span>
      <Loader2 aria-hidden className="text-primary size-8 animate-spin" />
      <div className="text-center">
        <p className="type-label">
          {desc}
          {determinate && (
            <span className="text-muted-foreground ml-2 tabular-nums">
              {progress}%
            </span>
          )}
        </p>
        <p className="type-caption mt-1">
          {calculating
            ? "Calculating usually takes one to two minutes. It’s safe to leave and come back."
            : "This can take a couple of minutes for large teams. It’s safe to leave and come back."}
        </p>
      </div>
      <div
        className="bg-border h-1.5 w-72 max-w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={determinate ? progress : undefined}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {determinate ? (
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        ) : (
          // Indeterminate: a travelling band rather than a fake measurement.
          <div className="bg-primary animate-run-progress h-full w-1/3 rounded-full" />
        )}
      </div>

      {calculating && (
        <ol className="flex w-72 max-w-full flex-col gap-1.5" aria-hidden>
          {CALCULATION.map(({ phase, label }) => {
            const index = ORDER.indexOf(phase);
            const done = index < at;
            const current = index === at;
            return (
              <li
                key={phase}
                className={cn(
                  "type-caption flex items-center gap-2",
                  (done || current) && "text-foreground",
                )}
              >
                {done ? (
                  <Check className="text-success-foreground size-3.5 shrink-0" />
                ) : current ? (
                  <Loader2 className="text-primary size-3.5 shrink-0 animate-spin" />
                ) : (
                  <Circle className="size-3.5 shrink-0" />
                )}
                {label}
              </li>
            );
          })}
        </ol>
      )}

      <p className="type-caption tabular-nums">
        {elapsedWords(elapsed)} so far
      </p>
      {below}
    </div>
  );
}
