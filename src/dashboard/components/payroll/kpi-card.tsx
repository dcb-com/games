import { cn } from "@dcb/ui";

// min-h keeps a consistent height whether or not `hint` is passed; break-words
// lets a large value wrap instead of overflowing the card.
export function KpiCard({
  label,
  value,
  hint,
  emphasis,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
  /** `warning` marks a figure that needs acting on, e.g. a past due date. */
  tone?: "warning";
}) {
  return (
    <div
      className={cn(
        "border-border flex min-h-[4.5rem] flex-col rounded-xl border px-3.5 py-3",
        emphasis && "border-primary/40 bg-primary/5",
        tone === "warning" && "border-warning-border bg-warning",
      )}
    >
      <div className="type-caption">{label}</div>
      <div className="text-foreground mt-1 text-base font-semibold break-words tabular-nums">
        {value}
      </div>
      {hint && (
        <div
          className={cn(
            "text-2xs mt-auto pt-0.5",
            tone === "warning"
              ? "text-warning-foreground font-medium"
              : "text-muted-foreground",
          )}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
