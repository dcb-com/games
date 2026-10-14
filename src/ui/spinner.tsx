import { cn } from "@dcb/ui";

// Sized via className; set the text color to recolor the moving arc.
export function Spinner({
  className,
  label = "Loading",
}: {
  className?: string;
  /** What a screen reader says while this spins. */
  label?: string;
}) {
  return (
    <div
      role="status"
      data-slot="spinner"
      className={cn(
        "border-muted-foreground/30 border-t-primary size-7 animate-spin rounded-full border-2",
        className,
      )}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}
