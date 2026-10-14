import { Check, Lock } from "lucide-react";
import { Fragment } from "react";

import { cn } from "@dcb/ui";

// One node per screen the run actually has. Payments is its own screen even
// though it shares Review's server step, and it is where the run locks.
const RUN_STEPS = [
  { label: "Timesheet", locks: false },
  { label: "Review", locks: false },
  { label: "Payments", locks: true },
  { label: "Finalize", locks: true },
  { label: "Done", locks: false },
] as const;

// `current` is 1-based. A narrow screen has no room for five labels beside
// the run menu and Close, so it names the step it is on and counts the rest;
// the full row of steps starts where the page is wide enough to hold it.
export function RunStepHeader({ current }: { current: number }) {
  const step = RUN_STEPS[current - 1] ?? RUN_STEPS[0];
  const currentLabel = step.label;
  return (
    <>
      <p className="flex min-w-0 flex-1 items-center gap-2 lg:hidden">
        <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums">
          {current}
        </span>
        <span className="flex min-w-0 items-center gap-1 truncate text-sm font-semibold">
          {currentLabel}
          {step.locks && (
            <Lock
              aria-label="Locks the run"
              className="text-warning-foreground size-3 shrink-0"
            />
          )}
        </span>
        <span className="type-caption shrink-0 tabular-nums">
          Step {current} of {RUN_STEPS.length}
        </span>
      </p>
      <RunStepRail current={current} currentLabel={currentLabel} />
    </>
  );
}

function RunStepRail({
  current,
  currentLabel,
}: {
  current: number;
  currentLabel: string;
}) {
  return (
    <ol
      className="hidden max-w-3xl min-w-0 flex-1 items-center lg:flex"
      aria-label={`Payroll steps, on ${currentLabel}`}
    >
      {RUN_STEPS.map(({ label, locks }, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "current" : "todo";
        return (
          <Fragment key={label}>
            {i > 0 && (
              <span
                aria-hidden
                className={cn(
                  "mx-2 h-px min-w-4 flex-1",
                  n <= current ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <li
              className="flex shrink-0 items-center gap-2"
              aria-current={state === "current" ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                  state === "done" && "bg-primary text-primary-foreground",
                  state === "current" &&
                    "bg-primary text-primary-foreground ring-primary/25 ring-4",
                  state === "todo" &&
                    "border-border text-muted-foreground border",
                )}
              >
                {state === "done" ? <Check className="size-3.5" /> : n}
              </span>
              <span
                className={cn(
                  "flex items-center gap-1 text-sm",
                  state === "current"
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground",
                )}
              >
                {label}
                {/* The same mark on both steps that close the run off. */}
                {locks && (
                  <Lock
                    aria-label="Locks the run"
                    className="text-warning-foreground size-3"
                  />
                )}
              </span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
